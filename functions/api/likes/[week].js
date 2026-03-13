/**
 * Cloudflare Pages Function — likes via KV
 * Bind KV namespace as ORBIT_LIKES in Pages settings.
 *
 * GET  /api/likes/:week  → { [articleId]: count }
 * POST /api/likes/:week  → { articleId, action: "like"|"unlike" }
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ params, env }) {
  const raw = await env.ORBIT_LIKES?.get(`week:${params.week}`);
  return new Response(raw || '{}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
}

export async function onRequestPost({ params, request, env }) {
  if (!env.ORBIT_LIKES) return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json', ...CORS } });
  const { articleId, action } = await request.json();
  if (!articleId || !['like','unlike'].includes(action)) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
  const raw = await env.ORBIT_LIKES.get(`week:${params.week}`);
  const counts = raw ? JSON.parse(raw) : {};
  if (action === 'like') counts[articleId] = (counts[articleId] || 0) + 1;
  else { counts[articleId] = Math.max(0, (counts[articleId] || 0) - 1); if (!counts[articleId]) delete counts[articleId]; }
  await env.ORBIT_LIKES.put(`week:${params.week}`, JSON.stringify(counts));
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS } });
}
