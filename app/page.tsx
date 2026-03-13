import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { redirect } from "next/navigation";

function getLatestWeek(): string | null {
  try {
    const dir = join(process.cwd(), "data/weeks");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) return null;
    const sorted = files.sort().reverse();
    return sorted[0].replace(".json", "");
  } catch {
    return null;
  }
}

export default function Home() {
  const latest = getLatestWeek();
  if (latest) redirect(`/${latest}`);
  return (
    <main className="min-h-screen bg-gradient-four-corners text-slate-100 font-sans flex flex-col items-center justify-center px-6">
      <p className="text-white/60 text-lg">No issues published yet.</p>
      <p className="text-white/40 text-sm mt-2">Check back soon.</p>
    </main>
  );
}
