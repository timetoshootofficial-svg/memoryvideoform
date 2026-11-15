/**
 * Timetoshoot — Google Apps Script Web App API
 * ------------------------------------------------------------------
 * This script must be BOUND to the Timetoshoot Google Sheet
 * (Extensions > Apps Script from inside the Sheet).
 *
 * Script Properties required:
 *   API_TOKEN  = a long random string (same value as js/config.js apiToken)
 *
 * Deploy: see DEPLOY.md
 *
 * WHAT A RESERVATION MEANS HERE
 * A reservation made on the site is an INTEREST RECORD, not a confirmed
 * booking. It lands in Bookings with Status "Pending" and a hold, so the
 * calendar can show honest scarcity, and it frees itself again when the hold
 * runs out. The real date is agreed with the customer on WhatsApp, and the
 * owner sets the Status by hand.
 *
 * Columns are read BY HEADER NAME, never by position, so you can reorder or
 * insert columns in the Bookings tab without breaking this script.
 *
 * Availability rules are mirrored in ../js/logic.js so they can be unit
 * tested in Node. If you change a rule here, change it there too.
 */

var TAB = {
  CONFIG: 'Config',
  BOOKINGS: 'Bookings',
  BLOCKED: 'Blocked',
  FUNNEL: 'Funnel',
  TESTIMONIALS: 'Testimonials'
};

var CACHE_SECONDS = 60;
var MAX_BOOKINGS_PER_PHONE_PER_DAY = 3;
var LOCK_WAIT_MS = 10000;

var DEFAULT_TIME_SLOTS = ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'];

/* ============================ ENTRY POINTS ============================ */

function doGet(e) { return handle_(e, 'GET'); }
function doPost(e) { return handle_(e, 'POST'); }

function handle_(e, method) {
  try {
    var input = {};
    if (e && e.parameter) {
      for (var k in e.parameter) input[k] = e.parameter[k];
    }
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      var parsed;
      try { parsed = JSON.parse(e.postData.contents); }
      catch (err) { return json_({ ok: false, code: 'BAD_JSON', message: 'Invalid JSON body' }); }
      if (parsed && typeof parsed === 'object') {
        for (var k2 in parsed) input[k2] = parsed[k2];
      }
    }

    var action = String(input.action || '').trim();
    if (!action) return json_({ ok: false, code: 'NO_ACTION' });

    if (!checkToken_(input.token)) {
      return json_({ ok: false, code: 'BAD_TOKEN', message: 'Unauthorized' });
    }

    switch (action) {
      case 'ping':            return json_({ ok: true, now: new Date().toISOString() });
      case 'bootstrap':       return json_(apiBootstrap_(input));
      case 'getConfig':       return json_({ ok: true, config: getConfig_() });
      case 'getAvailability': return json_({ ok: true, availability: getAvailability_(input.from, input.to) });
      case 'getTestimonials': return json_({ ok: true, testimonials: getTestimonials_() });
      case 'createBooking':   return json_(createBooking_(input));
      case 'logEvent':        return json_(logEvent_(input));
      default:                return json_({ ok: false, code: 'UNKNOWN_ACTION', message: action });
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, code: 'SERVER_ERROR', message: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) return false;             // fail closed until configured
  return String(token || '') === String(expected);
}

/* ========================= BOOKINGS TABLE ACCESS ====================== */

/**
 * Reads the Bookings tab once and returns a header-name index, so nothing in
 * this file depends on column letters.
 */
function bookingsTable_() {
  var sh = sheet_(TAB.BOOKINGS);
  var lastRow = sh.getLastRow();
  var lastCol = Math.max(1, sh.getLastColumn());
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h === null || h === undefined ? '' : h).trim(); });

  var idx = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && idx[headers[i]] === undefined) idx[headers[i]] = i;
  }

  ['BookingID', 'DeliveryDate', 'Status'].forEach(function (needed) {
    if (idx[needed] === undefined) {
      throw new Error('The Bookings tab has no "' + needed + '" column. Run setupSheet() from Setup.gs.');
    }
  });

  var rows = (lastRow >= 2) ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  return { sheet: sh, headers: headers, idx: idx, rows: rows, lastCol: lastCol };
}

