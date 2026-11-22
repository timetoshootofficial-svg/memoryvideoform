'use client';
import { useMemo, useState } from 'react';
import s from './admin.module.css';

const LENGTHS = ['30s', '1m', '2m', '3m', '4m', '5m'] as const;
const LABEL: Record<string, string> = {
  '30s': '30 seconds', '1m': '1 minute', '2m': '2 minutes',
  '3m': '3 minutes', '4m': '4 minutes', '5m': '5 minutes',
};
const inr = (n: number) => Number(n || 0).toLocaleString('en-IN');

export interface PackageRow { code: string; price: number; list: number }

/**
 * The six packages, as they will appear on the site.
 *
 * A package is "off" when its price is 0 — that is already how the booking
 * form decides what to show, so nothing new had to be invented for it. The
 * struck-through price is the "was" figure; it only appears on the site when
 * it is higher than the real one, because a saving that is not a saving is
 * the thing consumer law objects to.
 */
export default function Packages(
  { rows, onSave, busy, note }:
  { rows: PackageRow[];
    onSave: (values: Record<string, number>) => void;
    busy: boolean; note: string },
) {
  const [draft, setDraft] = useState<PackageRow[]>(rows);
  const set = (code: string, patch: Partial<PackageRow>) =>
    setDraft((d) => d.map((r) => (r.code === code ? { ...r, ...patch } : r)));

  const live = draft.filter((r) => r.price > 0);
  const cheapest = live.length ? Math.min(...live.map((r) => r.price)) : 0;
  const changed = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(rows),
    [draft, rows],
  );

  return (
    <div className={s.sec}>
      <h2>Packages</h2>
      <p className={s.hint}>
        Turn a length off and it disappears from the booking form.{' '}
        Put <b>1000</b> in the discount box and a ₹2,999 film shows as
        <s>₹3,999</s> <b>₹2,999</b> with &ldquo;Save ₹1,000&rdquo; under it. Leave it
        at 0 and no struck-through price appears at all.
      </p>

      <div className={s.pkgs}>
        {draft.map((r) => {
          const on = r.price > 0;
          const save = r.list > r.price ? r.list - r.price : 0;
          return (
            <div key={r.code} className={on ? s.pkg : `${s.pkg} ${s.pkgOff}`}>
              <div className={s.pkgHead}>
                <label className={s.sw}>
                  <input type="checkbox" checked={on}
                         onChange={(e) => set(r.code, {
                           price: e.target.checked ? (r.price || 2999) : 0,
                         })} />
                  <span>{LABEL[r.code] ?? r.code}</span>
                </label>
                <span className={s.sub}>{on ? 'on the site' : 'hidden'}</span>
              </div>

              <div className={s.pkgRow}>
                <label>
                  <span className={s.sub}>Price</span>
                  <input type="number" inputMode="numeric" min={0} value={r.price}
                         disabled={!on}
                         onChange={(e) => set(r.code, { price: Math.max(0, Number(e.target.value) || 0) })} />
                </label>
                <label>
                  <span className={s.sub}>Discount to show (₹ off)</span>
                  {/* The database stores the ORIGINAL price, because that is
                      what gets struck through. Nobody thinks in original
                      prices though — they think "₹1,000 off". So the box asks
                      for the discount and the sum is done here. */}
                  <input type="number" inputMode="numeric" min={0} value={save}
                         disabled={!on}
                         onChange={(e) => {
                           const d = Math.max(0, Number(e.target.value) || 0);
                           set(r.code, { list: d > 0 ? r.price + d : 0 });
                         }} />
                </label>
              </div>

              {on ? (
                <>
                  <p className={s.pkgPrev}>
                    {save > 0
                      ? <>Shows as <s>₹{inr(r.list)}</s> <b>₹{inr(r.price)}</b> <em>Save ₹{inr(save)}</em></>
                      : <>Shows as <b>₹{inr(r.price)}</b></>}
                  </p>

                  {/* A value left over from when this box asked for the
                      original price: it is below the price, so the site shows
                      nothing. One tap reads it as the discount instead. */}
                  {r.list > 0 && r.list <= r.price ? (
                    <p className={s.pkgWarn}>
                      An old value of ₹{inr(r.list)} is saved here and shows nothing.{' '}
                      <button type="button" className={s.link}
                              onClick={() => set(r.code, { list: r.price + r.list })}>
                        Use it as ₹{inr(r.list)} off
                      </button>
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* The advertisement quotes a price. If the cheapest package changes,
          the hero line changes with it, and the two can fall out of step
          again — which is the problem the price work existed to fix. */}
      <div className={s.pkgFoot}>
        <p>
          The site will say: <b>{cheapest > 0 ? `Films start at ₹${inr(cheapest)}` : 'nothing — every package is off'}</b>
          {' · '}{live.length} package{live.length === 1 ? '' : 's'} shown
        </p>
        <p className={s.sub}>Check this matches what your advertisement promises.</p>
      </div>

      {note ? <p className={note.startsWith('Saved') ? s.okmsg : s.errmsg}>{note}</p> : null}

      <button className={s.btn} disabled={busy || !changed || live.length === 0}
              onClick={() => {
                const values: Record<string, number> = {};
                for (const r of draft) {
                  values[`price_${r.code}`] = r.price;
                  values[`list_price_${r.code}`] = r.list;
                }
                onSave(values);
              }}>
        {busy ? 'Publishing…' : changed ? 'Publish to the site' : 'Nothing to publish'}
      </button>
    </div>
  );
}
