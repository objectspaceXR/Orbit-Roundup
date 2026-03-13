import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";

interface WeekMeta { week: string; label: string; publishedAt: string; itemCount: number; }

function weekDateRange(week: string): string {
  const [yearStr, wStr] = week.split("-W");
  const year = parseInt(yearStr), w = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(sun)} ${year}`;
}

function getWeeks(): WeekMeta[] {
  try {
    const dir = join(process.cwd(), "data/weeks");
    return readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .sort().reverse()
      .map(f => {
        const data = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        return { week: data.week, label: weekDateRange(data.week), publishedAt: data.publishedAt, itemCount: data.itemCount || data.items?.length || 0 };
      });
  } catch { return []; }
}

export default function Home() {
  const weeks = getWeeks();
  return (
    <main className="min-h-screen bg-gradient-four-corners text-slate-100 font-sans">
      <header className="bg-white py-4 rounded-b-3xl shadow-md shadow-slate-200/30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="relative flex-shrink-0 w-8 h-8 md:w-10 md:h-10" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/planets/saturn.png" alt="" className="w-full h-full object-contain" style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(50%) saturate(400%) hue-rotate(180deg)' }} />
              </div>
              <div>
                <h1 className="font-[var(--font-display)] text-xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-[linear-gradient(to_right,#6366f1,#8b5cf6,#3b82f6,#60a5fa,#ec4899,#f43f5e)] bg-[length:200%_auto] animate-logo-pastel drop-shadow-[0_2px_6px_rgba(100,116,139,0.25)]">
                  ORBIT ROUNDUP
                </h1>
                <p className="hidden md:block text-xs text-slate-400 font-medium mt-0.5">by Tom Martin-Davies</p>
              </div>
            </Link>
            <a href="https://objectspace.co.uk" target="_blank" rel="noopener" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              objectspace.co.uk
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-10 md:py-12">
        <div className="text-center mb-10">
          <h2 className="text-white font-bold tracking-tight drop-shadow-md">
            <span className="block text-xl md:text-2xl lg:text-3xl">What caught my eye</span>
            <span className="block text-2xl md:text-3xl lg:text-4xl mt-1">in XR, AI, 3D and creative tech</span>
          </h2>
        </div>

        {weeks.length === 0 ? (
          <div className="rounded-2xl bg-white/10 p-12 text-center text-white/60">No issues published yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {weeks.map(w => (
              <Link key={w.week} href={`/${w.week}`}
                className="flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-2xl px-6 py-4 transition-all backdrop-blur-sm text-white no-underline group"
              >
                <div>
                  <div className="font-semibold text-sm">{w.week} · {w.label}</div>
                  {w.publishedAt && (
                    <div className="text-xs text-white/50 mt-0.5">
                      Published {new Date(w.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/50 font-medium">{w.itemCount} items →</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="pb-8 text-center">
        <p className="text-white/50 text-xs">
          Orbit Roundup · weekly creative tech curation by{" "}
          <a href="https://objectspace.co.uk" target="_blank" rel="noopener" className="underline hover:text-white/80 transition-colors">
            Tom Martin-Davies
          </a>
        </p>
      </footer>
    </main>
  );
}
