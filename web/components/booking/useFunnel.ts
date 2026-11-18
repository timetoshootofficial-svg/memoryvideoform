'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { Lang } from '@/lib/i18n';

export interface FunnelEvent {
  sessionId: string; event: string; step: string; language: string; utm_campaign: string;
}

const UTM_KEY = 'tts_utm';
const SID_KEY = 'tts_sid';

export function sessionId(): string {
  try {
    let v = sessionStorage.getItem(SID_KEY);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, v);
    }
    return v;
  } catch { return 'nostore'; }
}

/** Ad parameters, kept for the whole visit so a booking can be attributed. */
export function captureUtm(): Record<string, string> {
  let stored: Record<string, string> = {};
  try { stored = JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}'); } catch { /* ignore */ }
  try {
    const q = new URLSearchParams(window.location.search);
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                     'ad_id', 'adset_id', 'campaign_id', 'fbclid']) {
      const v = q.get(k);
      if (v) stored[k] = v.slice(0, 200);
    }
    if (!stored.referrer && document.referrer) stored.referrer = document.referrer.slice(0, 200);
    sessionStorage.setItem(UTM_KEY, JSON.stringify(stored));
  } catch { /* ignore */ }
  return stored;
}

/** Batches events and sends them on a timer, on unload, and when six pile up. */
export function useFunnel(lang: Lang) {
  const queue = useRef<FunnelEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utm = useRef<Record<string, string>>({});

  const flush = useCallback((unloading = false) => {
    if (!queue.current.length) return;
    const events = queue.current.slice(0, 50);
    queue.current = [];
    if (timer.current) clearTimeout(timer.current);
    try {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: unloading,
      }).catch(() => {});
    } catch { /* never let analytics break the page */ }
  }, []);

  const track = useCallback((event: string, step: string | number = '') => {
    queue.current.push({
      sessionId: sessionId(), event, step: String(step),
      language: lang, utm_campaign: utm.current.utm_campaign || '',
    });
    if (queue.current.length >= 6) flush();
    else {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), 4000);
    }
  }, [lang, flush]);

  useEffect(() => {
    utm.current = captureUtm();
    track('page_view', 0);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(true); };
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { track, flush, utm };
}
