'use client';
import { makeT, type Lang } from '@/lib/i18n';
import CountUp from './CountUp';

/**
 * Three numbers under the headline, in place of the yellow "200+" pill and
 * the row of ticks that sat under it.
 *
 * Every figure here is real and comes from the config table: how many
 * families, how long delivery takes, and the cheapest film on offer. Nothing
 * is invented to fill the third column — if a price is not set, the column
 * is not shown.
 */
export default function Stats({ lang, clients, deliveryDays, fromPrice }: {
  lang: Lang;
  clients: string;
  deliveryDays: number;
  fromPrice: number;
}) {
  const t = makeT(lang);

  /* "200+" -> 200 and "+", so the number can count and the suffix stays put. */
  const digits = Number(String(clients).replace(/[^0-9]/g, '')) || 0;
  const suffix = String(clients).replace(/[0-9,\s]/g, '').slice(0, 2);

  const cells: Array<{ key: string; node: React.ReactNode; label: string }> = [];

  if (digits > 0) {
    cells.push({
      key: 'families',
      node: <><CountUp value={digits} />{suffix ? <span className="unit">{suffix}</span> : null}</>,
      label: t('stat_families'),
    });
  }
  if (deliveryDays > 0) {
    cells.push({
      key: 'delivery',
      node: <><CountUp value={deliveryDays} duration={800} /><span className="unit">{' '}{t('stat_days')}</span></>,
      label: t('stat_delivery'),
    });
  }
  if (fromPrice > 0) {
    cells.push({
      key: 'price',
      node: <>₹<CountUp value={fromPrice} duration={1300} /></>,
      label: t('stat_price'),
    });
  }

  if (cells.length < 2) return null;

  return (
    <div className="stats" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
      {cells.map((c) => (
        <div key={c.key}>
          <span className="n">{c.node}</span>
          <i className="rule" aria-hidden="true" />
          <span className="l">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
