/**
 * Shared helpers for the v2 story feed: the published item shape, beats, labels and display text.
 * (The classic page at /[week] keeps its own copies until v2 replaces it.)
 */

export interface PublishedItem {
  url: string; title: string; summary?: string; category?: string;
  source?: string; tags?: string[]; imageUrl?: string; videoUrl?: string; author?: string;
  subreddit?: string; feedName?: string; digestTitle?: string; digestSummary?: string;
  hint?: string; savedAt?: string;
}
export interface WeekData { week: string; items: PublishedItem[]; publishedAt?: string; }
export interface WeekMeta { week: string; count: number; cover?: string }

/** Beats in reading order. Inspiration and curated picks read as Design. */
export const BEATS = ['xr-spatial', 'three-d', 'creative-ai'] as const;
export type Beat = (typeof BEATS)[number];

/** Beat colours are XPLR v2's: XR orange, design pink, AI blue. `tone` is a `.tone-*` class from globals.css. */
export const BEAT_INFO: Record<Beat, { label: string; short: string; tone: string; text: string; dot: string }> = {
  'xr-spatial': { label: 'XR & Spatial', short: 'XR', tone: 'tone-orange', text: 'text-beat-xr', dot: 'bg-beat-xr' },
  'three-d': { label: '2D, 3D & Design', short: 'Design', tone: 'tone-pink', text: 'text-beat-design', dot: 'bg-beat-design' },
  'creative-ai': { label: 'Creative AI', short: 'AI', tone: 'tone-blue', text: 'text-beat-ai', dot: 'bg-beat-ai' },
};

/** An item that reads as a project (work to look at) rather than news: inspiration picks, videos, and design work with a picture. */
export function isProject(item: PublishedItem): boolean {
  const c = (item.category || '').toLowerCase();
  if (c === 'inspiration') return true;
  if (videoEmbed(item)) return true;
  return beatOf(item) === 'three-d' && !!item.imageUrl && !/newsletter/.test(item.source || '');
}

/** An item with the week it was published in, for the archive and dashboard. */
export type ArchiveItem = PublishedItem & { week: string };

/** Rough reading time of the summary plus the click-through, for the week's intro. */
export function minutesFor(items: PublishedItem[]): number {
  return Math.max(1, Math.round(items.reduce((n, i) => n + summaryOf(i).split(/\s+/).length, 0) / 200 + items.length * 0.25));
}

export function beatOf(item: PublishedItem): Beat {
  const k = (item.category || '').trim().toLowerCase().replace(/\s+/g, '-');
  const alias: Record<string, Beat> = { xr: 'xr-spatial', '3d': 'three-d', ai: 'creative-ai', inspiration: 'three-d', design: 'three-d' };
  const c = alias[k] || k;
  return (BEATS as readonly string[]).includes(c) ? (c as Beat) : 'three-d';
}

export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

export function titleOf(item: PublishedItem): string {
  return item.digestTitle?.trim() || stripHtml(item.title).replace(/\s*[–—]\s*.+$/, '').replace(/\s*\|\s*.+$/, '').trim() || stripHtml(item.title);
}

export function summaryOf(item: PublishedItem): string {
  return item.digestSummary?.trim() || (item.summary ? stripHtml(item.summary) : '');
}

export function tagsOf(item: PublishedItem): string[] {
  const raw = Array.isArray(item.tags) && item.tags.length ? item.tags.map(String) : (item.hint || '').split(/[,;]/);
  const out = raw
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    .filter((t) => t && t !== 'creative-tech' && !(BEATS as readonly string[]).includes(t));
  return [...new Set(out)];
}

const SOURCE_NAMES: Record<string, string> = {
  'glassalmanac.com': 'Glass Almanac', 'uploadvr.com': 'UploadVR', 'roadtovr.com': 'Road to VR',
  'the-decoder.com': 'The Decoder', 'techcrunch.com': 'TechCrunch', 'producthunt.com': 'Product Hunt',
  'theverge.com': 'The Verge', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'github.com': 'GitHub',
};

export function sourceOf(item: PublishedItem): string {
  if (item.feedName) return item.feedName;
  if (item.subreddit) return `r/${item.subreddit}`;
  try {
    const host = new URL(item.url).hostname.replace(/^www\./, '');
    if (/reddit\.com|redd\.it/.test(host)) return 'Reddit';
    if (SOURCE_NAMES[host]) return SOURCE_NAMES[host];
    const base = host.replace(/\.(com|org|net|co\.uk|io|ai|dev|app)$/i, '');
    return base.split(/[.-]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  } catch {
    return 'Read more';
  }
}

/** Monday of an ISO week. */
function mondayOf(week: string, plusWeeks = 0): Date {
  const [yearStr, wStr] = week.split('-W');
  const year = parseInt(yearStr), w = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1 + plusWeeks) * 7);
  return mon;
}

export function weekRange(week: string): string {
  const mon = mondayOf(week);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

/** The issue goes out the Monday after its week. */
export function issueDate(week: string): string {
  return mondayOf(week, 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Stable short id for likes (same key the classic page uses). */
export function likeKey(url: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(url))).slice(0, 64);
  return Buffer.from(url).toString('base64').slice(0, 64);
}

/** YouTube / Vimeo player for a story that is a video. */
export function videoEmbed(item: PublishedItem): string | null {
  const url = (item.videoUrl || item.url || '').trim();
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?playsinline=1&rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** Best still for a story: YouTube stories get the full-size frame rather than the small one. */
export function pictureOf(item: PublishedItem): string {
  const img = (item.imageUrl || '').replace(/&amp;/g, '&').trim();
  return img.replace(/(img\.youtube\.com|i\.ytimg\.com)\/vi\/([^/]+)\/(mq|hq|sd)?default\.jpg/i, '$1/vi/$2/hqdefault.jpg');
}
