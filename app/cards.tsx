'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BEAT_INFO, sourceOf, summaryOf, tagsOf, titleOf, videoEmbed, type PublishedItem } from '@/lib/roundup';
import type { Trend } from '@/lib/trends';
import { Actions, BeatChip, Cover, Icon, KEYS, Kicker, RemoveButton, useStoredSet } from './ui';

type Counts = { counts: Record<string, number>; bump: (id: string, by: number) => void };
const shadow = '[text-shadow:0_1px_12px_rgba(0,0,0,0.75)]';

/** A project as a tall story card: the picture is the hero, words over a deep fade, reactions at the foot. */
export function ProjectStory({ item, week, likes, position, onOpen, className = '' }: { item: PublishedItem; week: string; likes: Counts; position?: string; onOpen: () => void; className?: string }) {
  const seen = useStoredSet(KEYS.seen).has(item.url);
  const video = !!videoEmbed(item);
  const tags = [...(video ? ['video'] : []), ...tagsOf(item)].slice(0, 3);
  return (
    <article className={`group relative isolate overflow-hidden rounded-3xl border border-line bg-ink-raised aspect-[9/16] max-h-[78svh] ${className}`}>
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 cursor-pointer" aria-label={`Open story: ${titleOf(item)}`}>
        <Cover item={item} />
      </button>
      {seen && <div className="absolute inset-0 z-[5] pointer-events-none bg-black/45 transition-opacity group-hover:opacity-0" aria-hidden />}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-4 pb-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-black/50 border border-white/15 text-white font-hud text-[10px] uppercase tracking-wider backdrop-blur-md">{t}</span>
          ))}
        </div>
        <span className="shrink-0 flex items-center gap-1.5">
          {position && <span className="rounded-full bg-black/50 px-2 py-0.5 font-hud text-[10px] tabular-nums text-white/80 backdrop-blur-md">{position}</span>}
          <span className="pointer-events-auto -my-1.5">
            <RemoveButton item={item} tone="overlay" />
          </span>
        </span>
      </div>
      {video && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none w-14 h-14 rounded-full bg-black/55 border border-white/25 backdrop-blur-md flex items-center justify-center text-white">
          <Icon name="play" filled className="w-6 h-6 ml-0.5" />
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-black via-black/85 to-transparent px-5 pt-28 pb-3">
        <div className={`font-hud text-[11px] uppercase tracking-[0.12em] text-white/75 truncate ${shadow}`}>{sourceOf(item)}</div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="pointer-events-auto block mt-2 hover:underline decoration-white/40 underline-offset-4">
          <h3 className={`text-[20px] font-bold leading-tight text-balance text-white ${shadow}`}>{titleOf(item)}</h3>
        </a>
        <p className={`mt-2 text-[13.5px] leading-relaxed text-white/85 ${shadow}`}>{summaryOf(item)}</p>
        <Actions item={item} week={week} {...likes} tone="overlay" className="pointer-events-auto mt-2 -ml-2" />
      </div>
    </article>
  );
}

/** A news story in the feed: thumbnail, beat and source, headline, summary, tags and reactions. */
export function FeedCard({ item, week, likes, onOpen, meta, onTag }: { item: PublishedItem; week: string; likes: Counts; onOpen?: () => void; meta?: ReactNode; onTag?: (tag: string) => void }) {
  const seen = useStoredSet(KEYS.seen);
  const read = seen.has(item.url);
  const title = titleOf(item);
  const summary = summaryOf(item);
  return (
    <article className={`group w-full flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-card hover:border-line-strong transition-colors ${read ? 'opacity-70 hover:opacity-100' : ''}`}>
      <button type="button" onClick={onOpen} className="relative aspect-[16/9] overflow-hidden bg-ink-raised" aria-label={`Open story: ${title}`} tabIndex={onOpen ? 0 : -1}>
        <Cover item={item} small />
        {videoEmbed(item) && (
          <span className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white">
            <Icon name="play" filled className="w-4 h-4 ml-0.5" />
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 min-w-0">
          <BeatChip item={item} />
          <span className="min-w-0 truncate font-hud text-[11px] uppercase tracking-[0.1em] text-paper-muted">{sourceOf(item)}</span>
          <span className="ml-auto shrink-0 flex items-center gap-1 -my-1.5 -mr-2">
            {meta}
            <RemoveButton item={item} />
          </span>
        </div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => seen.toggle(item.url, true)} className="mt-3 hover:underline decoration-paper-faint underline-offset-4">
          <h3 className="text-[16.5px] font-bold leading-snug text-balance text-paper">{title}</h3>
        </a>
        {summary && summary !== title && <p className="mt-2 text-[13.5px] text-paper-muted leading-relaxed">{summary}</p>}
        <div className="mt-auto pt-3 flex items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {tagsOf(item)
              .slice(0, 2)
              .map((t) => (
                <button key={t} type="button" onClick={() => onTag?.(t)} className="rounded-md bg-ink-hover px-2 py-0.5 text-[11.5px] font-medium text-paper hover:bg-line" title={`More on ${t}`}>
                  #{t}
                </button>
              ))}
          </div>
          <Actions item={item} week={week} {...likes} className="ml-auto -mr-2" />
        </div>
      </div>
    </article>
  );
}

