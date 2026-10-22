/**
 * Checks every published story before it shows on the site: the link must answer, and the picture must be a real,
 * large-enough photo or render. Results go to data/media-check.json, which lib/weeks.ts reads at build time:
 * dead links are dropped, unsuitable pictures fall back to the made-up poster.
 *
 *   npm run check-media                check what is new or older than a week
 *   npm run check-media -- --force     check everything again
 *   OLLAMA_VISION=0 npm run check-media  skip the vision pass (size checks only)
 *
 * The vision pass is XPLR's picture analyser (local Ollama, qwen3-vl by default): screenshots, slides, logos,
 * pictures that are mostly words and weak pictures are turned down, as XPLR does for vision boards.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'data/media-check.json');
const FORCE = process.argv.includes('--force');
const WEEK_MS = 7 * 864e5;
const OLLAMA = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:4b-instruct';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : {};
const out = { checkedAt: new Date().toISOString(), links: prev.links || {}, images: prev.images || {} };
const fresh = (e) => !FORCE && e && Date.now() - Date.parse(e.checkedAt) < WEEK_MS;
const get = (url, accept) => fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(10000) });

/** A link is dead on 404/410, a server error, no answer, or a redirect that lands on the site's front page. */
async function checkLink(url) {
  try {
    const res = await get(url, 'text/html,*/*');
    res.body?.cancel().catch(() => {});
    const from = new URL(url);
    const to = new URL(res.url || url);
    const bounced = from.pathname.length > 1 && to.pathname.replace(/\/$/, '') === '' && from.hostname.replace(/^www\./, '') === to.hostname.replace(/^www\./, '');
    // Many sites turn bots away (401/403/429); those links work in a browser, so they stay
    const ok = !bounced && (res.status < 400 || [401, 403, 429].includes(res.status));
    return { ok, status: res.status, ...(bounced ? { reason: 'redirects to the front page' } : {}) };
  } catch (e) {
    return { ok: false, status: 0, reason: String(e?.cause?.code || e?.name || e) };
  }
}

/** Width and height from the first bytes of a PNG, GIF, JPEG or WebP. */
function sizeOf(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: 'png' };
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b.readUInt16LE(6), h: b.readUInt16LE(8), type: 'gif' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), type: 'webp' };
    if (k === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, type: 'webp' };
    if (k === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { w: 1 + (n & 0x3fff), h: 1 + ((n >> 14) & 0x3fff), type: 'webp' };
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), type: 'jpeg' };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

let visionUp = null;
async function vision() {
  if (process.env.OLLAMA_VISION === '0') return false;
  if (visionUp !== null) return visionUp;
  try {
    const tags = await (await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) })).json();
    visionUp = !!tags.models?.some((m) => m.name === MODEL || m.name.startsWith(`${MODEL}:`));
  } catch {
    visionUp = false;
  }
  if (!visionUp) console.log(`(vision pass off: ${MODEL} not found at ${OLLAMA}; size checks only)`);
  return visionUp;
}

const PROMPT = `Judge this picture as the cover of a story card. Be literal and brief.
- medium: photo, render (3D/CGI), illustration, graphic (poster/layout/type design), screenshot (an app, website or phone screen), document (a page of text, slide or PDF), logo, or mixed.
- textShare: roughly what percent of the picture is covered by words (0 if none).
- quality: 1 to 5 as a picture: 5 striking and well made, 3 ordinary, 1 blurry, cluttered or low resolution.
- subject: a few words.`;
const SCHEMA = {
  type: 'object',
  properties: { medium: { type: 'string', enum: ['photo', 'render', 'illustration', 'graphic', 'screenshot', 'document', 'logo', 'mixed'] }, textShare: { type: 'integer' }, quality: { type: 'integer' }, subject: { type: 'string' } },
  required: ['medium', 'textShare', 'quality', 'subject'],
};

