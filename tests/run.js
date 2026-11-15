/* Timetoshoot — unit tests. No dependencies.
 * Run:  node tests/run.js
 */
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const L = require(path.join(__dirname, '..', 'js', 'logic.js'));

let pass = 0, fail = 0;
const results = [];
const queue = [];
/* Tests may be sync or async; the runner awaits every single one. */
function test(name, fn) { queue.push({ name: name, fn: fn }); }
function group(name) { queue.push({ group: name }); }

async function runAll() {
  for (const item of queue) {
    if (item.group) { results.push('\n' + item.group); continue; }
    try {
      await item.fn();
      pass++;
      results.push('  ✓ ' + item.name);
    } catch (e) {
      fail++;
      results.push('  ✗ ' + item.name + '\n      ' + (e && e.message ? e.message : e));
    }
  }
  console.log(results.join('\n'));
  console.log('\n' + (fail === 0 ? '✓ ' : '✗ ') + pass + ' passed, ' + fail + ' failed\n');
  if (fail) process.exit(1);
}

const CFG = {
  price_30s: 2999, price_1m: 4999, price_2m: 7999,
  follower_discount: 200,
  daily_capacity: 2,
  units_30s: 1, units_1m: 1, units_2m: 2,
  min_lead_days: 3, booking_window_days: 60, slot_hold_hours: 24,
  time_slots: ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM']
};
const TODAY = '2026-11-15';
const NOW = new Date('2026-11-15T10:00:00+05:30');

/* ============================ 1. PRICING ============================ */
group('Price calculation');

test('30s base price, no discount', () => {
  assert.deepStrictEqual(L.calcPrice(CFG, '30s', false), { base: 2999, discount: 0, total: 2999 });
});

test('1m with follower discount', () => {
  assert.deepStrictEqual(L.calcPrice(CFG, '1m', true), { base: 4999, discount: 200, total: 4799 });
});

test('2m with follower discount', () => {
  assert.deepStrictEqual(L.calcPrice(CFG, '2m', true), { base: 7999, discount: 200, total: 7799 });
});

test('discount never exceeds the price', () => {
  const cheap = Object.assign({}, CFG, { price_30s: 150 });
  assert.deepStrictEqual(L.calcPrice(cheap, '30s', true), { base: 150, discount: 150, total: 0 });
});

test('negative or junk discount is ignored', () => {
  const bad = Object.assign({}, CFG, { follower_discount: -500 });
  assert.strictEqual(L.calcPrice(bad, '1m', true).total, 4999);
  const junk = Object.assign({}, CFG, { follower_discount: 'abc' });
  assert.strictEqual(L.calcPrice(junk, '1m', true).total, 4999);
});

test('prices come from config, not from code', () => {
  const changed = Object.assign({}, CFG, { price_1m: 6500 });
  assert.strictEqual(L.calcPrice(changed, '1m', false).total, 6500);
});

test('unknown length prices at zero rather than guessing', () => {
  assert.deepStrictEqual(L.calcPrice(CFG, '5m', false), { base: 0, discount: 0, total: 0 });
});

/* ============================== 2. UNITS ============================ */
group('Capacity units (2 min = double weight)');

test('30s and 1m take one unit, 2m takes two', () => {
  assert.strictEqual(L.unitsFor(CFG, '30s'), 1);
  assert.strictEqual(L.unitsFor(CFG, '1m'), 1);
  assert.strictEqual(L.unitsFor(CFG, '2m'), 2);
});

test('a 2m film fills a capacity-2 day on its own', () => {
  const bookings = [{ deliveryDate: '2026-11-25', units: 2, status: 'Confirmed' }];
  assert.strictEqual(L.slotsLeft('2026-11-25', bookings, {}, 2, NOW), 0);
});

test('two 1m films fill a capacity-2 day', () => {
  const bookings = [
    { deliveryDate: '2026-11-25', units: 1, status: 'Confirmed' },
    { deliveryDate: '2026-11-25', units: 1, status: 'Paid' }
  ];
  assert.strictEqual(L.slotsLeft('2026-11-25', bookings, {}, 2, NOW), 0);
});

test('one slot left is not enough for a 2m film', () => {
  const bookings = [{ deliveryDate: '2026-11-25', units: 1, status: 'Paid' }];
  const left = L.slotsLeft('2026-11-25', bookings, {}, 2, NOW);
  assert.strictEqual(left, 1);
  assert.strictEqual(L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 2, slotsLeft: left
  }).selectable, false);
  assert.strictEqual(L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: left
  }).selectable, true);
});

