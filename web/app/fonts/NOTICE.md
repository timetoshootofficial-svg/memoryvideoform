# Fonts

These three files are served from this site instead of from Google.

| File | Family | Weights used | Subset |
|---|---|---|---|
| `PlusJakartaSans-latin-var.woff2` | Plus Jakarta Sans | 600–800 | latin |
| `Inter-latin-var.woff2` | Inter | 400–600 | latin |
| `NotoSansTamil-tamil-var.woff2` | Noto Sans Tamil | 400–700 | tamil |

Each is the **variable** font, which is why one file covers every weight. They
are the exact files `next/font/google` was downloading at build time — taken
from the same `fonts.gstatic.com` URLs its CSS points at, same subsets.

All three are licensed under the SIL Open Font License 1.1, which permits
bundling and serving them: https://openfontlicense.org

## Why they live here

The build used to fetch them from Google every time. On 22 Nov 2026 that fetch
failed and the production deploy died with:

    An error occurred in `next/font`.
    TypeError: Cannot read properties of null (reading '1')

Nothing was wrong with the site — Google simply did not answer. Now the build
needs no network for fonts, so it cannot fail that way again.

## Replacing one

Download the woff2 the Google CSS points at for the subset you want, drop it
here, and keep the weight range in `app/layout.tsx` matching the font's own
`wght` axis.
