import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { ArchiveItem, PublishedItem, WeekData, WeekMeta } from './roundup';

/** Build-time reads of the published weeks (server only). */
const DIR = join(process.cwd(), 'data/weeks');
/**
 * Local testing only: XPLR's own published snapshots (set ORBIT_LOCAL_WEEKS_DIR in .env.local, e.g.
 * ../XPLR_Dash/data/orbit/published). A week there wins over the same week in data/weeks, so what XPLR just
 * published shows here straight away, before it has been pulled from GitHub. Never set on Cloudflare.
 */
const LOCAL = process.env.ORBIT_LOCAL_WEEKS_DIR ? resolve(process.cwd(), process.env.ORBIT_LOCAL_WEEKS_DIR) : null;

/** The file a week is read from: the local XPLR snapshot when there is one, else data/weeks. */
export function weekFile(week: string): string {
  const local = LOCAL && join(LOCAL, `${week}.json`);
  return local && existsSync(local) ? local : join(DIR, `${week}.json`);
}

function weekNames(dir: string | null): string[] {
  try {
    return dir ? readdirSync(dir).filter((f) => /^\d{4}-W\d{2}\.json$/.test(f)).map((f) => f.replace('.json', '')) : [];
  } catch {
    return [];
  }
}
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
    return [...new Set([...weekNames(DIR), ...weekNames(LOCAL)])]
      .map((week) => {
        const d = readWeek(week);
        const cover = d?.items.find((i) => i.imageUrl)?.imageUrl;
        return { week, count: d?.items.length ?? 0, ...(cover ? { cover } : {}) };
      })
      .sort((a, b) => a.week.localeCompare(b.week));
  } catch {
    return [];
  }
}

export function readWeek(week: string): WeekData | null {
  try {
    const d = JSON.parse(readFileSync(weekFile(week), 'utf-8'));
    return { week: d.week || week, items: clean(Array.isArray(d.items) ? d.items : []), publishedAt: d.publishedAt, ...(typeof d.summary === 'string' && d.summary.trim() ? { summary: d.summary.trim() } : {}) };
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