/* ============================ 3. CAPACITY =========================== */
group('Capacity and Blocked overrides');

test('no override uses daily_capacity', () => {
  assert.strictEqual(L.capacityFor('2026-11-25', {}, 2), 2);
});

test('blank override means the day is fully blocked', () => {
  assert.strictEqual(L.capacityFor('2026-11-25', { '2026-11-25': null }, 2), 0);
  assert.strictEqual(L.capacityFor('2026-11-25', { '2026-11-25': '' }, 2), 0);
});

test('numeric override replaces daily_capacity, up and down', () => {
  assert.strictEqual(L.capacityFor('2026-11-25', { '2026-11-25': 4 }, 2), 4);
  assert.strictEqual(L.capacityFor('2026-11-25', { '2026-11-25': 1 }, 2), 1);
  assert.strictEqual(L.capacityFor('2026-11-25', { '2026-11-25': 0 }, 2), 0);
});

test('override only affects its own date', () => {
  const blocked = { '2026-11-25': 0 };
  assert.strictEqual(L.capacityFor('2026-11-26', blocked, 2), 2);
});

/* =========================== 4. HOLD EXPIRY ========================= */
group('Hold expiry');

test('Confirmed and Paid always hold the slot', () => {
  assert.strictEqual(L.holdsSlot('Confirmed', null, NOW), true);
  assert.strictEqual(L.holdsSlot('Paid', null, NOW), true);
});

test('Pending with a future hold still blocks the slot', () => {
  assert.strictEqual(L.holdsSlot('Pending', '2026-11-16T10:00:00+05:30', NOW), true);
});

test('Pending with an expired hold frees the slot', () => {
  assert.strictEqual(L.holdsSlot('Pending', '2026-11-15T09:59:00+05:30', NOW), false);
});

test('Pending with no hold date does not block', () => {
  assert.strictEqual(L.holdsSlot('Pending', '', NOW), false);
  assert.strictEqual(L.holdsSlot('Pending', 'not a date', NOW), false);
});

test('Cancelled and Expired never block', () => {
  assert.strictEqual(L.holdsSlot('Cancelled', '2099-01-01T00:00:00Z', NOW), false);
  assert.strictEqual(L.holdsSlot('Expired', '2099-01-01T00:00:00Z', NOW), false);
});

test('an expired hold returns the slot to the calendar', () => {
  const bookings = [
    { deliveryDate: '2026-11-25', units: 1, status: 'Pending', holdUntil: '2026-11-15T09:00:00+05:30' },
    { deliveryDate: '2026-11-25', units: 1, status: 'Pending', holdUntil: '2026-11-16T09:00:00+05:30' }
  ];
  assert.strictEqual(L.slotsLeft('2026-11-25', bookings, {}, 2, NOW), 1);
});

/* ============================ 5. LEAD TIME ========================== */
group('Lead time and booking window');

test('today is never selectable', () => {
  assert.strictEqual(L.evaluateDate(TODAY, {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 2
  }).reason, 'lead_time');
});

test('the day before the lead-time edge is rejected', () => {
  assert.strictEqual(L.evaluateDate('2026-11-17', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 2
  }).reason, 'lead_time');
});

test('exactly today + min_lead_days is allowed', () => {
  assert.strictEqual(L.evaluateDate('2026-11-18', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 2
  }).selectable, true);
});

test('min_lead_days of 0 allows tomorrow and today', () => {
  assert.strictEqual(L.evaluateDate(TODAY, {
    today: TODAY, minLeadDays: 0, bookingWindowDays: 60, units: 1, slotsLeft: 1
  }).selectable, true);
});

test('the last day of the window is allowed, the next is not', () => {
  assert.strictEqual(L.evaluateDate(L.addDays(TODAY, 60), {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 1
  }).selectable, true);
  assert.strictEqual(L.evaluateDate(L.addDays(TODAY, 61), {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 1
  }).reason, 'out_of_window');
});

test('a full day reports full, not lead_time', () => {
  assert.strictEqual(L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1, slotsLeft: 0
  }).reason, 'full');
});

/* ========================== 6. EVENT-DATE RULE ====================== */
group('Delivery must land before the event');

