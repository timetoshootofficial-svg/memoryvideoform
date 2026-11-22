import s from '../app/legal.module.css';
import WhatsAppFab from './WhatsAppFab';
import type { Lang } from '@/lib/i18n';

/** The four pages a payment provider looks for, linked from each other. */
export const LEGAL_PAGES = [
  { href: '/terms', label: 'Terms' },
  { href: '/refunds', label: 'Refunds & Cancellation' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * The frame every legal page shares: the header, the cross-links and the
 * footer. Written once so the four pages cannot end up looking like four
 * different sites, which is exactly what an underwriter notices.
 */
export default function LegalShell(
  { title, updated, here, lang, whatsappNumber, whatsappLink, children }:
  { title: string; updated?: string; here: string; lang: Lang;
    whatsappNumber: string; whatsappLink: string; children: React.ReactNode },
) {
  return (
    <div className={s.page}>
      <header className={s.phead}>
        <div className={`${s.wrap} ${s.hrow}`}>
          <a className={s.brand} href="/"><span className={s.dot} /><span>TIMETOSHOOT</span></a>
          <a className={s.back} href="/">&larr; Back to site</a>
        </div>
      </header>

      <main className={s.wrap}>
        <h1>{title}</h1>
        {updated ? <p className={s.updated}>Last updated: {updated}</p> : null}
        {children}
      </main>

      <footer className={s.pfoot}>
        <div className={s.wrap}>
          <p style={{ margin: '0 0 10px' }}>
            {LEGAL_PAGES.map(({ href, label }, i) => (
              <span key={href}>
                {i > 0 ? ' · ' : ''}
                {href === here ? <span>{label}</span> : <a href={href}>{label}</a>}
              </span>
            ))}
          </p>
          <p style={{ margin: '0 0 6px' }}><a href="/">&larr; Back to Timetoshoot</a></p>
          <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Timetoshoot. All rights reserved.</p>
        </div>
      </footer>

      <WhatsAppFab lang={lang} number={whatsappNumber} link={whatsappLink} />
    </div>
  );
}
