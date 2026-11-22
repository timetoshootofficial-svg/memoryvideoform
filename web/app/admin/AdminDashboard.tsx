'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import s from './admin.module.css';
import type { AdminPayload, AdminBooking, LeadsPayload, Lead, StageWindow, CampaignRow } from './types';

const STATUSES = ['Pending', 'Confirmed', 'Paid', 'Cancelled', 'Expired'] as const;

const FUNNEL_STEPS: Array<[string, string]> = [
  ['page_view', 'Opened the page'],
  ['form_start', 'Started the form'],
  ['step_2', 'Gave name and number'],
  ['step_3', 'Chose an occasion'],
  ['step_4', 'Reached the calendar'],
  ['date_selected', 'Picked a date'],
  ['time_selected', 'Picked a time'],
  ['booking_created', 'Reserved a slot'],
  ['whatsapp_redirect', 'Went to WhatsApp'],
];

/* The static dashboard only named three of the six lengths, so a 4m booking
   showed as "4m". All six are here. */
const LEN: Record<string, string> = {
  '30s': '30 seconds', '1m': '1 minute', '2m': '2 minutes',
  '3m': '3 minutes', '4m': '4 minutes', '5m': '5 minutes',
};

const PIN_KEY = 'tts_admin_pin';
const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + '%' : '—');
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const p = String(iso).split('-');
  if (p.length < 3) return String(iso);
  try {
    return new Date(+p[0], +p[1] - 1, +p[2])
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return String(iso); }
};

const STAGE_WINDOWS: Array<[StageWindow, string]> = [
  ['today', 'Today'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days'], ['all', 'All time'],
];

const STEP_NAMES = ['', 'Gave name and number', 'Chose an occasion', 'Saw the price', 'Finished'];

/** Four dots: how far this person got before they stopped. */
function StepDots({ step, completed }: { step: number; completed: boolean }) {
  return (
    <span className={s.stepdot} title={STEP_NAMES[Math.min(step, 4)]}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={completed && n <= 4 ? s.done : n <= step ? s.on : ''} />
      ))}
      <span>{completed ? 'finished' : STEP_NAMES[Math.min(step, 4)]}</span>
    </span>
  );
}

function Stat({ k, v, sub, cls, hi }:
  { k: string; v: string | number; sub?: string; cls?: string; hi?: boolean }) {
  return (
    <div className={`${s.stat}${hi ? ' ' + s.hi : ''}`}>
      <div className={s.k}>{k}</div>
      <div className={`${s.v} ${cls ? s[cls] : ''}`}>{v}</div>
      {sub ? <div className={s.s}>{sub}</div> : null}
    </div>
  );
}

function Box({ title, obj, fmt }:
  { title: string; obj: Record<string, number>; fmt?: (k: string) => string }) {
  const keys = Object.keys(obj || {}).sort((a, b) => obj[b] - obj[a]);
  return (
    <div className={s.box}>
      <h3>{title}</h3>
      {keys.length === 0
        ? <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Nothing yet.</p>
        : keys.slice(0, 8).map((k) => (
            <div className={s.kv} key={k}><span>{fmt ? fmt(k) : k}</span><b>{obj[k]}</b></div>
          ))}
    </div>
  );
}

/**
 * Which advertisement actually brings money.
 *
 * The Meta Pixel tells Meta who booked. It cannot tell anyone who PAID,
 * because payment happens in a WhatsApp conversation Meta never sees. That
 * number exists only here, in the status set by hand on the Bookings tab —
 * which is what makes this table the one worth reading before changing spend.
 */
