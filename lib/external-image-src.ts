/**
 * Image src for <img>: use /api/image-proxy for opaque article URLs (og:image, etc.).
 * Matches mission-control Draft — skip proxy for obvious direct image files.
 */
export function externalImageSrcForImg(url: string): string {
  const u = fullSizePicture((url || '').replace(/&amp;/g, '&').trim());
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

/**
 * Bing News thumbnails (bing.com/th?id=…) come as 100px squares unless asked for a width. Asking for a width alone
 * returns the original picture at full size, uncropped, so stories and cards are sharp rather than a blown-up blur.
 */
export function fullSizePicture(url: string): string {
  if (!/^(https?:)?\/\/(www\.)?bing\.com\/th\b/i.test(url)) return url;
  try {
    const u = new URL(url.startsWith('//') ? `https:${url}` : url);
    for (const k of ['w', 'h', 'c', 'rs']) u.searchParams.delete(k);
    u.searchParams.set('w', '1200');
    return u.toString();
  } catch {
    return url;
  }
}
