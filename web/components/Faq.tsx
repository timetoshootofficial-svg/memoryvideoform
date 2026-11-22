import type { T } from '@/lib/i18n';

/* <details> rather than a JavaScript accordion: it opens with no script at
   all, and screen readers already know what it is. */
/* Both of these used to arrive as one English sentence out of the config
   table, which meant the Tamil page quietly showed English. They are numbers
   now, and each language writes its own sentence around them. */
export default function Faq({ t, deliveryDays, revisions }:
  { t: T; deliveryDays: number; revisions: number }) {
  const items: Array<[string, string]> = [
    [t('faq_1_q'), t('faq_1_a')],
    [t('faq_2_q'), t('faq_2_a', { delivery: t('delivery_line', { days: deliveryDays }) })],
    [t('faq_3_q'), t('faq_3_a_default', { n: revisions })],
    [t('faq_4_q'), t('faq_4_a')],
    [t('faq_5_q'), t('faq_5_a')],
    [t('faq_6_q'), t('faq_6_a')],
  ];
  return (
    <section id="faq">
      <div className="wrap">
        <h2 className="sec-h display">{t('faq_title')}</h2>
        <div className="faq">
          {items.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
