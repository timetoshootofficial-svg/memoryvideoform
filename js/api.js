/* Timetoshoot — the one place that talks to Supabase.
 * ---------------------------------------------------------------------------
 * The page never touches a table. It calls five database functions, and they
 * decide what comes back. That is why the publishable key below is safe to
 * ship: with it you can ask tts_bootstrap for today's prices, and you can ask
 * tts_create_booking to hold a slot. You cannot read a customer, set your own
 * price, or write a row yourself.
 *
 * Every call answers with the same shape the page already understood:
 *   { ok: true, ... }  or  { ok: false, code: 'SLOT_TAKEN', message: '...' }
 * so a network failure and a refusal are handled in one place, here.
 */
(function (root) {
  'use strict';

  var CFG = root.TTS_CONFIG || {};

  function base() {
    return String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  }

  function ready() {
    var u = base();
    return u.indexOf('http') === 0 && u.indexOf('PASTE') === -1 && !!CFG.supabaseKey;
  }

  /* Supabase wants the key on every request. Sent as a header normally, and in
     the query string for the unload flush, where headers are unreliable. */
  function rpcUrl(fn, inUrlKey) {
    return base() + '/rest/v1/rpc/' + fn + (inUrlKey ? '?apikey=' + encodeURIComponent(CFG.supabaseKey) : '');
  }

  function headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': CFG.supabaseKey,
      'Authorization': 'Bearer ' + CFG.supabaseKey
    };
  }

  function fail(code, message) {
    return { ok: false, code: code, message: message || '' };
  }

  function call(fn, args, opts) {
    opts = opts || {};
    if (!ready()) return Promise.resolve(fail('NO_API', 'Backend is not configured.'));

    var init = {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args || {})
    };
    if (opts.keepalive) init.keepalive = true;

    var timer = null;
    if (opts.timeoutMs && typeof AbortController === 'function') {
      var ac = new AbortController();
      init.signal = ac.signal;
      timer = setTimeout(function () { try { ac.abort(); } catch (e) {} }, opts.timeoutMs);
    }

    return fetch(rpcUrl(fn, false), init)
      .then(function (r) {
        if (timer) clearTimeout(timer);
        return r.text().then(function (text) {
          var body = null;
          try { body = text ? JSON.parse(text) : null; } catch (e) {}
          if (!r.ok) {
            /* PostgREST explains itself in `message`; never show that raw. */
            return fail(r.status === 404 ? 'NOT_DEPLOYED' : 'HTTP_' + r.status,
                        (body && body.message) || '');
          }
          if (body && typeof body === 'object') return body;
          return fail('BAD_RESPONSE');
        });
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer);
        return fail(e && e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
      });
  }

  root.TTS_API = {
    ready: ready,

    /* Prices, rules and which slots are gone — one round trip. */
    bootstrap: function (from, to) {
      return call('tts_bootstrap', { p_from: from || null, p_to: to || null }, { timeoutMs: 12000 });
    },

    /* Anonymous funnel counters. Never blocks the page and never throws. */
    logEvents: function (events, unloading) {
      if (!ready() || !events || !events.length) return Promise.resolve({ ok: true, written: 0 });
      if (unloading) {
        /* On pagehide a normal fetch is cancelled. keepalive lets it finish. */
        try {
          fetch(rpcUrl('tts_log_events', true), {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ p_events: events }),
            keepalive: true,
            mode: 'cors'
          }).catch(function () {});
        } catch (e) {}
        return Promise.resolve({ ok: true });
      }
      return call('tts_log_events', { p_events: events }, { timeoutMs: 8000 });
    },

    createBooking: function (payload) {
      return call('tts_create_booking', { p: payload }, { timeoutMs: 20000 });
    },

    adminData: function (pin) {
      return call('tts_admin_data', { p_pin: pin }, { timeoutMs: 20000 });
    },

    adminSetStatus: function (pin, bookingId, status) {
      return call('tts_admin_set_status', { p_pin: pin, p_booking_id: bookingId, p_status: status },
                  { timeoutMs: 15000 });
    }
  };
}(typeof self !== 'undefined' ? self : this));
