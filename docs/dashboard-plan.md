# Dashboard plan: your own Orbit

Status: **planned, not built** (22 Oct 2026). The Dashboard tab is hidden; the page is still at `/dashboard/`.
Don't unhide it until it works per visitor.

Each visitor gets their own Orbit, built from every issue so far:

- **A. Topics you follow:** tags or your own words, gathered across every week.
- **B. Catch up:** what's new in your topics since you last looked, playable as stories.
- **C. Bookmarks:** tools, articles, projects and videos you keep, with filters.

It works signed out (kept in the browser) and persists across devices once you sign in.

---

## A. Topics you follow

- **+ Follow** on any #tag, or type your own words ("gaussian splats", "Vision Pro").
- **Starter topics:** Tom's current feeds in `lib/dashboard.ts` (Smart glasses watch, Blender & 3D craft, Generative
  video, Tools to try, The big labs) become ready-made topics anyone can add in one tap, not feeds everyone sees.
- Rename a topic, add or remove its words, delete it.
- Matching uses the topic matching below, so a topic finds stories that use other words for the same thing.

## B. Catch up

- Per topic: what's new since you last caught up ("Smart glasses: 4 new").
- **Play catch-up** plays everything new as stories (same viewer and Play decks as the banner); finishing marks it caught up.
- Top of the dashboard: "Since your last visit: 11 new across 3 topics".

## C. Bookmarks

- Save any story on Orbit. It's filed as **tool**, **article**, **project** or **video** automatically (from its tags,
  e.g. `tools`, `inspiration`, a video link); you can change it.
- Optional: paste any link, and a Pages Function fetches its title and picture.
- Filters: type, beat (XR / Design / AI), #tag, week, and a search box. A short note per bookmark.

---

## Topic matching (the part that makes A and B work)

The problem: today a topic matches only an exact tag, or exact words in the title or summary. "Smart glasses" misses
a story tagged `ar-glasses`; "Gaussian splats" misses "3DGS" or "radiance fields". Published weeks hold both
`ar-glasses` and `xr-glasses`, because XPLR only started folding them together later.

Three layers, cheapest and most predictable first:

### 1. One shared list of topics and their other names (build with the dashboard)

- A file mapping each topic to the names it goes by, e.g.
  - `xr-glasses`: smart glasses, AR glasses, XR glasses, Spectacles, Ray-Ban Meta, Orion, Android XR glasses
  - `gaussian-splats`: 3DGS, splatting, splats, radiance fields, NeRF
- Topics and stories both go through it, older weeks included, so `ar-glasses` and `xr-glasses` are the same thing.
- Small differences match on their own: capitals, hyphen or space, plurals.
- **One list for both apps:** it starts from XPLR's `src/lib/canonical-tags.ts` (which already folds
  `ar-glasses`, `smart glasses`, `spectacles`, `ray-ban`, `rayneo` into `xr-glasses`) and is copied to Orbit the way the
  Roundup format is (`lib/roundup.ts` ↔ XPLR `src/lib/orbit/roundup-format.ts`). Tom keeps it.
- **At publish time:** when Claude writes each story's digest title and summary in XPLR, it also picks topics from
  this list, so stories arrive already tagged and the list stays useful without hand-fixing tags.

### 2. Suggest related tags when a topic is made (build with the dashboard)

- Typing "Gaussian splats" suggests tags that often appear on the same stories: "Also include #3dgs,
  #radiance-fields, #nerf?" Tick the ones you want.
- Each story says why it matched ("matched: 3dgs"); **Not this** takes it out of that topic for you.

### 3. Match by meaning (later, once people use topics)

- When XPLR publishes, it adds an embedding (a "meaning fingerprint") per story, made locally with Ollama like the
  picture checks.
- A topic's words get the same kind of fingerprint from a Pages Function (Cloudflare Workers AI embeddings), and
  stories that mean the same thing match even with no shared words ("Meta's new wearable display" for smart glasses).
- Costs more and is less predictable: an option per topic, **Include related stories**, added after 1 and 2.

---

## Storage and sign-in

- **One JSON document per person in Cloudflare KV**, the same kind of storage the like counts use (`ORBIT_LIKES`); a
  new namespace, e.g. `ORBIT_USERS`, keyed by user id. R2 (a bucket with a JSON file each) also works, but KV is
  already set up and fits the size.
- Each save carries a version number, so changes from phone and laptop merge instead of overwriting.
- Signed out, the same document lives in the browser (`localStorage`); the first sign-in merges it into the account.
  Today's browser keys (`orbit-v2-saved`, `orbit-v2-follow`, `orbit-v2-seen`, `orbit-v2-hidden`) carry over.
- Later, a weekly catch-up email means searching across everyone: that is the point to move to D1 (Cloudflare's
  database), not before.

Rough shape of a person's document:

```json
{
  "version": 12,
  "updatedAt": "2026-11-02T09:14:00Z",
  "topics": [
    { "id": "xr-glasses", "label": "Smart glasses", "match": ["xr-glasses", "vision pro"], "related": true, "caughtUpAt": "2026-10-27T08:00:00Z", "notThis": ["https://…"] }
  ],
  "bookmarks": [
    { "url": "https://…", "title": "Tamga", "imageUrl": "https://…", "source": "CG Channel", "kind": "tool", "beat": "three-d", "tags": ["3d", "tools"], "week": "2026-W14", "savedAt": "2026-10-22T18:00:00Z", "note": "try for sculpting" }
  ],
  "seen": ["https://…"],
  "hidden": ["https://…"]
}
```

**Sign-in**, on Pages Functions so the site stays static:

| Option | Effort | Notes |
|---|---|---|
| Sign in with Google | Low | No passwords, no email sending. Start here. |
| Email link (no password) | Medium | Needs an email service (e.g. Resend). Add if people ask. |
| Passkeys | Medium-high | Slick, less familiar. |

Functions needed: `/api/auth/*` (sign in, sign out, session cookie), `/api/me` (GET and PUT the document),
`/api/me/export`, `/api/me/delete`; optionally `/api/link-preview` for pasted links.

**Privacy:** a short privacy note, **Download my data** and **Delete my account** ship with sign-in.

---

## Order to build

1. **Browser-only A, B, C** on the document shape above (nothing thrown away later), with matching layers 1 and 2.
   Unhide the tab.
2. **Sign-in and sync:** Google sign-in, `/api/me`, merge on first sign-in, export and delete.
3. **Extras:** pasted links in bookmarks, matching layer 3, weekly catch-up email (moves storage to D1).

## To decide when we start

- Sign-in: Google only, or Google and email links?
- Bookmarks: Orbit stories only, or any pasted link too?
- Should Tom's XPLR bookmarks show in his Orbit dashboard, or stay separate?
