'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BEAT_INFO, beatOf, sourceOf, summaryOf, tagsOf, titleOf, videoEmbed, type PublishedItem } from '@/lib/roundup';
import { Actions, Cover, Icon, KEYS, useStoredSet } from './ui';

/** Time on a story: long enough to read its digest, 8s at least and 20s at most. */
const storyMs = (item: PublishedItem) => Math.min(20000, Math.max(8000, 3000 + `${titleOf(item)} ${summaryOf(item)}`.split(/\s+/).length * 260));
export type Story = { item: PublishedItem; week: string };

/**
 * Full-screen stories as a quick digest: the picture on top, the story in big type below, timed to its length. Tap or arrow right/left to move, hold or Space to
 * pause, Esc or swipe down to close. Videos play inline and stop the clock. Reduced motion: no auto-advance.
 */
export default function StoryViewer({ stories, at, onGo, onClose, likes }: { stories: Story[]; at: number; onGo: (i: number) => void; onClose: () => void; likes: { counts: Record<string, number>; bump: (id: string, by: number) => void } }) {
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useState(0);
  const seen = useStoredSet(KEYS.seen);
  const story = stories[at];
  const still = paused || playing;
  const ms = story ? storyMs(story.item) : 8000;
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const next = useCallback(() => (at < stories.length - 1 ? onGo(at + 1) : onClose()), [at, stories.length, onGo, onClose]);
  const prev = useCallback(() => at > 0 && onGo(at - 1), [at, onGo]);

  useEffect(() => {
    setP(0);
    setPlaying(false);
    if (story) seen.toggle(story.item.url, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  // The clock: advances while nothing holds it
  useEffect(() => {
    if (still || reduced) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setP((v) => {
        const n = v + (now - last) / ms;
        last = now;
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [still, reduced, at, ms]);
  useEffect(() => {
    if (p >= 1) next();
  }, [p, next]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    document.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
    };
  }, [next, prev, onClose]);

  if (!story) return null;
  const { item, week } = story;
  const embed = videoEmbed(item);
  const beat = BEAT_INFO[beatOf(item)];

  const down = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('a,button,iframe,[role=menu]')) return;
    touch.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setPaused(true);
  };
  const up = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    setPaused(false);
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return onClose();
    if (Math.abs(dx) > 60) return dx < 0 ? next() : prev();
    if (Date.now() - t.t < 250) {
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (e.clientX - box.left < box.width * 0.33) prev();
      else next();
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Stories" onClick={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center cursor-zoom-out">
      <button type="button" onClick={onClose} aria-label="Close stories" className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <Icon name="close" />
      </button>
      <button type="button" onClick={prev} disabled={at === 0} aria-label="Previous story" className="hidden md:flex absolute left-[max(1rem,calc(50%-330px))] z-30 w-11 h-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20">
        <Icon name="arrowLeft" />
      </button>
      <button type="button" onClick={next} aria-label="Next story" className="hidden md:flex absolute right-[max(1rem,calc(50%-330px))] z-30 w-11 h-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <Icon name="arrowRight" />
      </button>

      <div className="relative w-full h-full sm:h-[min(94svh,920px)] sm:w-[min(94vw,600px)] sm:rounded-3xl overflow-hidden bg-ink-raised border-line sm:border flex flex-col touch-pan-y select-none cursor-default" onPointerDown={down} onPointerUp={up} onPointerCancel={() => setPaused(false)}>
        {/* The picture (or the playing video) up top */}
        <div className="relative shrink-0 h-[42%] sm:h-[46%] bg-black">
          {playing && embed ? (
            <iframe src={`${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`} title={titleOf(item)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 w-full h-full z-10" />
          ) : (
            <>
              <Cover item={item} eager />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-ink-raised" />
            </>
          )}
          {embed && !playing && (
            <button type="button" onClick={() => setPlaying(true)} aria-label="Play the video" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-paper text-ink flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
              <Icon name="play" filled className="w-7 h-7 ml-1" />
            </button>
          )}
          {/* Progress, one bar a story */}
          <div className={`absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[max(.75rem,env(safe-area-inset-top))] ${playing ? 'opacity-0' : ''}`}>
            {stories.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
                <span className="block h-full bg-white origin-left" style={{ transform: `scaleX(${i < at ? 1 : i > at ? 0 : Math.min(1, p)})` }} />
              </span>
            ))}
          </div>
          <div className={`absolute inset-x-0 top-5 z-20 flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)] ${playing ? 'opacity-0' : ''}`}>
            <span className={`${beat.tone} tone-chip rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-black/40 backdrop-blur`}>{beat.short}</span>
            <span className="ml-auto font-hud text-[10px] tabular-nums text-white/70">
              {at + 1}/{stories.length}
              {still && !playing ? ' · paused' : ''}
            </span>
          </div>
        </div>

        {/* The digest: big enough to read at a glance */}
        <div className="relative flex-1 min-h-0 flex flex-col px-6 sm:px-8 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <span className="font-hud text-[11.5px] uppercase tracking-[0.14em] text-paper-faint">{sourceOf(item)}</span>
            <h2 className="mt-2 text-[28px] sm:text-[34px] font-bold leading-[1.1] text-balance text-paper">{titleOf(item)}</h2>
            {summaryOf(item) && <p className="mt-4 text-[18px] sm:text-[19px] leading-[1.55] text-paper-muted text-pretty">{summaryOf(item)}</p>}
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
              {tagsOf(item)
                .slice(0, 4)
                .map((t) => (
                  <span key={t} className="font-hud text-[11px] uppercase tracking-wider text-paper-faint">#{t}</span>
                ))}
            </div>
          </div>
          <div className="shrink-0 pt-4 flex items-center gap-2">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-signal px-6 text-[15px] font-semibold text-ink hover:brightness-110">
              Read it <Icon name="external" />
            </a>
            <Actions item={item} week={week} {...likes} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
