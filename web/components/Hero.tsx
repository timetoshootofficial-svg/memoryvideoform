import type { T, Lang } from '@/lib/i18n';
import Stats from './Stats';

/* A plain anchor, not a button with a scroll handler: it works before React
   has loaded, which on a phone opening this from an Instagram ad is the
   moment the visitor is most likely to tap. */
export default function Hero({ t, lang, clients }: {
  t: T;
  lang: Lang;
  clients: string;
}) {
  return (
    <section className="hero">
      <div className="wrap">
        <span className="kicker">{t('hero_tagline')}</span>
        <h1 className="display">
          <span>{t('hero_h1_1')}</span> <span className="alt">{t('hero_h1_2')}</span>
        </h1>
        <p className="sub">{t('hero_sub')}</p>
        <Stats lang={lang} clients={clients} />
        <a className="btn btn-primary" href="#book">{t('start_cta')}</a>
      </div>
    </section>
  );
}
