import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY. Delete this route once the deployment is confirmed working.
 *
 * It reports only what is needed to tell a misconfigured environment from a
 * broken one: whether each variable is present, how long it is, the host it
 * would call, and what that host answers. It never returns a key, and it is
 * behind a one-off token so it is not readable by anyone who finds the path.
 */
export async function GET(req: Request) {
  const given = new URL(req.url).searchParams.get('k') ?? '';
  if (given !== 'cc86b795de0202cffe340215') return new NextResponse('not found', { status: 404 });

  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

  let host = '(unparseable)';
  let pathname = '';
  try { const u = new URL(url); host = u.protocol + '//' + u.host; pathname = u.pathname; }
  catch { /* leave as is */ }

  const target = `${url}/rest/v1/rpc/tts_bootstrap`;
  let probe: Record<string, unknown> = {};
  try {
    const r = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: '{}',
      cache: 'no-store',
    });
    probe = { status: r.status, contentType: r.headers.get('content-type'),
              server: r.headers.get('server'), body: (await r.text()).slice(0, 160) };
  } catch (e) {
    probe = { threw: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    urlSet: url.length > 0,
    urlLength: url.length,
    urlHost: host,
    urlPath: pathname,
    urlHasTrailingSlash: /\/$/.test(url),
    urlHasWhitespace: /\s/.test(url),
    keySet: key.length > 0,
    keyLength: key.length,
    keyPrefix: key.slice(0, 14),
    keyHasWhitespace: /\s/.test(key),
    targetCalled: target.replace(key, '***'),
    probe,
  });
}
