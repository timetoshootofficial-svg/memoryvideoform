'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SiteConfig, BookingSuccess, FilmLength } from '@/lib/types';
import { makeT, type Lang, type StringKey } from '@/lib/i18n';
import * as L from '@/lib/logic';
import { inr, waUrl } from '@/lib/format';
import { useFunnel, sessionId } from './useFunnel';

const OCCASIONS = [
  { v: 'Anniversary',           k: 'occ_anniversary', icon: 'heart'  },
  { v: 'Birthday',              k: 'occ_birthday',    icon: 'cake'   },
  { v: 'Birth memory gift',     k: 'occ_birth',       icon: 'baby'   },
  { v: 'Tribute to loved ones', k: 'occ_tribute',     icon: 'candle' },
  { v: 'Other',                 k: 'occ_other',       icon: 'clap'   },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  heart:  <path d="M12 21s-7-4.6-7-9.6A4.4 4.4 0 0112 8.4 4.4 4.4 0 0119 11.4c0 5-7 9.6-7 9.6z" />,
  cake:   <path d="M4 20h16M5 20v-6h14v6M8 14V9m4 5V9m4 5V9M8 6V4m4 2V4m4 2V4" />,
  baby:   <><circle cx="12" cy="9" r="4" /><path d="M5 21a7 7 0 0114 0" /></>,
  candle: <path d="M10 21h4M12 21v-7M12 14a3 3 0 003-3c0-2-3-5-3-5S9 9 9 11a3 3 0 003 3z" />,
  clap:   <path d="M3 9l18-4M3 9l2 11h14l2-11H3zM8 5.8l1 3.2M13 4.7l1 3.2" />,
};

const LAST_STEP = 3;
const RESULT_STEP = 4;

interface Data {
  name: string; phone: string;
  occasion: string; eventDate: string;
  filmLength: string; follower: boolean;
}

/**
 * Three steps, then WhatsApp.
 *
 * There used to be a fourth: a calendar where people picked a delivery date
 * and an hour, and the slot was held for them. Two thirds of everyone who got
 * that far left without finishing. Nobody buying a film for their parents'
 * anniversary knows which Tuesday they want it, and being asked made them
 * stop. The real date is settled in the conversation, so the form no longer
 * pretends to settle it.
 */
