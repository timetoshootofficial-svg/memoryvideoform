'use client';
import Script from 'next/script';

/**
 * The Meta Pixel.
 *
 * Without it Meta can only optimise toward clicks, because clicks are all it
 * can see — which is how an advertiser ends up paying for people who were
 * never going to buy. With it, Meta learns who actually books and goes
 * looking for more of them.
 *
 * It is loaded `afterInteractive`, so it never competes with the page itself
 * for the first paint. If no id is configured nothing is injected at all:
 * a half-loaded pixel reports worse numbers than no pixel.
 */
export default function MetaPixel({ id }: { id: string }) {
  if (!/^\d{10,20}$/.test(id)) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
        (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${id}');
        fbq('track','PageView');
      `}</Script>
      {/* For the small share of visitors with JavaScript off. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} alt=""
             src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
