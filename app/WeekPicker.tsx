'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { WeekMeta } from '@/lib/roundup';
import { Kicker } from './ui';

/** ISO week key ("2026-W14") of a date. */
function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const y = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((t.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function mondayOfKey(key: string): Date {
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  return new Date(y, 0, 4 - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
}
function mondaysIn(month: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(month.getFullYear(), month.getMonth(), 1);
  d.setDate(1 + ((8 - d.getDay()) % 7));
  for (; d.getMonth() === month.getMonth(); d.setDate(d.getDate() + 7)) out.push(new Date(d));
  return out;
}

/**
 * A small calendar of every month from the first issue to the latest, newest first, one cell per week (by its Monday).
 * Published weeks open; the rest are greyed. Esc or a click outside closes it.
 */
export default function WeekPicker({ week, weeks, onClose }: { week: string; weeks: WeekMeta[]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => !box.current?.parentElement?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', key);
    box.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', off);
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const byKey = new Map(weeks.map((w) => [w.week, w]));
  const latest = weeks[weeks.length - 1]?.week;
  const first = mondayOfKey(weeks[0]?.week ?? week);
  const stop = new Date(first.getFullYear(), first.getMonth(), 1);
  const months: Date[] = [];
  const last = mondayOfKey(latest ?? week);
  for (let m = new Date(last.getFullYear(), last.getMonth(), 1); m >= stop; m = new Date(m.getFullYear(), m.getMonth() - 1, 1)) months.push(m);

  return (
    <div ref={box} role="dialog" aria-label="Choose a week" className="absolute right-0 top-full mt-2 z-50 w-[min(92vw,340px)] max-h-[70svh] overflow-y-auto rounded-2xl border border-line bg-ink-raised p-4 shadow-2xl">
      <div className="flex items-baseline justify-between">
        <span className="font-poster uppercase text-2xl tracking-wide">Issues</span>
        <Kicker>{weeks.length} published</Kicker>
      </div>
      {months.map((m) => (
        <div key={m.toISOString()} className="mt-4">
          <Kicker className="text-paper-muted">{m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Kicker>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {mondaysIn(m).map((mon) => {
              const k = weekKey(mon);
              const w = byKey.get(k);
              const n = Number(k.split('-W')[1]);
              const date = `${mon.getDate()} ${mon.toLocaleDateString('en-GB', { month: 'short' })}`;
              const cell = 'h-14 rounded-xl flex flex-col items-center justify-center leading-none';
              if (!w) {
                return (
                  <span key={k} className={`${cell} border border-dashed border-line text-paper-faint/60`} title={`Week ${n}: no issue`}>
                    <span className="font-hud text-[11px]">W{n}</span>
                    <span className="mt-1 text-[10px]">{date}</span>
                  </span>
                );
              }
              const on = k === week;
              return (
                <Link key={k} href={`/${k}/`} onClick={onClose} aria-current={on ? 'page' : undefined} title={`Week ${n} · ${date} · ${w.count} stories`} className={`${cell} transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${on ? 'bg-signal text-ink' : 'bg-ink-card border border-line text-paper hover:border-line-strong hover:bg-ink-hover'}`}>
                  <span className="font-poster text-[20px] tracking-wide">W{n}</span>
                  <span className={`mt-1 font-hud text-[9.5px] ${on ? 'text-ink/70' : 'text-paper-faint'}`}>{k === latest ? 'latest' : date}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
