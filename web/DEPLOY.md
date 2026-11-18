# Deploying this app

Vercel builds from this folder, not the repository root.

| Setting | Value |
|---|---|
| Root Directory | `web` |
| Framework Preset | Next.js |
| Build Command | leave to the framework |
| Output Directory | leave to the framework |
| Install Command | leave to the framework |

`vercel.json` beside this file pins the framework, so a dashboard preset left
on "Other" from the old static site cannot quietly turn the build into a file
upload again. That is what happened once: the Root Directory was right, the
preset was not, and Vercel published only `public/` — which has no index.html,
so every page answered 404 while `/reviews/review-1.jpg` still worked.

## Environment variables

Both are needed in **Production**, or the page renders with fallback prices
and the form cannot reach the database:

```
SUPABASE_URL              https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY  sb_publishable_...
```

Never add the secret key (`sb_secret_...`). Nothing here needs it.

## Checking a deployment went out

```
curl -sI https://timetoshoot.in/ | head -1          # 200
curl -s  https://timetoshoot.in/ | grep -o '<title>[^<]*'
                                                    # Memory films from your photos
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     https://timetoshoot.in/api/events \
     -H 'Content-Type: application/json' -d '{"events":[]}'
                                                    # 200
```

If `/reviews/review-1.jpg` answers 200 but `/` answers 404, the build was a
file upload rather than a Next.js build: check the Framework Preset.

## The repository root

`vercel.json`, `index.html` and `js/` at the root are the previous static
site. They are kept as a fallback and are not deployed while Root Directory
is `web`.
