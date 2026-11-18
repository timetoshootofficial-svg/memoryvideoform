import type { T } from '@/lib/i18n';

const Tick = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth="3" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/* A plain anchor, not a button with a scroll handler: it works before React
   has loaded, which on a phone opening this from an Instagram ad is the
   moment the visitor is most likely to tap. */
export default function Hero({ t, clients, holdHours }: { t: T; clients: string; holdHours: number }) {
  return (
    <section className="hero">
      <div className="wrap">
        <span className="kicker">{t('hero_tagline')}</span>
        <h1 className="display">
          <span>{t('hero_h1_1')}</span> <span className="alt">{t('hero_h1_2')}</span>
        </h1>
        <p className="sub">{t('hero_sub')}</p>
        <div className="hero-proof">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.3 6.9.8-5 4.7 1.3 6.8L12 17.3 5.9 20.6 7.2 13.8 2.2 9.1l6.9-.8z" />
          </svg>
          <span>{t('hero_badge', { count: clients })}</span>
        </div>
        <ul className="badges">
          <li><Tick /><span>{t('hero_point_1')}</span></li>
          <li><Tick /><span>{t('hero_point_2')}</span></li>
          <li><Tick /><span>{t('hero_point_3', { hours: holdHours })}</span></li>
        </ul>
        <a className="btn btn-primary" href="#book">{t('start_cta')}</a>
      </div>
    </section>
  );
}
