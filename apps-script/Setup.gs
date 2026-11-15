/**
 * Timetoshoot — one-time Sheet setup.
 * Open the Sheet > Extensions > Apps Script, paste this file, then run setupSheet().
 * Safe to re-run: it only creates what is missing and never deletes bookings.
 */

var BOOKING_COLUMNS = ['BookingID', 'CreatedAt', 'Name', 'Phone', 'Occasion', 'EventDate',
  'FilmLength', 'DeliveryDate', 'SlotTime', 'Units', 'Price', 'FollowerDiscount', 'Total',
  'Status', 'HoldUntil', 'UTM_Source', 'UTM_Medium', 'UTM_Campaign', 'UTM_Content', 'AdID',
  'fbclid', 'Referrer', 'Language', 'Notes'];

function setupSheet() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');

  setupConfig_(ss);
  setupBookings_(ss);
  setupBlocked_(ss);
  setupFunnel_(ss);
  setupTestimonials_(ss);
  setupDashboard_(ss);

  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  SpreadsheetApp.getActive().toast('Timetoshoot tabs are ready.', 'Setup complete', 5);
}

/** Generates a random API token and stores it in Script Properties. Run once. */
function generateApiToken() {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').substring(0, 8);
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', token);
  Logger.log('API_TOKEN = ' + token);
  Logger.log('Copy this into js/config.js as apiToken.');
  return token;
}

/**
 * Sets the PIN that unlocks /admin. Run once, then change the value below and
 * run it again whenever you want a new PIN.
 *
 * This is NOT the same as API_TOKEN. API_TOKEN ships inside the public page;
 * this PIN never does, and the admin dashboard shows customer phone numbers,
 * so keep it to yourself and make it long.
 */
function setAdminPin() {
  var pin = 'CHANGE-ME-to-something-long';     // <-- edit this line, then Run
  if (pin.indexOf('CHANGE-ME') === 0) {
    throw new Error('Open Setup.gs, replace the pin on this line with your own, then run setAdminPin again.');
  }
  if (String(pin).length < 8) {
    throw new Error('Use at least 8 characters. A 4-digit pin is guessable.');
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', String(pin));
  Logger.log('ADMIN_PIN set. Open https://timetoshoot.in/admin and enter it.');
  return 'ok';
}

function getOrCreate_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function header_(sh, headers) {
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#111111').setFontColor('#FFC700');
  sh.setFrozenRows(1);
}

/** 1 -> 'A', 27 -> 'AA' */
function colLetter_(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

/** Column letter of a header in the Bookings layout, so formulas never drift. */
function bookingCol_(name) {
  var i = BOOKING_COLUMNS.indexOf(name);
  if (i === -1) throw new Error('Unknown Bookings column: ' + name);
  return colLetter_(i + 1);
}

/* ------------------------------- Config ------------------------------ */

function setupConfig_(ss) {
  var sh = getOrCreate_(ss, 'Config');
  header_(sh, ['Key', 'Value', 'Notes']);

  var seed = [
    ['price_30s', 2999, '30 second film price in rupees'],
    ['price_1m', 4999, '1 minute film price — CONFIRM THIS'],
    ['price_2m', 7999, '2 minute film price — CONFIRM THIS'],
    ['price_3m', 9999, '3 minute film price'],
    ['price_4m', 13999, '4 minute film price'],
    ['price_5m', 16999, '5 minute film price'],
    ['follower_discount', 200, 'Flat rupees off when customer follows @timetoshoot'],
    ['time_slots', '11:00 AM, 1:00 PM, 4:00 PM, 7:00 PM',
      'The time slots offered on each day, separated by commas. Edit freely.'],
    ['daily_capacity', 4, 'How many slots you will take per day. Keep it at or below the number of time_slots.'],
    ['units_30s', 1, 'Capacity units a 30s film uses'],
    ['units_1m', 1, 'Capacity units a 1m film uses'],
    ['units_2m', 2, 'Capacity units a 2m film uses (double weight)'],
    ['units_3m', 2, 'Capacity units a 3m film uses'],
    ['units_4m', 3, 'Capacity units a 4m film uses'],
    ['units_5m', 3, 'Capacity units a 5m film uses. Keep every units_* at or below daily_capacity, or that length can never be booked.'],
    ['min_lead_days', 3, 'Earliest date = today + this many days'],
    ['booking_window_days', 60, 'How far ahead the calendar shows'],
    ['slot_hold_hours', 24, 'How long a reserved slot is held before it frees itself'],
    ['whatsapp_number', '917448326503', 'With country code, digits only. Used for the booking message, which carries the date, time and reference.'],
    ['whatsapp_link', 'https://wa.me/message/PB6XEXRKZL7BH1',
      'Your WhatsApp Business short link. Used for the plain "message us" buttons. It cannot carry a prefilled message, so booking confirmations use whatsapp_number instead.'],
    ['most_chosen_package', '1m', 'One of: 30s | 1m | 2m — gets the "Most chosen" badge'],
    ['delivery_text', 'Ready within 5 days of receiving all details', 'Shown in FAQ and pricing'],
    ['clients_count', '200+', 'Hero badge number'],
    ['instagram_handle', 'timetoshoot', 'Without the @'],
    ['revisions_text', '', 'FILL ME: your revision policy, shown in the FAQ']
  ];

  var existing = {};
  var last = sh.getLastRow();
  if (last >= 2) {
    var cur = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < cur.length; i++) existing[String(cur[i][0]).trim()] = true;
  }
  var toAdd = seed.filter(function (r) { return !existing[r[0]]; });
  if (toAdd.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAdd.length, 3).setValues(toAdd);
  }

  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(2, 300);
  sh.setColumnWidth(3, 420);
}

