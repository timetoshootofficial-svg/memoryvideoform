# Put your media here

| File | What | Notes |
|---|---|---|
| `keerthika.jpg` | Keerthika's photo for the hero | square, about 400×400, under 150 KB |
| `og.jpg` | link preview card | 1200×630, already made |
| `review-1.jpg`, `review-2.jpg`, … | WhatsApp feedback screenshots | **1080 × 1350 (4:5 portrait)**, under 250 KB each |

### Review screenshots

Crop each screenshot to **4:5 portrait — 1080 × 1350 px**. That is the same
shape Instagram uses, so it sits right on a phone and in the grid.

Keep the part of the conversation that carries the feeling. A screenshot
cropped to show three or four messages reads better than a whole scrolling
thread shrunk to fit.

**Blur out phone numbers and profile photos before you add them.** Those
belong to your customers, and the file goes into a public repository and a
public website.

Then list them in `js/config.js`:

```js
reviewImages: [
  'assets/review-1.jpg',
  'assets/review-2.jpg',
  'assets/review-3.jpg'
],
```

Two across on a phone, three on a tablet, four on a desktop. Tapping one opens
it full size. Leave the list empty and the section hides itself.

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
