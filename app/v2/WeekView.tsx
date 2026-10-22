'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BEAT_INFO, BEATS, REELS, beatOf, feedOf, isProject, issueDate, leadOf, minutesFor, reelsOf, sourceOf, tagsOf, titleOf, weekRange, type Beat, type WeekData, type WeekMeta } from '@/lib/roundup';
import type { Trend } from '@/lib/trends';
import { externalImageSrcForImg } from '@/lib/external-image-src';
import { FeedCard, ProjectStory, Row, TrendTile } from './cards';
import StoryViewer, { type Story } from './StoryViewer';
import { Cover, Icon, KEYS, Kicker, Poster, SectionHeader, Toaster, TopBar, buttonClass, useHidden, useLikeCounts, useStoredSet } from './ui';

type Lens = 'all' | Beat | 'following' | 'saved';

/**
 * One week as a public XPLR dashboard: the issue up top with the week as stories to watch and each beat's lead,
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
  const rest = useMemo(() => feedOf(items, new Set(trends.flatMap((t) => t.urls))), [items, trends]);
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
    return <TrendTile key={t.title} trend={t} stories={stories} lead={lead} onWatch={(s) => open(stories, s)} />;
  };
  const showBeat = (b: Beat) => {
    setLens(b);
    setTag(null);
    document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' });
  };

  const open = (list: typeof items, item: (typeof items)[number]) => setViewer({ stories: list.map((i) => ({ item: i, week })), at: Math.max(0, list.indexOf(item)) });
  const topTags = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of items) for (const t of tagsOf(i)) if (!['ai', '3d', '2d', 'xr', 'art', 'design', 'trends', 'tools'].includes(t)) c.set(t, (c.get(t) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [items]);
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
        {/* ── The issue: the week as stories to watch, and each beat's lead with the way to the rest of it ── */}
        <section className="px-4 sm:px-6 pt-6 sm:pt-10 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="group relative isolate overflow-hidden rounded-3xl border border-line min-h-[420px] sm:min-h-[480px] flex flex-col justify-end">
            <Cover item={cover} eager />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/10" />
            <div className="relative z-10 p-6 sm:p-8">
              <Kicker className="text-signal">Orbit Roundup · {weekRange(week)}</Kicker>
              <h1 className="mt-3 font-poster uppercase text-[56px] sm:text-[88px] leading-[0.86] tracking-wide text-paper">
                Week {Number(week.split('-W')[1])}
                <span className="block text-paper-faint text-[0.42em] tracking-normal mt-2">in XR, AI, 3D &amp; creative tech</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15px] text-paper-muted leading-relaxed">
                {items.length} stories · {minutesFor(items)} min · out {issueDate(week)}. Picked by Tom Martin-Davies.
              </p>
              <div className="mt-6 -mx-1 px-1 flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar" role="group" aria-label="Watch the week">
                {REELS.map((r) => {
                  const list = reels[r.id];
                  if (!list.length) return null;
                  const fresh = list.filter((i) => !seen.has(i.url));
                  const face = fresh[0] ?? list[0];
                  return (
                    <button key={r.id} type="button" onClick={() => open(list, face)} aria-label={`Watch ${r.label}: ${list.length} stories`} className="group/reel shrink-0 w-[72px] flex flex-col items-center gap-1.5 text-center">
                      {/* A ring while it has stories you have not watched */}
                      <span className={`block w-16 h-16 rounded-full p-[3px] transition-transform group-hover/reel:scale-105 ${fresh.length ? 'bg-signal' : 'bg-line-strong'}`}>
                        <span className="relative block w-full h-full rounded-full overflow-hidden ring-2 ring-ink bg-ink">
                          <Cover item={face} small plain />
                        </span>
                      </span>
                      <span className="text-[12px] font-semibold leading-tight text-paper">{r.label}</span>
                      <span className="font-hud text-[10px] leading-none text-paper-faint">{fresh.length && fresh.length < list.length ? `${fresh.length} new` : list.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid gap-4 content-start">
            {BEATS.map((b) => {
              const list = beatNews[b];
              const top = leadOf(list);
              if (!top) return null;
              return (
                <article key={b} className={`${BEAT_INFO[b].tone} tone-card rounded-3xl p-4 flex gap-4`}>
                  <button type="button" onClick={() => open(list, top)} aria-label={`Watch: ${titleOf(top)}`} className="relative w-24 sm:w-28 aspect-square shrink-0 rounded-2xl overflow-hidden">
                    <Cover item={top} small />
                  </button>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <Kicker className="truncate">
                      {BEAT_INFO[b].label} · {sourceOf(top)}
                    </Kicker>
                    <a href={top.url} target="_blank" rel="noopener noreferrer" onClick={() => seen.toggle(top.url, true)} className="mt-1.5 hover:underline decoration-paper-faint underline-offset-4">
                      <h2 className="text-[16.5px] font-bold leading-snug text-balance text-paper line-clamp-3">{titleOf(top)}</h2>
                    </a>
                    {list.length > 1 && (
                      <button type="button" onClick={() => showBeat(b)} className="mt-auto pt-2 self-start inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline underline-offset-4" style={{ color: 'rgb(var(--t))' }}>
                        All {list.length} {BEAT_INFO[b].short} stories <Icon name="arrowRight" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
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
          <SectionHeader index="03" id="feed-title" title="Your feed" meta="The rest of the week's news" />
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
              <SectionHeader index="04" id="past" title="Back in time" meta={`${weeks.length} issues`} actions={<Link href="/v2/archive/" className={buttonClass('secondary', 'sm')}><Icon name="search" /> Search the archive</Link>} />
            </div>
            <Row label="Past weeks">
              {[...weeks].reverse().map((w) => (
                <Link key={w.week} href={`/v2/${w.week}/`} aria-current={w.week === week ? 'page' : undefined} className={`group snap-start shrink-0 relative isolate overflow-hidden rounded-2xl border w-[220px] aspect-[4/5] ${w.week === week ? 'border-signal' : 'border-line hover:border-line-strong'}`}>
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