/* ------------------------------ Bookings ----------------------------- */

function setupBookings_(ss) {
  var sh = getOrCreate_(ss, 'Bookings');

  /* If an older layout is already there, add SlotTime rather than rewriting
     the headers over real data. */
  var lastCol = Math.max(1, sh.getLastColumn());
  var current = sh.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h || '').trim(); });

  if (current.join('') === '') {
    header_(sh, BOOKING_COLUMNS);
  } else if (current.indexOf('SlotTime') === -1) {
    var after = current.indexOf('DeliveryDate');
    var at = (after === -1) ? current.length : after + 1;
    sh.insertColumnAfter(at);
    sh.getRange(1, at + 1).setValue('SlotTime')
      .setFontWeight('bold').setBackground('#111111').setFontColor('#FFC700');
    SpreadsheetApp.getActive().toast('Added the SlotTime column to Bookings.', 'Updated', 5);
  }

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Confirmed', 'Paid', 'Cancelled', 'Expired'], true)
    .setAllowInvalid(false)
    .setHelpText('Pending = reserved on the site, not yet confirmed by you')
    .build();
  var statusRange = bookingCol_('Status') + '2:' + bookingCol_('Status') + '5000';
  sh.getRange(statusRange).setDataValidation(statusRule);

  var ynRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Y', 'N'], true).setAllowInvalid(false).build();
  sh.getRange(bookingCol_('FollowerDiscount') + '2:' + bookingCol_('FollowerDiscount') + '5000')
    .setDataValidation(ynRule);

  sh.getRange(bookingCol_('Phone') + '2:' + bookingCol_('Phone') + '5000').setNumberFormat('@');
  sh.getRange(bookingCol_('SlotTime') + '2:' + bookingCol_('SlotTime') + '5000').setNumberFormat('@');
  sh.getRange(bookingCol_('Price') + '2:' + bookingCol_('Price') + '5000').setNumberFormat('#,##0');
  sh.getRange(bookingCol_('Total') + '2:' + bookingCol_('Total') + '5000').setNumberFormat('#,##0');

  var rules = [];
  var map = [['Pending', '#3A3000', '#FFD21F'], ['Confirmed', '#0F2A10', '#9BE28F'],
             ['Paid', '#0C2A2A', '#7FE3D4'], ['Cancelled', '#2A0F0F', '#FF9B9B'],
             ['Expired', '#1A1A1A', '#A0A0A0']];
  for (var i = 0; i < map.length; i++) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(map[i][0])
      .setBackground(map[i][1]).setFontColor(map[i][2])
      .setRanges([sh.getRange(statusRange)]).build());
  }
  sh.setConditionalFormatRules(rules);
  sh.setFrozenColumns(1);
}

/* ------------------------------- Blocked ----------------------------- */

