/**
 * Cloudflare Pages Function — fetches a story's picture (or a Streamable clip) for the page, when the site it comes
 * from refuses to show it on other sites. GET /api/image-proxy?url=...
 *
 * It only ever passes back pictures and videos. Anything else (a web page, a script, an SVG, which can carry
 * scripts) is refused, so nobody can use this address to show their own page as if it were Orbit. It also refuses
 * local and private addresses (checked again after every redirect), and anything too big.
 */
const REDDIT_MEDIA = /(^|\.)(redd\.it|redditmedia\.com|reddit\.com)$/i;

/** Picture and video types it passes back. No SVG: it can carry scripts. */
const ALLOWED = /^(image\/(jpeg|png|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)|video\/(mp4|webm|quicktime))$/i;
/** When a site sends no useful type, the file's ending decides, from the same list. */
const BY_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

const MAX_IMAGE = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO = 150 * 1024 * 1024; // 150 MB
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 15000;

/** Headers on everything it sends back: never treated as anything but the stated type, never runs as a page. */
const SAFE = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
};

const refuse = (status, why) => new Response(why, { status, headers: { ...SAFE, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

/** True for addresses on this machine or a private network, written as a name or as a number. */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa')) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // a bare name like "router"
  // IPv4, including the forms browsers also accept (a single number, hex)
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (/^(0x[0-9a-f]+|\d+)$/i.test(h)) return true; // 2130706433, 0x7f000001
  // IPv6: loopback, unspecified, unique-local (fc00::/7), link-local (fe80::/10), IPv4-mapped
  if (h.includes(':')) return h === '::1' || h === '::' || /^f[cd]/i.test(h) || /^fe[89ab]/i.test(h) || h.startsWith('::ffff:') || h.startsWith('64:ff9b:');
  return false;
}

/** A usable outside address, or null. */
function check(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (u.port && !['80', '443'].includes(u.port)) return null;
  if (isPrivateHost(u.hostname)) return null;
  return u;
}

function typeOf(res, url) {
  const sent = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ALLOWED.test(sent)) return sent;
  // Some sites send pictures as "application/octet-stream" or nothing: go by the file's ending
  if (!sent || sent === 'application/octet-stream' || sent === 'binary/octet-stream') {
    const ext = url.pathname.split('.').pop()?.toLowerCase() || '';
    if (BY_EXTENSION[ext]) return BY_EXTENSION[ext];
    if (/(^|\.)redd\.it$/i.test(url.hostname)) return 'video/mp4';
  }
  return null;
}

export async function onRequestGet({ request }) {
  const start = check(new URL(request.url).searchParams.get('url') || '');
  if (!start) return refuse(400, 'Not an allowed address');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/*,video/*;q=0.9,*/*;q=0.5',
  };
  // Videos seek by asking for part of the file
  const range = request.headers.get('range');
  if (range && /^bytes=\d*-\d*$/.test(range)) headers.Range = range;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Follow redirects by hand, checking every stop
    let url = start;
    let res;
    for (let hop = 0; ; hop++) {
      const h = { ...headers, ...(REDDIT_MEDIA.test(url.hostname) ? { Referer: 'https://www.reddit.com/' } : {}) };
      res = await fetch(url.toString(), { redirect: 'manual', headers: h, signal: controller.signal });
      if (res.status < 300 || res.status >= 400) break;
      const next = res.headers.get('location');
      if (!next || hop >= MAX_REDIRECTS) return refuse(502, 'Too many redirects');
      const resolved = check(new URL(next, url).toString());
      if (!resolved) return refuse(400, 'Redirected to an address that is not allowed');
      url = resolved;
    }
    if (!res.ok) return refuse(res.status === 404 ? 404 : 502, 'Could not fetch it');

    const type = typeOf(res, url);
    if (!type) return refuse(415, 'Not a picture or video');
    const size = Number(res.headers.get('content-length') || 0);
    const cap = type.startsWith('video/') ? MAX_VIDEO : MAX_IMAGE;
    if (size > cap) return refuse(413, 'Too big');

    const out = { ...SAFE, 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' };
    for (const k of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const v = res.headers.get(k);
      if (v) out[k] = v;
    }
    return new Response(res.body, { status: res.status === 206 ? 206 : 200, headers: out });
  } catch {
    return refuse(502, 'Could not fetch it');
  } finally {
    clearTimeout(timer);
  }
}
