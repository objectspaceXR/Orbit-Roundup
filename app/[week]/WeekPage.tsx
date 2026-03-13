'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PublishedItem {
  url: string; title: string; summary?: string; category?: string;
  source?: string; tags?: string[]; imageUrl?: string; author?: string;
  subreddit?: string; feedName?: string; digestTitle?: string; digestSummary?: string;
}
interface WeekData { week: string; items: PublishedItem[]; publishedAt?: string; }

const CAT_ORDER = ['xr-spatial', 'three-d', 'creative-ai', 'inspiration', 'discord-inbox'];
const CAT_LABELS: Record<string, string> = {
  'xr-spatial': 'XR & Spatial', 'three-d': '3D & Motion',
  'creative-ai': 'Creative AI', 'inspiration': 'Projects I Liked', 'discord-inbox': 'Curated',
};
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

function simplifyTitle(t: string): string {
  return t.replace(/<[^>]*>/g, '').replace(/\s*[–—]\s*.+$/, '').replace(/\s*\|\s*.+$/, '').trim();
}

const LIKED_KEY = 'orbit-reader-liked';
function getLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')); } catch { return new Set(); }
}
function saveLiked(s: Set<string>) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch {}
}

export default function WeekPage({ data }: { data: WeekData }) {
  const { week, items, publishedAt } = data;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => { setLiked(getLiked()); }, []);
  useEffect(() => {
    fetch(`/api/likes/${week}`).then(r => r.json()).then(d => setCounts(d || {})).catch(() => {});
  }, [week]);

  const grouped = useMemo(() => {
    const map: Record<string, PublishedItem[]> = {};
    for (const item of items) {
      const cat = item.category || 'xr-spatial';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return map;
  }, [items]);

  const toggleLike = async (url: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const isLiked = liked.has(url);
    const next = new Set(liked);
    isLiked ? next.delete(url) : next.add(url);
    setLiked(next); saveLiked(next);
    setCounts(prev => ({ ...prev, [url]: Math.max(0, (prev[url] || 0) + (isLiked ? -1 : 1)) }));
    try {
      await fetch(`/api/likes/${week}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: btoa(url).slice(0, 64), action: isLiked ? 'unlike' : 'like' }),
      });
    } catch {}
  };

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="min-h-screen bg-gradient-four-corners text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-white py-4 rounded-b-3xl shadow-md">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div>
              <div className="font-[var(--font-display)] text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-[linear-gradient(to_right,#6366f1,#8b5cf6,#3b82f6,#60a5fa,#ec4899,#f43f5e)] bg-[length:200%_auto] animate-logo-pastel">
                ORBIT ROUNDUP
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">by Tom Martin-Davies</p>
            </div>
          </Link>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-700">{week} · {weekDateRange(week)}</div>
            {formattedDate && <div className="text-xs text-slate-400 mt-0.5">Published {formattedDate}</div>}
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← All issues</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-center text-white font-semibold tracking-tight mb-8 drop-shadow-md">
          <span className="block text-lg">What caught my eye this week</span>
          <span className="block text-xl mt-1">in XR, AI, 3D and creative tech</span>
        </h2>

        <div className="space-y-4">
          {CAT_ORDER.filter(cat => grouped[cat]?.length).map(cat => {
            const c = CAT_COLORS[cat] || FALLBACK;
            return (
              <div key={cat} className="rounded-xl overflow-hidden bg-slate-300/95 backdrop-blur-sm shadow-md">
                <div className={`${c.bg} px-5 py-3 flex items-center justify-between`}>
                  <h2 className="text-white font-extrabold tracking-tight text-xl">{CAT_LABELS[cat]}</h2>
                  <span className="text-white/90 text-xs font-bold">{grouped[cat].length} items</span>
                </div>
                <div className="p-3 bg-slate-200/95">
                  <div className="grid gap-5 items-start justify-items-center"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 340px))' }}>
                    {grouped[cat].map(item => {
                      const displayTitle = item.digestTitle?.trim() || simplifyTitle(item.title);
                      const displaySummary = item.digestSummary?.trim() || item.summary || '';
                      const tags = (item.tags || []).slice(0, 3);
                      const isLiked = liked.has(item.url);
                      const likeCount = counts[item.url] || 0;
                      return (
                        <article key={item.url}
                          className="w-full max-w-[340px] rounded-2xl bg-white/95 shadow-md border border-slate-200/60 overflow-hidden hover:border-violet-300/50 hover:shadow-xl hover:scale-[1.02] hover:z-10 transition-all duration-200 flex flex-col"
                          style={{ aspectRatio: '1 / 1.03' }}>
                          {/* Title band */}
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
                            <div className={`${c.bg} px-5 py-4 min-h-[5.25rem] flex items-end`}>
                              <h3 className="font-[var(--font-display)] font-extrabold leading-snug text-white text-base sm:text-lg line-clamp-2">
                                {displayTitle}
                              </h3>
                            </div>
                          </a>
                          {/* Body */}
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1 block px-5 pt-3 pb-2">
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {tags.map(tag => (
                                  <span key={tag} className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded ${c.tag}`}>{tag}</span>
                                ))}
                              </div>
                            )}
                            {displaySummary && (
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-5">
                                {displaySummary}
                              </p>
                            )}
                          </a>
                          {/* Footer */}
                          <div className="px-5 pb-3 pt-2 border-t border-slate-100 flex flex-col gap-1.5 shrink-0">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => toggleLike(item.url, e)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${isLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                                </svg>
                                {likeCount > 0 && <span>{likeCount}</span>}
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
        <p className="text-white/50 text-xs">
          Orbit Roundup · curated by{' '}
          <a href="https://objectspace.co.uk" target="_blank" rel="noopener" className="underline hover:text-white/80 transition-colors">
            Tom Martin-Davies
          </a>
        </p>
      </footer>
    </main>
  );
}