function setupBlocked_(ss) {
  var sh = getOrCreate_(ss, 'Blocked');
  header_(sh, ['Date', 'CapacityOverride', 'Note']);
  sh.getRange('A2:A1000').setNumberFormat('yyyy-mm-dd');
  if (sh.getLastRow() < 2) {
    sh.getRange(2, 3).setValue('Leave CapacityOverride blank to close the day completely, or put a number to limit how many slots that day shows.');
    sh.getRange(2, 3).setFontColor('#A0A0A0');
  }
  sh.setColumnWidth(3, 460);
}

/* -------------------------------- Funnel ----------------------------- */

function setupFunnel_(ss) {
  var sh = getOrCreate_(ss, 'Funnel');
  header_(sh, ['Timestamp', 'SessionID', 'Event', 'Step', 'Language', 'UTM_Campaign']);
}

/* ----------------------------- Testimonials -------------------------- */

function setupTestimonials_(ss) {
  var sh = getOrCreate_(ss, 'Testimonials');
  header_(sh, ['Name', 'Text', 'Occasion', 'Active']);
  var ynRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Y', 'N'], true).setAllowInvalid(false).build();
  sh.getRange('D2:D1000').setDataValidation(ynRule);
  sh.setColumnWidth(2, 520);
  if (sh.getLastRow() < 2) {
    sh.getRange(1, 6).setValue('Only rows with Active = Y are shown on the site. Never add a testimonial you did not receive.');
    sh.getRange(1, 6).setFontColor('#A0A0A0');
  }
}

/* ------------------------------ Dashboard ---------------------------- */

