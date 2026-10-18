import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ArchiveItem, PublishedItem, WeekData, WeekMeta } from './roundup';

/** Build-time reads of the published weeks (server only). */
const DIR = join(process.cwd(), 'data/weeks');
const CHECK = join(process.cwd(), 'data/media-check.json');

/** Results of `npm run check-media`: dead links are dropped, unsuitable pictures fall back to the poster. */
type MediaCheck = { links?: Record<string, { ok: boolean }>; images?: Record<string, { ok: boolean }> };
let check: MediaCheck | null = null;
function media(): MediaCheck {
  if (check) return check;
  try {
    check = existsSync(CHECK) ? JSON.parse(readFileSync(CHECK, 'utf-8')) : {};
  } catch {
    check = {};
  }
  return check!;
}

function clean(items: PublishedItem[]): PublishedItem[] {
  const { links = {}, images = {} } = media();
  return items
    .filter((i) => i?.url && links[i.url]?.ok !== false)
    .map((i) => (i.imageUrl && images[i.imageUrl]?.ok === false ? { ...i, imageUrl: undefined } : i));
}

export function listWeeks(): WeekMeta[] {
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const d = readWeek(f.replace('.json', ''));
        const cover = d?.items.find((i) => i.imageUrl)?.imageUrl;
        return { week: f.replace('.json', ''), count: d?.items.length ?? 0, ...(cover ? { cover } : {}) };
      })
      .sort((a, b) => a.week.localeCompare(b.week));
  } catch {
    return [];
  }
}

export function readWeek(week: string): WeekData | null {
  try {
    const d = JSON.parse(readFileSync(join(DIR, `${week}.json`), 'utf-8'));
    return { week: d.week || week, items: clean(Array.isArray(d.items) ? d.items : []), publishedAt: d.publishedAt };
  } catch {
    return null;
  }
}

/** Every published item, newest week first: the archive's search index. */
export function allItems(): ArchiveItem[] {
  return listWeeks()
    .reverse()
    .flatMap((w) => (readWeek(w.week)?.items ?? []).map((i) => ({ ...i, week: w.week })));
}
