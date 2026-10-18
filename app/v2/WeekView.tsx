'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BEAT_INFO, BEATS, beatOf, isProject, issueDate, minutesFor, sourceOf, summaryOf, tagsOf, titleOf, weekRange, type Beat, type WeekData, type WeekMeta } from '@/lib/roundup';
import type { Trend } from '@/lib/trends';
import { externalImageSrcForImg } from '@/lib/external-image-src';
import { FeedCard, ProjectStory, Row } from './cards';
import StoryViewer, { type Story } from './StoryViewer';
import { Cover, Icon, KEYS, Kicker, Poster, SectionHeader, Toaster, TopBar, buttonClass, useHidden, useLikeCounts, useStoredSet } from './ui';

type Lens = 'all' | Beat | 'following' | 'saved';

/**
 * One week as a public XPLR dashboard: the issue up top, what is trending, inspiration as a row of stories,
 * then the feed through lenses (beats, the topics you follow, your saves), and the weeks before.
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
  const news = useMemo(() => items.filter((i) => !isProject(i)), [items]);
  const lead = useMemo(() => news.find((i) => i.imageUrl) ?? items[0], [news, items]);
  const byUrl = useMemo(() => new Map(items.map((i) => [i.url, i])), [items]);

  const feed = useMemo(() => {
    let list = items;
    if (lens === 'following') list = items.filter((i) => tagsOf(i).some((t) => follow.has(t)));
    else if (lens === 'saved') list = items.filter((i) => saved.has(i.url));
    else if (lens !== 'all') list = items.filter((i) => beatOf(i) === lens);
    if (tag) list = list.filter((i) => tagsOf(i).includes(tag));
    return list;
  }, [items, lens, tag, follow, saved]);

  const open = (list: typeof items, item: (typeof items)[number]) => setViewer({ stories: list.map((i) => ({ item: i, week })), at: Math.max(0, list.indexOf(item)) });
  const topTags = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of items) for (const t of tagsOf(i)) if (!['ai', '3d', '2d', 'xr', 'art', 'design', 'trends', 'tools'].includes(t)) c.set(t, (c.get(t) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [items]);
  const unseen = items.filter((i) => !seen.has(i.url)).length;
  const counts = Object.fromEntries(BEATS.map((b) => [b, items.filter((i) => beatOf(i) === b).length])) as Record<Beat, number>;

  const lenses: { id: Lens; label: string; n: number }[] = [
    { id: 'all', label: 'Everything', n: items.length },
    ...BEATS.map((b) => ({ id: b as Lens, label: BEAT_INFO[b].short, n: counts[b] })),
    { id: 'following', label: 'Following', n: items.filter((i) => tagsOf(i).some((t) => follow.has(t))).length },
    { id: 'saved', label: 'Saved', n: items.filter((i) => saved.has(i.url)).length },
  ];

  return (
    <>
      <TopBar current="week" week={week} weeks={weeks} />
      <main className="mx-auto max-w-[1400px] pb-24">
        {/* ── The issue ── */}
        <section className="px-4 sm:px-6 pt-6 sm:pt-10 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="group relative isolate overflow-hidden rounded-3xl border border-line min-h-[420px] sm:min-h-[480px] flex flex-col justify-end">
            <Cover item={lead} eager />
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
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => open(items, items.find((i) => !seen.has(i.url)) ?? items[0])} className={buttonClass('signal')}>
                  <Icon name="play" filled /> {unseen && unseen < items.length ? `Carry on · ${unseen} new` : 'Watch the week'}
                </button>
                <a href="#feed" className={buttonClass('secondary')}>
                  Read the feed
                </a>
              </div>
            </div>
          </div>
          <div className="grid gap-4 grid-rows-[auto_1fr]">
            <a href={lead.url} target="_blank" rel="noopener noreferrer" className={`${BEAT_INFO[beatOf(lead)].tone} tone-card rounded-3xl p-6 block`}>
              <Kicker>Lead story · {sourceOf(lead)}</Kicker>
              <h2 className="mt-3 text-[22px] font-bold leading-tight text-balance">{titleOf(lead)}</h2>
              <p className="mt-2 text-[14px] text-paper-muted leading-relaxed line-clamp-3">{summaryOf(lead)}</p>
            </a>
            <div className="grid grid-cols-3 gap-3">
              {BEATS.map((b) => (
                <button key={b} type="button" onClick={() => { setLens(b); setTag(null); document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' }); }} className={`${BEAT_INFO[b].tone} tone-card rounded-2xl p-4 text-left flex flex-col justify-between min-h-[120px]`}>
                  <span className="font-poster text-5xl leading-none">{counts[b]}</span>
                  <span className="font-hud text-[10.5px] uppercase tracking-[0.12em] text-paper-muted">{BEAT_INFO[b].label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trends: what happened this week, each told once with the stories behind it ── */}
        {trends.length > 0 && (
          <section className="px-4 sm:px-6 mt-16" aria-labelledby="trends">
            <SectionHeader index="01" id="trends" title="Trending" meta="What happened this week" />
            <div className="grid gap-4 lg:grid-cols-2">
              {trends.map((t, n) => {
                const stories = t.urls.map((u) => byUrl.get(u)!).filter(Boolean);
                if (!stories.length) return null;
                const sources = [...new Set(stories.map(sourceOf))];
                const lead = n === 0;
                return (
                  <article key={t.title} className={`${BEAT_INFO[t.beat].tone} tone-card rounded-3xl overflow-hidden flex flex-col ${lead ? 'lg:col-span-2 lg:flex-row' : ''}`}>
                    <button type="button" onClick={() => open(stories, stories[0])} aria-label={`Watch: ${t.title}`} className={`group relative grid gap-px bg-line shrink-0 ${lead ? 'lg:w-[55%] aspect-[16/9] lg:aspect-auto lg:min-h-[340px]' : 'aspect-[16/7]'}`} style={{ gridTemplateColumns: `repeat(${Math.min(3, stories.length)}, 1fr)` }}>
                      {stories.slice(0, 3).map((s) => (
                        <span key={s.url} className="relative overflow-hidden">
                          <Cover item={s} small />
                        </span>
                      ))}
                      <span className="absolute left-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-3 h-8 text-[12px] font-semibold text-white">
                        <Icon name="play" filled className="w-3.5 h-3.5" /> Watch the trend
                      </span>
                    </button>
                    <div className={`flex flex-col ${lead ? 'p-6 sm:p-8 lg:justify-center' : 'p-5 sm:p-6'}`}>
                      {/* How many stories it gathers: their pictures stacked, then the count in words */}
                      <div className="flex items-center gap-3">
                        <span className="flex -space-x-2.5 shrink-0" aria-hidden>
                          {stories.slice(0, 4).map((s) => (
                            <span key={s.url} className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-ink-raised bg-ink">
                              <Cover item={s} small plain />
                            </span>
                          ))}
                        </span>
                        <span className="flex flex-col gap-1 min-w-0">
                          <span className="font-poster uppercase tracking-wide text-[22px] leading-none" style={{ color: 'rgb(var(--t))' }}>
                            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                          </span>
                          <Kicker className="truncate">
                            {BEAT_INFO[t.beat].short} · {sources.slice(0, 3).join(', ')}
                            {sources.length > 3 ? ` +${sources.length - 3}` : ''}
                          </Kicker>
                        </span>
                      </div>
                      <h3 className={`mt-4 font-poster uppercase tracking-wide leading-[0.95] text-balance text-paper ${lead ? 'text-[40px] sm:text-[56px]' : 'text-[32px] sm:text-[36px]'}`}>{t.title}</h3>
                      {t.why && <p className={`mt-3 text-paper-muted leading-relaxed ${lead ? 'text-[16px]' : 'text-[14.5px]'}`}>{t.why}</p>}
                      <ul className="mt-4 divide-y divide-line/70 border-t border-line/70">
                        {stories.map((s) => (
                          <li key={s.url}>
                            <button type="button" onClick={() => open(stories, s)} className="w-full flex items-baseline gap-3 py-2 text-left group/row">
                              <span className="font-hud text-[10.5px] uppercase tracking-[0.1em] text-paper-faint w-24 shrink-0 truncate">{sourceOf(s)}</span>
                              <span className="text-[14px] leading-snug text-paper group-hover/row:underline decoration-paper-faint underline-offset-4 line-clamp-1">{titleOf(s)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
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
          <SectionHeader index="03" id="feed-title" title="Your feed" meta="Pick a lens, follow a topic" />
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
