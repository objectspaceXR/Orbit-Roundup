import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import WeekPage from "./WeekPage";

interface PublishedItem {
  url: string; title: string; summary?: string; category?: string;
  source?: string; tags?: string[]; imageUrl?: string; author?: string;
  subreddit?: string; feedName?: string; digestTitle?: string; digestSummary?: string;
}
interface WeekData { week: string; items: PublishedItem[]; publishedAt?: string; }

export async function generateStaticParams() {
  try {
    const dir = join(process.cwd(), "data/weeks");
    return readdirSync(dir).filter(f => f.endsWith(".json")).map(f => ({ week: f.replace(".json", "") }));
  } catch { return []; }
}

function getWeekMeta(): { week: string; count: number }[] {
  try {
    const dir = join(process.cwd(), "data/weeks");
    return readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const w = f.replace(".json", "");
        const d = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        return { week: w, count: d.items?.length || d.itemCount || 0 };
      })
      .sort((a, b) => a.week.localeCompare(b.week));
  } catch { return []; }
}

export default async function Page({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const data: WeekData = JSON.parse(readFileSync(join(process.cwd(), "data/weeks", `${week}.json`), "utf-8"));
  const weekMeta = getWeekMeta();
  const allWeeks = weekMeta.map(w => w.week);
  const currentIndex = allWeeks.indexOf(week);
  const prevWeek = currentIndex > 0 ? allWeeks[currentIndex - 1] : null;
  const nextWeek = currentIndex < allWeeks.length - 1 ? allWeeks[currentIndex + 1] : null;
  return <WeekPage data={data} prevWeek={prevWeek} nextWeek={nextWeek} weekMeta={weekMeta} />;
}
