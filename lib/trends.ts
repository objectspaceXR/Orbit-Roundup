import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Beat } from './roundup';
import { readWeek, weekFile } from './weeks';

/** Something that happened this week, told once, by the outlets that reported it and the stories behind it. */
export interface Trend {
  title: string;
  /** Why it matters, a sentence or two. */
  why: string;
  beat: Beat;
  /** The week's stories that make it up, the strongest first (may be none). */
  urls: string[];
  /** Outlets reporting it that are not stories in the week. */
  links: TrendLink[];
}
/** An outlet reporting a trend, with its page's share picture when XPLR found one. */
export type TrendLink = { title: string; url: string; host: string; imageUrl?: string };

const FOCUS: Record<string, Beat> = { xr: 'xr-spatial', design: 'three-d', '3d': 'three-d', ai: 'creative-ai' };
type RawTrend = { title?: string; why?: string; focus?: string; urls?: string[]; links?: { url: string; title?: string; host?: string; imageUrl?: string }[] };

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * A week's trends (server only): `trends` in the week's JSON when XPLR publishes them, otherwise
 * data/trends/<week>.json. The stories still in the week come first, then the outlets that reported it (a link
 * that is a story in the week counts as the story; one without a headline is an older week's story, since
 * dropped). A trend needs two sources.
 */
export function trendsFor(week: string): Trend[] {
  let raw: RawTrend[] = [];
  try {
    const inWeek = JSON.parse(readFileSync(weekFile(week), 'utf-8')).trends;
    const file = join(process.cwd(), 'data/trends', `${week}.json`);
    raw = Array.isArray(inWeek) ? inWeek : existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')).trends ?? [] : [];
  } catch {
    return [];
  }
  const have = new Set(readWeek(week)?.items.map((i) => i.url) ?? []);
  return raw
    .map((t) => ({
      title: t.title?.trim() || '',
      why: t.why?.trim() || '',
      beat: FOCUS[(t.focus || '').toLowerCase()] ?? 'three-d',
      urls: [...new Set([...(t.urls ?? []), ...(t.links ?? []).map((l) => l.url)].filter((u) => have.has(u)))],
      links: (t.links ?? [])
        .filter((l) => l?.url && l.title?.trim() && !have.has(l.url))
        .map((l) => ({ title: l.title!.trim(), url: l.url, host: l.host?.trim() || hostOf(l.url), ...(l.imageUrl ? { imageUrl: l.imageUrl } : {}) })),
    }))
    .filter((t) => t.title && t.urls.length + t.links.length >= 2);
}
