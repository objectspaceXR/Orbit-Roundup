import { listWeeks, readWeek } from '@/lib/weeks';
import { trendsFor } from '@/lib/trends';
import WeekView from './WeekView';

/** The front page is the latest published week. */
export default function Home() {
  const weeks = listWeeks();
  const latest = weeks[weeks.length - 1];
  const data = latest && readWeek(latest.week);
  if (!data) {
    return <main className="min-h-screen flex items-center justify-center text-paper-faint">No issues published yet.</main>;
  }
  return <WeekView data={data} weeks={weeks} trends={trendsFor(data.week)} />;
}
