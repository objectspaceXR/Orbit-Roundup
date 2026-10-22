'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BEAT_INFO, BEATS, REELS, beatOf, feedOf, isProject, issueDate, leadOf, minutesFor, reelsOf, summaryParts, tagsOf, weekRange, type Beat, type WeekData, type WeekMeta } from '@/lib/roundup';
import type { Trend } from '@/lib/trends';
import { externalImageSrcForImg } from '@/lib/external-image-src';
import { FeedCard, ProjectStory, Row, TrendTile } from './cards';
import StoryViewer, { type Story } from './StoryViewer';
import { Cover, Icon, KEYS, Kicker, PlayStack, Poster, SectionHeader, Toaster, TopBar, buttonClass, useHidden, useLikeCounts, useStoredSet } from './ui';

type Lens = 'all' | Beat | 'following' | 'saved';

/**
 * One week as a public XPLR dashboard: one banner with the week to play as stories and Tom's summary of it,
 * what is trending, inspiration as a row of stories, then the feed (the news no trend tells) through lenses
 * (beats, the topics you follow, your saves), and the weeks before.
 */
export default function WeekView({ data, weeks, trends }: { data: WeekData; weeks: WeekMeta[]; trends: Trend[] }) {
  const { week } = data;
  const hidden = useHidden();
  const items = useMemo(() => data.items.filter((i) => !hidden.has(i.url)), [data.items, hidden]);
  const likes = useLikeCounts([week]);
  const follow = useStoredSet(KEYS.follow);
  const saved = useStoredSet(KEYS.saved);
  const seen = useStoredSet(KEYS.seen);
  const [lens, setLens] = useState<Lens>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ stories: Story[]; at: number } | null>(null);


  const projects = useMemo(() => items.filter(isProject), [items]);
  const rest = useMemo(() => feedOf(items), [items]);
  const reels = useMemo(() => reelsOf(items), [items]);
  const cover = leadOf(items) ?? items[0];
  const byUrl = useMemo(() => new Map(items.map((i) => [i.url, i])), [items]);

  const feed = useMemo(() => {
    let list = rest;
    if (lens === 'following') list = rest.filter((i) => tagsOf(i).some((t) => follow.has(t)));
    else if (lens === 'saved') list = rest.filter((i) => saved.has(i.url));
    else if (lens !== 'all') list = rest.filter((i) => beatOf(i) === lens);
    if (tag) list = list.filter((i) => tagsOf(i).includes(tag));
    return list;
  }, [rest, lens, tag, follow, saved]);
  const trendTile = (t: Trend, lead = false) => {
    const stories = t.urls.map((u) => byUrl.get(u)!).filter(Boolean);
    return <TrendTile key={t.title} trend={t} stories={stories} lead={lead} />;
  };
  const open = (list: typeof items, item: (typeof items)[number]) => setViewer({ stories: list.map((i) => ({ item: i, week })), at: Math.max(0, list.indexOf(item)) });
  const topTags = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of items) for (const t of tagsOf(i)) if (!['ai', '3d', '2d', 'xr', 'art', 'design', 'trends', 'tools'].includes(t)) c.set(t, (c.get(t) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [items]);
  // Tom's summary of the week when XPLR published one; for older weeks, what its trends say
  const summary = useMemo(() => {
    if (data.summary) return summaryParts(data.summary);
    if (!trends.length) return null;
    return { opening: 'What happened this week:', bullets: trends.map((t) => `${t.title}. ${t.why.split(/(?<=\.)\s/)[0]}`), closing: '' };
  }, [data.summary, trends]);
  const beatNews = Object.fromEntries(BEATS.map((b) => [b, rest.filter((i) => beatOf(i) === b)])) as Record<Beat, typeof items>;

  const lenses: { id: Lens; label: string; n: number }[] = [
    { id: 'all', label: 'Everything', n: rest.length },
    ...BEATS.map((b) => ({ id: b as Lens, label: BEAT_INFO[b].short, n: beatNews[b].length })),
    { id: 'following', label: 'Following', n: rest.filter((i) => tagsOf(i).some((t) => follow.has(t))).length },
    { id: 'saved', label: 'Saved', n: rest.filter((i) => saved.has(i.url)).length },
  ];

  return (
    <>
      <TopBar current="week" week={week} weeks={weeks} />
      <main className="mx-auto max-w-[1400px] pb-24">
        {/* ── The issue: one wide banner with the week to play as stories and what happened, in Tom's words ── */}
        <section className="px-4 sm:px-6 pt-6 sm:pt-10">
          <div className="group relative isolate overflow-hidden rounded-3xl border border-line">
            <Cover item={cover} eager />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/20 lg:bg-gradient-to-r lg:from-ink lg:via-ink/75 lg:to-ink/30" />
            <div className="relative z-10 grid gap-8 p-5 pt-40 sm:p-8 sm:pt-56 lg:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-end lg:min-h-[560px]">
              <div>
                <Kicker className="text-signal">Orbit Roundup · {weekRange(week)}</Kicker>
                <h1 className="mt-3 font-poster uppercase text-[56px] sm:text-[88px] leading-[0.86] tracking-wide text-paper">
                  Week {Number(week.split('-W')[1])}
                  <span className="block text-paper-faint text-[0.42em] tracking-normal mt-2">in XR, AI, 3D &amp; creative tech</span>
                </h1>
                <p className="mt-5 max-w-xl text-[15px] text-paper-muted leading-relaxed">
                  {items.length} stories · {minutesFor(items)} min · out {issueDate(week)}. Picked by Tom Martin-Davies.
                </p>
                <div className="mt-6 max-w-xl grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Play the week as stories">
                  {REELS.map((r) => {
                    const list = reels[r.id];
                    if (!list.length) return null;
                    const fresh = list.filter((i) => !seen.has(i.url));
                    // It starts on the first story not watched yet, and the stack shows that one and the two after it
                    const from = Math.max(0, list.indexOf(fresh[0] ?? list[0]));
                    return <PlayStack key={r.id} label={r.id === 'all' ? 'all' : r.label} items={[...list.slice(from), ...list.slice(0, from)]} count={list.length} fresh={fresh.length} primary={r.id === 'all'} onClick={() => open(list, list[from])} />;
                  })}
                </div>
              </div>
              {summary && <WeekSummary {...summary} />}
            </div>
          </div>
        </section>

        {/* ── Trends: the lead big, the rest smaller, each with its pictures, the whole summary and where to read it ── */}
        {trends.length > 0 && (
          <section className="px-4 sm:px-6 mt-16" aria-labelledby="trends">
            <SectionHeader index="01" id="trends" title="Trending" meta="What happened this week" />
            {/* The lead across two columns, the rest one each, three to a row however many there are */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{trends.map((t, n) => trendTile(t, n === 0))}</div>
          </section>
        )}

        {/* ── Inspiration ── */}
        {projects.length > 0 && (
          <section className="mt-16" aria-labelledby="inspiration">
            <div className="px-4 sm:px-6">
              <SectionHeader index="02" id="inspiration" title="Inspiration" meta={`${projects.length} projects · tap to watch`} actions={
                <button type="button" onClick={() => open(projects, projects[Math.floor(Math.random() * projects.length)])} className={buttonClass('secondary', 'sm')}>
                  <Icon name="sparkle" /> Surprise me
                </button>
              } />
            </div>
            <Row label="Inspiration this week">
              {projects.map((p, i) => (
                <ProjectStory key={p.url} item={p} week={week} likes={likes} position={`${i + 1}/${projects.length}`} onOpen={() => open(projects, p)} className="snap-start shrink-0 w-[min(78vw,320px)]" />
              ))}
            </Row>
          </section>
        )}

        {/* ── The feed ── */}
        <section id="feed" className="px-4 sm:px-6 mt-16 scroll-mt-20" aria-labelledby="feed-title">
          <SectionHeader index="03" id="feed-title" title="Your feed" meta="All the week's news" />
          <div className="flex flex-wrap items-center gap-2 mb-3" role="tablist" aria-label="Feed lens">
            {lenses.map((l) => (
              <button key={l.id} role="tab" aria-selected={lens === l.id} type="button" onClick={() => setLens(l.id)} className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-colors ${lens === l.id ? 'bg-paper text-ink' : 'border border-line text-paper-muted hover:text-paper hover:border-line-strong'}`}>
                {l.label} <span className="font-hud text-[11px] opacity-60 ml-1">{l.n}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-6 min-h-8">
            {tag ? (
              <button type="button" onClick={() => setTag(null)} className="inline-flex items-center gap-1.5 rounded-full bg-signal text-ink px-3 h-8 text-[12.5px] font-semibold">
                #{tag} <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Kicker className="mr-1">{follow.value.length ? 'Following' : 'Follow topics to build your feed'}</Kicker>
            )}
            {!tag &&
              (follow.value.length ? follow.value : topTags).slice(0, 10).map((t) => (
                <button key={t} type="button" onClick={() => follow.toggle(t)} className={`rounded-full px-3 h-8 text-[12.5px] font-medium transition-colors ${follow.has(t) ? 'bg-ink-hover text-paper' : 'border border-dashed border-line-strong text-paper-muted hover:text-paper'}`} title={follow.has(t) ? `Unfollow ${t}` : `Follow ${t}`}>
                  {follow.has(t) ? '✓ ' : '+ '}#{t}
                </button>
              ))}
          </div>
          {feed.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {feed.map((i) => (
                <FeedCard key={i.url} item={i} week={week} likes={likes} onOpen={() => open(feed, i)} onTag={setTag} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-paper-faint">
              {lens === 'saved' ? 'Nothing saved from this week yet. Tap the bookmark on any story.' : lens === 'following' ? 'None of your topics came up this week. Tap + on a topic above, or a #tag on any card.' : 'Nothing here.'}
            </p>
          )}
        </section>

        {/* ── Weeks before ── */}
        {weeks.length > 1 && (
          <section className="mt-16" aria-labelledby="past">
            <div className="px-4 sm:px-6">
              <SectionHeader index="04" id="past" title="Back in time" meta={`${weeks.length} issues`} actions={<Link href="/archive/" className={buttonClass('secondary', 'sm')}><Icon name="search" /> Search the archive</Link>} />
            </div>
            <Row label="Past weeks">
              {[...weeks].reverse().map((w) => (
                <Link key={w.week} href={`/${w.week}/`} aria-current={w.week === week ? 'page' : undefined} className={`group snap-start shrink-0 relative isolate overflow-hidden rounded-2xl border w-[220px] aspect-[4/5] ${w.week === week ? 'border-signal' : 'border-line hover:border-line-strong'}`}>
                  {w.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={externalImageSrcForImg(w.cover)} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <Poster name={w.week} seed={w.week} small />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block font-poster uppercase text-4xl leading-none">Wk {Number(w.week.split('-W')[1])}</span>
                    <Kicker className="text-white/75 mt-1.5 block">{weekRange(w.week)} · {w.count}</Kicker>
                  </span>
                </Link>
              ))}
            </Row>
          </section>
        )}
      </main>
      {viewer && <StoryViewer stories={viewer.stories} at={viewer.at} onGo={(at) => setViewer((v) => v && { ...v, at })} onClose={() => setViewer(null)} likes={likes} />}
      <Toaster />
    </>
  );
}

/** What happened this week, in Tom's words: his opening line, a bullet per highlight and his closing line. */
function WeekSummary({ opening, bullets, closing }: { opening: string; bullets: string[]; closing: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink/70 backdrop-blur-md p-5 sm:p-6">
      <Kicker className="text-signal">What&apos;s in the week</Kicker>
      {opening && <p className="mt-3 text-[16px] sm:text-[17px] font-semibold leading-snug text-paper text-balance">{opening}</p>}
      {bullets.length > 0 && (
        <ul className="mt-3 grid gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2.5 text-[14px] leading-relaxed text-paper-muted">
              <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-signal shrink-0" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {closing && <p className="mt-4 text-[13.5px] leading-relaxed text-paper-faint">{closing}</p>}
    </div>
  );
}
