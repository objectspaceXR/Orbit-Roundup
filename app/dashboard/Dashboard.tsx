'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DASHBOARD, type CustomFeed } from '@/lib/dashboard';
import { summaryOf, tagsOf, titleOf, type ArchiveItem } from '@/lib/roundup';
import { FeedCard, Row } from '../cards';
import StoryViewer, { type Story } from '../StoryViewer';
import { Icon, KEYS, Kicker, SectionHeader, Toaster, TopBar, buttonClass, toast, useHidden, useLikeCounts, useStoredSet } from '../ui';

const matches = (i: ArchiveItem, words: string[]) => {
  const tags = tagsOf(i);
  const text = `${titleOf(i)} ${summaryOf(i)}`.toLowerCase();
  return words.some((w) => tags.includes(w) || (w.length > 3 && text.includes(w.toLowerCase())));
};

/**
 * The public dashboard: your saves and the topics you follow (kept in this browser), then Tom's standing feeds
 * from lib/dashboard.ts. Every row is drawn from all published weeks, newest first.
 */
export default function Dashboard({ items: all }: { items: ArchiveItem[] }) {
  const hidden = useHidden();
  const items = useMemo(() => all.filter((i) => !DASHBOARD.exclude.includes(i.url) && !hidden.has(i.url)), [all, hidden]);
  const removed = useMemo(() => hidden.value.map((u) => all.find((i) => i.url === u)).filter(Boolean) as ArchiveItem[], [hidden.value, all]);
  const saved = useStoredSet(KEYS.saved);
  const follow = useStoredSet(KEYS.follow);
  const seen = useStoredSet(KEYS.seen);
  const [viewer, setViewer] = useState<{ stories: Story[]; at: number } | null>(null);
  const likes = useLikeCounts([...new Set(items.map((i) => i.week))]);

  const mine = useMemo(() => saved.value.map((u) => items.find((i) => i.url === u)).filter(Boolean) as ArchiveItem[], [saved.value, items]);
  const following = useMemo(() => (follow.value.length ? items.filter((i) => matches(i, follow.value)) : []), [follow.value, items]);
  const feeds = useMemo(() => DASHBOARD.feeds.map((f: CustomFeed) => ({ ...f, items: items.filter((i) => matches(i, f.match)) })).filter((f) => f.items.length), [items]);
  const read = items.filter((i) => seen.has(i.url)).length;

  const open = (list: ArchiveItem[], i: ArchiveItem) => setViewer({ stories: list.map((x) => ({ item: x, week: x.week })), at: list.indexOf(i) });
  const row = (label: string, list: ArchiveItem[]) => (
    <Row label={label}>
      {list.map((i) => (
        <div key={`${label}-${i.url}`} className="snap-start shrink-0 w-[min(82vw,300px)] flex">
          <FeedCard item={i} week={i.week} likes={likes} onOpen={() => open(list, i)} onTag={(t) => follow.toggle(t, true)} meta={<Kicker>W{Number(i.week.split('-W')[1])}</Kicker>} />
        </div>
      ))}
    </Row>
  );

  return (
    <>
      <TopBar current="dashboard" />
      <main className="mx-auto max-w-[1400px] pt-8 sm:pt-12 pb-24">
        <section className="px-4 sm:px-6 grid gap-4 lg:grid-cols-[1.4fr_1fr] items-end">
          <div>
            <Kicker className="text-signal">Custom feeds · beta</Kicker>
            <h1 className="mt-2 font-poster uppercase text-[52px] sm:text-[80px] leading-[0.88] tracking-wide">{DASHBOARD.title}</h1>
            <p className="mt-4 max-w-xl text-[15px] text-paper-muted leading-relaxed">{DASHBOARD.intro}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: saved.value.length, label: 'Saved', tone: 'tone-lime' },
              { n: follow.value.length, label: 'Topics', tone: 'tone-blue' },
              { n: `${items.length ? Math.round((read / items.length) * 100) : 0}%`, label: 'Read', tone: 'tone-pink' },
            ].map((s) => (
              <div key={s.label} className={`${s.tone} tone-card rounded-2xl p-4 min-h-[110px] flex flex-col justify-between`}>
                <span className="font-poster text-5xl leading-none">{s.n}</span>
                <Kicker>{s.label}</Kicker>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="saves">
          <div className="px-4 sm:px-6">
            <SectionHeader index="01" id="saves" title="Your saves" meta={`${mine.length} kept in this browser`} />
          </div>
          {mine.length ? row('Your saves', mine) : <Empty>Tap the bookmark on any story and it lands here.</Empty>}
        </section>

        <section className="mt-14" aria-labelledby="topics">
          <div className="px-4 sm:px-6">
            <SectionHeader index="02" id="topics" title="Your topics" meta={follow.value.length ? `${following.length} stories` : undefined} />
            {follow.value.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {follow.value.map((t) => (
                  <button key={t} type="button" onClick={() => follow.toggle(t)} className="inline-flex items-center gap-1.5 rounded-full bg-ink-hover px-3 h-8 text-[12.5px] text-paper hover:bg-line" title={`Unfollow ${t}`}>
                    #{t} <Icon name="close" className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {following.length ? row('Your topics', following) : <Empty>Follow topics from Trending, or tap a #tag on any card.</Empty>}
        </section>

        {feeds.map((f, n) => (
          <section key={f.id} className="mt-14" aria-labelledby={`feed-${f.id}`}>
            <div className="px-4 sm:px-6">
              <SectionHeader
                index={String(n + 3).padStart(2, '0')}
                id={`feed-${f.id}`}
                title={f.title}
                meta={`${f.items.length} · ${f.note}`}
                actions={
                  <button type="button" onClick={() => open(f.items, f.items[0])} className={buttonClass('secondary', 'sm')}>
                    <Icon name="play" filled /> Watch
                  </button>
                }
              />
            </div>
            {row(f.title, f.items)}
          </section>
        ))}

        {removed.length > 0 && (
          <section className="mt-14" aria-labelledby="removed">
            <div className="px-4 sm:px-6">
              <SectionHeader
                id="removed"
                title="Removed"
                meta={`${removed.length} hidden from every view`}
                actions={
                  <button type="button" onClick={() => { const urls = [...hidden.value]; hidden.restoreAll(); toast(`Restored ${urls.length}`, { label: 'Undo', run: () => hidden.add(urls) }); }} className={buttonClass('secondary', 'sm')}>
                    Restore all
                  </button>
                }
              />
            </div>
            <div className="opacity-80">{row('Removed', removed)}</div>
          </section>
        )}

        <p className="px-4 sm:px-6 mt-16 text-[13px] text-paper-faint">
          Saves, topics and removals stay on this device for now. <Link href="/archive/" className="underline underline-offset-4 hover:text-paper">Search everything</Link>
        </p>
      </main>
      {viewer && <StoryViewer stories={viewer.stories} at={viewer.at} onGo={(at) => setViewer((v) => v && { ...v, at })} onClose={() => setViewer(null)} likes={likes} />}
      <Toaster />
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mx-4 sm:mx-6 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-paper-faint">{children}</p>;
}
