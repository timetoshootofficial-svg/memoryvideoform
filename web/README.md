# Timetoshoot — Next.js rebuild

The same site, rebuilt as a Next.js 15 App Router app in React and TypeScript.
The Postgres backend is untouched: this is a front end swap.

```
npm install
cp .env.example .env.local     # fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm run dev                    # http://localhost:3000
npm run build && npm start
npm test                       # 14 logic and copy tests
npm run typecheck
```

## How it is put together

| | |
|---|---|
| `app/page.tsx` | Server Component. Fetches prices and availability and renders them into the HTML. |
| `app/api/*` | Route Handlers. The only things that talk to Supabase from a request. |
| `lib/supabase.ts` | `import 'server-only'` — cannot be pulled into a client bundle. |
| `lib/logic.ts` | The booking rules, ported to TypeScript. Postgres still has the authoritative copy. |
| `lib/i18n.ts` | All 139 strings × 2 languages, ported verbatim. |
| `app/globals.css` | The original stylesheet, unchanged apart from the three font tokens. |

## What this rebuild actually changed

**The Supabase key no longer reaches the browser.** On the static site it
shipped in `js/config.js` on every page load. Here it lives in the server
environment and the browser only ever calls `/api/*`. The row level security
behind it is unchanged, so this is a second lock rather than the only one.

**Prices and the calendar arrive inside the HTML.** The static page painted,
then asked for them. This one renders 57 selectable days server-side, so there
is no second round trip before the calendar is usable.

**The language no longer flashes.** The choice is a cookie read on the server,
so a Tamil reader gets Tamil in the first byte instead of English for a moment.

**Thumbnails are re-encoded.** `next/image` serves AVIF instead of YouTube's
JPEGs: 415 KB → 52 KB.

**A bug came along for free.** The old dashboard only named three of the six
film lengths, so a 4m booking displayed as `4m`. All six are named here.

## Measured, not estimated

Both served locally, same machine, same Supabase project.

| | static | Next.js |
|---|---|---|
| HTML + JS, over the wire (gzip) | **37 KB** | 167 KB |
| YouTube thumbnails | 415 KB | **52 KB** |
| **first load, total** | 452 KB | **220 KB** |
| JS to parse and run | 132 KB raw | 578 KB raw |
| Build step | none | ~3 s |
| Dependencies | 0 | 4 runtime |

So the rebuild is lighter in bytes, and heavier in JavaScript. On a fast phone
that trade is clearly good. On a slow one the parse cost of 578 KB of
JavaScript is real and the static page would still start faster.

The thumbnail saving is the larger half of the win, and it was never a Next.js
feature — the same 362 KB could be saved on the static site by pre-encoding
the four images. Worth knowing before concluding the framework did it.

## What has NOT been done

- Not deployed. Vercel still serves the static site from `main`.
- No Meta Pixel. `NEXT_PUBLIC_PIXEL_ID` is read but nothing is injected yet;
  the static site fired a `Lead` event on reservation and this does not.
- `npm audit` has not been run or cleared.
- The booking flow was driven end to end in a real browser up to the reserve
  button, but no booking was submitted, so the success screen and the
  WhatsApp hand-off are untested against the live database.
