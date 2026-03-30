/**
 * Image src for <img>: use /api/image-proxy for opaque article URLs (og:image, etc.).
 * Matches mission-control Draft — skip proxy for obvious direct image files.
 */
export function externalImageSrcForImg(url: string): string {
  const u = (url || '').replace(/&amp;/g, '&').trim();
  if (!u) return '';
  const isExternal = /^(https?:)?\/\//i.test(u);
  if (!isExternal) return u;
  const pathOnly = u.split('?')[0].split('#')[0];
  const directFile =
    /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(pathOnly) ||
    /img\.youtube\.com|i\.ytimg\.com/i.test(u);
  if (directFile) return u;
  return `/api/image-proxy?url=${encodeURIComponent(u)}`;
}
