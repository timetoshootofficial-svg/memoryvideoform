/**
 * Whoever fills this in is copying out of a dashboard, so take what they
 * paste rather than insisting on one exact shape. A missing scheme, a
 * trailing slash, a stray newline from the clipboard and the `/rest/v1`
 * suffix are all the same project, and each of them, at some point, meant
 * the live site silently served built-in prices instead of real ones.
 *
 * `db.<ref>.supabase.co` is NOT the same thing in spirit: it is the Postgres
 * server and speaks no HTTP at all. It is corrected here too, because it sits
 * one tab away from the API URL in the dashboard and is easy to grab instead.
 *
 * Deliberately free of `server-only` so it can be tested directly.
 */
export function normaliseSupabaseUrl(raw: string | undefined): string {
  let u = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!u) return '';

  /* A bare project reference. The dashboard shows it on its own in several
     places, so it is an easy thing to copy in place of the URL, and on its
     own it resolves to nothing at all. */
  if (/^[a-z0-9]{16,32}$/i.test(u)) return `https://${u.toLowerCase()}.supabase.co`;

  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/\/+$/, '');
  u = u.replace(/\/rest(\/v1)?$/i, '');
  u = u.replace(/^(https?:\/\/)db\./i, '$1');
  return u;
}