function cell_(row, idx, name) {
  var i = idx[name];
  return (i === undefined) ? '' : row[i];
}

function buildRow_(idx, lastCol, data) {
  var arr = [];
  for (var i = 0; i < lastCol; i++) arr.push('');
  Object.keys(data).forEach(function (key) {
    if (idx[key] !== undefined) arr[idx[key]] = data[key];
  });
  return arr;
}

/* ============================== CONFIG =============================== */

function getConfig_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('config');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var sh = sheet_(TAB.CONFIG);
  var values = sh.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '').trim();
    if (!key) continue;
    out[key] = values[i][1];
  }

  var cfg = {
    price_30s: num_(out.price_30s, 2999),
    price_1m: num_(out.price_1m, 4999),
    price_2m: num_(out.price_2m, 7999),
    follower_discount: num_(out.follower_discount, 200),
    daily_capacity: num_(out.daily_capacity, 4),
    units_30s: num_(out.units_30s, 1),
    units_1m: num_(out.units_1m, 1),
    units_2m: num_(out.units_2m, 2),
    min_lead_days: num_(out.min_lead_days, 3),
    booking_window_days: num_(out.booking_window_days, 60),
    slot_hold_hours: num_(out.slot_hold_hours, 24),
    whatsapp_number: String(out.whatsapp_number || '917448326503').replace(/[^0-9]/g, ''),
    most_chosen_package: String(out.most_chosen_package || '1m').trim(),
    delivery_text: String(out.delivery_text || 'Ready within 5 days of receiving all details'),
    clients_count: String(out.clients_count || '200+'),
    instagram_handle: String(out.instagram_handle || 'timetoshoot'),
    revisions_text: String(out.revisions_text || ''),
    time_slots: parseTimeSlots_(out.time_slots),
    today: today_()
  };

  cache.put('config', JSON.stringify(cfg), CACHE_SECONDS);
  return cfg;
}

/** "11:00 AM, 1:00 PM" -> ['11:00 AM','1:00 PM'] */
function parseTimeSlots_(raw) {
  var s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return DEFAULT_TIME_SLOTS.slice();
  var out = s.split(',')
    .map(function (x) { return sanitize_(x, 20); })
    .filter(function (x) { return !!x; });
  return out.length ? out : DEFAULT_TIME_SLOTS.slice();
}

function unitsFor_(cfg, filmLength) {
  if (filmLength === '30s') return cfg.units_30s;
  if (filmLength === '1m') return cfg.units_1m;
  if (filmLength === '2m') return cfg.units_2m;
  return 0;
}

function priceFor_(cfg, filmLength) {
  if (filmLength === '30s') return cfg.price_30s;
  if (filmLength === '1m') return cfg.price_1m;
  if (filmLength === '2m') return cfg.price_2m;
  return 0;
}

/* ============================ AVAILABILITY ============================ */

/**
 * For each date returns:
 *   slotsLeft — capacity units left (a 2 minute film costs units_2m of them)
 *   times     — every time slot offered that day, each flagged taken or free
 *
 * A date is bookable when it has units left AND at least one free time slot.
 */
