'use client';
import { useState } from 'react';
import Image from 'next/image';
import { makeT, type Lang, type T } from '@/lib/i18n';
import { SITE } from '@/lib/site';

type Sample = { youtube: string; label: string };

/**
 * A facade: only a thumbnail loads with the page, and the YouTube player
 * arrives on tap. Embedding four iframes up front costs about a megabyte and
 * hands YouTube a visitor who has not asked to watch anything yet.
 *
 * next/image re-encodes the thumbnails to AVIF, which is where most of this
 * rebuild's weight saving comes from.
 */
function Reel({ s, clone, t, playing, onPlay }: {
  s: Sample; clone: boolean; t: T; playing: boolean; onPlay: () => void;
}) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${s.youtube}/maxresdefault.jpg`);

  if (playing) {
    return (
      <div className="reel">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${s.youtube}?autoplay=1&rel=0&playsinline=1`}
          title={s.label || t('samples_play')} allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen loading="lazy"
        />
        {s.label ? <div className="cap">{s.label}</div> : null}
      </div>
    );
  }

  return (
    <div className="reel" {...(clone ? { 'aria-hidden': true } : {})}>
      <button type="button" className="yt" onClick={onPlay}
              tabIndex={clone ? -1 : undefined} aria-label={t('samples_play')}>
        <Image src={src} alt="" width={640} height={360} loading="lazy"
               /* maxresdefault does not exist for every upload. */
               onError={() => setSrc(`https://i.ytimg.com/vi/${s.youtube}/hqdefault.jpg`)} />
        <span className="play">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A0A0A" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
      {s.label ? <div className="cap">{s.label}</div> : null}
    </div>
  );
}

export default function WorkMarquee({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const items = SITE.samples.filter((s) => s.youtube) as unknown as Sample[];
  const [playing, setPlaying] = useState<number | null>(null);

  if (!items.length) return null;

  /* Two copies so the loop hands off without a visible jump. */
  const track = [...items, ...items];

  return (
    <section id="samples">
      <div className="wrap">
        <h2 className="sec-h display">{t('samples_title')}</h2>
        <p className="sec-s">{t('samples_sub')}</p>
      </div>
      <div className="wrap">
        <div className="marquee on-alt">
          <div className="reels"
               style={{ animationDuration: `${Math.max(28, items.length * 11)}s`,
                        animationPlayState: playing === null ? undefined : 'paused' }}>
            {track.map((s, i) => (
              <Reel key={i} s={s} clone={i >= items.length} t={t}
                    playing={playing === i} onPlay={() => setPlaying(i)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
