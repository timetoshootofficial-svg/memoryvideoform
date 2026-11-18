import { cookies } from 'next/headers';
import { LANG_COOKIE } from './lang-shared';
import type { Lang } from './i18n';

export { LANG_COOKIE };

/**
 * The chosen language lives in a cookie rather than in React state, so the
 * server renders the right language in the very first byte. The static site
 * had to swap the text after hydration, which showed English for a moment to
 * every Tamil reader.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === 'ta' ? 'ta' : 'en';
}
