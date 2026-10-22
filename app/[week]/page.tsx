import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listWeeks, readWeek } from '@/lib/weeks';
import { trendsFor } from '@/lib/trends';
import { issueDate, weekRange } from '@/lib/roundup';
import WeekView from '../WeekView';

export async function generateStaticParams() {
  return listWeeks().map((w) => ({ week: w.week }));
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params;
  const d = readWeek(week);
  const title = `Orbit Roundup · ${weekRange(week)}`;
  const description = d?.items.length
    ? `${d.items.length} stories in XR, AI, 3D and creative tech, picked by Tom Martin-Davies. Out ${issueDate(week)}.`
    : 'Weekly creative tech curation by Tom Martin-Davies.';
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const data = readWeek(week);
  if (!data) notFound();
  const weeks = listWeeks();
  return <WeekView data={data} weeks={weeks} trends={trendsFor(week)} />;
}