test('delivery after the event is rejected', () => {
  assert.strictEqual(L.evaluateDate('2026-11-27', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '2026-11-25', units: 1, slotsLeft: 2
  }).reason, 'after_event');
});

test('delivery on the event day itself is rejected', () => {
  assert.strictEqual(L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '2026-11-25', units: 1, slotsLeft: 2
  }).reason, 'after_event');
});

test('delivery the day before the event is allowed and marked best', () => {
  const r = L.evaluateDate('2026-11-24', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '2026-11-25', units: 1, slotsLeft: 2
  });
  assert.strictEqual(r.selectable, true);
  assert.strictEqual(r.best, true);
});

test('1 to 3 days before the event is the sweet spot, 4 is not', () => {
  const mk = d => L.evaluateDate(d, {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '2026-11-25', units: 1, slotsLeft: 2
  });
  assert.strictEqual(mk('2026-11-22').best, true);   // 3 days before
  assert.strictEqual(mk('2026-11-21').best, false);  // 4 days before
  assert.strictEqual(mk('2026-11-21').selectable, true);
});

test('no event date means no best highlighting and no event rule', () => {
  const r = L.evaluateDate('2026-12-20', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '', units: 1, slotsLeft: 1
  });
  assert.strictEqual(r.selectable, true);
  assert.strictEqual(r.best, false);
});

test('an event inside the lead-time window leaves nothing selectable', () => {
  const avail = [];
  for (let i = 0; i <= 10; i++) avail.push({ date: L.addDays(TODAY, i), slotsLeft: 2, capacity: 2 });
  const cal = L.buildCalendar(avail, {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, eventDate: '2026-11-17', units: 1
  });
  assert.strictEqual(L.hasAnySelectable(cal), false);
});

/* =========================== 7. CALENDAR BUILD ====================== */
group('Calendar model');

test('a 2m film hides days that only have one unit free', () => {
  const avail = [
    { date: '2026-11-20', slotsLeft: 1, capacity: 2 },
    { date: '2026-11-21', slotsLeft: 2, capacity: 2 }
  ];
  const cal = L.buildCalendar(avail, { today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 2 });
  assert.strictEqual(cal[0].selectable, false);
  assert.strictEqual(cal[0].reason, 'full');
  assert.strictEqual(cal[1].selectable, true);
});

test('the same days are open for a 1m film', () => {
  const avail = [{ date: '2026-11-20', slotsLeft: 1, capacity: 2 }];
  const cal = L.buildCalendar(avail, { today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1 });
  assert.strictEqual(cal[0].selectable, true);
  assert.strictEqual(cal[0].slotsLeft, 1);
});

/* ========================= 8. PHONE VALIDATION ====================== */
group('Indian mobile validation');

const goodPhones = [
  ['9876543210', '9876543210'],
  ['+919876543210', '9876543210'],
  ['+91 98765 43210', '9876543210'],
  ['0091 9876543210', '9876543210'],
  ['09876543210', '9876543210'],
  ['91-98765-43210', '9876543210'],
  ['  7448326503  ', '7448326503'],
  ['6012345678', '6012345678']
];
goodPhones.forEach(([input, expected]) => {
  test('accepts ' + JSON.stringify(input), () => {
    assert.strictEqual(L.normalizePhone(input), expected);
    assert.strictEqual(L.isValidPhone(input), true);
  });
});

const badPhones = ['', '12345', '5876543210', '1234567890', '98765 4321', '98765432101',
  'abcdefghij', '+1 415 555 0132', '0000000000', null, undefined, '+91 5876543210'];
badPhones.forEach(input => {
  test('rejects ' + JSON.stringify(input), () => {
    assert.strictEqual(L.isValidPhone(input), false);
  });
});

test('name needs two real letters, English or Tamil', () => {
  assert.strictEqual(L.isValidName('Priya'), true);
  assert.strictEqual(L.isValidName('கீர்தி'), true);
  assert.strictEqual(L.isValidName('A'), false);
  assert.strictEqual(L.isValidName('123456'), false);
  assert.strictEqual(L.isValidName('   '), false);
});

/* ========================== 9. RESERVATION RULES ==================== */
group('Reservation rules');

function store(bookings, blocked) {
  return { config: CFG, today: TODAY, now: NOW, bookings: bookings || [], blocked: blocked || {} };
}

test('a clean request is accepted', () => {
  const r = L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: '2026-11-25', eventDate: '2026-11-28',
    filmLength: '1m', slotTime: '11:00 AM'
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.units, 1);
});

