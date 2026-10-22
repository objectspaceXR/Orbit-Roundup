'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { externalImageSrcForImg } from '@/lib/external-image-src';
import { BEAT_INFO, beatOf, likeKey, sourceOf, titleOf, type PublishedItem, type WeekMeta } from '@/lib/roundup';
import WeekPicker from './WeekPicker';

/* Building blocks for v2, in XPLR v2's voice: icons, headers, buttons, the poster fallback, reader state and actions. */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONS = {
  heart: <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4 2.3h3.2C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20Z" />,
  bookmark: <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M7 17 17 7M8 7h9v9" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  play: <path d="M7 4.5v15l12-7.5Z" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />,
  link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'w-4 h-4', filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke} fill={filled ? 'currentColor' : 'none'}>
      {ICONS[name]}
    </svg>
  );
}

/** Mono, upper-case label: the HUD voice for meta information. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-hud text-[11px] uppercase tracking-[0.14em] text-paper-faint ${className}`}>{children}</span>;
}

/** Section title in the poster face, with an index ("01"), meta and actions on the right. */
export function SectionHeader({ index, title, meta, actions, id }: { index?: string; title: string; meta?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
      <div className="flex items-baseline gap-3 min-w-0">
        {index && <span className="font-hud text-xs text-signal">{index}</span>}
        <h2 id={id} className="font-poster uppercase text-3xl sm:text-4xl leading-none tracking-wide text-paper">{title}</h2>
        {meta && <Kicker>{meta}</Kicker>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BUTTON = {
  primary: 'bg-paper text-ink hover:bg-white',
  signal: 'bg-signal text-ink hover:brightness-110',
  secondary: 'border border-line-strong text-paper hover:bg-ink-hover',
  ghost: 'text-paper-muted hover:text-paper hover:bg-ink-hover',
} as const;
export function buttonClass(variant: keyof typeof BUTTON = 'secondary', size: 'sm' | 'md' = 'md') {
  return `inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-[13px]'} ${BUTTON[variant]}`;
}

export function BeatChip({ item }: { item: PublishedItem }) {
  const b = BEAT_INFO[beatOf(item)];
  return (
    <span className={`${b.tone} tone-chip shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide`}>
      <span className="tone-dot w-1.5 h-1.5 rounded-full" aria-hidden />
      {b.short}
    </span>
  );
}

/* ---------- Pictures ---------- */

const hashOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
const POSTER_TONES = ['255,138,76', '240,123,196', '98,179,255', '212,255,58', '132,216,204', '255,170,110'];
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** The made-up poster for an item with no usable picture: two tones from its URL, a layout grid and its source name. */
export function Poster({ name, seed, small = false, plain = false }: { name: string; seed: string; small?: boolean; plain?: boolean }) {
  const h = hashOf(seed);
  const n = POSTER_TONES.length;
  const ai = h % n;
  const a = POSTER_TONES[ai];
  const b = POSTER_TONES[(ai + 1 + ((h >> 4) % (n - 1))) % n];
  const x = 15 + ((h >> 8) % 50);
  const y = 28 + ((h >> 12) % 22);
  return (
    <span aria-hidden className="absolute inset-0 overflow-hidden bg-ink">
      <span
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.06]"
        style={{ background: `radial-gradient(90% 70% at ${x}% ${y}%, rgba(${a},1), rgba(${a},.35) 45%, rgba(${a},0) 75%), radial-gradient(85% 65% at ${100 - x}% ${y + 25}%, rgba(${b},.95), rgba(${b},.25) 50%, rgba(${b},0) 80%), linear-gradient(160deg, rgba(${a},.5), rgba(${b},.45))` }}
      />
      <span className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(250,246,238,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(250,246,238,.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <span className="absolute inset-0 opacity-[0.18] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      {!plain && <span className={`absolute inset-x-4 top-[22%] font-poster uppercase leading-[0.85] tracking-wide text-paper/90 break-words [text-shadow:0_2px_28px_rgba(0,0,0,.45)] ${small ? 'text-2xl' : 'text-5xl'}`}>{name}</span>}
    </span>
  );
}

/** The src an item's picture loads from (YouTube stills at their larger size); empty when it has none. */
export function coverSrc(item: PublishedItem): string {
  return item.imageUrl ? externalImageSrcForImg(item.imageUrl.replace(/(img\.youtube\.com|i\.ytimg\.com)\/vi\/([^/]+)\/(mq|sd)?default\.jpg/i, '$1/vi/$2/hqdefault.jpg')) : '';
}

/** An item's picture filling its box; with none, or one that fails, the poster. */
export function Cover({ item, small = false, eager = false, plain = false }: { item: PublishedItem; small?: boolean; eager?: boolean; plain?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = coverSrc(item);
  if (!src || failed) return <Poster name={sourceOf(item)} seed={item.url} small={small} plain={plain} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
  );
}

/* ---------- Reader state: likes, saves, seen and followed tags live in this browser ---------- */

const EMPTY: string[] = [];
const caches = new Map<string, { raw: string; value: string[] }>();
const listeners = new Set<() => void>();
function readSet(key: string): string[] {
  let raw = '[]';
  try {
    raw = localStorage.getItem(key) || '[]';
  } catch {
    return caches.get(key)?.value ?? EMPTY;
  }
  const c = caches.get(key);
  if (c && c.raw === raw) return c.value;
  let value: string[] = [];
  try {
    value = JSON.parse(raw);
  } catch {}
  caches.set(key, { raw, value });
  return value;
}
function writeSet(key: string, value: string[]) {
  const raw = JSON.stringify(value);
  caches.set(key, { raw, value });
  try {
    localStorage.setItem(key, raw);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener('storage', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', l);
  };
}

/** A list of strings kept in localStorage, shared across components and tabs. */
export function useStoredSet(key: string) {
  const value = useSyncExternalStore(subscribe, () => readSet(key), () => EMPTY);
  const toggle = (v: string, on?: boolean) => {
    const cur = readSet(key);
    const has = cur.includes(v);
    if (on === has) return;
    writeSet(key, has ? cur.filter((x) => x !== v) : [v, ...cur]);
  };
  const add = (vs: string[]) => {
    const cur = readSet(key);
    const next = [...new Set([...cur, ...vs])];
    if (next.length !== cur.length) writeSet(key, next);
  };
  return { value, has: (v: string) => value.includes(v), toggle, add };
}

export const KEYS = { liked: 'orbit-reader-liked', saved: 'orbit-v2-saved', seen: 'orbit-v2-seen', follow: 'orbit-v2-follow', hidden: 'orbit-v2-hidden' };

/** Like counts for the weeks on screen, from the shared /api/likes function (absent in `next dev`). */
export function useLikeCounts(weeks: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = weeks.join(',');
  useEffect(() => {
    let live = true;
    Promise.all(key.split(',').filter(Boolean).map((w) => fetch(`/api/likes/${w}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))))
      .then((all) => live && setCounts(Object.assign({}, ...all)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);
  const bump = (id: string, by: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + by) }));
  return { counts, bump };
}

/* ---------- Actions: like, save, send ---------- */

type ToastAction = { label: string; run: () => void };
let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A short note at the foot of the screen, with an optional action such as Undo. */
export function toast(message: string, action?: ToastAction) {
  window.dispatchEvent(new CustomEvent('orbit-toast', { detail: { message, action } }));
}
export function Toaster() {
  const [t, setT] = useState<{ message: string; action?: ToastAction } | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; action?: ToastAction }>).detail;
      setT(d);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setT(null), d.action ? 6000 : 2200);
    };
    window.addEventListener('orbit-toast', on);
    return () => window.removeEventListener('orbit-toast', on);
  }, []);
  return (
    <div aria-live="polite" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-full bg-paper text-ink pl-4 pr-2 py-1.5 text-[13px] font-semibold shadow-2xl transition-all ${t ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
      <span className="py-0.5">{t?.message}</span>
      {t?.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.run();
            setT(null);
          }}
          className="rounded-full bg-ink text-signal px-3 h-7 text-[12px] font-bold uppercase tracking-wide hover:bg-ink-hover"
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}

/** Hiding stories: gone from every view in this browser, with Undo straight after and Restore on the dashboard. */
export function useHidden() {
  const hidden = useStoredSet(KEYS.hidden);
  const saved = useStoredSet(KEYS.saved);
  const hide = (item: PublishedItem) => {
    const wasSaved = saved.has(item.url);
    hidden.toggle(item.url, true);
    saved.toggle(item.url, false);
    toast('Removed', {
      label: 'Undo',
      run: () => {
        hidden.toggle(item.url, false);
        if (wasSaved) saved.toggle(item.url, true);
      },
    });
  };
  return { ...hidden, hide, restore: (url: string) => hidden.toggle(url, false), restoreAll: () => hidden.value.forEach((u) => hidden.toggle(u, false)) };
}

/** The remove (×) button for a card; on a removed story it puts it back. */
export function RemoveButton({ item, tone = 'card' }: { item: PublishedItem; tone?: 'card' | 'overlay' }) {
  const hidden = useHidden();
  const gone = hidden.has(item.url);
  if (gone) {
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); hidden.restore(item.url); toast('Restored'); }} className="h-8 px-3 rounded-full bg-signal text-ink text-[12px] font-bold hover:brightness-110">
        Restore
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        hidden.hide(item);
      }}
      aria-label="Remove: not interested"
      title="Remove: not interested"
      className={`w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${tone === 'overlay' ? 'bg-black/50 text-white/80 hover:text-white hover:bg-black/70 backdrop-blur-md' : 'text-paper-faint hover:text-paper hover:bg-ink-hover'}`}
    >
      <Icon name="close" className="w-4 h-4" />
    </button>
  );
}

/** Send a story: the phone's share sheet when there is one, otherwise a small menu. */
export function SendButton({ item, tone = 'card' }: { item: PublishedItem; tone?: 'card' | 'overlay' }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  const title = titleOf(item);
  const text = `${title} — via Orbit Roundup`;
  const send = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, text, url: item.url });
        return;
      } catch {
        return;
      }
    }
    setOpen((o) => !o);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast('Link copied');
    } catch {
      toast('Could not copy');
    }
    setOpen(false);
  };
  const u = encodeURIComponent(item.url);
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'X', href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${u}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${item.url}`)}` },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${item.url}`)}` },
  ];
  return (
    <span ref={box} className="relative">
      <ActionIcon icon="send" label="Send" onClick={send} tone={tone} />
      {open && (
        <span role="menu" className="absolute bottom-full right-0 mb-2 z-30 w-44 rounded-2xl border border-line bg-ink-raised p-1.5 shadow-2xl text-left">
          <button role="menuitem" onClick={copy} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-paper hover:bg-ink-hover">
            <Icon name="link" /> Copy link
          </button>
          {links.map((l) => (
            <a key={l.label} role="menuitem" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-paper hover:bg-ink-hover">
              <Icon name={l.label === 'Email' ? 'mail' : 'external'} /> {l.label}
            </a>
          ))}
        </span>
      )}
    </span>
  );
}

function ActionIcon({ icon, label, onClick, active = false, count, tone }: { icon: IconName; label: string; onClick: () => void; active?: boolean; count?: number; tone: 'card' | 'overlay' }) {
  const idle = tone === 'overlay' ? 'text-white/85 hover:text-white hover:bg-white/10' : 'text-paper-muted hover:text-paper hover:bg-ink-hover';
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} title={label} className={`h-9 min-w-9 px-2 inline-flex items-center justify-center gap-1 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${active ? (icon === 'heart' ? 'text-signal' : 'text-signal') : idle}`}>
      <Icon name={icon} filled={active} className="w-[18px] h-[18px]" />
      {!!count && <span className="font-hud text-[11px] tabular-nums">{count}</span>}
    </button>
  );
}

/** Like (counted for everyone), save (kept in this browser, see the Dashboard) and send. */
export function Actions({ item, week, counts, bump, tone = 'card', className = '' }: { item: PublishedItem; week: string; counts: Record<string, number>; bump: (id: string, by: number) => void; tone?: 'card' | 'overlay'; className?: string }) {
  const liked = useStoredSet(KEYS.liked);
  const saved = useStoredSet(KEYS.saved);
  const id = likeKey(item.url);
  const isLiked = liked.has(id);
  const like = () => {
    liked.toggle(id);
    bump(id, isLiked ? -1 : 1);
    fetch(`/api/likes/${week}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: id, action: isLiked ? 'unlike' : 'like' }) }).catch(() => {});
  };
  const save = () => {
    toast(saved.has(item.url) ? 'Removed from your saves' : 'Saved to your dashboard');
    saved.toggle(item.url);
  };
  return (
    <div className={`flex items-center ${className}`} onClick={(e) => e.stopPropagation()}>
      <ActionIcon icon="heart" label={isLiked ? 'Unlike' : 'Like'} active={isLiked} onClick={like} count={counts[id]} tone={tone} />
      <ActionIcon icon="bookmark" label={saved.has(item.url) ? 'Remove from saves' : 'Save'} active={saved.has(item.url)} onClick={save} tone={tone} />
      <SendButton item={item} tone={tone} />
    </div>
  );
}

/* ---------- Frame ---------- */

/** The top bar: the Orbit mark, the three views, and on a week the arrows and the week picker. */
export function TopBar({ current, week, weeks = [] }: { current: 'week' | 'archive' | 'dashboard'; week?: string; weeks?: WeekMeta[] }) {
  const [picking, setPicking] = useState(false);
  const tabs = [
    { id: 'week', label: 'This week', href: '/' },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard/' },
    { id: 'archive', label: 'Archive', href: '/archive/' },
  ] as const;
  const at = weeks.findIndex((w) => w.week === week);
  const prev = at > 0 ? weeks[at - 1].week : undefined;
  const next = at >= 0 ? weeks[at + 1]?.week : undefined;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] h-14 px-4 sm:px-6 flex items-stretch gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-signal shadow-[0_0_14px_rgba(212,255,58,.7)]" aria-hidden />
          <span className="font-poster uppercase text-xl tracking-wide leading-none">Orbit</span>
          <span className="hidden xl:inline font-hud text-[10px] uppercase tracking-[0.14em] text-paper-faint mt-0.5">Roundup</span>
        </Link>
        <nav className="flex items-stretch ml-1 sm:ml-4 min-w-0 overflow-x-auto no-scrollbar" aria-label="Views">
          {tabs.map((t) => (
            <Link key={t.id} href={t.href} className="v2-tab" aria-current={current === t.id ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        {week && (
          <div className="relative ml-auto flex items-center gap-1">
            {prev ? <Link href={`/${prev}/`} className={`hidden lg:inline-flex ${buttonClass('ghost', 'sm')}`} aria-label="Previous week"><Icon name="arrowLeft" /></Link> : <span className="hidden lg:block w-8" />}
            <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking} aria-haspopup="dialog" className={`${buttonClass(picking ? 'primary' : 'secondary', 'sm')} font-hud tabular-nums tracking-[0.08em]`}>
              <span className="hidden sm:inline">{week.replace('-', ' · ')}</span>
              <span className="sm:hidden">W{Number(week.split('-W')[1])}</span>
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${picking ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {next ? <Link href={`/${next}/`} className={`hidden lg:inline-flex ${buttonClass('ghost', 'sm')}`} aria-label="Next week"><Icon name="arrowRight" /></Link> : <span className="hidden lg:block w-8" />}
            {picking && <WeekPicker week={week} weeks={weeks} onClose={() => setPicking(false)} />}
          </div>
        )}
        <Link href="/archive/" className={`${week ? '' : 'ml-auto'} ${buttonClass('ghost', 'sm')} self-center shrink-0`} aria-label="Search the archive">
          <Icon name="search" />
        </Link>
      </div>
    </header>
  );
}