function getAvailability_(fromDate, toDate) {
  var cfg = getConfig_();
  var from = normDate_(fromDate) || cfg.today;
  var to = normDate_(toDate) || addDays_(cfg.today, cfg.booking_window_days);

  var cacheKey = 'avail:' + from + ':' + to;
  var cache = CacheService.getScriptCache();
  var hit = cache.get(cacheKey);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var table = bookingsTable_();
  var now = new Date();
  var used = {};
  var takenTimes = {};

  for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];
    var deliveryDate = normDate_(cell_(row, table.idx, 'DeliveryDate'));
    if (!deliveryDate) continue;
    var status = String(cell_(row, table.idx, 'Status') || '').trim();
    if (!holdsSlot_(status, cell_(row, table.idx, 'HoldUntil'), now)) continue;

    used[deliveryDate] = (used[deliveryDate] || 0) + num_(cell_(row, table.idx, 'Units'), 1);

    var slotTime = String(cell_(row, table.idx, 'SlotTime') || '').trim();
    if (slotTime) {
      if (!takenTimes[deliveryDate]) takenTimes[deliveryDate] = {};
      takenTimes[deliveryDate][slotTime] = true;
    }
  }

  var blocked = blockedMap_();
  var out = [];
  var cursor = from;
  var guard = 0;

  while (cursor <= to && guard++ < 400) {
    var cap = cfg.daily_capacity;
    if (Object.prototype.hasOwnProperty.call(blocked, cursor)) {
      cap = (blocked[cursor] === null) ? 0 : blocked[cursor];
    }
    var u = used[cursor] || 0;
    var takenHere = takenTimes[cursor] || {};

    var times = cfg.time_slots.map(function (label) {
      return { time: label, taken: !!takenHere[label] };
    });
    var freeTimes = times.filter(function (x) { return !x.taken; }).length;

    out.push({
      date: cursor,
      capacity: cap,
      used: u,
      slotsLeft: Math.max(0, cap - u),
      times: times,
      freeTimes: freeTimes
    });
    cursor = addDays_(cursor, 1);
  }

  cache.put(cacheKey, JSON.stringify(out), CACHE_SECONDS);
  return out;
}

function holdsSlot_(status, holdUntil, now) {
  if (status === 'Confirmed' || status === 'Paid') return true;
  if (status !== 'Pending') return false;
  if (!holdUntil) return false;
  var d = (holdUntil instanceof Date) ? holdUntil : new Date(String(holdUntil));
  if (isNaN(d.getTime())) return false;
  return d.getTime() > now.getTime();
}

function blockedMap_() {
  var sh = sheet_(TAB.BLOCKED);
  var last = sh.getLastRow();
  var map = {};
  if (last < 2) return map;
  var values = sh.getRange(2, 1, last - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    var date = normDate_(values[i][0]);
    if (!date) continue;
    var override = values[i][1];
    map[date] = (override === '' || override === null || override === undefined)
      ? null                                  // blank = fully blocked
      : num_(override, 0);
  }
  return map;
}

/* ============================ TESTIMONIALS =========================== */

function getTestimonials_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('testimonials');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var sh = sheet_(TAB.TESTIMONIALS);
  var last = sh.getLastRow();
  var out = [];
  if (last >= 2) {
    var values = sh.getRange(2, 1, last - 1, 4).getValues();
    for (var i = 0; i < values.length; i++) {
      var active = String(values[i][3] || '').trim().toUpperCase();
      var text = String(values[i][1] || '').trim();
      if (active !== 'Y' || !text) continue;
      out.push({
        name: String(values[i][0] || '').trim(),
        text: text,
        occasion: String(values[i][2] || '').trim()
      });
    }
  }
  cache.put('testimonials', JSON.stringify(out), CACHE_SECONDS);
  return out;
}

/* ============================= BOOTSTRAP ============================= */

function apiBootstrap_(input) {
  var cfg = getConfig_();
  var from = normDate_(input.from) || cfg.today;
  var to = normDate_(input.to) || addDays_(cfg.today, cfg.booking_window_days);
  return {
    ok: true,
    config: cfg,
    availability: getAvailability_(from, to),
    testimonials: getTestimonials_()
  };
}

/* =========================== CREATE BOOKING ========================== */

/**
 * Records a reservation. This is an interest record: Status "Pending" with a
 * hold, never a confirmed booking.
 */
