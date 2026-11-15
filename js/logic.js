/* Timetoshoot — pure booking logic.
 * Loaded in the browser as window.TTS, and required by tests/run.js in Node.
 * Rules here mirror apps-script/Code.gs. Keep both in sync.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TTS = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* The lengths on offer, in the order the stepper shows them. A length is
     only offered when Config carries a price for it, so one can be retired by
     clearing price_<code> in the Sheet. */
  var LENGTHS = ['30s', '1m', '2m', '3m', '4m', '5m'];

  /** Which of them this config actually prices. */
  function availableLengths(config) {
    return LENGTHS.filter(function (code) {
      return Number(config['price_' + code]) > 0;
    });
  }

  /* ------------------------------ dates ------------------------------ */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Date | 'YYYY-MM-DD' | '' -> 'YYYY-MM-DD' | '' */
  function normDate(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return '';
      return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
    return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
  }

  function addDays(dateStr, days) {
    var p = String(dateStr).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function daysBetween(a, b) {
    var pa = String(a).split('-'), pb = String(b).split('-');
    var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
    var db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  }

  /* ------------------------------ phone ------------------------------ */

  /** Returns the clean 10-digit number, or '' when invalid. */
  function normalizePhone(v) {
    var digits = String(v === null || v === undefined ? '' : v).replace(/[^0-9]/g, '');
    if (digits.length > 11 && digits.indexOf('00') === 0) digits = digits.slice(2);   // 0091...
    if (digits.length === 13 && digits.indexOf('091') === 0) digits = digits.slice(3);
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
  }

  function isValidPhone(v) { return normalizePhone(v) !== ''; }

  function isValidName(v) {
    var s = String(v === null || v === undefined ? '' : v).trim();
    return s.replace(/[^A-Za-z஀-௿]/g, '').length >= 2;
  }

  /* ------------------------------ pricing ---------------------------- */

  /* Both read Config by key, so adding a length is a Sheet change, not a
     code change. An unknown length prices at zero rather than guessing. */
  function unitsFor(config, filmLength) {
    if (LENGTHS.indexOf(filmLength) === -1) return 0;
    var v = config['units_' + filmLength];
    if (v === '' || v === null || v === undefined) return 1;
    var n = Number(v);
    return (isNaN(n) || n < 1) ? 1 : n;
  }

  /**
   * The price shown struck through, from Config list_price_<code>.
   * Returns 0 when it is missing, or not above what is actually charged, so
   * a blank or a mistake simply shows no strike rather than a fake saving.
   */
  function listPrice(config, filmLength) {
    if (LENGTHS.indexOf(filmLength) === -1) return 0;
    var n = Number(config['list_price_' + filmLength]);
    if (isNaN(n) || n <= 0) return 0;
    return n > basePrice(config, filmLength) ? n : 0;
  }

  function basePrice(config, filmLength) {
    if (LENGTHS.indexOf(filmLength) === -1) return 0;
    var n = Number(config['price_' + filmLength]);
    return (isNaN(n) || n < 0) ? 0 : n;
  }

  /** { base, discount, total } */
  function calcPrice(config, filmLength, isFollower) {
    var base = basePrice(config, filmLength);
    if (!base || isNaN(base)) return { base: 0, discount: 0, total: 0, list: 0 };
    var discount = isFollower ? Number(config.follower_discount || 0) : 0;
    if (isNaN(discount) || discount < 0) discount = 0;
    if (discount > base) discount = base;
    return { base: base, discount: discount, total: base - discount,
             list: listPrice(config, filmLength) };
  }

  /* ---------------------------- availability ------------------------- */

  /** Blocked override wins; blank override (null) means fully blocked. */
  function capacityFor(date, blockedMap, dailyCapacity) {
    if (blockedMap && Object.prototype.hasOwnProperty.call(blockedMap, date)) {
      var v = blockedMap[date];
      if (v === null || v === undefined || v === '') return 0;
      var n = Number(v);
      return isNaN(n) ? 0 : Math.max(0, n);
    }
    return Math.max(0, Number(dailyCapacity) || 0);
  }

  /** Does this booking row still occupy its delivery slot? */
  function holdsSlot(status, holdUntil, now) {
    if (status === 'Confirmed' || status === 'Paid') return true;
    if (status !== 'Pending') return false;
    if (!holdUntil) return false;
    var d = (holdUntil instanceof Date) ? holdUntil : new Date(String(holdUntil));
    if (isNaN(d.getTime())) return false;
    return d.getTime() > (now instanceof Date ? now.getTime() : new Date(now).getTime());
  }

  function usedUnitsForDate(bookings, date, now) {
    var total = 0;
    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (normDate(b.deliveryDate) !== date) continue;
      if (!holdsSlot(b.status, b.holdUntil, now)) continue;
      total += Number(b.units || 1);
    }
    return total;
  }

  function slotsLeft(date, bookings, blockedMap, dailyCapacity, now) {
    return Math.max(0, capacityFor(date, blockedMap, dailyCapacity) - usedUnitsForDate(bookings, date, now));
  }

  /** Time labels already held on this date. */
  function takenTimesForDate(bookings, date, now) {
    var out = [];
    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (normDate(b.deliveryDate) !== date) continue;
      if (!holdsSlot(b.status, b.holdUntil, now)) continue;
      var tlabel = String(b.slotTime || '').trim();
      if (tlabel && out.indexOf(tlabel) === -1) out.push(tlabel);
    }
    return out;
  }

  function isTimeTaken(bookings, date, time, now) {
    return takenTimesForDate(bookings, date, now).indexOf(String(time || '').trim()) !== -1;
  }

  /** [{time, taken}] for one date, in the order the Config lists them. */
  function timesForDate(allTimes, bookings, date, now) {
    var taken = takenTimesForDate(bookings, date, now);
    return (allTimes || []).map(function (label) {
      return { time: label, taken: taken.indexOf(label) !== -1 };
    });
  }

  function countFreeTimes(times) {
    var n = 0;
    for (var i = 0; i < (times || []).length; i++) if (!times[i].taken) n++;
    return n;
  }

  /**
   * Why a delivery date can or cannot be chosen.
   * opts: { today, minLeadDays, bookingWindowDays, eventDate, units, slotsLeft,
   *         freeTimes }
   * freeTimes is optional. When given, a day with no free time slot is full
   * even if it still has capacity units.
   * -> { selectable, reason, best }
   *    reason: 'ok' | 'lead_time' | 'out_of_window' | 'after_event' | 'full'
   *    best:   true when it lands in the sweet spot just before the event
   */
  function evaluateDate(date, opts) {
    var today = normDate(opts.today);
    var minLead = Number(opts.minLeadDays) || 0;
    var windowDays = Number(opts.bookingWindowDays) || 60;
    var eventDate = normDate(opts.eventDate);
    var units = Number(opts.units) || 1;
    var left = Number(opts.slotsLeft) || 0;

    if (date < addDays(today, minLead)) return { selectable: false, reason: 'lead_time', best: false };
    if (date > addDays(today, windowDays)) return { selectable: false, reason: 'out_of_window', best: false };
    if (eventDate && date >= eventDate) return { selectable: false, reason: 'after_event', best: false };
    if (left < units) return { selectable: false, reason: 'full', best: false };
    if (opts.freeTimes !== undefined && opts.freeTimes !== null && Number(opts.freeTimes) <= 0) {
      return { selectable: false, reason: 'full', best: false };
    }

    var best = false;
    if (eventDate) {
      var gap = daysBetween(date, eventDate);   // days from delivery to event
      best = gap >= 1 && gap <= 3;
    }
    return { selectable: true, reason: 'ok', best: best };
  }

  /** Builds the calendar model the UI renders. */
  function buildCalendar(availability, opts) {
    return (availability || []).map(function (day) {
      var times = day.times || null;
      var free = (day.freeTimes !== undefined && day.freeTimes !== null)
        ? day.freeTimes
        : (times ? countFreeTimes(times) : undefined);

      var e = evaluateDate(day.date, {
        today: opts.today,
        minLeadDays: opts.minLeadDays,
        bookingWindowDays: opts.bookingWindowDays,
        eventDate: opts.eventDate,
        units: opts.units,
        slotsLeft: day.slotsLeft,
        freeTimes: free
      });

      /* What the visitor sees as "n left" is whichever runs out first: the
         capacity you set, or the time slots still open that day. */
      var shown = day.slotsLeft;
      if (free !== undefined && free !== null) shown = Math.min(shown, free);

      return {
        date: day.date,
        slotsLeft: shown,
        capacityLeft: day.slotsLeft,
        capacity: day.capacity,
        times: times,
        freeTimes: free,
        selectable: e.selectable,
        reason: e.reason,
        best: e.best
      };
    });
  }

  function hasAnySelectable(calendar) {
    for (var i = 0; i < calendar.length; i++) if (calendar[i].selectable) return true;
    return false;
  }

  /* ------------------------- slot reservation ------------------------ */

  /**
   * The decision half of createBooking, with no I/O so it can be tested.
   * store: { bookings: [], blocked: {}, config, now, today }
   * req:   { phone, deliveryDate, eventDate, filmLength }
   * -> { ok:true, units, price } | { ok:false, code, message }
   *
   * Mirrors apps-script/Code.gs createBooking_ (which wraps this in LockService).
   */
  function checkReservation(store, req) {
    var cfg = store.config;
    var today = normDate(store.today);
    var now = store.now;
    var deliveryDate = normDate(req.deliveryDate);
    var eventDate = normDate(req.eventDate);
    var phone = normalizePhone(req.phone);

    if (!phone) return { ok: false, code: 'BAD_PHONE' };
    /* Mirror the server: a length without a price in Config is not on offer,
       even though the code is in the canonical list. */
    if (availableLengths(cfg).indexOf(req.filmLength) === -1) {
      return { ok: false, code: 'BAD_LENGTH' };
    }
    if (!deliveryDate) return { ok: false, code: 'BAD_DATE' };

    var times = cfg.time_slots || [];
    var slotTime = String(req.slotTime || '').trim();
    if (times.length) {
      if (times.indexOf(slotTime) === -1) return { ok: false, code: 'BAD_TIME' };
      if (isTimeTaken(store.bookings, deliveryDate, slotTime, now)) {
        return { ok: false, code: 'SLOT_TAKEN' };
      }
    }

    var units = unitsFor(cfg, req.filmLength);
    var e = evaluateDate(deliveryDate, {
      today: today,
      minLeadDays: cfg.min_lead_days,
      bookingWindowDays: cfg.booking_window_days,
      eventDate: eventDate,
      units: units,
      slotsLeft: slotsLeft(deliveryDate, store.bookings, store.blocked, cfg.daily_capacity, now),
      freeTimes: times.length
        ? countFreeTimes(timesForDate(times, store.bookings, deliveryDate, now))
        : undefined
    });

    if (!e.selectable) {
      if (e.reason === 'lead_time') return { ok: false, code: 'LEAD_TIME' };
      if (e.reason === 'out_of_window') return { ok: false, code: 'OUT_OF_WINDOW' };
      if (e.reason === 'after_event') return { ok: false, code: 'AFTER_EVENT' };
      return { ok: false, code: 'SLOT_TAKEN' };
    }

    var sameDay = 0;
    for (var i = 0; i < store.bookings.length; i++) {
      var b = store.bookings[i];
      if (normalizePhone(b.phone) !== phone) continue;
      if (normDate(b.createdAt) === today) sameDay++;
      if (b.status !== 'Cancelled' && b.status !== 'Expired' &&
          normDate(b.deliveryDate) === deliveryDate &&
          String(b.slotTime || '').trim() === slotTime) {
        return { ok: false, code: 'DUPLICATE', existingId: b.bookingId };
      }
    }
    if (sameDay >= 3) return { ok: false, code: 'RATE_LIMIT' };

    return { ok: true, units: units, price: basePrice(cfg, req.filmLength) };
  }

  function nextBookingId(lastSeq) {
    var n = (Number(lastSeq) || 0) + 1;
    return 'TTS-' + ('0000' + n).slice(-4);
  }

  return {
    LENGTHS: LENGTHS, availableLengths: availableLengths,
    normDate: normDate, addDays: addDays, daysBetween: daysBetween,
    normalizePhone: normalizePhone, isValidPhone: isValidPhone, isValidName: isValidName,
    unitsFor: unitsFor, basePrice: basePrice, listPrice: listPrice, calcPrice: calcPrice,
    capacityFor: capacityFor, holdsSlot: holdsSlot, usedUnitsForDate: usedUnitsForDate,
    slotsLeft: slotsLeft, evaluateDate: evaluateDate, buildCalendar: buildCalendar,
    takenTimesForDate: takenTimesForDate, isTimeTaken: isTimeTaken,
    timesForDate: timesForDate, countFreeTimes: countFreeTimes,
    hasAnySelectable: hasAnySelectable, checkReservation: checkReservation,
    nextBookingId: nextBookingId
  };
}));