test('the same phone, date and time twice is a duplicate', () => {
  const existing = [{
    bookingId: 'TTS-0001', phone: '9876543210', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '1:00 PM', filmLength: '1m', units: 1,
    status: 'Pending', holdUntil: '2026-11-16T10:00:00+05:30'
  }];
  /* a different time is fine */
  assert.strictEqual(L.checkReservation(store(existing), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '4:00 PM'
  }).ok, true);
  /* the same time is not */
  const r = L.checkReservation(store(existing), {
    phone: '+91 98765 43210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM'
  });
  assert.ok(r.code === 'DUPLICATE' || r.code === 'SLOT_TAKEN');
});

test('a cancelled booking does not count as a duplicate', () => {
  const existing = [{
    bookingId: 'TTS-0001', phone: '9876543210', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '1:00 PM', filmLength: '1m', units: 1, status: 'Cancelled'
  }];
  const r = L.checkReservation(store(existing), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM'
  });
  assert.strictEqual(r.ok, true);
});

test('a fourth booking from one phone on one day is refused', () => {
  const existing = [];
  for (let i = 0; i < 3; i++) {
    existing.push({
      bookingId: 'TTS-000' + (i + 1), phone: '9876543210', createdAt: TODAY,
      deliveryDate: L.addDays('2026-11-25', i), filmLength: '1m', units: 1, status: 'Cancelled'
    });
  }
  const r = L.checkReservation(store(existing), {
    phone: '9876543210', deliveryDate: '2026-12-10', filmLength: '1m', slotTime: '11:00 AM'
  });
  assert.strictEqual(r.code, 'RATE_LIMIT');
});

test('bookings made on earlier days do not count toward the daily limit', () => {
  const existing = [];
  for (let i = 0; i < 3; i++) {
    existing.push({
      bookingId: 'TTS-000' + (i + 1), phone: '9876543210', createdAt: '2026-11-01',
      deliveryDate: L.addDays('2026-11-25', i), filmLength: '1m', units: 1, status: 'Cancelled'
    });
  }
  assert.strictEqual(L.checkReservation(store(existing), {
    phone: '9876543210', deliveryDate: '2026-12-10', filmLength: '1m', slotTime: '11:00 AM'
  }).ok, true);
});

test('a blocked day cannot be reserved', () => {
  const r = L.checkReservation(store([], { '2026-11-25': null }), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '11:00 AM'
  });
  assert.strictEqual(r.code, 'SLOT_TAKEN');
});

test('rules are enforced even if the browser sends a bad date', () => {
  assert.strictEqual(L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: TODAY, filmLength: '1m', slotTime: '11:00 AM'
  }).code, 'LEAD_TIME');
  assert.strictEqual(L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: '2026-11-25', eventDate: '2026-11-20',
    filmLength: '1m', slotTime: '11:00 AM'
  }).code, 'AFTER_EVENT');
  assert.strictEqual(L.checkReservation(store(), {
    phone: '555', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '11:00 AM'
  }).code, 'BAD_PHONE');
  assert.strictEqual(L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '10m', slotTime: '11:00 AM'
  }).code, 'BAD_LENGTH');
  assert.strictEqual(L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '9:00 PM'
  }).code, 'BAD_TIME', 'a time that is not in Config must be refused');
  assert.strictEqual(L.checkReservation(store(), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: ''
  }).code, 'BAD_TIME');
});

test('booking IDs are sequential and zero padded', () => {
  assert.strictEqual(L.nextBookingId(0), 'TTS-0001');
  assert.strictEqual(L.nextBookingId(41), 'TTS-0042');
  assert.strictEqual(L.nextBookingId(999), 'TTS-1000');
});

/* ====================== 10. CONCURRENT LAST SLOT ==================== */
group('Two people, one last slot');

/* A miniature Apps Script: a sheet, a lock, and the same decision function.
 * Each await is a point where the other request could interleave. */
