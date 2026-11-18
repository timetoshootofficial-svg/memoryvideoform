'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { makeT, type Lang } from '@/lib/i18n';
import { SITE } from '@/lib/site';

export default function Reviews({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const [open, setOpen] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const shots = SITE.reviewImages.filter((s) => !broken.has(s));
  if (!shots.length) return null;

  const track = [...shots, ...shots];

  return (
    <section id="testimonials">
      <div className="wrap">
        <h2 className="sec-h display">{t('testi_title')}</h2>
        <div className="marquee">
          <div className="shots" style={{ animationDuration: `${Math.max(30, shots.length * 9)}s` }}>
            {track.map((src, i) => (
              <button key={i} type="button" className="shot" onClick={() => setOpen(src)}
                      tabIndex={i >= shots.length ? -1 : undefined}
                      {...(i >= shots.length ? { 'aria-hidden': true } : {})}
                      aria-label={t('testi_open')}>
                <Image src={src} alt="" width={1080} height={1350} loading="lazy"
                       /* A file that never arrived should not leave a grey hole. */
                       onError={() => setBroken((b) => new Set(b).add(src))} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {open ? (
        <div className="lightbox on" role="dialog" aria-modal="true" aria-label="Review"
             onClick={() => setOpen(null)}>
          <button type="button" className="x" aria-label="Close" onClick={() => setOpen(null)}>&times;</button>
          <Image src={open} alt="" width={1080} height={1350} />
        </div>
      ) : null}
    </section>
  );
}
