import type { Metadata } from 'next';
import { allItems } from '@/lib/weeks';
import Dashboard from './Dashboard';

export const metadata: Metadata = { title: "Orbit Roundup · Tom's dashboard", robots: { index: false } };

export default function DashboardPage() {
  return <Dashboard items={allItems()} />;
}
