# Orbit Roundup

The public weekly roundup at orbit.objectspace.co.uk. XPLR Dash publishes each week to `data/weeks/<week>.json` (Roundup tab → Publish), and Cloudflare Pages builds this static site.

## v2: public dashboard (not live, at `/v2`, noindex)

The classic page (`/[week]`) is untouched. v2 uses XPLR Dash v2's design system (ink/paper/signal tokens, Anton + Geist, tone cards) and reads as a public XPLR dashboard:

- `/v2/` and `/v2/<week>/` (`app/v2/WeekView.tsx`): the issue up top, **Trending** (tags rising against the weeks before, `lib/trends.ts`), **Inspiration** as a row of tall story cards, **Your feed** with lenses (beats, Following, Saved) and #tag filters, then **Back in time**.
- `/v2/archive/`: search every issue (words, `#tag`, `?q=`), filter by beat, kind, week or your saves.
- `/v2/dashboard/`: your saves and followed topics, then Tom's standing custom feeds from `lib/dashboard.ts`.
- Stories open full screen (`app/v2/StoryViewer.tsx`): 8s each, tap/arrows/swipe, Space to pause, videos inline.
- Like (shared counts via `/api/likes/<week>`), Save and Send (share sheet, or copy/LinkedIn/X/WhatsApp/email) on every story. Saves, follows and seen state live in the browser (`orbit-v2-*`).

### Links and pictures

Run `npm run check-media` after publishing a week. It checks every link (dead or bounced-to-home links are dropped) and every picture (size, shape, then XPLR's local vision model via Ollama turns down logos, screenshots, slides and text-heavy or weak pictures). Results go to `data/media-check.json`, read at build time; turned-down pictures show the generated poster instead.

## Development

```bash
npm run dev
```
