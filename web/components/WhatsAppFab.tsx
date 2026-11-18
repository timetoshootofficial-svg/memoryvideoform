'use client';
import { makeT, type Lang } from '@/lib/i18n';

/**
 * Always there, bottom right, on every page.
 *
 * It opens the plain enquiry message, not the booking one: someone who taps
 * this has not filled the form in, so the message must not claim a film
 * length or a reference that does not exist.
 */
export default function WhatsAppFab({ lang, number, link }: {
  lang: Lang; number: string; link: string;
}) {
  const t = makeT(lang);
  const clean = String(number || '917448326503').replace(/[^0-9]/g, '');
  const href = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(link)
    ? link
    : `https://wa.me/${clean}?text=${encodeURIComponent(t('wa_plain'))}`;

  return (
    <a className="wafab" href={href} target="_blank" rel="noopener"
       aria-label={t('footer_whatsapp')}>
      <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 2a8 8 0 110 16 8 8 0 01-4.2-1.2l-.4-.2-2.6.7.7-2.5-.3-.4A8 8 0 0112 4zm-2.2 3.6c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 1.8s.6 1.8 1.6 2.9 2 1.7 3.4 2.1c.6.2 1.1.1 1.5-.1.4-.2.8-.7.9-1.1.1-.4 0-.6-.1-.7l-1.4-.7c-.2-.1-.4 0-.5.1l-.5.6c-.1.1-.2.1-.4 0a6 6 0 01-1.6-1 5 5 0 01-1-1.3c-.1-.2 0-.3.1-.4l.4-.5.1-.4-.6-1.4c-.1-.1-.2-.2-.3-.2z" />
      </svg>
    </a>
  );
}
