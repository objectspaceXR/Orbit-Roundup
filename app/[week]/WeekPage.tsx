'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PublishedItem {
  url: string; title: string; summary?: string; category?: string;
  source?: string; tags?: string[]; imageUrl?: string; author?: string;
  subreddit?: string; feedName?: string; digestTitle?: string; digestSummary?: string;
  hint?: string;
}
interface WeekData { week: string; items: PublishedItem[]; publishedAt?: string; }

/** Week picker: W11 16 Mar 26 — week number + publish due date (Monday of week after). */
function formatWeekForPicker(week: string): string {
  const pubDate = getPublishDateForWeek(week);
  if (!pubDate) return week;
  const [, wStr] = week.split('-W');
  const wNum = parseInt(wStr);
  return `W${wNum} ${pubDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`;
}

/** Sections — inspiration/discord-inbox feed into XR/3D/AI, no separate sections */
const CAT_ORDER = ['xr-spatial', 'three-d', 'creative-ai'];
const CAT_LABELS: Record<string, string> = {
  'xr-spatial': 'XR & Spatial', 'three-d': '2D, 3D & Design',
  'creative-ai': 'Creative AI', 'inspiration': '2D, 3D & Design', 'discord-inbox': '2D, 3D & Design',
};

function toCanonicalCategory(cat: string): string {
  const k = cat?.trim().toLowerCase().replace(/\s+/g, '-') || '';
  if (CAT_ORDER.includes(k)) return k;
  const ALIAS: Record<string, string> = { 'xr': 'xr-spatial', '3d': 'three-d', 'ai': 'creative-ai', 'curated': 'discord-inbox' };
  return ALIAS[k] || k || 'xr-spatial';
}

/** Map category for display — inspiration/discord-inbox feed into three-d */
function displayCategory(cat: string): string {
  const c = toCanonicalCategory(cat || 'xr-spatial');
  if (c === 'inspiration' || c === 'discord-inbox') return 'three-d';
  return CAT_ORDER.includes(c) ? c : 'three-d';
}

function getItemTags(item: PublishedItem): string[] {
  if (Array.isArray(item.tags) && item.tags.length > 0) return item.tags.map(String).filter(Boolean);
  if (item.hint) return item.hint.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeTagForDisplay(tag: string): string | null {
  if (!tag || typeof tag !== 'string') return null;
  const k = tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!k || k === 'creative-tech') return null;
  return k;
}
const CAT_COLORS: Record<string, { bg: string; tag: string }> = {
  'xr-spatial':    { bg: 'bg-gradient-to-r from-cyan-500/80 to-blue-500/80',      tag: 'bg-cyan-200/90 text-cyan-900' },
  'three-d':       { bg: 'bg-gradient-to-r from-violet-500/80 to-purple-500/80',  tag: 'bg-violet-200/90 text-violet-900' },
  'creative-ai':   { bg: 'bg-gradient-to-r from-fuchsia-500/80 to-pink-500/80',   tag: 'bg-fuchsia-200/90 text-fuchsia-900' },
  'inspiration':   { bg: 'bg-gradient-to-r from-rose-500/80 to-pink-400/80',      tag: 'bg-rose-200/90 text-rose-900' },
  'discord-inbox': { bg: 'bg-gradient-to-r from-indigo-500/80 to-violet-500/80',  tag: 'bg-indigo-200/90 text-indigo-900' },
};
const FALLBACK = { bg: 'bg-gradient-to-r from-slate-500/80 to-slate-600/80', tag: 'bg-slate-200/90 text-slate-800' };