function createBooking_(input) {
  var cfg = getConfig_();

  /* ---- honeypot: silently accept, never write ---- */
  if (String(input.honeypot || input.company || '').trim() !== '') {
    return { ok: true, bookingId: 'TTS-0000', total: 0, holdUntil: null, spam: true };
  }

  /* ---- validation (server side, never trust the browser) ---- */
  var name = sanitize_(input.name, 80);
  if (name.replace(/[^A-Za-z஀-௿]/g, '').length < 2) {
    return { ok: false, code: 'BAD_NAME', message: 'Please enter your name.' };
  }

  var phone = normalizePhone_(input.phone);
  if (!phone) return { ok: false, code: 'BAD_PHONE', message: 'Enter a valid 10-digit Indian mobile number.' };

  if (input.consent !== true && String(input.consent) !== 'true') {
    return { ok: false, code: 'NO_CONSENT', message: 'Please agree to be contacted on WhatsApp.' };
  }

  var occasion = sanitize_(input.occasion, 40);
  var allowedOccasions = ['Anniversary', 'Birthday', 'Birth memory gift', 'Tribute to loved ones', 'Other'];
  if (allowedOccasions.indexOf(occasion) === -1) {
    return { ok: false, code: 'BAD_OCCASION', message: 'Please choose an occasion.' };
  }

  var filmLength = String(input.filmLength || '').trim();
  if (['30s', '1m', '2m'].indexOf(filmLength) === -1) {
    return { ok: false, code: 'BAD_LENGTH', message: 'Please choose a film length.' };
  }

  var deliveryDate = normDate_(input.deliveryDate);
  if (!deliveryDate) return { ok: false, code: 'BAD_DATE', message: 'Please pick a date.' };

  var slotTime = sanitize_(input.slotTime, 20);
  if (cfg.time_slots.indexOf(slotTime) === -1) {
    return { ok: false, code: 'BAD_TIME', message: 'Please pick a time slot.' };
  }

  var eventDate = normDate_(input.eventDate) || '';

  var earliest = addDays_(cfg.today, cfg.min_lead_days);
  var latest = addDays_(cfg.today, cfg.booking_window_days);
  if (deliveryDate < earliest) {
    return { ok: false, code: 'LEAD_TIME', message: 'We need at least ' + cfg.min_lead_days + ' days. Please pick a later date.' };
  }
  if (deliveryDate > latest) {
    return { ok: false, code: 'OUT_OF_WINDOW', message: 'That date is too far ahead. Please pick a closer date.' };
  }
  if (eventDate && deliveryDate >= eventDate) {
    return { ok: false, code: 'AFTER_EVENT', message: 'Delivery must be before your event date.' };
  }

  var units = unitsFor_(cfg, filmLength);
  var price = priceFor_(cfg, filmLength);
  var follower = (input.follower === true || String(input.follower) === 'true');
  var discount = follower ? cfg.follower_discount : 0;
  var total = Math.max(0, price - discount);

  /* ---- atomic section ---- */
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_WAIT_MS);
  } catch (e) {
    return { ok: false, code: 'LOCK_BUSY', message: 'Too many reservations at once. Please try again.' };
  }

  try {
    var table = bookingsTable_();
    var rows = table.rows;
    var idx = table.idx;
    var now = new Date();
    var todayStr = cfg.today;

    /* rate limit + duplicate check */
    var sameDayCount = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var rPhone = String(cell_(r, idx, 'Phone') || '').replace(/[^0-9]/g, '');
      if (rPhone.length > 10) rPhone = rPhone.slice(-10);
      if (rPhone !== phone) continue;

      if (normDate_(cell_(r, idx, 'CreatedAt')) === todayStr) sameDayCount++;

      var rStatus = String(cell_(r, idx, 'Status') || '').trim();
      if (rStatus !== 'Cancelled' && rStatus !== 'Expired' &&
          normDate_(cell_(r, idx, 'DeliveryDate')) === deliveryDate &&
          String(cell_(r, idx, 'SlotTime') || '').trim() === slotTime) {
        return { ok: false, code: 'DUPLICATE', existingId: String(cell_(r, idx, 'BookingID') || ''),
                 message: 'You already reserved this slot. We will message you on WhatsApp.' };
      }
    }
    if (sameDayCount >= MAX_BOOKINGS_PER_PHONE_PER_DAY) {
      return { ok: false, code: 'RATE_LIMIT', message: 'You have reached today’s limit. Please message us on WhatsApp.' };
    }

    /* re-check availability inside the lock */
    var blocked = blockedMap_();
    var cap = cfg.daily_capacity;
    if (Object.prototype.hasOwnProperty.call(blocked, deliveryDate)) {
      cap = (blocked[deliveryDate] === null) ? 0 : blocked[deliveryDate];
    }

    var usedUnits = 0;
    var timeTaken = false;
    for (var j = 0; j < rows.length; j++) {
      var rj = rows[j];
      if (normDate_(cell_(rj, idx, 'DeliveryDate')) !== deliveryDate) continue;
      if (!holdsSlot_(String(cell_(rj, idx, 'Status') || '').trim(), cell_(rj, idx, 'HoldUntil'), now)) continue;
      usedUnits += num_(cell_(rj, idx, 'Units'), 1);
      if (String(cell_(rj, idx, 'SlotTime') || '').trim() === slotTime) timeTaken = true;
    }

    if (timeTaken || cap - usedUnits < units) {
      return { ok: false, code: 'SLOT_TAKEN',
               message: 'This slot was just taken. Please pick another.' };
    }

    /* sequential BookingID */
    var bookingId = nextBookingId_(rows, idx);
    var holdUntil = new Date(now.getTime() + cfg.slot_hold_hours * 3600 * 1000);

    table.sheet.appendRow(buildRow_(idx, table.lastCol, {
      'BookingID': bookingId,
      'CreatedAt': formatDateTime_(now),
      'Name': name,
      'Phone': "'" + phone,
      'Occasion': occasion,
      'EventDate': eventDate,
      'FilmLength': filmLength,
      'DeliveryDate': deliveryDate,
      'SlotTime': slotTime,
      'Units': units,
      'Price': price,
      'FollowerDiscount': follower ? 'Y' : 'N',
      'Total': total,
      'Status': 'Pending',
      'HoldUntil': formatDateTime_(holdUntil),
      'UTM_Source': sanitize_(input.utm_source, 60),
      'UTM_Medium': sanitize_(input.utm_medium, 60),
      'UTM_Campaign': sanitize_(input.utm_campaign, 80),
      'UTM_Content': sanitize_(input.utm_content, 80),
      'AdID': sanitize_(input.ad_id, 60),
      'fbclid': sanitize_(input.fbclid, 200),
      'Referrer': sanitize_(input.referrer, 200),
      'Language': sanitize_(input.language, 8),
      'Notes': sanitize_(input.notes, 300)
    }));

    CacheService.getScriptCache().removeAll(['config']);
    clearAvailabilityCache_();

    return {
      ok: true,
      bookingId: bookingId,
      total: total,
      price: price,
      discount: discount,
      units: units,
      deliveryDate: deliveryDate,
      slotTime: slotTime,
      holdUntil: holdUntil.toISOString(),
      holdHours: cfg.slot_hold_hours
    };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function nextBookingId_(rows, idx) {
  var props = PropertiesService.getScriptProperties();
  var stored = parseInt(props.getProperty('LAST_SEQ') || '0', 10);
  if (isNaN(stored)) stored = 0;
  var maxSeen = 0;
  for (var i = 0; i < rows.length; i++) {
    var m = /^TTS-(\d+)$/.exec(String(cell_(rows[i], idx, 'BookingID') || '').trim());
    if (m) { var n = parseInt(m[1], 10); if (n > maxSeen) maxSeen = n; }
  }
  var next = Math.max(stored, maxSeen) + 1;
  props.setProperty('LAST_SEQ', String(next));
  return 'TTS-' + ('0000' + next).slice(-4);
}

