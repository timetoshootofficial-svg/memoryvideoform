import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Tamil } from 'next/font/google';
import { getLang } from '@/lib/lang';
import { SITE } from '@/lib/site';
import './globals.css';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'], weight: ['600', '700', '800'],
  variable: '--font-display', display: 'swap',
});
const body = Inter({
  subsets: ['latin'], weight: ['400', '500', '600'],
  variable: '--font-body', display: 'swap',
});
const tamil = Noto_Sans_Tamil({
  subsets: ['tamil'], weight: ['400', '500', '700'],
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