function Campaigns({ rows }: { rows: CampaignRow[] }) {
  if (!rows.length) {
    return (
      <div className={s.sec}>
        <h2>By advertisement</h2>
        <p style={{ color: 'var(--muted)' }}>
          Nothing yet. Campaign names arrive with the <b>utm_campaign</b> on your ad links.
        </p>
      </div>
    );
  }
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + '%' : '—');
  return (
    <div className={s.sec}>
      <h2>By advertisement</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
        Revenue counts only bookings you marked <b>Paid</b>. Mark them as they pay,
        or this column stays at zero and tells you nothing.
      </p>
      <div className={s.tablewrap}>
        <table>
          <thead><tr>
            <th>Campaign</th><th>Numbers</th><th>Finished</th>
            <th>Paid</th><th>Number → paid</th><th>Revenue</th><th>Awaiting payment</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.campaign}>
                <td><b>{r.campaign}</b></td>
                <td className={s.mono}>{r.numbers}</td>
                <td className={s.mono}>{r.finished}</td>
                <td className={s.mono}>{r.paid}</td>
                <td className={s.mono}>{pct(r.paid, r.numbers)}</td>
                <td className={s.mono}><b>{money(r.revenue)}</b></td>
                <td className={s.mono}>{r.pipeline ? money(r.pipeline) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Everyone who typed a number, finished or not.
 *
 * The ones who did not finish are the point of this table: they wanted a film
 * enough to give you their number, and before this existed you never saw them.
 */
function LeadsTable({ data, filter, setFilter }: {
  data: LeadsPayload | null;
  filter: 'all' | 'abandoned' | 'finished';
  setFilter: (f: 'all' | 'abandoned' | 'finished') => void;
}) {
  const [q, setQ] = useState('');
  if (!data) {
    return (
      <div className={s.sec}>
        <h2>Leads</h2>
        <p style={{ color: 'var(--muted)' }}>
          Could not load leads. If this is the first time, run <b>03_capture_partials.sql</b>.
        </p>
      </div>
    );
  }

  /* Captured after the guard: TypeScript cannot carry the narrowing into the
     hoisted csv() below. */
  const payload = data;
  const needle = q.trim().toLowerCase();
  const rows = payload.leads.filter((l) => {
    if (filter === 'abandoned' && l.completed) return false;
    if (filter === 'finished' && !l.completed) return false;
    if (!needle) return true;
    return [l.name, l.phone, l.occasion, l.campaign, l.bookingId]
      .join(' ').toLowerCase().includes(needle);
  });

  function csv() {
    const head = ['Name', 'Phone', 'Step', 'Finished', 'Reference', 'Occasion',
                  'Film', 'Price', 'First seen', 'Last seen', 'Campaign', 'Language'];
    const body = rows.map((l) => [l.name, l.phone, STEP_NAMES[Math.min(l.step, 4)],
      l.completed ? 'yes' : 'no', l.bookingId, l.occasion, l.filmLength, l.price,
      l.firstSeen, l.lastSeen, l.campaign, l.language]);
    const text = [head, ...body]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetoshoot-leads-${payload.today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={s.sec}>
      <h2>Leads</h2>
      <div className={s.tools}>
        <input type="search" placeholder="Search name, phone, campaign…" aria-label="Search leads"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">Everyone</option>
          <option value="abandoned">Did not finish</option>
          <option value="finished">Finished</option>
        </select>
        <button className={s.btn} onClick={csv}>Download CSV</button>
      </div>
      <div className={s.tablewrap}>
        <table>
          <thead><tr>
            <th>Name</th><th>Phone</th><th>How far</th><th>Wanted</th>
            <th>Price</th><th>Last seen</th><th>Source</th><th />
          </tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.sessionId}>
                <td>
                  <b>{l.name || '—'}</b>
                  {l.bookingId ? <span className={s.sub}>{l.bookingId}</span> : null}
                </td>
                <td className={s.mono}>{l.phone ? `+91 ${l.phone}` : '—'}</td>
                <td><StepDots step={l.step} completed={l.completed} /></td>
                <td>
                  {l.occasion || '—'}
                  {l.filmLength ? <span className={s.sub}>{LEN[l.filmLength] ?? l.filmLength}</span> : null}
                </td>
                <td className={s.mono}>{l.price ? money(l.price) : '—'}</td>
                <td className={s.mono}>{l.lastSeen}</td>
                <td>
                  {l.campaign}
                  {l.source ? <span className={s.sub}>{l.source}</span> : null}
                </td>
                <td>
                  {l.phone
                    ? <a className={s.btn} target="_blank" rel="noopener"
                         href={`https://wa.me/91${l.phone}`}>WhatsApp</a>
                    : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className={s.empty}>Nothing matches that filter.</div> : null}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [pin, setPin] = useState('');
  const [entry, setEntry] = useState('');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [leadsData, setLeadsData] = useState<LeadsPayload | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'bookings'>('dashboard');
  const [stageWin, setStageWin] = useState<StageWindow>('all');
  const [leadFilter, setLeadFilter] = useState<'all' | 'abandoned' | 'finished'>('all');
  const [err, setErr] = useState<React.ReactNode>('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const [range, setRange] = useState<'all' | 'last7' | 'today' | 'yesterday'>('all');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fWhen, setFWhen] = useState('');

  const call = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return r.json();
  }, []);

  const load = useCallback(async (usePin: string) => {
    setBusy(true);
    setErr('');
    const [j, lj] = await Promise.all([call({ pin: usePin }), call({ action: 'leads', pin: usePin })]);
    setBusy(false);
    setLeadsData(lj?.ok ? (lj as LeadsPayload) : null);

    if (!j?.ok) {
      setData(null);
      try { sessionStorage.removeItem(PIN_KEY); } catch { /* ignore */ }
      const code = j?.code ?? '';
      setErr(
        code === 'BAD_PIN' ? 'Wrong PIN.'
        : code === 'LOCKED' ? 'Too many wrong attempts. Wait 15 minutes.'
        : code === 'PIN_NOT_SET' ? <>No PIN is set yet. Run <b>select tts_set_admin_pin(&apos;your-pin&apos;)</b> in the Supabase SQL editor.</>
        : code === 'NOT_DEPLOYED' ? <>The database functions are missing. Run <b>supabase/schema.sql</b>.</>
        : code === 'NO_API' ? 'The server is not configured with SUPABASE_URL.'
        : (j?.message || 'Could not reach the server.'),
      );
      return false;
    }
    setData(j as AdminPayload);
    setPin(usePin);
    try { sessionStorage.setItem(PIN_KEY, usePin); } catch { /* ignore */ }
    return true;
  }, [call]);

  useEffect(() => {
    let saved = '';
    try { saved = sessionStorage.getItem(PIN_KEY) || ''; } catch { /* ignore */ }
    if (saved) load(saved);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3800);
    return () => clearTimeout(id);
  }, [toast]);

  const visible = useMemo<AdminBooking[]>(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.bookings.filter((b) => {
      if (fStatus && b.status !== fStatus) return false;
      if (fWhen === 'today' && b.createdDate !== data.today) return false;
      if (fWhen === 'yesterday') {
        const y = new Date(data.today);
        y.setDate(y.getDate() - 1);
        if (b.createdDate !== y.toISOString().slice(0, 10)) return false;
      }
      if (fWhen === 'last7') {
        const w = new Date(data.today);
        w.setDate(w.getDate() - 6);
        if (b.createdDate < w.toISOString().slice(0, 10)) return false;
      }
      if (!needle) return true;
      return [b.id, b.name, b.phone, b.campaign, b.occasion].join(' ').toLowerCase().includes(needle);
    });
  }, [data, q, fStatus, fWhen]);

  async function changeStatus(id: string, status: string) {
    const j = await call({ action: 'setStatus', pin, bookingId: id, status });
    if (j?.ok) { setToast(`${id} → ${status}`); load(pin); }
    else setToast(j?.message || 'Could not change the status.');
  }

  function downloadCsv() {
    const head = ['Reference', 'Booked', 'Name', 'Phone', 'Occasion', 'Event', 'Film',
                  'Delivery', 'Slot', 'Total', 'Status', 'Campaign', 'Source'];
    const rows = visible.map((b) => [b.id, b.createdAt, b.name, b.phone, b.occasion,
      b.eventDate ?? '', b.filmLength, b.deliveryDate, b.slotTime, b.total, b.status,
      b.campaign, b.source]);
    const csv = [head, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetoshoot-bookings-${data?.today ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------- gate -------------------------------- */
  if (!data) {
    return (
      <div className={s.admin}>
        <div className={s.gate}>
          <div className={s.brand} style={{ justifyContent: 'center', marginBottom: 16 }}>
            <span className={s.dot} /><span>TIMETOSHOOT</span>
          </div>
          <h1 className={s.display}>Admin</h1>
          <p>Enter your PIN to see bookings.</p>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); load(entry); }}>
            <input type="password" placeholder="PIN" aria-label="Admin PIN"
                   autoComplete="current-password" value={entry}
                   onChange={(e) => setEntry(e.target.value)} />
            <button className={`${s.btn} ${s.btnprimary}`} type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Unlock'}
            </button>
          </form>
          {err ? <div className={`${s.err} ${s.on}`}>{err}</div> : null}
          <p className={s.note}>
            This page shows customer phone numbers. The PIN is checked on the server —
            nothing is sent to the browser until it matches.
          </p>
        </div>
      </div>
    );
  }

  /* ----------------------------- dashboard ----------------------------- */
  const st = data.stats;
  const f = (data.funnel as unknown as Record<string, Record<string, number>>)[range] ?? {};
  const top = Math.max(1, f.page_view ?? 0);
  let prev: number | null = null;

  return (
    <div className={s.admin}>
      <header className={s.head}>
        <div className={`${s.wrap} ${s.hrow}`}>
          <div className={s.brand}>
            <span className={s.dot} /><span>TIMETOSHOOT</span><small>Admin</small>
          </div>
          <div className={s.hactions}>
            <span className={s.stamp}>{data.now}</span>
            <button className={s.btn} onClick={() => load(pin)} disabled={busy}>
              {busy ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className={s.btn} onClick={() => {
              try { sessionStorage.removeItem(PIN_KEY); } catch { /* ignore */ }
              setData(null); setPin(''); setEntry('');
            }}>Lock</button>
          </div>
        </div>
      </header>

      <main className={s.wrap}>
        <div className={s.tabs} role="tablist">
          <button role="tab" aria-selected={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
            Dashboard
          </button>
          <button role="tab" aria-selected={tab === 'leads'} onClick={() => setTab('leads')}>
            Leads
            {leadsData ? <span className={s.count}>{leadsData.leads.length}</span> : null}
          </button>
          <button role="tab" aria-selected={tab === 'bookings'} onClick={() => setTab('bookings')}>
            Bookings
            <span className={s.count}>{data.bookings.length}</span>
          </button>
        </div>

        {tab === 'dashboard' && leadsData ? (
          <div className={s.sec}>
            <h2>Who gets how far</h2>
            <div className={s.tools} style={{ marginBottom: 12 }}>
              <select value={stageWin} onChange={(e) => setStageWin(e.target.value as StageWindow)}>
                {STAGE_WINDOWS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            {(() => {
              const st2 = leadsData.stages[stageWin];
              if (!st2) return <p style={{ color: 'var(--muted)' }}>Nothing yet.</p>;
              const top = Math.max(1, st2.gaveNumber);
              const rows: Array<[string, number]> = [
                ['Gave name and number', st2.gaveNumber],
                ['Chose an occasion', st2.choseOccasion],
                ['Saw the price', st2.sawPrice],
                ['Pressed Book now', st2.finished],
              ];
              let prev: number | null = null;
              return (
                <>
                  <div className={s.grid} style={{ marginBottom: 16 }}>
                    <Stat k="Numbers captured" v={st2.gaveNumber} sub="even if they left" hi />
                    <Stat k="Finished" v={st2.finished} sub="pressed Book now" cls="ok" />
                    <Stat k="Left part way" v={st2.abandoned} sub="worth a message" cls="warn" />
                    <Stat k="Finished value" v={money(st2.valueFinished)} cls="info" />
                    <Stat k="Walked away with" v={money(st2.valueLeft)} sub="unfinished, at list price" cls="warn" />
                  </div>
                  <div className={s.funnel}>
                    {rows.map(([label, n]) => {
                      const width = Math.max(0, Math.min(100, (n / top) * 100));
                      const drop = prev !== null && prev > 0 && n < prev
                        ? `↓ ${Math.round(((prev - n) / prev) * 100)}%` : '';
                      prev = n;
                      return (
                        <div className={s.frow} key={label}>
                          <div className={s.lbl}>{label}</div>
                          <div className={s.bar}><i style={{ width: `${width}%` }} /></div>
                          <div className={s.num}>{n}{drop ? <span>{drop}</span> : null}</div>
                        </div>
                      );
                    })}
                    <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: '10px 0 0' }}>
                      Number to booking: <b style={{ color: 'var(--yellow)' }}>
                        {pct(st2.finished, st2.gaveNumber)}
                      </b>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}

        {tab === 'dashboard' && leadsData?.campaigns ? <Campaigns rows={leadsData.campaigns} /> : null}

        {tab === 'leads' ? <LeadsTable data={leadsData} filter={leadFilter} setFilter={setLeadFilter} /> : null}

        {tab === 'dashboard' ? (
        <>
        <div className={s.sec}>
          <h2>Reservations</h2>
          <div className={s.grid}>
            <Stat k="Today" v={st.today} sub="reserved today" hi />
            <Stat k="Yesterday" v={st.yesterday} />
            <Stat k="Last 7 days" v={st.last7} />
            <Stat k="Last 30 days" v={st.last30} />
            <Stat k="All time" v={st.total} />
            <Stat k="Pending" v={st.pending} sub="waiting on you" cls="warn" />
            <Stat k="Confirmed" v={st.confirmed} cls="ok" />
            <Stat k="Paid" v={st.paid} cls="info" />
            <Stat k="Cancelled" v={st.cancelled} cls="dim" />
            <Stat k="Expired" v={st.expired} sub="hold ran out" cls="dim" />
          </div>
        </div>

        <div className={s.sec}>
          <h2>Value</h2>
          <div className={s.grid}>
            <Stat k="Paid" v={money(st.revenuePaid)} sub="money in" cls="info" hi />
            <Stat k="Confirmed" v={money(st.revenueConfirmed)} sub="agreed, not paid" cls="ok" />
            <Stat k="Pending" v={money(st.revenuePending)} sub="not spoken to yet" cls="warn" />
            <Stat k="To chase" v={money(st.revenueConfirmed + st.revenuePending)} sub="confirmed + pending" />
            <Stat k="Avg paid" v={st.paid ? money(Math.round(st.revenuePaid / st.paid)) : '—'} sub="per booking" />
          </div>
        </div>

        <div className={s.sec}>
          <h2>Where people drop off</h2>
          <div className={s.tools} style={{ marginBottom: 12 }}>
            <select value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
              <option value="all">All time</option>
              <option value="last7">Last 7 days</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
          <div className={s.funnel}>
            {FUNNEL_STEPS.map(([key, label]) => {
              const n = f[key] ?? 0;
              const width = Math.max(0, Math.min(100, (n / top) * 100));
              const drop = prev !== null && prev > 0 && n < prev
                ? `↓ ${Math.round(((prev - n) / prev) * 100)}%` : '';
              prev = n;
              return (
                <div className={s.frow} key={key}>
                  <div className={s.lbl}>{label}</div>
                  <div className={s.bar}><i style={{ width: `${width}%` }} /></div>
                  <div className={s.num}>{n}{drop ? <span>{drop}</span> : null}</div>
                </div>
              );
            })}
            <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: '10px 0 0' }}>
              Visit to reservation: <b style={{ color: 'var(--yellow)' }}>
                {pct(f.booking_created ?? 0, f.page_view ?? 0)}
              </b>{' · '}unique visitors all time: {data.funnel.sessions}
            </p>
          </div>
        </div>

        <div className={s.sec}>
          <h2>Breakdown</h2>
          <div className={s.split}>
            <Box title="By occasion" obj={st.byOccasion} />
            <Box title="By film length" obj={st.byLength} fmt={(k) => LEN[k] ?? k} />
            <Box title="By time slot" obj={st.bySlot} />
            <Box title="By campaign" obj={st.byCampaign} />
          </div>
        </div>
        </>
        ) : null}

        {tab === 'bookings' ? (
        <div className={s.sec}>
          <h2>All bookings</h2>
          <div className={s.tools}>
            <input type="search" placeholder="Search name, phone, reference, campaign…"
                   aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((x) => <option key={x}>{x}</option>)}
            </select>
            <select value={fWhen} onChange={(e) => setFWhen(e.target.value)}>
              <option value="">Any time</option>
              <option value="today">Booked today</option>
              <option value="yesterday">Booked yesterday</option>
              <option value="last7">Last 7 days</option>
            </select>
            <button className={s.btn} onClick={downloadCsv}>Download CSV</button>
          </div>
          <div className={s.tablewrap}>
            <table>
              <thead><tr>
                <th>Reference</th><th>Booked</th><th>Customer</th><th>Occasion</th>
                <th>Film</th><th>Slot</th><th>Total</th><th>Status</th><th>Source</th><th />
              </tr></thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b.id}>
                    <td className={s.id}>{b.id}</td>
                    <td className={s.mono}>{b.createdAt.slice(5, 16)}</td>
                    <td>
                      <b>{b.name || '—'}</b>
                      <span className={`${s.sub} ${s.mono}`}>{b.phone ? `+91 ${b.phone}` : '—'}</span>
                    </td>
                    <td>
                      {b.occasion || '—'}
                      {b.eventDate ? <span className={s.sub}>event {fmtDate(b.eventDate)}</span> : null}
                    </td>
                    <td>
                      {LEN[b.filmLength] ?? b.filmLength ?? '—'}
                      {b.follower === 'Y' ? <span className={s.sub}>follower discount</span> : null}
                    </td>
                    <td>
                      {fmtDate(b.deliveryDate)}
                      <span className={s.sub}>{b.slotTime || '—'}</span>
                      {b.holdActive && b.status === 'Pending'
                        ? <span className={`${s.sub} ${s.hold}`}>holds until {String(b.holdUntil).slice(5, 16)}</span>
                        : null}
                    </td>
                    <td className={s.mono}><b>{money(b.total)}</b></td>
                    <td>
                      <span className={`${s.pill} ${s['p-' + b.status]}`}>{b.status}</span>
                      <select className={s.st} aria-label={`Change status for ${b.id}`}
                              value={b.status} onChange={(e) => changeStatus(b.id, e.target.value)}>
                        {STATUSES.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td>
                      {b.campaign}
                      {b.source ? <span className={s.sub}>{b.source}</span> : null}
                    </td>
                    <td>
                      <a className={s.btn} href={`https://wa.me/91${b.phone}`}
                         target="_blank" rel="noopener">WhatsApp</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 ? <div className={s.empty}>Nothing matches that filter.</div> : null}
          </div>
        </div>
        ) : null}
      </main>

      {toast ? <div className={`${s.toast} ${s.on}`} role="status">{toast}</div> : null}
    </div>
  );
}