function clearAvailabilityCache_() {
  var cache = CacheService.getScriptCache();
  var keys = [];
  var cfg0 = null;
  try { cfg0 = JSON.parse(cache.get('config') || 'null'); } catch (e) {}
  var today = (cfg0 && cfg0.today) ? cfg0.today : today_();
  for (var w = 0; w <= 120; w++) {
    keys.push('avail:' + today + ':' + addDays_(today, w));
  }
  cache.removeAll(keys);
}

/* ============================== FUNNEL =============================== */

function logEvent_(input) {
  var events = input.events;
  if (!events && input.event) {
    events = [{ sessionId: input.sessionId, event: input.event, step: input.step,
                language: input.language, utm_campaign: input.utm_campaign }];
  }
  if (!Array.isArray(events) || !events.length) return { ok: true, written: 0 };
  events = events.slice(0, 50);

  var rows = events.map(function (ev) {
    return [
      formatDateTime_(new Date()),
      sanitize_(ev.sessionId, 40),
      sanitize_(ev.event, 40),
      sanitize_(ev.step, 20),
      sanitize_(ev.language, 8),
      sanitize_(ev.utm_campaign, 80)
    ];
  });

  var sh = sheet_(TAB.FUNNEL);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  return { ok: true, written: rows.length };
}

