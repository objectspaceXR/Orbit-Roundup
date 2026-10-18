import type { Metadata } from 'next';
import { allItems, listWeeks } from '@/lib/weeks';
import Archive from './Archive';

export const metadata: Metadata = { title: 'Orbit Roundup · Archive', robots: { index: false } };

export default function ArchivePage() {
  return <Archive items={allItems()} weeks={listWeeks().map((w) => w.week).reverse()} />;
}
