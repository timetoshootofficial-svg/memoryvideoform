'use client';
import { useEffect, useState } from 'react';
import { makeT, type Lang } from '@/lib/i18n';

/** Appears once the hero has scrolled away, and hides while the form is open. */
export default function StickyCta({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const book = document.getElementById('book');
    const hero = document.querySelector('.hero');
    if (!book || !hero) return;

    let heroGone = false;
    let formVisible = false;
    const update = () => setShow(heroGone && !formVisible);

    const o1 = new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting; update(); },
      { rootMargin: '-120px 0px 0px 0px' });
    const o2 = new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; update(); },
      { threshold: 0.18 });
    o1.observe(hero);
    o2.observe(book);
    return () => { o1.disconnect(); o2.disconnect(); };
  }, []);

  return (
    /* The stylesheet shows .sticky by default and tucks it away with .hide,
       so the class is the inverse of the state. */
    <div className={`sticky${show ? '' : ' hide'}`}>
      <div className="wrap">
        <a className="btn btn-primary" href="#book">{t('sticky_cta')}</a>
      </div>
    </div>
  );
}