function makeServer(opts) {
  const useLock = !opts || opts.useLock !== false;
  const sheet = { rows: [], seq: 0 };
  let locked = false;
  const waiters = [];

  function acquire() {
    if (!useLock) return Promise.resolve();
    if (!locked) { locked = true; return Promise.resolve(); }
    return new Promise(res => waiters.push(res));
  }
  function release() {
    if (!useLock) return;
    const next = waiters.shift();
    if (next) next(); else locked = false;
  }
  const tick = () => new Promise(res => setImmediate(res));

  async function createBooking(req) {
    await acquire();
    try {
      await tick();                                  // read the sheet (async in real life)
      const decision = L.checkReservation({
        config: CFG, today: TODAY, now: NOW,
        bookings: sheet.rows, blocked: {}
      }, req);
      await tick();                                  // generate the ID
      if (!decision.ok) return decision;
      sheet.seq += 1;
      const id = L.nextBookingId(sheet.seq - 1);
      await tick();                                  // append the row
      sheet.rows.push({
        bookingId: id, phone: L.normalizePhone(req.phone), createdAt: TODAY,
        deliveryDate: req.deliveryDate, slotTime: req.slotTime,
        filmLength: req.filmLength,
        units: L.unitsFor(CFG, req.filmLength), status: 'Pending',
        holdUntil: new Date(NOW.getTime() + CFG.slot_hold_hours * 3600000).toISOString()
      });
      return { ok: true, bookingId: id };
    } finally {
      release();
    }
  }
  return { createBooking, sheet };
}

