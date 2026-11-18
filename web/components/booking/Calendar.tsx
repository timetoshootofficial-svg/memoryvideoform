'use client';
import type { CalendarDay } from '@/lib/types';
import type { Lang, T } from '@/lib/i18n';
import { fmtDate, fmtMonth, DOW } from '@/lib/format';

/** The month grid. Pure: it is handed days and renders them. */
export default function Calendar({ cal, selected, lang, t, onPick }: {
  cal: CalendarDay[];
  selected: string;
  lang: Lang;
  t: T;
  onPick: (date: string) => void;
}) {
  const months: string[] = [];
  const byMonth: Record<string, CalendarDay[]> = {};
  for (const d of cal) {
    const key = d.date.slice(0, 7);
    if (!byMonth[key]) { byMonth[key] = []; months.push(key); }
    byMonth[key].push(d);
  }

  return (
    <>
      {months.map((key) => {
        const days = byMonth[key];
        const p = key.split('-');
        const firstDow = new Date(+p[0], +p[1] - 1, +days[0].date.slice(8, 10)).getDay();

        return (
          <div className="month" key={key}>
            <h4>{fmtMonth(key, lang)}</h4>
            <div className="dow">{DOW[lang].map((x, i) => <span key={i}>{x}</span>)}</div>
            <div className="days">
              {Array.from({ length: firstDow }, (_, i) => <span className="day pad" key={`p${i}`} />)}
              {days.map((d) => {
                const isSel = d.date === selected;
                const cls = ['day'];
                let sub = '';
                let disabled = false;
                if (isSel) { cls.push('sel'); sub = t('legend_selected'); }
                else if (d.selectable) {
                  cls.push('avail');
                  if (d.best) cls.push('best');
                  sub = t('slots_left', { n: d.slotsLeft });
                } else if (d.reason === 'full') { cls.push('full'); sub = t('full'); disabled = true; }
                else { cls.push('dis'); disabled = true; }

                return (
                  <button type="button" key={d.date} className={cls.join(' ')} disabled={disabled}
                          onClick={() => onPick(d.date)}
                          aria-label={`${fmtDate(d.date, lang)} ${sub}`}>
                    <span>{d.date.slice(8, 10).replace(/^0/, '')}</span>
                    <span className="s">{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
