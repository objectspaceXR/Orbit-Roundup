/**
 * Inline video embed helpers (Orbit Roundup — matches mission-control Draft).
 * Reddit permalinks are not embedded — players are cross-origin / iframe-blocked; use thumbnail + link.
 */

export function getVideoEmbedUrl(url: string): { embed: string; type: 'youtube' | 'vimeo' } | null {
  try {
    if (/youtube|youtu\.be/i.test(url)) {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? { embed: `https://www.youtube.com/embed/${m[1]}`, type: 'youtube' } : null;
    }
    if (/vimeo\.com/i.test(url)) {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return m ? { embed: `https://player.vimeo.com/video/${m[1]}`, type: 'vimeo' } : null;
    }
  } catch {
    /* invalid URL */
  }
  return null;
}

/** Direct / known-native video URLs (not Reddit post pages). */
export function isNativeVideoUrl(url: string): boolean {
  return /v\.redd\.it|streamable\.com|gfycat\.com|\.(mp4|webm|gifv?)(\?|$)/i.test(url);
}
