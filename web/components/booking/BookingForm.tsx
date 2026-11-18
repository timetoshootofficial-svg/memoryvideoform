'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvailabilityDay, SiteConfig, BookingSuccess, FilmLength } from '@/lib/types';
import { makeT, type Lang, type StringKey } from '@/lib/i18n';
import * as L from '@/lib/logic';
import { fmtDate, inr, waUrl } from '@/lib/format';
import Calendar from './Calendar';
import { useFunnel } from './useFunnel';

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

const RESULT_STEP = 5;

interface Data {
  name: string; phone: string; consent: boolean;
  occasion: string; eventDate: string;
  filmLength: string; deliveryDate: string; slotTime: string; follower: boolean;
}

export default function BookingForm({ config, availability: initialAvailability, lang }: {
  config: SiteConfig;
  availability: AvailabilityDay[];
  lang: Lang;
}) {
  /* `t` is built here rather than handed down: a server component cannot pass
     a function across the boundary into a client component. */
  const t = makeT(lang);
  const lengths = useMemo(() => L.availableLengths(config), [config]);

  const [availability, setAvailability] = useState(initialAvailability);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<number, string>>({});
  const [booking, setBooking] = useState<BookingSuccess | null>(null);
  const [data, setData] = useState<Data>({
    name: '', phone: '', consent: false,
    occasion: '', eventDate: '',
    filmLength: lengths.includes(config.most_chosen_package as FilmLength)
      ? config.most_chosen_package
      : (lengths[1] ?? lengths[0] ?? ''),
    deliveryDate: '', slotTime: '', follower: false,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);
  const { track, flush, utm } = useFunnel(lang);

  const started = useRef(false);
  const set = (patch: Partial<Data>) => setData((d) => ({ ...d, ...patch }));

  /* The funnel chart counts form_start, so it has to be fired the first time
     someone actually types something, not when the section scrolls into view. */
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    track('form_start', 1);
  };
  const today = config.today;
  const units = L.unitsFor(config, data.filmLength);
  const price = L.calcPrice(config, data.filmLength, data.follower);

  /* The calendar is derived, never stored: change the length and the days
     that no longer fit stop being selectable in the same render. */
  const cal = useMemo(() => L.buildCalendar(availability, {
    today, minLeadDays: config.min_lead_days, bookingWindowDays: config.booking_window_days,
    eventDate: data.eventDate, units,
  }), [availability, today, config.min_lead_days, config.booking_window_days, data.eventDate, units]);

  /* ...so a selection that has become invalid has to be dropped. */
  useEffect(() => {
    if (!data.deliveryDate) return;
    const day = cal.find((d) => d.date === data.deliveryDate && d.selectable);
    if (!day) { set({ deliveryDate: '', slotTime: '' }); return; }
    if (data.slotTime && day.times && !day.times.some((x) => x.time === data.slotTime && !x.taken)) {
      set({ slotTime: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cal]);

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
      if (!data.consent) return fail(1, t('err_consent'));
    }
    if (n === 2) {
      if (!OCCASIONS.some((o) => o.v === data.occasion)) return fail(2, t('err_occasion'));
      if (data.eventDate && data.eventDate <= today) return fail(2, t('err_event_past'));
    }
    if (n === 4) {
      if (!data.deliveryDate) return fail(4, t('err_pick_date'));
      if (!data.slotTime) return fail(4, t('err_pick_time'));
    }
    setErr({});
    return true;
  }

  const next = (from: number) => { if (validate(from)) goStep(from + 1); };

  async function refreshAvailability() {
    try {
      const r = await fetch('/api/availability', { cache: 'no-store' });
      const j = await r.json();
      if (j && Array.isArray(j.availability)) setAvailability(j.availability);
    } catch { /* keep what we have */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!validate(1) || !validate(2)) { goStep(1); return; }
    if (!validate(4)) return;

    setBusy(true);
    setErr({});
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name, phone: data.phone, consent: 'true',
          occasion: data.occasion, eventDate: data.eventDate,
          filmLength: data.filmLength, deliveryDate: data.deliveryDate,
          slotTime: data.slotTime, follower: String(data.follower),
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
        if (code === 'SLOT_TAKEN' || code === 'BAD_TIME') {
          track('slot_taken', 4);
          set({ slotTime: '' });
          await refreshAvailability();
          return fail(4, t('err_slot_taken'));
        }
        if (code === 'RATE_LIMIT') return fail(4, t('err_rate_limit'));
        if (code === 'DUPLICATE')  return fail(4, t('err_duplicate'));
        if (code === 'BAD_PHONE')  return fail(4, t('err_phone'));
        if (code === 'NETWORK' || code === 'TIMEOUT') return fail(4, t('err_offline'));
        return fail(4, j?.message || t('err_generic'));
      }

      setBooking(j as BookingSuccess);
      goStep(RESULT_STEP, true);
      track('booking_created', 4);
      track('whatsapp_redirect', 4);
      flush(true);
    } catch {
      fail(4, navigator.onLine === false ? t('err_offline') : t('err_generic'));
    } finally {
      setBusy(false);
    }
  }

  const lenLabel = (code: string) => t(`len_${code}` as StringKey);
  const lenShort = (code: string) => t(`len_${code}_short` as StringKey);
  const occName = (v: string) => {
    const o = OCCASIONS.find((x) => x.v === v);
    return o ? t(o.k) : '—';
  };
  const isTribute = data.occasion === 'Tribute to loved ones';

  const selectedDay = cal.find((d) => d.date === data.deliveryDate);
  const times = selectedDay?.times ?? config.time_slots.map((x) => ({ time: x, taken: false }));

  const waHref = booking
    ? waUrl(config.whatsapp_number, t('wa_message', {
        name: data.name, id: booking.bookingId, occasion: occName(data.occasion),
        length: lenShort(data.filmLength),
        date: fmtDate(booking.deliveryDate || data.deliveryDate, lang),
        time: booking.slotTime || data.slotTime, amount: inr(booking.total),
      }))
    : '#';

  /* The browser is told to open WhatsApp only after the success screen has
     painted, so a blocked redirect still leaves a button to tap. */
  useEffect(() => {
    if (!booking || waHref === '#') return;
    const id = setTimeout(() => { window.location.href = waHref; }, 450);
    return () => clearTimeout(id);
  }, [booking, waHref]);

  const noneFit = step === 4 && !L.hasAnySelectable(cal);

  return (
    <section id="book">
      <div className="wrap">
        <h2 className="sec-h display">{t('form_title')}</h2>
        <p className="sec-s">{t('form_sub')}</p>

        <div className="formcard" ref={cardRef}>
          <div className="prog" aria-hidden="true">
            <i style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }} />
          </div>
          <p className="prog-lbl">
            {step <= 4 ? t('step_of', { n: step, total: 4 }) : ''}
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
              <label className="check">
                <input type="checkbox" checked={data.consent}
                       onChange={(e) => set({ consent: e.target.checked })} />
                <span>{t('consent')}</span>
              </label>
              {err[1] ? <p className="err on">{err[1]}</p> : <p className="err" />}
              <div className="navrow">
                <button type="button" className="btn btn-primary" onClick={() => next(1)}>{t('next')}</button>
              </div>
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
                       /* Tapping anywhere in the field opens the picker. */
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

            {/* ----------------------------- 3 ----------------------------- */}
            <div className={`step${step === 3 ? ' on' : ''}`}>
              <h3>{t('s3_title')}</h3>
              <p className="hint">{t('s3_sub')}</p>
              <div className="stepper">
                <div className="track">
                  <i className="fill" style={{
                    width: `${lengths.length < 2 ? 100
                      : (Math.max(0, lengths.indexOf(data.filmLength as FilmLength)) / (lengths.length - 1)) * 100}%`,
                  }} />
                  <input type="range" min={0} max={Math.max(0, lengths.length - 1)} step={1}
                         aria-label="Film length"
                         value={Math.max(0, lengths.indexOf(data.filmLength as FilmLength))}
                         onChange={(e) => set({ filmLength: lengths[Number(e.target.value)] })} />
                </div>
                <div className="stops">
                  {lengths.map((code) => (
                    <button type="button" key={code} aria-pressed={data.filmLength === code}
                            aria-label={lenLabel(code)}
                            onClick={() => set({ filmLength: code })}>
                      {lenShort(code)}
                    </button>
                  ))}
                </div>
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
              {err[3] ? <p className="err on">{err[3]}</p> : <p className="err" />}
              <div className="navrow">
                <button type="button" className="btn btn-ghost" onClick={() => goStep(2, true)}>{t('back')}</button>
                <button type="button" className="btn btn-primary" onClick={() => next(3)}>{t('next')}</button>
              </div>
            </div>

            {/* ----------------------------- 4 ----------------------------- */}
            <div className={`step${step === 4 ? ' on' : ''}`}>
              <h3>{t('s4_title')}</h3>
              <p className="hint">
                {data.eventDate
                  ? t('s4_sub_event', { date: fmtDate(data.eventDate, lang) })
                  : t('s4_sub')}
              </p>
              <div className="legend">
                <span><i className="sw av" /><span>{t('legend_available')}</span></span>
                <span><i className="sw bs" /><span>{t('legend_best')}</span></span>
                <span><i className="sw sel" /><span>{t('legend_selected')}</span></span>
                <span><i className="sw fl" /><span>{t('legend_full')}</span></span>
              </div>

              <div aria-live="polite">
                {noneFit ? (
                  <div className="nofit">
                    <b>{t('no_dates_title')}</b>
                    <p>{t('no_dates_body', {
                      date: fmtDate(data.eventDate || L.addDays(today, config.min_lead_days), lang),
                    })}</p>
                    <a className="btn btn-wa" style={{ width: '100%' }}
                       href={waUrl(config.whatsapp_number, t('wa_rush', {
                         name: data.name || '-', length: lenShort(data.filmLength),
                         date: fmtDate(data.eventDate || L.addDays(today, config.min_lead_days), lang),
                       }))}
                       onClick={() => { track('rush_click', 4); flush(true); }}>
                      {t('rush_cta')}
                    </a>
                  </div>
                ) : (
                  <Calendar cal={cal} selected={data.deliveryDate} lang={lang} t={t}
                            onPick={(date) => {
                              set({ deliveryDate: date, slotTime: '' });
                              track('date_selected', 4);
                            }} />
                )}
              </div>

              {units > 1 ? <p className="sub muted" style={{ fontSize: 12.5 }}>{t('two_min_note')}</p> : null}

              {data.deliveryDate ? (
                <div>
                  <h4 className="timeh">{t('time_title', { date: fmtDate(data.deliveryDate, lang) })}</h4>
                  <div className="times" role="group">
                    {times.map((x) => (
                      <button type="button" key={x.time} className="tchip" disabled={x.taken}
                              aria-pressed={x.time === data.slotTime}
                              onClick={() => { set({ slotTime: x.time }); track('time_selected', 4); }}>
                        <span>{x.time}</span>
                        {x.taken ? <span className="s">{t('time_taken')}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {data.deliveryDate && data.slotTime ? (
                <div className="minisum">
                  <span>{t('mini_sum', {
                    length: lenLabel(data.filmLength),
                    date: fmtDate(data.deliveryDate, lang),
                    time: data.slotTime,
                  })}</span>
                  <span>
                    {price.list > 0 ? <s className="was">₹{inr(price.list)}</s> : null}
                    <b>₹{inr(price.total)}</b>
                  </span>
                </div>
              ) : null}

              {err[4] ? <p className="err on">{err[4]}</p> : <p className="err" />}

              <div className="navrow">
                <button type="button" className="btn btn-ghost" onClick={() => goStep(3, true)}>{t('back')}</button>
                <button type="submit" className="btn btn-primary"
                        disabled={busy || !data.deliveryDate || !data.slotTime}>
                  {busy ? t('submitting') : t('reserve_cta')}
                </button>
              </div>
              <p className="sub muted" style={{ textAlign: 'center', marginTop: 11 }}>
                {t('reserve_note', { hours: config.slot_hold_hours })}
              </p>
              <p className="sub muted" style={{ textAlign: 'center', marginTop: 4 }}>{t('privacy_inline')}</p>
            </div>

            {/* --------------------------- result -------------------------- */}
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
                      length: lenLabel(data.filmLength),
                      date: fmtDate(booking.deliveryDate || data.deliveryDate, lang),
                      time: booking.slotTime || data.slotTime,
                    })}</span>
                  </div>
                  <a className="btn btn-primary" href={waHref}>{t('open_whatsapp')}</a>
                  <p className="sub muted" style={{ marginTop: 12 }}>
                    {t('success_note', { hours: booking.holdHours || config.slot_hold_hours })}
                  </p>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