/** A horizontal row that scrolls by swipe, arrows and keys, with its own arrow buttons. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (el) setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(update, []);
  const go = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={ref} onScroll={update} role="region" aria-label={label} tabIndex={0} className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 pb-2 focus-visible:outline-none">
        {children}
      </div>
      {!edge.start && (
        <button type="button" onClick={() => go(-1)} aria-label="Scroll back" className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-paper text-ink shadow-xl hover:bg-white">
          <Icon name="arrowLeft" />
        </button>
      )}
      {!edge.end && (
        <button type="button" onClick={() => go(1)} aria-label="Scroll on" className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-paper text-ink shadow-xl hover:bg-white">
          <Icon name="arrowRight" />
        </button>
      )}
    </div>
  );
}

/** A trend's sources as one list: its stories in the issue first, then the outlets, each with what it shows. */
/** "www.theverge.com" as "theverge", as XPLR's Trending shows an outlet. */
const shortHost = (host: string) => host.replace(/^www\./, '').replace(/\.(com|co\.uk|net|org|io)$/, '');

type TrendSource = { item: PublishedItem; story: boolean };
function trendSources(t: Trend, stories: PublishedItem[]): TrendSource[] {
  return [
    ...stories.map((item) => ({ item, story: true })),
    ...t.links.map((l) => ({ item: { url: l.url, title: l.title, imageUrl: l.imageUrl, feedName: shortHost(l.host) }, story: false })),
  ];
}

/** A trend picture: opens the article it comes from. */
function TrendPicture({ source: { item } }: { source: TrendSource }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${sourceOf(item)}: ${titleOf(item)}`} className="group relative overflow-hidden">
      <Cover item={item} small />
    </a>
  );
}

/**
 * A trend as a tile, the same as XPLR's Trending: a strip of pictures from its stories and outlets, its beat, what
 * happened and the whole summary, then one small line of where to read it. The lead takes two columns. It is for
 * reading, not a story: every picture and source opens its article.
 */
export function TrendTile({ trend: t, stories, lead = false, children }: { trend: Trend; stories: PublishedItem[]; lead?: boolean; children?: ReactNode }) {
  const sources = trendSources(t, stories);
  // Pictures first, stories before outlets
  const pictures = [...sources.filter((s) => s.item.imageUrl), ...sources.filter((s) => !s.item.imageUrl)].slice(0, 3);
  return (
    <article className={`${BEAT_INFO[t.beat].tone} tone-card rounded-3xl overflow-hidden flex flex-col ${lead ? 'sm:col-span-2' : ''}`}>
      <div className={`relative grid gap-px bg-line shrink-0 ${lead ? 'aspect-[16/7]' : 'aspect-[16/9]'}`} style={{ gridTemplateColumns: `repeat(${pictures.length || 1}, 1fr)` }}>
        {pictures.map((s) => (
          <TrendPicture key={s.item.url} source={s} />
        ))}
      </div>
      <div className={`flex flex-col flex-1 ${lead ? 'p-6 sm:p-7' : 'p-5'}`}>
        <Kicker className="!text-[rgb(var(--t))]">{BEAT_INFO[t.beat].label}</Kicker>
        <h3 className={`mt-2.5 font-poster uppercase tracking-wide leading-[0.95] text-balance text-paper ${lead ? 'text-[36px] sm:text-[46px]' : 'text-[26px]'}`}>{t.title}</h3>
        {t.why && <p className={`mt-3 text-paper-muted leading-relaxed ${lead ? 'text-[15.5px]' : 'text-[14px]'}`}>{t.why}</p>}
        {/* Where to read it: one small line, the stories first */}
        <p className="mt-auto pt-4 flex flex-wrap gap-x-3 gap-y-1 font-hud text-[10.5px] uppercase tracking-[0.1em] text-paper-faint">
          {sources.map(({ item }) => (
            <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-paper" title={titleOf(item)}>
              {sourceOf(item)} ↗
            </a>
          ))}
        </p>
        {children}
      </div>
    </article>
  );
}
