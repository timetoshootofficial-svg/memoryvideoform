'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE } from '@/lib/lang-shared';
import type { Lang } from '@/lib/i18n';

/** Writes the cookie, then asks the server to re-render in that language. */
export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (next: Lang) => {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };

  return (
    <div className="langtog" role="group" aria-label="Language" data-pending={pending || undefined}>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => choose('en')}>EN</button>
      <button type="button" aria-pressed={lang === 'ta'} onClick={() => choose('ta')}>தமிழ்</button>
    </div>
  );
}