async function analyse(buf) {
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({ model: MODEL, stream: false, format: SCHEMA, keep_alive: '5m', options: { temperature: 0, num_ctx: 4096 }, messages: [{ role: 'user', content: PROMPT, images: [buf.toString('base64')] }] }),
    });
    return JSON.parse((await res.json()).message?.content || 'null');
  } catch {
    return null;
  }
}
const reject = (a) =>
  a.medium === 'screenshot' && (a.quality <= 3 || a.textShare >= 30) ? 'screenshot' : a.medium === 'document' ? 'document or slide' : a.medium === 'logo' ? 'just a logo' : a.textShare >= 70 && a.medium !== 'graphic' ? 'mostly text' : a.quality <= 2 ? 'weak picture' : null;

async function checkImage(url) {
  const r = { checkedAt: new Date().toISOString() };
  if (/^\/api\//.test(url)) return { ...r, ok: false, reason: 'XPLR-local media path' };
  try {
    // YouTube stills are shown at hqdefault (480×360), so judge that one
    const src = url.replace(/&amp;/g, '&').replace(/(img\.youtube\.com|i\.ytimg\.com)\/vi\/([^/]+)\/(mq|sd)?default\.jpg/i, '$1/vi/$2/hqdefault.jpg');
    const res = await get(src, 'image/png,image/jpeg,image/webp,image/*');
    const type = res.headers.get('content-type') || '';
    if (!res.ok) return { ...r, ok: false, reason: `HTTP ${res.status}` };
    if (!type.startsWith('image/')) return { ...r, ok: false, reason: `not an image (${type.split(';')[0]})` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 6000) return { ...r, ok: false, reason: 'tiny file' };
    const dim = sizeOf(buf);
    if (dim) {
      Object.assign(r, { w: dim.w, h: dim.h });
      if (dim.w < 480 || dim.h < 270) return { ...r, ok: false, reason: `too small (${dim.w}×${dim.h})` };
      const ar = dim.w / dim.h;
      if (ar > 3 || ar < 0.4) return { ...r, ok: false, reason: `odd shape (${ar.toFixed(2)})` };
    }
    // The vision model reads PNG and JPEG; other formats pass on size alone
    if ((dim?.type === 'png' || dim?.type === 'jpeg') && (await vision())) {
      const a = await analyse(buf);
      if (a) {
        Object.assign(r, { medium: a.medium, quality: a.quality, textShare: a.textShare, subject: a.subject });
        const why = reject(a);
        if (why) return { ...r, ok: false, reason: why };
      }
    }
    return { ...r, ok: true };
  } catch (e) {
    return { ...r, ok: false, reason: String(e?.cause?.code || e?.name || e) };
  }
}

async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) await fn(list[i++]); }));
}

const items = readdirSync(join(ROOT, 'data/weeks'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(ROOT, 'data/weeks', f), 'utf-8')).items || []);
const links = [...new Set(items.map((i) => i.url))].filter((u) => !fresh(out.links[u]));
const images = [...new Set(items.map((i) => i.imageUrl).filter(Boolean))].filter((u) => !fresh(out.images[u]));
console.log(`Checking ${links.length} links and ${images.length} pictures…`);

await pool(links, 8, async (u) => {
  out.links[u] = { ...(await checkLink(u)), checkedAt: new Date().toISOString() };
  if (!out.links[u].ok) console.log(`  x link  ${out.links[u].status} ${out.links[u].reason || ''} ${u}`);
});
await pool(images, (await vision()) ? 2 : 8, async (u) => {
  out.images[u] = await checkImage(u);
  if (!out.images[u].ok) console.log(`  x image ${out.images[u].reason}  ${u.slice(0, 100)}`);
});

writeFileSync(OUT, JSON.stringify(out, null, 2));
const bad = (m) => Object.values(m).filter((e) => !e.ok).length;
console.log(`Done: ${bad(out.links)} dead links, ${bad(out.images)} pictures turned down -> data/media-check.json`);
