import type { T } from '@/lib/i18n';

const STEPS = [
  { n: '01', k: 'how_1', who: 'who_you', cls: 'you' },
  { n: '02', k: 'how_2', who: 'who_us', cls: '' },
  { n: '03', k: 'how_3', who: 'who_us', cls: 'key' },
  { n: '04', k: 'how_4', who: 'who_us', cls: '' },
] as const;

export default function Process({ t, deliveryText }: { t: T; deliveryText: string }) {
  return (
    <section id="how" className="alt-bg">
      <div className="wrap">
        <h2 className="sec-h display">{t('how_title')}</h2>
        <p className="sec-s">{t('how_sub')}</p>
        <ol className="process">
          {STEPS.map((s) => (
            <li key={s.n} className={s.cls || undefined}>
              <span className="n">{s.n}</span>
              <div>
                <b>{t(`${s.k}_t` as 'how_1_t')}</b>
                <p>{t(`${s.k}_d` as 'how_1_d', { delivery: deliveryText })}</p>
                <span className="who">{t(s.who)}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