export default function BookingForm({ config, lang }: { config: SiteConfig; lang: Lang }) {
  const t = makeT(lang);
  const lengths = useMemo(() => L.availableLengths(config), [config]);
  const cheapest = useMemo(
    () => lengths.slice().sort((a, b) => L.basePrice(config, a) - L.basePrice(config, b))[0] ?? '',
    [lengths, config],
  );

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<number, string>>({});
  const [booking, setBooking] = useState<BookingSuccess | null>(null);
  const [data, setData] = useState<Data>({
    name: '', phone: '',
    occasion: '', eventDate: '',
    /* The CHEAPEST length, always. The advertisement quotes the lowest price,
       so anyone arriving from it must find that price here. Landing on the
       most-chosen package instead meant a visitor who clicked ₹2,999 met
       ₹4,999 on the step where the price first appears, and left.

       Cheapest by PRICE, not by duration: the two happen to agree today, but
       a price change in the config table should not quietly move the default. */
    filmLength: cheapest,
    follower: false,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  /* Refs so the unload listener reads the latest values, not the ones it
     closed over when it was attached. */
  const dataRef = useRef<Data>(null as unknown as Data);
  const stepRef = useRef(1);
  const hpRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const { track, flush, utm } = useFunnel(lang);

  /* Sent as they move, so a number typed on step one reaches the Leads tab
     whether or not they ever press Book now. It is fire and forget: the form
     does not wait for it and never shows an error if it fails. */
  const saved = useRef('');
  const capture = (step: number, d: Data) => {
    const sig = `${step}|${d.name}|${d.phone}|${d.occasion}|${d.filmLength}|${d.follower}`;
    if (saved.current === sig) return;
    saved.current = sig;
    try {
      fetch('/api/partial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId(), step,
          name: d.name, phone: d.phone, occasion: d.occasion, eventDate: d.eventDate,
          filmLength: d.filmLength, follower: String(d.follower),
          price: L.calcPrice(config, d.filmLength, d.follower).total,
          language: lang,
          utm_source: utm.current.utm_source ?? '', utm_medium: utm.current.utm_medium ?? '',
          utm_campaign: utm.current.utm_campaign ?? '', utm_content: utm.current.utm_content ?? '',
          ad_id: utm.current.ad_id ?? utm.current.adset_id ?? '',
          fbclid: utm.current.fbclid ?? '', referrer: utm.current.referrer ?? '',
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* never let capture break the form */ }
  };

  const set = (patch: Partial<Data>) => setData((d) => ({ ...d, ...patch }));
  dataRef.current = data;
  stepRef.current = step;
  const today = config.today;
  const price = L.calcPrice(config, data.filmLength, data.follower);

  /* The funnel chart counts form_start, so it fires the first time someone
     actually types, not when the section scrolls into view. */
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    track('form_start', 1);
  };

  const goStep = (n: number, skipTrack = false) => {
    setStep(n);
    if (!skipTrack) track(`step_${n}`, n);
    requestAnimationFrame(() => {
      const el = cardRef.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    });
  };

  const fail = (n: number, msg: string) => { setErr({ [n]: msg }); return false; };

  function validate(n: number): boolean {
    if (n === 1) {
      if (!L.isValidName(data.name)) return fail(1, t('err_name'));
      if (!L.isValidPhone(data.phone)) return fail(1, t('err_phone'));
    }
    if (n === 2) {
      if (!OCCASIONS.some((o) => o.v === data.occasion)) return fail(2, t('err_occasion'));
      if (data.eventDate && data.eventDate <= today) return fail(2, t('err_event_past'));
    }
    setErr({});
    return true;
  }

  const next = (from: number) => {
    if (!validate(from)) return;
    capture(from + 1, data);
    goStep(from + 1);
  };

  /* They may change the length, or tick the follower box, and then leave
     without pressing the button. That is still worth knowing. */
  useEffect(() => {
    if (step !== LAST_STEP) return;
    const id = setTimeout(() => capture(LAST_STEP, data), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data.filmLength, data.follower]);

  /* And if they close the tab mid-step, take what there is. */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && dataRef.current.phone) {
        capture(stepRef.current, dataRef.current);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lenLabel = (code: string) => t(`len_${code}` as StringKey);
  const lenShort = (code: string) => t(`len_${code}_short` as StringKey);
  const occName = (v: string) => {
    const o = OCCASIONS.find((x) => x.v === v);
    return o ? t(o.k) : '—';
  };
  const isTribute = data.occasion === 'Tribute to loved ones';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!validate(1)) { goStep(1); return; }
    if (!validate(2)) { goStep(2); return; }

    setBusy(true);
    setErr({});
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId(),
          name: data.name, phone: data.phone, consent: 'true',
          occasion: data.occasion, eventDate: data.eventDate,
          filmLength: data.filmLength, follower: String(data.follower),
          honeypot: hpRef.current?.value ?? '', language: lang,
          utm_source: utm.current.utm_source ?? '', utm_medium: utm.current.utm_medium ?? '',
          utm_campaign: utm.current.utm_campaign ?? '', utm_content: utm.current.utm_content ?? '',
          ad_id: utm.current.ad_id ?? utm.current.adset_id ?? '',
          fbclid: utm.current.fbclid ?? '', referrer: utm.current.referrer ?? '',
        }),
      });
      const j = await res.json();

      if (!j?.ok) {
        const code = j?.code ?? '';
        if (code === 'RATE_LIMIT') return fail(LAST_STEP, t('err_rate_limit'));
        if (code === 'BAD_PHONE')  return fail(LAST_STEP, t('err_phone'));
        if (code === 'NETWORK' || code === 'TIMEOUT') return fail(LAST_STEP, t('err_offline'));
        return fail(LAST_STEP, j?.message || t('err_generic'));
      }

      setBooking(j as BookingSuccess);
      goStep(RESULT_STEP, true);
      track('booking_created', LAST_STEP);
      flush();
    } catch {
      fail(LAST_STEP, navigator.onLine === false ? t('err_offline') : t('err_generic'));
    } finally {
      setBusy(false);
    }
  }

  const waHref = booking
    ? waUrl(config.whatsapp_number, t('wa_message', {
        name: data.name, id: booking.bookingId, occasion: occName(data.occasion),
        length: lenShort(data.filmLength), amount: inr(booking.total),
      }))
    : '#';

  /* No automatic redirect. The thank-you screen is the confirmation that their
     details arrived; sending them straight out would hide it, and a blocked
     redirect would leave them on a blank page with nothing to tap. */
  useEffect(() => {
    if (booking) track('whatsapp_shown', RESULT_STEP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  return (
    <section id="book">
      <div className="wrap">
        <h2 className="sec-h display">{t('form_title')}</h2>
        <p className="sec-s">{t('form_sub')}</p>

        <div className="formcard" ref={cardRef}>
          <div className="prog" aria-hidden="true">
            <i style={{ width: `${(Math.min(step, LAST_STEP) / LAST_STEP) * 100}%` }} />
          </div>
          <p className="prog-lbl">
            {step <= LAST_STEP ? t('step_of', { n: step, total: LAST_STEP }) : ''}
          </p>

          <form noValidate autoComplete="on" onSubmit={submit}>
            <input className="hp" type="text" name="company" ref={hpRef}
                   tabIndex={-1} autoComplete="off" aria-hidden="true" />

            {/* ----------------------------- 1 ----------------------------- */}
            <div className={`step${step === 1 ? ' on' : ''}`}>
              <h3>{t('s1_title')}</h3>
              <p className="hint">{t('s1_sub')}</p>
              <div className="field">
                <label htmlFor="f_name">{t('label_name')}</label>
                <input id="f_name" type="text" autoComplete="name" maxLength={60}
                       placeholder={t('ph_name')} value={data.name}
                       onChange={(e) => { markStarted(); set({ name: e.target.value }); }} />
              </div>
              <div className="field">
                <label htmlFor="f_phone">{t('label_phone')}</label>
                <div className="phonewrap">
                  <span className="cc">+91</span>
                  <input id="f_phone" type="tel" autoComplete="tel" inputMode="numeric" maxLength={14}
                         placeholder={t('ph_phone')} value={data.phone}
                         onChange={(e) => { markStarted(); set({ phone: e.target.value }); }} />
                </div>
                <p className="sub">{t('phone_hint')}</p>
              </div>
              {err[1] ? <p className="err on">{err[1]}</p> : <p className="err" />}
              <div className="navrow">
                <button type="button" className="btn btn-primary" onClick={() => next(1)}>{t('next')}</button>
              </div>
              {/* Consent is given by carrying on rather than by a tick. The
                  sentence has to stay visible at the moment they continue,
                  which is the whole reason it sits under the button. */}
              <p className="sub muted" style={{ textAlign: 'center', marginTop: 11 }}>
                {t('consent')}
              </p>
            </div>

            {/* ----------------------------- 2 ----------------------------- */}
            <div className={`step${step === 2 ? ' on' : ''}`}>
              <h3>{t('s2_title')}</h3>
              <p className="hint">{t('s2_sub')}</p>
              <div className="occ">
                {OCCASIONS.map((o) => (
                  <button type="button" key={o.v} aria-pressed={data.occasion === o.v}
                          onClick={() => { set({ occasion: o.v }); track('occasion_selected', 2); }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {ICONS[o.icon]}
                    </svg>
                    <span>{t(o.k)}</span>
                  </button>
                ))}
              </div>
              {isTribute ? <div className="gentle">{t('tribute_note')}</div> : null}
              <div className="field">
                <label htmlFor="f_event">
                  {isTribute ? t('label_event_date_tribute') : t('label_event_date')}
                </label>
                <input id="f_event" type="date" value={data.eventDate} min={today}
                       onChange={(e) => { set({ eventDate: e.target.value }); track('date_selected', 2); }}
                       onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* unsupported */ } }} />
                <p className="sub">
                  {isTribute ? t('event_date_hint_tribute') : t('event_date_hint')}
                </p>
              </div>
              {err[2] ? <p className="err on">{err[2]}</p> : <p className="err" />}
              <div className="navrow">
                <button type="button" className="btn btn-ghost" onClick={() => goStep(1, true)}>{t('back')}</button>
                <button type="button" className="btn btn-primary" onClick={() => next(2)}>{t('next')}</button>
              </div>
            </div>

            {/* --------------------- 3 — price, then send ------------------- */}
            <div className={`step${step === LAST_STEP ? ' on' : ''}`}>
              <h3>{t('s3_title')}</h3>
              <p className="hint">{t('s3_sub')}</p>
              {/* A row of things to tap, not a track to drag. A range input is
                  one control for six values: it has no visible options, it
                  needs a precise drag on a phone, and it changes the price
                  without the person being sure what they did. Each length is
                  now its own button with its own price on it. */}
              <div className="lens" role="radiogroup" aria-label={t('s3_title')}>
                {lengths.map((code) => {
                  const p = L.calcPrice(config, code, data.follower);
                  const on = data.filmLength === code;
                  return (
                    <button type="button" key={code} role="radio" aria-checked={on}
                            className={on ? 'len on' : 'len'}
                            onClick={() => set({ filmLength: code })}>
                      <span className="t">{lenLabel(code)}</span>
                      <span className="p">₹{inr(p.total)}</span>
                      {p.list > 0 ? <s className="was">₹{inr(p.list)}</s> : null}
                    </button>
                  );
                })}
              </div>
              <div className="pricebox">
                <div className="lbl">{t('your_film', { length: lenLabel(data.filmLength) })}</div>
                <div className="amt">
                  <span>₹{inr(price.total)}</span>
                  {price.list > 0 ? <s className="was">₹{inr(price.list)}</s> : null}
                </div>
                <div className="off">
                  {data.follower && price.discount > 0
                    ? t('discount_applied', { amount: inr(price.discount) })
                    : t('total_label')}
                </div>
              </div>
              <label className="check">
                <input type="checkbox" checked={data.follower}
                       onChange={(e) => set({ follower: e.target.checked })} />
                <span>{t('follower_check', {
                  amount: inr(Number(config.follower_discount) || 0),
                  handle: config.instagram_handle,
                })}</span>
              </label>

              {err[LAST_STEP] ? <p className="err on">{err[LAST_STEP]}</p> : <p className="err" />}

              <div className="navrow">
                <button type="button" className="btn btn-ghost" onClick={() => goStep(2, true)}>{t('back')}</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? t('submitting') : t('reserve_cta')}
                </button>
              </div>
              <p className="sub muted" style={{ textAlign: 'center', marginTop: 11 }}>
                {t('reserve_note')}
              </p>
              <p className="sub muted" style={{ textAlign: 'center', marginTop: 4 }}>{t('privacy_inline')}</p>
            </div>

            {/* ------------------------- thank you ------------------------- */}
            <div className={`step${step === RESULT_STEP ? ' on' : ''}`}>
              {booking ? (
                <div className="result">
                  <div className="tick">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A"
                         strokeWidth="3" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <h3 className="display">{t('success_title')}</h3>
                  <p>{t('success_body', { id: booking.bookingId })}</p>
                  <div className="minisum" style={{ margin: '0 0 16px' }}>
                    <span>{t('mini_sum', {
                      length: lenLabel(data.filmLength), occasion: occName(data.occasion),
                    })}</span>
                    <span><b>₹{inr(booking.total)}</b></span>
                  </div>
                  {/* btn-wa is the quiet outline style; this is the one thing
                      the whole page is for, so it gets the primary treatment
                      and the icon that says where it goes. */}
                  <a className="btn btn-primary" href={waHref} style={{ width: '100%', gap: 9 }}
                     onClick={() => { track('whatsapp_redirect', RESULT_STEP); flush(true); }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 2a8 8 0 110 16 8 8 0 01-4.2-1.2l-.4-.2-2.6.7.7-2.5-.3-.4A8 8 0 0112 4zm-2.2 3.6c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 1.8s.6 1.8 1.6 2.9 2 1.7 3.4 2.1c.6.2 1.1.1 1.5-.1.4-.2.8-.7.9-1.1.1-.4 0-.6-.1-.7l-1.4-.7c-.2-.1-.4 0-.5.1l-.5.6c-.1.1-.2.1-.4 0a6 6 0 01-1.6-1 5 5 0 01-1-1.3c-.1-.2 0-.3.1-.4l.4-.5.1-.4-.6-1.4c-.1-.1-.2-.2-.3-.2z" />
                    </svg>
                    {t('open_whatsapp')}
                  </a>
                  <p className="sub muted" style={{ marginTop: 12 }}>{t('success_note')}</p>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