function setupDashboard_(ss) {
  var sh = getOrCreate_(ss, 'Dashboard');
  sh.clear();
  sh.getRange('A1').setValue('TIMETOSHOOT DASHBOARD')
    .setFontSize(16).setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('A1:D1').setBackground('#111111');

  var S = bookingCol_('Status');        // status column letter
  var T = bookingCol_('Total');
  var C = bookingCol_('UTM_Campaign');
  var O = bookingCol_('Occasion');
  var D = bookingCol_('DeliveryDate');
  var M = bookingCol_('SlotTime');
  var N = bookingCol_('Name');
  var F = bookingCol_('FilmLength');
  var I = bookingCol_('BookingID');

  function count(status) { return '=COUNTIF(Bookings!' + S + ':' + S + ',"' + status + '")'; }
  function sum(status) {
    return '=SUMIF(Bookings!' + S + ':' + S + ',"' + status + '",Bookings!' + T + ':' + T + ')';
  }

  // Rows are written starting at row 3, so row 4 = first data row of each block.
  var block = [
    ['FUNNEL (all time)', '', 'RESERVATIONS BY STATUS', ''],                               // row 3
    ['Visits (page_view)', '=COUNTIF(Funnel!C:C,"page_view")', 'Pending (not yet confirmed)', count('Pending')],  // 4
    ['Unique sessions', '=IFERROR(COUNTA(UNIQUE(FILTER(Funnel!B2:B,Funnel!B2:B<>""))),0)', 'Confirmed', count('Confirmed')], // 5
    ['Form starts', '=COUNTIF(Funnel!C:C,"form_start")', 'Paid', count('Paid')],            // 6
    ['Reached film length', '=COUNTIF(Funnel!C:C,"step_3")', 'Cancelled', count('Cancelled')], // 7
    ['Reached calendar', '=COUNTIF(Funnel!C:C,"step_4")', 'Expired (hold ran out)', count('Expired')], // 8
    ['Picked a date', '=COUNTIF(Funnel!C:C,"date_selected")', 'Total rows', '=COUNTA(Bookings!' + I + '2:' + I + ')'], // 9
    ['Picked a time', '=COUNTIF(Funnel!C:C,"time_selected")', '', ''],                      // 10
    ['Slots reserved', '=COUNTIF(Funnel!C:C,"booking_created")', 'VALUE AT STAKE', ''],     // 11
    ['WhatsApp opened', '=COUNTIF(Funnel!C:C,"whatsapp_redirect")', 'Paid', sum('Paid')],   // 12
    ['CONVERSION', '', 'Confirmed, not yet paid', sum('Confirmed')],                        // 13
    ['Visit to form start', '=IFERROR(B6/B4,"")', 'Reserved, unconfirmed', sum('Pending')], // 14
    ['Form start to calendar', '=IFERROR(B8/B6,"")', 'Avg paid value', '=IFERROR(D12/D6,"")'], // 15
    ['Calendar to reservation', '=IFERROR(B11/B8,"")', 'To chase today', '=IFERROR(D13+D14,"")'], // 16
    ['Visit to reservation', '=IFERROR(B11/B4,"")', '', ''],                                // 17
    ['', '', '', ''],                                                                       // 18
    ['Slot-taken clashes', '=COUNTIF(Funnel!C:C,"slot_taken")', '', '']                     // 19
  ];
  sh.getRange(3, 1, block.length, 4).setValues(block);

  sh.getRange('A3').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('C3').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('A13').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('C11').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('A19').setFontWeight('bold');
  sh.getRange('B14:B17').setNumberFormat('0.0%');
  sh.getRange('D12:D16').setNumberFormat('₹#,##0');

  sh.getRange('A22').setValue('BY CAMPAIGN (reservations and value)').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('A23').setFormula(
    '=IFERROR(QUERY({Bookings!' + C + '2:' + C + ',Bookings!' + S + '2:' + S + ',Bookings!' + T + '2:' + T + '},' +
    '"select Col1, count(Col2), sum(Col3) where Col1 is not null and Col1 != \'\' ' +
    'group by Col1 order by count(Col2) desc ' +
    'label Col1 \'Campaign\', count(Col2) \'Reservations\', sum(Col3) \'Value\'",0),"No campaign data yet")'
  );

  sh.getRange('F22').setValue('BY OCCASION').setFontWeight('bold').setFontColor('#FFC700');
  sh.getRange('F23').setFormula(
    '=IFERROR(QUERY({Bookings!' + O + '2:' + O + ',Bookings!' + T + '2:' + T + '},' +
    '"select Col1, count(Col1), sum(Col2) where Col1 is not null and Col1 != \'\' ' +
    'group by Col1 order by count(Col1) desc ' +
    'label Col1 \'Occasion\', count(Col1) \'Reservations\', sum(Col2) \'Value\'",0),"No reservations yet")'
  );

  sh.getRange('A34').setValue('UPCOMING (Confirmed and Paid)').setFontWeight('bold').setFontColor('#FFC700');
  var heads = ['Date', 'Time', 'ID', 'Name', 'Length', 'Status'];
  sh.getRange(35, 1, 1, heads.length).setValues([heads]).setFontWeight('bold');
  sh.getRange('A36').setFormula(
    '=IFERROR(SORT(FILTER({Bookings!' + D + '2:' + D + ',Bookings!' + M + '2:' + M + ',' +
    'Bookings!' + I + '2:' + I + ',Bookings!' + N + '2:' + N + ',Bookings!' + F + '2:' + F + ',' +
    'Bookings!' + S + '2:' + S + '},' +
    'Bookings!' + D + '2:' + D + '<>"",(Bookings!' + S + '2:' + S + '="Confirmed")+(Bookings!' + S + '2:' + S + '="Paid")),1,TRUE),"Nothing confirmed yet")'
  );

  sh.getRange('A39').setValue('TO CHASE (reserved on the site, still Pending)').setFontWeight('bold').setFontColor('#FFC700');
  var heads2 = ['Date', 'Time', 'ID', 'Name', 'Phone'];
  sh.getRange(40, 1, 1, heads2.length).setValues([heads2]).setFontWeight('bold');
  sh.getRange('A41').setFormula(
    '=IFERROR(SORT(FILTER({Bookings!' + D + '2:' + D + ',Bookings!' + M + '2:' + M + ',' +
    'Bookings!' + I + '2:' + I + ',Bookings!' + N + '2:' + N + ',Bookings!' + bookingCol_('Phone') + '2:' + bookingCol_('Phone') + '},' +
    'Bookings!' + S + '2:' + S + '="Pending"),1,TRUE),"Nothing waiting")'
  );

  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 130);
  sh.setColumnWidth(3, 230);
  sh.setColumnWidth(4, 150);
  sh.setTabColor('#FFC700');
}

/** Creates the 15-minute trigger that expires stale holds. Run once. */
function createExpiryTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'expireHolds') ScriptApp.deleteTrigger(existing[i]);
  }
  ScriptApp.newTrigger('expireHolds').timeBased().everyMinutes(15).create();
  Logger.log('expireHolds trigger created (every 15 minutes).');
}
