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

export default async function Page({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const data: WeekData = JSON.parse(readFileSync(join(process.cwd(), "data/weeks", `${week}.json`), "utf-8"));
  return <WeekPage data={data} />;
}