function weekDateRange(week: string): string {
  const [yearStr, wStr] = week.split('-W');
  const year = parseInt(yearStr), w = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)} ${year}`;
}

/** Publish date = Monday of the week after the content week (we publish on Monday). */
function getPublishDateForWeek(week: string): Date | null {
  const [yearStr, wStr] = week.split('-W');
  const year = parseInt(yearStr), w = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + w * 7); // +1 week
  return mon;
}

function sourceName(url: string, item: PublishedItem): string {
  if (item.feedName) return item.feedName;
  if (item.subreddit) return `r/${item.subreddit}`;
  const MAP: Record<string, string> = {
    'glassalmanac.com': 'Glass Almanac', 'uploadvr.com': 'UploadVR',
    'roadtovr.com': 'Road to VR', 'the-decoder.com': 'The Decoder',
    'techcrunch.com': 'TechCrunch', 'producthunt.com': 'Product Hunt',
    'theverge.com': 'The Verge',
  };
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/reddit\.com|redd\.it/.test(host)) return 'Reddit';
    if (MAP[host]) return MAP[host];
    const base = host.replace(/\.(com|org|net|co\.uk|io|ai|dev|app)$/i, '');
    return base.split(/[.-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  } catch { return 'Read more'; }
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}
function simplifyTitle(t: string): string {
  return stripHtml(t).replace(/\s*[–—]\s*.+$/, '').replace(/\s*\|\s*.+$/, '').trim();
}

const LIKED_KEY = 'orbit-reader-liked';
/** Same as old /orbit page: relative URL. Baked in via Cloudflare Function when deployed. */
function thumbSrc(imageUrl: string): string {
  if (!imageUrl) return '';
  // Route through Cloudflare Pages Function proxy — handles Reddit referrer restrictions
  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}
function getLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')); } catch { return new Set(); }
}
function saveLiked(s: Set<string>) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch {}
}

export default function WeekPage({ data, prevWeek, nextWeek, weekMeta }: {
  data: WeekData; prevWeek: string | null; nextWeek: string | null; weekMeta: { week: string; count: number }[];
}) {
  const allWeeks = weekMeta.map(w => w.week);
  const { week, items, publishedAt } = data;
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set());

  useEffect(() => { setLiked(getLiked()); }, []);
  useEffect(() => {
    fetch(`/api/likes/${week}`).then(r => r.json()).then(d => setCounts(d || {})).catch(() => {});
  }, [week]);

  const itemsFiltered = useMemo(() => {
    let out = items;
    if (tagFilters.size > 0) {
      const lowerSet = new Set([...tagFilters].map((t) => t.toLowerCase()));
      out = out.filter((i) => getItemTags(i).some((t) => {
        const norm = normalizeTagForDisplay(t);
        return norm && lowerSet.has(norm.toLowerCase());
      }));
    }
    if (categoryFilters.size > 0) {
      out = out.filter((i) => categoryFilters.has(displayCategory(i.category || 'xr-spatial')));
    }
    return out;
  }, [items, tagFilters, categoryFilters]);

  const grouped = useMemo(() => {
    const map: Record<string, PublishedItem[]> = {};
    for (const item of itemsFiltered) {
      const key = displayCategory(item.category || 'xr-spatial');
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [itemsFiltered]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      for (const t of getItemTags(i)) {
        const norm = normalizeTagForDisplay(t);
        if (norm) set.add(norm);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const toggleCategoryFilter = (key: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const toggleLike = async (url: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const isLiked = liked.has(url);
    const next = new Set(liked);
    isLiked ? next.delete(url) : next.add(url);
    setLiked(next); saveLiked(next);
    const key = btoa(url).slice(0, 64);
    setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + (isLiked ? -1 : 1)) }));
    try {
      await fetch(`/api/likes/${week}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: btoa(url).slice(0, 64), action: isLiked ? 'unlike' : 'like' }),
      });
    } catch {}
  };

  // Published = actual publish/update date from data
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => navigator.clipboard.writeText(url).then(() => alert('Link copied')));
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied'));
    }
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-gradient-four-corners text-slate-100 font-sans selection:bg-violet-500/30">
      {/* Header — matching mission-control orbit page */}
      <header className="relative bg-white py-4 rounded-b-3xl shadow-md shadow-slate-200/30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
            {/* Row 1: branding left, Share right (mobile) */}
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Link href="/" className="flex items-center gap-3 no-underline overflow-visible">
                <div className="relative flex-shrink-0 w-8 h-8 md:w-10 md:h-10" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/planets/saturn.png" alt="" className="w-full h-full object-contain" style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(50%) saturate(400%) hue-rotate(180deg)' }} />
                </div>
                <div className="overflow-visible">
                  <h1 className="font-[var(--font-display)] text-xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-[linear-gradient(to_right,#6366f1,#8b5cf6,#3b82f6,#60a5fa,#ec4899,#f43f5e)] bg-[length:200%_auto] animate-logo-pastel drop-shadow-[0_2px_6px_rgba(100,116,139,0.25)] overflow-visible py-0.5 pr-1 leading-[1.2]">
                    ORBIT ROUNDUP
                  </h1>
                  <p className="hidden md:block text-xs text-slate-400 font-medium mt-0.5">by Tom Martin-Davies</p>
                </div>
              </Link>
              <div className="md:hidden">
                <button onClick={handleShare} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors" title="Share this Orbit Roundup">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  Share
                </button>
              </div>
            </div>

            {/* Row 2: week nav + date (center) */}
            <div className="flex flex-col items-center justify-self-center order-last md:order-none">
              <div className="flex items-center gap-1">
                {prevWeek ? (
                  <Link href={`/${prevWeek}`} className="min-w-[44px] min-h-[44px] w-9 h-9 sm:w-7 sm:h-7 sm:min-w-0 sm:min-h-0 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors" title="Older week">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                  </Link>
                ) : <div className="w-9 sm:w-7" />}
                <div className="relative">
                  <button onClick={() => setWeekPickerOpen(!weekPickerOpen)} className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:px-3 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap transition-colors inline-flex items-center gap-1.5">
                    {formatWeekForPicker(week)}
                    {allWeeks.length > 0 && (
                      <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                      </svg>
                    )}
                  </button>
                  {weekPickerOpen && allWeeks.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setWeekPickerOpen(false)} />
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 min-w-[180px] py-1">
                        <div className="px-3 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Published weeks</div>
                        {[...weekMeta].reverse().map(({ week: w, count }) => (
                          <Link key={w} href={`/${w}`} onClick={() => setWeekPickerOpen(false)}
                            className={`block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors no-underline ${w === week ? 'text-violet-600 font-bold' : 'text-slate-700'}`}>
                            {formatWeekForPicker(w)} <span className="text-slate-400">({count})</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {nextWeek ? (
                  <Link href={`/${nextWeek}`} className="min-w-[44px] min-h-[44px] w-9 h-9 sm:w-7 sm:h-7 sm:min-w-0 sm:min-h-0 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors" title="Newer week">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                ) : <div className="w-9 sm:w-7" />}
              </div>
              {formattedDate && <p className="text-[10px] text-slate-400 mt-1">Published {formattedDate}</p>}
            </div>

            {/* Desktop: Share right */}
            <div className="hidden md:flex items-center justify-end gap-2">
              <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors" title="Share this Orbit Roundup">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
        <h2 className="text-center text-white font-bold tracking-tight mb-6 md:mb-8 drop-shadow-md">
          <span className="block text-xl md:text-2xl lg:text-3xl">What&apos;s in my orbit this week</span>
          <span className="block text-2xl md:text-3xl lg:text-4xl mt-1">in XR, AI, 3D and creative tech</span>
        </h2>
        <p className="text-center text-white/70 text-sm -mt-4 mb-6 md:mb-8">
          Issue {allWeeks.indexOf(week) + 1}
          {formattedDate && ` · ${formattedDate}`}
          {' · '}{week}
        </p>

        {/* Category + Tag filters */}
        {items.length > 0 && (
          <div className="flex flex-col gap-4 mb-6 md:mb-8">
            <div className="flex flex-wrap gap-1.5 items-center justify-center">
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Category</span>
              <button
                onClick={() => setCategoryFilters(new Set())}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${categoryFilters.size === 0 ? 'bg-white/20 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
              >
                All
              </button>
              {CAT_ORDER.filter(cat => items.some(i => displayCategory(i.category || 'xr-spatial') === cat)).map((cat) => {
                const count = items.filter((i) => displayCategory(i.category || 'xr-spatial') === cat).length;
                if (count === 0) return null;
                const isActive = categoryFilters.has(cat);
                const c = CAT_COLORS[cat] || FALLBACK;
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategoryFilter(cat)}
                    className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${isActive ? `${c.bg} text-white ring-2 ring-white/50` : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                  >
                    {CAT_LABELS[cat]} ({count})
                  </button>
                );
              })}
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="md:hidden">
                  <button
                    onClick={() => setTagsExpanded((e) => !e)}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full text-[10px] font-semibold text-white/90 bg-white/10 hover:bg-white/15 transition-all"
                  >
                    Tags {tagFilters.size > 0 && <span className="text-white">({tagFilters.size})</span>}
                    <svg className={`w-3.5 h-3.5 transition-transform ${tagsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {tagsExpanded && (
                    <div className="flex flex-wrap gap-1.5 items-center justify-center mt-2">
                      <button
                        onClick={() => setTagFilters(new Set())}
                        className={`min-h-[36px] px-2 py-1.5 rounded-full text-[10px] font-medium transition-all ${tagFilters.size === 0 ? 'bg-white/20 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                      >
                        All
                      </button>
                      {allTags.map((tag) => {
                        const count = items.filter((i) => getItemTags(i).some((t) => normalizeTagForDisplay(t)?.toLowerCase() === tag.toLowerCase())).length;
                        const isActive = tagFilters.has(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTagFilter(tag)}
                            className={`min-h-[36px] px-2 py-1.5 rounded-full text-[10px] font-medium transition-all ${isActive ? 'bg-slate-500/80 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                          >
                            {tag} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="hidden md:flex flex-wrap gap-1.5 items-center justify-center">
                  <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Tags</span>
                  <button
                    onClick={() => setTagFilters(new Set())}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${tagFilters.size === 0 ? 'bg-white/20 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => {
                    const count = items.filter((i) => getItemTags(i).some((t) => normalizeTagForDisplay(t)?.toLowerCase() === tag.toLowerCase())).length;
                    const isActive = tagFilters.has(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${isActive ? 'bg-slate-500/80 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                      >
                        {tag} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {CAT_ORDER.filter(cat => grouped[cat]?.length).map(cat => {
            const c = CAT_COLORS[cat] || FALLBACK;
            return (
              <div key={cat} className="rounded-xl overflow-hidden bg-slate-300/95 backdrop-blur-sm shadow-md">
                <div className={`${c.bg} px-5 py-3 flex items-center justify-between`}>
                  <h2 className="text-white font-extrabold tracking-tight text-xl">{CAT_LABELS[cat]}</h2>
                  <span className="text-white/90 text-xs font-bold">{grouped[cat].length} items</span>
                </div>
                <div className="p-3 sm:p-4 bg-slate-200/95">
                  <div
                    className={`grid gap-4 sm:gap-5 items-stretch max-w-[1200px] mx-auto ${
                      grouped[cat].length < 3
                        ? 'justify-center'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                    style={
                      grouped[cat].length < 3
                        ? { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 340px))' }
                        : undefined
                    }
                  >
                    {grouped[cat].map(item => {
                      const displayTitle = item.digestTitle?.trim() || simplifyTitle(item.title) || stripHtml(item.title);
                      const displaySummary = item.digestSummary?.trim() || (item.summary ? stripHtml(item.summary) : null) || '';
                      const tags = getItemTags(item).map(normalizeTagForDisplay).filter((t): t is string => !!t);
                      const displayTags = [...new Set(tags)].slice(0, 3);
                      const isLiked = liked.has(item.url);
                      const likeCount = counts[btoa(item.url).slice(0, 64)] || 0;
                      const showThumb = item.imageUrl && !thumbErrors.has(item.url);
                      return (
                        <article key={item.url}
                          className="w-full min-w-0 rounded-2xl bg-white/95 shadow-md border border-slate-200/60 overflow-hidden hover:border-violet-300/50 hover:shadow-xl hover:scale-[1.02] hover:z-10 transition-all duration-200 flex flex-col max-sm:min-h-0 max-sm:!aspect-auto sm:min-h-0"
                          style={{ aspectRatio: showThumb ? '1 / 1.2' : '1 / 1.02' }}>
                          {/* Title band — top-aligned, reduced padding */}
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
                            <div className={`${c.bg} px-5 py-3 min-h-[4rem] sm:min-h-[3.5rem] flex items-start`}>
                              <h3 className="font-[var(--font-display)] font-extrabold leading-snug text-white text-base sm:text-xl line-clamp-2">
                                {displayTitle}
                              </h3>
                            </div>
                          </a>
                          {/* Body — on mobile: size to content so divider sits close to text */}
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-initial sm:flex-1 flex flex-col min-h-0 block">
                            {showThumb && (
                              <div className="w-full h-28 shrink-0 bg-slate-200 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={thumbSrc(item.imageUrl!)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={() => setThumbErrors(prev => new Set([...prev, item.url]))}
                                />
                              </div>
                            )}
                            <div className="flex-initial sm:flex-1 min-h-0 overflow-hidden px-5 pt-3 pb-2 flex flex-col">
                            {displayTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2 overflow-hidden shrink-0">
                                {displayTags.map(tag => (
                                  <span key={tag} className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded ${c.tag}`}>{tag}</span>
                                ))}
                              </div>
                            )}
                            {displaySummary && (
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-4 overflow-hidden min-h-0">
                                {displaySummary}
                              </p>
                            )}
                            </div>
                          </a>
                          {/* Footer — heart left, share right */}
                          <div className="flex flex-col shrink-0 px-5 pb-3 pt-2 font-sans border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-1.5">
                              <button
                                type="button"
                                onClick={(e) => toggleLike(item.url, e)}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'}`}
                                title={isLiked ? 'Unlike' : 'Like'}
                              >
                                <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                                </svg>
                                {likeCount > 0 && <span>{likeCount}</span>}
                              </button>
                              <div className="flex-1" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (navigator.share) {
                                    navigator.share({ title: displayTitle, url: item.url }).catch(() => navigator.clipboard.writeText(item.url).then(() => alert('Link copied')));
                                  } else {
                                    navigator.clipboard.writeText(item.url).then(() => alert('Link copied'));
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Share"
                              >
                                <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                              </button>
                            </div>
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${c.bg} text-white hover:opacity-90 transition-opacity shadow-sm w-full`}>
                              {sourceName(item.url, item)}
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                              </svg>
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="pb-8 text-center">
        <p className="text-white text-xs">
          Orbit Roundup · weekly creative tech curation by{' '}
          <a href="https://www.linkedin.com/in/tmd-xr" target="_blank" rel="noopener noreferrer" className="hover:text-white/90 underline transition-colors">
            Tom Martin-Davies
          </a>
          {' · '}
          <a href="https://objectspace.co.uk" target="_blank" rel="noopener noreferrer" className="hover:text-white/90 underline transition-colors">
            objectspace.co.uk
          </a>
        </p>
      </footer>
    </main>
  );
}
