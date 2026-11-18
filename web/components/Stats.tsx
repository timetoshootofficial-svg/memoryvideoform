'use client';
import { makeT, type Lang } from '@/lib/i18n';
import CountUp from './CountUp';

/**
 * One number under the headline.
 *
 * It was three — families, delivery time, starting price — and three columns
 * of small type read like a specification sheet. A single figure, given room,
 * is the more confident thing to say, and the price has its own step in the
 * form a moment later anyway.
 *
 * No card around it: a border drawn around one number looks like a widget.
 */
export default function Stats({ lang, clients }: { lang: Lang; clients: string }) {
  const t = makeT(lang);

  /* "500+" -> 500 and "+", so the number can count and the mark stays put. */
  const digits = Number(String(clients).replace(/[^0-9]/g, '')) || 0;
  const suffix = String(clients).replace(/[0-9,\s]/g, '').slice(0, 2);

  if (digits <= 0) return null;

  return (
    <p className="stat1">
      <span className="n">
        <CountUp value={digits} duration={1400} />
        {suffix ? <span className="unit">{suffix}</span> : null}
      </span>
      <i className="rule" aria-hidden="true" />
      <span className="l">{t('stat_families')}</span>
    </p>
  );
}
