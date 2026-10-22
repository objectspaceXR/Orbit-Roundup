# Orbit Roundup

The public weekly roundup at orbit.objectspace.co.uk. XPLR Dash publishes each week to `data/weeks/<week>.json` (Roundup tab → Publish), and Cloudflare Pages builds this static site.

## The site

It uses XPLR Dash v2's design system (ink/paper/signal tokens, Anton + Geist, tone cards) and reads as a public XPLR dashboard. (This was "v2" at `/v2` until 2026-10; old `/v2` links redirect via `public/_redirects`.)

- `/` and `/<week>/` (`app/WeekView.tsx`): the issue up top, **Trending** (tags rising against the weeks before, `lib/trends.ts`), **Inspiration** as a row of tall story cards, **Your feed** with lenses (beats, Following, Saved) and #tag filters, then **Back in time**.
- `/archive/`: search every issue (words, `#tag`, `?q=`), filter by beat, kind, week or your saves.
- `/dashboard/` (noindex): your saves and followed topics, then Tom's standing custom feeds from `lib/dashboard.ts`.
- Stories open full screen (`app/StoryViewer.tsx`): 8s each, tap/arrows/swipe, Space to pause, videos inline.
- Like (shared counts via `/api/likes/<week>`), Save and Send (share sheet, or copy/LinkedIn/X/WhatsApp/email) on every story. Saves, follows and seen state live in the browser (`orbit-v2-*`).

### Links and pictures

Run `npm run check-media` after publishing a week. It checks every link (dead or bounced-to-home links are dropped) and every picture (size, shape, then XPLR's local vision model via Ollama turns down logos, screenshots, slides and text-heavy or weak pictures). Results go to `data/media-check.json`, read at build time; turned-down pictures show the generated poster instead.

## Development

```bash
npm run dev
```
