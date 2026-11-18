import type { T } from '@/lib/i18n';

/* <details> rather than a JavaScript accordion: it opens with no script at
   all, and screen readers already know what it is. */
export default function Faq({ t, deliveryText, revisionsText }:
  { t: T; deliveryText: string; revisionsText: string }) {
  const items: Array<[string, string]> = [
    [t('faq_1_q'), t('faq_1_a')],
    [t('faq_2_q'), t('faq_2_a', { delivery: deliveryText })],
    [t('faq_3_q'), revisionsText.trim() || t('faq_3_a_default')],
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
