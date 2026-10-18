import { listWeeks, readWeek } from '@/lib/weeks';
import { trendsFor } from '@/lib/trends';
import WeekView from './WeekView';

/** /v2 is the latest published week as the public dashboard. */
export default function V2Home() {
  const weeks = listWeeks();
  const latest = weeks[weeks.length - 1];
  const data = latest && readWeek(latest.week);
  if (!data) {
    return <main className="min-h-screen flex items-center justify-center text-paper-faint">No issues published yet.</main>;
  }
  return <WeekView data={data} weeks={weeks} trends={trendsFor(data.week)} />;
}
