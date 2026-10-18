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

/**
 * The video files to try, in order, for playing a story's video muted as its cover; empty when it has none.
 * Reddit's v.redd.it links are not files: the MP4 inside is CMAF_<height>.mp4 on newer posts and DASH_<height>.mp4
 * on older ones (picture only, no sound), so each is tried until one plays.
 */
export function clipSources(url?: string): string[] {
  const u = (url || '').replace(/&amp;/g, '&').trim();
  const reddit = u.match(/v\.redd\.it\/([a-z0-9]+)/i);
  if (reddit) {
    const files = ['CMAF_720', 'DASH_720', 'CMAF_480', 'DASH_480'].map((f) => `https://v.redd.it/${reddit[1]}/${f}.mp4`);
    return /\.mp4(\?|$)/i.test(u) ? [u, ...files.filter((f) => f !== u.split('?')[0])] : files;
  }
  return /streamable\.com|\.(mp4|webm)(\?|$)/i.test(u) ? [u] : [];
}
