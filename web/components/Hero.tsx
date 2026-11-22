import type { T, Lang } from '@/lib/i18n';
import Stats from './Stats';

/* A plain anchor, not a button with a scroll handler: it works before React
   has loaded, which on a phone opening this from an Instagram ad is the
   moment the visitor is most likely to tap. */
export default function Hero({ t, lang, clients, fromPrice }: {
  t: T;
  lang: Lang;
  clients: string;
  fromPrice: number;
}) {
  return (
    <section className="hero">
      <div className="wrap">
        <span className="kicker">{t('hero_tagline')}</span>
        {/* Two copies on purpose. The first is the heading: ordinary black
            text, always painted, never animated. The second is the gold one,
            laid exactly over it and shown only through a sliding window, so
            the light appears to travel through the letters. If the animation
            never runs, the second copy simply stays hidden off to one side
            and the heading is there in plain ink. */}
        <div className="h1wrap">
          <h1 className="display">
            <span>{t('hero_h1_1')}</span> <span className="alt">{t('hero_h1_2')}</span>
          </h1>
          <h1 className="display lit" aria-hidden="true">
            <span>{t('hero_h1_1')}</span> <span className="alt">{t('hero_h1_2')}</span>
          </h1>
        </div>
        <p className="sub">{t('hero_sub')}</p>
        <Stats lang={lang} clients={clients} />
        <a className="btn btn-primary" href="#book">{t('start_cta')}</a>
        {/* The advertisement quotes this price, so the page must carry it
            before the form does. Read at the moment the thumb is already on
            the button, which is when the question is actually being asked. */}
        {fromPrice > 0 ? (
          <p className="fromprice">{t('hero_price', { amount: fromPrice.toLocaleString('en-IN') })}</p>
        ) : null}
      </div>
    </section>
  );
}
