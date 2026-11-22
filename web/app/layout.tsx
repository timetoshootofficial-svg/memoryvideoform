import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getLang } from '@/lib/lang';
import { SITE } from '@/lib/site';
import './globals.css';

/* The same three families as before, served from this repository instead of
   fetched from Google while the site builds.

   next/font/google downloads the font during `next build`. On 22 Nov 2026
   Google did not answer and the production deploy failed on a null dereference
   inside the loader — nothing to do with this site's code, and nothing anyone
   here could fix. These files are the exact ones it was downloading (the
   variable font for each family, same subsets), so the page looks identical
   and the build no longer needs the network.

   One file covers every weight because each is a variable font; the range is
   the font's own wght axis, trimmed to the weights this site uses. */
const display = localFont({
  src: './fonts/PlusJakartaSans-latin-var.woff2',
  weight: '600 800', style: 'normal',
  variable: '--font-display', display: 'swap',
});
const body = localFont({
  src: './fonts/Inter-latin-var.woff2',
  weight: '400 600', style: 'normal',
  variable: '--font-body', display: 'swap',
});
const tamil = localFont({
  src: './fonts/NotoSansTamil-tamil-var.woff2',
  weight: '400 700', style: 'normal',
  variable: '--font-tamil', display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'Timetoshoot — Memory films from your photos',
  description:
    'Send us your photos. We turn them into a short film your family will watch again and again. Made in Tamil Nadu.',
  openGraph: {
    title: 'Timetoshoot — Memory films from your photos',
    description: 'Memories fade. We give them life again.',
    url: SITE.url, siteName: SITE.name, locale: 'en_IN', type: 'website',
  },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${tamil.variable}`}>
      <body>{children}</body>
    </html>
  );
}
