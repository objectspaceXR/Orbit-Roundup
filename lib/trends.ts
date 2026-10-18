import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Beat } from './roundup';
import { readWeek } from './weeks';

/** Something that happened this week, told once, with the stories behind it. */
export interface Trend {
  title: string;
  /** Why it matters, a sentence or two. */
  why: string;
  beat: Beat;
  /** The week's stories that make it up, the strongest first. */
  urls: string[];
}

const FOCUS: Record<string, Beat> = { xr: 'xr-spatial', design: 'three-d', '3d': 'three-d', ai: 'creative-ai' };
type RawTrend = { title?: string; why?: string; focus?: string; urls?: string[]; links?: { url: string }[] };

/**
 * A week's trends (server only): `trends` in the week's JSON when XPLR publishes them, otherwise
 * data/trends/<week>.json. Only stories still in the week count, and a trend needs two of them.
 */
export function trendsFor(week: string): Trend[] {
  let raw: RawTrend[] = [];
  try {
    const inWeek = JSON.parse(readFileSync(join(process.cwd(), 'data/weeks', `${week}.json`), 'utf-8')).trends;
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
      urls: [...(t.urls ?? []), ...(t.links ?? []).map((l) => l.url)].filter((u) => have.has(u)),
    }))
    .filter((t) => t.title && t.urls.length >= 2);
}