/* ======================== TRIGGER: expire holds ====================== */

/**
 * Run every 15 minutes (see DEPLOY.md). Flips Pending rows whose hold has
 * passed to Expired, which frees the slot and the time.
 */
function expireHolds() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(LOCK_WAIT_MS); } catch (e) { return; }
  try {
    var table = bookingsTable_();
    if (!table.rows.length) return;
    if (table.idx.HoldUntil === undefined) return;

    var statusCol = table.idx.Status + 1;
    var statusValues = table.sheet.getRange(2, statusCol, table.rows.length, 1).getValues();
    var now = new Date();
    var changed = 0;

    for (var i = 0; i < table.rows.length; i++) {
      if (String(statusValues[i][0] || '').trim() !== 'Pending') continue;
      var hold = cell_(table.rows[i], table.idx, 'HoldUntil');
      if (!hold) continue;
      var d = (hold instanceof Date) ? hold : new Date(String(hold));
      if (isNaN(d.getTime())) continue;
      if (d.getTime() <= now.getTime()) { statusValues[i][0] = 'Expired'; changed++; }
    }

    if (changed) {
      table.sheet.getRange(2, statusCol, table.rows.length, 1).setValues(statusValues);
      clearAvailabilityCache_();
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* ============================== HELPERS ============================== */

function sheet_(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name + '. Run setupSheet() from Setup.gs.');
  return sh;
}

function tz_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'Asia/Kolkata';
}

function today_() {
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
}

function formatDateTime_(d) {
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd HH:mm:ss');
}

/** Any input -> 'YYYY-MM-DD' or '' */
function normDate_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  return '';
}

function addDays_(dateStr, days) {
  var p = String(dateStr).split('-');
  var d = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
  d.setUTCDate(d.getUTCDate() + days);
  var mm = ('0' + (d.getUTCMonth() + 1)).slice(-2);
  var dd = ('0' + d.getUTCDate()).slice(-2);
  return d.getUTCFullYear() + '-' + mm + '-' + dd;
}

function num_(v, fallback) {
  if (v === '' || v === null || v === undefined) return fallback;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? fallback : n;
}

/** Strip formula triggers and control characters before writing to the Sheet. */
function sanitize_(v, maxLen) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  s = s.replace(/^[\s'"]*[=+\-@\t\r]+/, '');
  s = s.trim();
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  return s;
}

/** '+91 98765 43210' | '09876543210' -> '9876543210'; '' if invalid */
function normalizePhone_(v) {
  var digits = String(v === null || v === undefined ? '' : v).replace(/[^0-9]/g, '');
  if (digits.length > 11 && digits.indexOf('00') === 0) digits = digits.substring(2);   // 0091...
  if (digits.length === 13 && digits.indexOf('091') === 0) digits = digits.substring(3);
  if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.substring(2);
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.substring(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return '';
  return digits;
}
