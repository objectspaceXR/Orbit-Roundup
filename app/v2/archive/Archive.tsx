'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BEAT_INFO, BEATS, beatOf, isProject, sourceOf, summaryOf, tagsOf, titleOf, weekRange, type ArchiveItem, type Beat } from '@/lib/roundup';
import { FeedCard } from '../cards';
import StoryViewer, { type Story } from '../StoryViewer';
import { Icon, KEYS, Kicker, SectionHeader, Toaster, TopBar, buttonClass, useLikeCounts, useStoredSet } from '../ui';

/** Lower-case words of an item, for search. */
const haystack = (i: ArchiveItem) => `${titleOf(i)} ${summaryOf(i)} ${sourceOf(i)} ${tagsOf(i).join(' ')}`.toLowerCase();

/**
 * Every published story, searchable. Words match titles, summaries, sources and tags (all words must match);
 * `#tag` matches a tag exactly. Filter by beat, kind and week; results are grouped by week, newest first.
 */
export default function Archive({ items, weeks }: { items: ArchiveItem[]; weeks: string[] }) {
  const [q, setQ] = useState('');
  const [beat, setBeat] = useState<Beat | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'projects' | 'news' | 'saved' | 'hidden'>('all');
  const [week, setWeek] = useState('all');
  const [viewer, setViewer] = useState<{ stories: Story[]; at: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const saved = useStoredSet(KEYS.saved);
  const hidden = useStoredSet(KEYS.hidden);

  // ?q= from links such as a trend's "All weeks"; "/" focuses the box
  useEffect(() => {
    const p = new URLSearchParams(location.search).get('q');
    if (p) queueMicrotask(() => setQ(p));
    const key = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }, [q]);

  const index = useMemo(() => items.map((i) => ({ i, text: haystack(i), tags: tagsOf(i) })), [items]);
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return index
      .filter(({ i, text, tags }) => {
        if (beat !== 'all' && beatOf(i) !== beat) return false;
        if (week !== 'all' && i.week !== week) return false;
        if (kind === 'projects' && !isProject(i)) return false;
        if (kind === 'news' && isProject(i)) return false;
        if (kind === 'saved' && !saved.has(i.url)) return false;
        if (kind === 'hidden' ? !hidden.has(i.url) : hidden.has(i.url)) return false;
        return terms.every((t) => (t.startsWith('#') ? tags.includes(t.slice(1)) : text.includes(t)));
      })
      .map(({ i }) => i);
  }, [index, q, beat, week, kind, saved, hidden]);
  const groups = useMemo(() => {
    const m = new Map<string, ArchiveItem[]>();
    for (const r of results) m.set(r.week, [...(m.get(r.week) || []), r]);
    return [...m.entries()];
  }, [results]);
  const likes = useLikeCounts(groups.map(([w]) => w));

  // Topics to browse when there is no query: the most used specific tags
  const topics = useMemo(() => {
    const c = new Map<string, number>();
    for (const { tags } of index) for (const t of tags) c.set(t, (c.get(t) || 0) + 1);
    return [...c.entries()].filter(([t]) => !['ai', '3d', '2d', 'xr', 'art', 'design', 'trends', 'tools'].includes(t)).sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [index]);

  const select = 'h-9 rounded-full border border-line bg-ink-raised px-3 text-[13px] text-paper focus:outline-none focus:border-signal';
  return (
    <>
      <TopBar current="archive" />
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-8 sm:pt-12 pb-24">
        <Kicker className="text-signal">{items.length} stories · {weeks.length} issues</Kicker>
        <h1 className="mt-2 font-poster uppercase text-[52px] sm:text-[80px] leading-[0.88] tracking-wide">The archive</h1>
        <div className="mt-6 relative max-w-3xl">
          <Icon name="search" className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-paper-faint" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stories, sources, #tags…"
            aria-label="Search the archive"
            className="w-full h-14 rounded-full border border-line-strong bg-ink-raised pl-14 pr-14 text-[16px] text-paper placeholder:text-paper-faint focus:outline-none focus:border-signal"
          />
          <kbd className="hidden sm:block absolute right-5 top-1/2 -translate-y-1/2 font-hud text-[11px] text-paper-faint border border-line rounded px-1.5">/</kbd>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={beat} onChange={(e) => setBeat(e.target.value as Beat | 'all')} className={select} aria-label="Beat">
            <option value="all">All beats</option>
            {BEATS.map((b) => (
              <option key={b} value={b}>{BEAT_INFO[b].label}</option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={select} aria-label="Kind">
            <option value="all">News &amp; projects</option>
            <option value="news">News only</option>
            <option value="projects">Projects only</option>
            <option value="saved">My saves</option>
            <option value="hidden">Removed</option>
          </select>
          <select value={week} onChange={(e) => setWeek(e.target.value)} className={select} aria-label="Week">
            <option value="all">Every week</option>
            {weeks.map((w) => (
              <option key={w} value={w}>{w.replace('-', ' ')} · {weekRange(w)}</option>
            ))}
          </select>
          {(q || beat !== 'all' || kind !== 'all' || week !== 'all') && (
            <button type="button" onClick={() => { setQ(''); setBeat('all'); setKind('all'); setWeek('all'); }} className={buttonClass('ghost', 'sm')}>
              Clear
            </button>
          )}
          <Kicker className="ml-auto">{results.length} found</Kicker>
        </div>
        {!q && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {topics.map(([t, n]) => (
              <button key={t} type="button" onClick={() => setQ(`#${t}`)} className="rounded-full border border-line px-3 h-8 text-[12.5px] text-paper-muted hover:text-paper hover:border-line-strong">
                #{t} <span className="font-hud text-[10.5px] opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        {groups.map(([w, list]) => (
          <section key={w} className="mt-12">
            <SectionHeader title={`Week ${Number(w.split('-W')[1])}`} meta={`${weekRange(w)} · ${list.length}`} actions={<Link href={`/v2/${w}/`} className={buttonClass('ghost', 'sm')}>Open issue <Icon name="arrowRight" /></Link>} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((i) => (
                <FeedCard key={i.url} item={i} week={w} likes={likes} onTag={(t) => setQ(`#${t}`)} onOpen={() => setViewer({ stories: results.map((r) => ({ item: r, week: r.week })), at: results.indexOf(i) })} />
              ))}
            </div>
          </section>
        ))}
        {!results.length && <p className="mt-12 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-paper-faint">Nothing matches. Try fewer words, or a #tag.</p>}
      </main>
      {viewer && <StoryViewer stories={viewer.stories} at={viewer.at} onGo={(at) => setViewer((v) => v && { ...v, at })} onClose={() => setViewer(null)} likes={likes} />}
      <Toaster />
    </>
  );
}