test('with LockService, only one of two simultaneous bookings wins the last slot', async () => {
  const srv = makeServer();
  /* one unit already used on a capacity-2 day, so exactly one slot is left */
  srv.sheet.rows.push({
    bookingId: 'TTS-0001', phone: '9000000000', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '11:00 AM', filmLength: '1m', units: 1, status: 'Confirmed'
  });
  srv.sheet.seq = 1;

  /* both want the SAME remaining time slot */
  const [a, b] = await Promise.all([
    srv.createBooking({ phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM' }),
    srv.createBooking({ phone: '9123456789', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM' })
  ]);

  const winners = [a, b].filter(r => r.ok);
  const losers = [a, b].filter(r => !r.ok);
  assert.strictEqual(winners.length, 1, 'exactly one booking should succeed');
  assert.strictEqual(losers.length, 1, 'exactly one booking should be refused');
  assert.strictEqual(losers[0].code, 'SLOT_TAKEN');
  assert.strictEqual(srv.sheet.rows.length, 2, 'only one row may be written');
  assert.strictEqual(L.takenTimesForDate(srv.sheet.rows, '2026-11-25', NOW).length, 2);
  assert.notStrictEqual(winners[0].bookingId, 'TTS-0001');
});

test('without the lock the same race double-books, which is why the lock is there', async () => {
  const srv = makeServer({ useLock: false });
  srv.sheet.rows.push({
    bookingId: 'TTS-0001', phone: '9000000000', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '11:00 AM', filmLength: '1m', units: 1, status: 'Confirmed'
  });
  srv.sheet.seq = 1;

  const [a, b] = await Promise.all([
    srv.createBooking({ phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM' }),
    srv.createBooking({ phone: '9123456789', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM' })
  ]);
  assert.strictEqual([a, b].filter(r => r.ok).length, 2, 'both get in without the lock');
  const at1pm = srv.sheet.rows.filter(r => r.slotTime === '1:00 PM');
  assert.strictEqual(at1pm.length, 2, 'the same time is double-booked');
});

test('three people chasing two slots: two win, one is refused', async () => {
  const srv = makeServer();
  const out = await Promise.all([
    srv.createBooking({ phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '11:00 AM' }),
    srv.createBooking({ phone: '9123456789', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM' }),
    srv.createBooking({ phone: '9555555555', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '4:00 PM' })
  ]);
  assert.strictEqual(out.filter(r => r.ok).length, 2);
  assert.strictEqual(out.filter(r => r.code === 'SLOT_TAKEN').length, 1);
  assert.deepStrictEqual(out.filter(r => r.ok).map(r => r.bookingId).sort(), ['TTS-0001', 'TTS-0002']);
});

test('a 2m film and a 1m film racing for a capacity-2 day: only one fits', async () => {
  const srv = makeServer();
  srv.sheet.rows.push({
    bookingId: 'TTS-0001', phone: '9000000000', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '11:00 AM', filmLength: '1m', units: 1, status: 'Paid'
  });
  srv.sheet.seq = 1;
  const [big, small] = await Promise.all([
    srv.createBooking({ phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '2m', slotTime: '1:00 PM' }),
    srv.createBooking({ phone: '9123456789', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '4:00 PM' })
  ]);
  assert.strictEqual(big.ok, false, '2m needs 2 units and only 1 is left');
  assert.strictEqual(big.code, 'SLOT_TAKEN');
  assert.strictEqual(small.ok, true);
});

/* =========================== 10b. TIME SLOTS ======================== */
group('Time slots');

const SLOTS = ['11:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'];

test('every slot is free when nothing is booked', () => {
  const t = L.timesForDate(SLOTS, [], '2026-11-25', NOW);
  assert.strictEqual(t.length, 4);
  assert.strictEqual(L.countFreeTimes(t), 4);
});

test('a held booking marks only its own time as taken', () => {
  const bookings = [{ deliveryDate: '2026-11-25', slotTime: '1:00 PM', status: 'Confirmed', units: 1 }];
  const t = L.timesForDate(SLOTS, bookings, '2026-11-25', NOW);
  assert.deepStrictEqual(t.map(x => x.taken), [false, true, false, false]);
  assert.strictEqual(L.countFreeTimes(t), 3);
});

test('an expired hold releases its time again', () => {
  const bookings = [{
    deliveryDate: '2026-11-25', slotTime: '1:00 PM', status: 'Pending',
    holdUntil: '2026-11-15T09:00:00+05:30', units: 1
  }];
  assert.strictEqual(L.isTimeTaken(bookings, '2026-11-25', '1:00 PM', NOW), false);
  assert.strictEqual(L.countFreeTimes(L.timesForDate(SLOTS, bookings, '2026-11-25', NOW)), 4);
});

test('a time taken on one date is still free on another', () => {
  const bookings = [{ deliveryDate: '2026-11-25', slotTime: '1:00 PM', status: 'Paid', units: 1 }];
  assert.strictEqual(L.isTimeTaken(bookings, '2026-11-26', '1:00 PM', NOW), false);
});

test('a day with capacity left but no free times is full', () => {
  const r = L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1,
    slotsLeft: 5, freeTimes: 0
  });
  assert.strictEqual(r.selectable, false);
  assert.strictEqual(r.reason, 'full');
});

test('a day with free times but no capacity left is also full', () => {
  const r = L.evaluateDate('2026-11-25', {
    today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1,
    slotsLeft: 0, freeTimes: 4
  });
  assert.strictEqual(r.reason, 'full');
});

test('the count shown is whichever runs out first, capacity or times', () => {
  const avail = [
    { date: '2026-11-25', capacity: 4, used: 0, slotsLeft: 4,
      times: [{ time: '11:00 AM', taken: true }, { time: '1:00 PM', taken: true },
              { time: '4:00 PM', taken: false }, { time: '7:00 PM', taken: false }] },
    { date: '2026-11-26', capacity: 4, used: 3, slotsLeft: 1,
      times: SLOTS.map(x => ({ time: x, taken: false })) }
  ];
  const cal = L.buildCalendar(avail, { today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1 });
  assert.strictEqual(cal[0].slotsLeft, 2, 'two time slots left, so show 2');
  assert.strictEqual(cal[1].slotsLeft, 1, 'one capacity unit left, so show 1');
  assert.strictEqual(cal[0].selectable, true);
  assert.strictEqual(cal[1].selectable, true);
});

test('a fully booked day is not selectable and keeps its times for display', () => {
  const avail = [{
    date: '2026-11-25', capacity: 4, used: 4, slotsLeft: 0,
    times: SLOTS.map(x => ({ time: x, taken: true }))
  }];
  const cal = L.buildCalendar(avail, { today: TODAY, minLeadDays: 3, bookingWindowDays: 60, units: 1 });
  assert.strictEqual(cal[0].selectable, false);
  assert.strictEqual(cal[0].reason, 'full');
  assert.strictEqual(cal[0].times.length, 4);
});

test('reserving a time that is already held is refused', () => {
  const bookings = [{
    bookingId: 'TTS-0001', phone: '9000000000', createdAt: '2026-11-10',
    deliveryDate: '2026-11-25', slotTime: '1:00 PM', filmLength: '1m',
    units: 1, status: 'Confirmed'
  }];
  assert.strictEqual(L.checkReservation(store(bookings), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '1:00 PM'
  }).code, 'SLOT_TAKEN');
  assert.strictEqual(L.checkReservation(store(bookings), {
    phone: '9876543210', deliveryDate: '2026-11-25', filmLength: '1m', slotTime: '4:00 PM'
  }).ok, true);
});

/* ============================ 11. PROJECT =========================== */
group('Project wiring');

/** require() caches modules, so force a fresh evaluation each time. */
function loadI18n() {
  const file = path.join(__dirname, '..', 'js', 'i18n.js');
  delete require.cache[require.resolve(file)];
  global.window = {};
  require(file);
  return global.window.TTS_I18N;
}

test('every English string has a Tamil translation', () => {
  const dict = loadI18n();
  const en = Object.keys(dict.en);
  const ta = Object.keys(dict.ta);
  const missing = en.filter(k => ta.indexOf(k) === -1);
  assert.deepStrictEqual(missing, [], 'missing Tamil keys: ' + missing.join(', '));
  const extra = ta.filter(k => en.indexOf(k) === -1);
  assert.deepStrictEqual(extra, [], 'extra Tamil keys: ' + extra.join(', '));
});

test('every string the page asks for exists in both languages', () => {
  const dict = loadI18n();
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const used = new Set();
  let m;
  const attr = /data-i18n(?:-ph)?="([a-z0-9_]+)"/g;
  while ((m = attr.exec(html))) used.add(m[1]);
  const call = /\bt\(\s*'([a-z0-9_]+)'/g;
  while ((m = call.exec(html))) used.add(m[1]);

  assert.ok(used.size > 50, 'should have found the page strings, found ' + used.size);
  const missingEn = [...used].filter(k => dict.en[k] === undefined);
  const missingTa = [...used].filter(k => dict.ta[k] === undefined);
  assert.deepStrictEqual(missingEn, [], 'English keys the page uses but i18n lacks');
  assert.deepStrictEqual(missingTa, [], 'Tamil keys the page uses but i18n lacks');
});

test('every element id the page script touches exists in the markup', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const markup = html.slice(0, html.indexOf('<script src="js/config.js">'));
  const ids = new Set();
  let m;
  const idAttr = /\sid="([A-Za-z0-9_-]+)"/g;
  while ((m = idAttr.exec(markup))) ids.add(m[1]);

  const used = new Set();
  const sel = /\\$\('#([A-Za-z0-9_-]+)'/g;
  while ((m = sel.exec(html))) used.add(m[1]);

  const missing = [...used].filter(id => !ids.has(id));
  assert.deepStrictEqual(missing, [], 'script selects #ids that are not in the markup');
});

test('index.html loads the three script files that exist on disk', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ['js/config.js', 'js/i18n.js', 'js/logic.js'].forEach(f => {
    assert.ok(html.indexOf('src="' + f + '"') !== -1, 'index.html should load ' + f);
    assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f + ' should exist');
  });
});

test('no real secret is committed', () => {
  /* The Apps Script URL and apiToken ARE meant to be here: a static site has
     no server to hide them in, they ship in every visitor's page source, and
     Apps Script re-validates everything they can reach. What must never land
     in this repo is anything that grants account access. */
  const files = ['index.html', 'js/config.js', 'js/logic.js', 'js/i18n.js',
                 'README.md', 'CHECKLIST.md', '.env.example'];
  const forbidden = [
    [/gh[pousr]_[A-Za-z0-9]{20,}/, 'a GitHub token'],
    [/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/, 'a Google Sheet ID'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
    [/"type":\s*"service_account"/, 'a Google service account key'],
    [/AIza[0-9A-Za-z_-]{30,}/, 'a Google API key']
  ];
  files.forEach(f => {
    const full = path.join(__dirname, '..', f);
    if (!fs.existsSync(full)) return;
    const src = fs.readFileSync(full, 'utf8');
    forbidden.forEach(([re, what]) => {
      assert.ok(!re.test(src), f + ' must not contain ' + what);
    });
  });
});

test('the live Apps Script endpoint is wired up', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  assert.ok(!/PASTE_YOUR/.test(src), 'config.js still has placeholders — the site cannot reach the Sheet');
  assert.ok(/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(src), 'apiUrl should be an Apps Script /exec URL');
  assert.ok(/apiToken:\s*'[A-Za-z0-9_-]{16,}'/.test(src), 'apiToken should be set');
});

test('the page never writes 48 hours anywhere', () => {
  ['index.html', 'js/i18n.js', 'js/config.js'].forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/48\s*(hours|hrs|hour|மணி)/i.test(src), f + ' should not promise 48 hours');
  });
});

/* ============================== REPORT ============================== */
runAll();
