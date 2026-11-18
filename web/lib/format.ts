import type { Lang } from './i18n';

const locale = (lang: Lang) => (lang === 'ta' ? 'ta-IN' : 'en-IN');

/** 'Mon, 15 Dec' in the reader's language. Falls back to the raw date. */
export function fmtDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const p = iso.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  try {
    return d.toLocaleDateString(locale(lang), { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return iso; }
}

export function fmtMonth(key: string, lang: Lang): string {
  const p = key.split('-');
  try {
    return new Date(+p[0], +p[1] - 1, 1)
      .toLocaleDateString(locale(lang), { month: 'long', year: 'numeric' });
  } catch { return key; }
}

export const inr = (n: number) => Number(n || 0).toLocaleString('en-IN');

/* wa.me mangles emoji, so none of the message templates carry any. */
export function waUrl(whatsappNumber: string, text: string): string {
  const num = String(whatsappNumber || '917448326503').replace(/[^0-9]/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export const DOW: Record<Lang, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  ta: ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'],
};
