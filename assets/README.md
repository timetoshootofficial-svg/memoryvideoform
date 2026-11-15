# Put your media here

| File | What | Notes |
|---|---|---|
| `keerthika.jpg` | Keerthika's photo for the hero | square, about 400×400, under 150 KB |
| `og.jpg` | link preview card | 1200×630, already made |

**Sample films live on YouTube now**, not in this folder. Put the video id in
`js/config.js` under `samples`:

```js
samples: [
  { youtube: '__pRxYUfCZU', label: 'Anniversary film' },
  ...
]
```

The id is the part after `youtu.be/` in the share link. Only the thumbnail
loads with the page; YouTube's player is fetched when a visitor taps, so the
page stays fast on mobile data. `label` is the caption under the film — leave
it `''` for none.

The videos must be Public or Unlisted. Private ones will not play.

Names and labels are set in `js/config.js` under `samples` and `founderPhoto`.

Missing files are handled gracefully: the hero shows a framed placeholder and
each sample shows a clapperboard card, so you can publish before the videos
are ready.

Keep videos small. People arrive from Instagram on mobile data — a 20 MB
sample film will cost you bookings.
