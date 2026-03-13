/**
 * Cloudflare Pages Function — proxy external images to bypass CORS/referrer restrictions
 * GET /api/image-proxy?url=...
 */
const REDDIT_MEDIA = /redd\.it|redditmedia\.com|reddit\.com/i;

export async function onRequestGet({ request }) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return new Response('url required', { status: 400 });
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return new Response('Invalid protocol', { status: 400 });
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };
    if (REDDIT_MEDIA.test(parsed.hostname)) {
      headers['Referer'] = 'https://www.reddit.com/';
    }
    const res = await fetch(url, { redirect: 'follow', headers });
    if (!res.ok) return new Response(null, { status: res.status });
    const contentType = res.headers.get('content-type') || (url.includes('redd.it') ? 'video/mp4' : 'image/jpeg');
    return new Response(res.body, {
      headers: {
        'Content-Type': contentType.split(';')[0],
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
