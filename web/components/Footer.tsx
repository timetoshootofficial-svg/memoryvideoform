import type { T } from '@/lib/i18n';

export default function Footer({ t, instagram, whatsapp }:
  { t: T; instagram: string; whatsapp: string }) {
  return (
    <footer>
      <div className="wrap">
        <div className="brand" style={{ marginBottom: 8 }}>
          <span className="dot" /><span>TIMETOSHOOT</span>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{t('footer_tagline')}</p>
        <div className="fcols">
          <div>
            <div className="flinks">
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="#FFC700" />
                </svg>
                <span>{t('footer_instagram')}</span>
              </a>
              <a href={whatsapp} target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFC700" aria-hidden="true">
                  <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 2a8 8 0 110 16 8 8 0 01-4.2-1.2l-.4-.2-2.6.7.7-2.5-.3-.4A8 8 0 0112 4zm-2.2 3.6c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 1.8s.6 1.8 1.6 2.9 2 1.7 3.4 2.1c.6.2 1.1.1 1.5-.1.4-.2.8-.7.9-1.1.1-.4 0-.6-.1-.7l-1.4-.7c-.2-.1-.4 0-.5.1l-.5.6c-.1.1-.2.1-.4 0a6 6 0 01-1.6-1 5 5 0 01-1-1.3c-.1-.2 0-.3.1-.4l.4-.5.1-.4-.6-1.4c-.1-.1-.2-.2-.3-.2z" />
                </svg>
                <span>{t('footer_whatsapp')}</span>
              </a>
            </div>
          </div>
          <div>
            <p className="fnote">{t('footer_privacy')}</p>
            {/* Razorpay looks for these four, and looks for them linked from
                the page people actually pay on. */}
            <p className="fnote">
              {([['/terms', 'footer_terms_link'],
                 ['/refunds', 'footer_refunds_link'],
                 ['/privacy', 'footer_privacy_link'],
                 ['/contact', 'footer_contact_link']] as const).map(([href, key], i) => (
                <span key={href}>
                  {i > 0 ? ' \u00b7 ' : ''}
                  <a href={href} style={{ textDecoration: 'underline' }}>{t(key)}</a>
                </span>
              ))}
            </p>
            <p className="fnote">{t('footer_rights', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
