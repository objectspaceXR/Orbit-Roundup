'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BEAT_INFO, beatOf, sourceOf, summaryOf, tagsOf, titleOf, videoEmbed, type PublishedItem } from '@/lib/roundup';
import { externalImageSrcForImg } from '@/lib/external-image-src';
import { isNativeVideoUrl } from '@/lib/video-embed';
import { Actions, Cover, Icon, KEYS, useStoredSet } from './ui';

export type Story = { item: PublishedItem; week: string };

/**
 * Full-screen stories as a quick digest: the picture (or the story's own video, playing muted) fills the top two
 * thirds, and the story sits at the foot on a fade that turns solid behind the words. Nothing moves on by itself:
 * tap the right of the story (or swipe left, Space, the arrows) for the next, the left for the one before; Esc or swipe
 * down closes. Opened part-way through a list, the stories before are a step back. Videos play inline.
 */
export default function StoryViewer({ stories, at, onGo, onClose, likes }: { stories: Story[]; at: number; onGo: (i: number) => void; onClose: () => void; likes: { counts: Record<string, number>; bump: (id: string, by: number) => void } }) {
  const [playing, setPlaying] = useState(false);
  const [clipFailed, setClipFailed] = useState<Set<string>>(new Set());
  const seen = useStoredSet(KEYS.seen);
  const story = stories[at];
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);

  const next = useCallback(() => (at < stories.length - 1 ? onGo(at + 1) : onClose()), [at, stories.length, onGo, onClose]);
  const prev = useCallback(() => at > 0 && onGo(at - 1), [at, onGo]);

  useEffect(() => {
    setPlaying(false);
    if (story) seen.toggle(story.item.url, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        next();
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
  // A video file of its own plays as the cover, muted and looping (Reddit's v.redd.it streams do not play in a <video>)
  const clip = item.videoUrl && !embed && isNativeVideoUrl(item.videoUrl) && !/v\.redd\.it/i.test(item.videoUrl) && !clipFailed.has(item.url) ? item.videoUrl : null;
  // While a YouTube or Vimeo player runs, it sits above the story instead of under it, so nothing covers its controls
  const tall = !(playing && embed);
  // Round glass buttons, halfway down: inside the screen's edges on phones, beside the card on wider screens
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white bg-white/15 border border-white/25 backdrop-blur-md shadow-lg shadow-black/40 hover:bg-white/25 active:scale-95 transition disabled:opacity-0 disabled:pointer-events-none';

  const down = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('a,button,iframe,[role=menu]')) return;
    touch.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const up = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return onClose();
    if (Math.abs(dx) > 60) return dx < 0 ? next() : prev();
    // A tap, not a press to select text: the left third goes back, the rest goes on
    if (Date.now() - t.t < 400 && Math.abs(dx) < 10 && Math.abs(dy) < 10 && !window.getSelection()?.toString()) {
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
      <button type="button" onClick={prev} disabled={at === 0} aria-label="Previous story" className={`${arrow} left-2 md:left-[max(1rem,calc(50%-370px))]`}>
        <Icon name="arrowLeft" />
      </button>
      <button type="button" onClick={next} aria-label={at < stories.length - 1 ? 'Next story' : 'Close stories'} className={`${arrow} right-2 md:right-[max(1rem,calc(50%-370px))]`}>
        <Icon name="arrowRight" />
      </button>

      <div className="relative w-full h-full sm:h-[min(94svh,920px)] sm:w-[min(94vw,600px)] sm:rounded-3xl overflow-hidden bg-ink-raised border-line sm:border flex flex-col touch-pan-y select-none cursor-default" onPointerDown={down} onPointerUp={up} onPointerCancel={() => (touch.current = null)}>
        {/* The picture (or video) takes the top two thirds; the story's text block rises over its foot */}
        <div className={`${tall ? 'absolute inset-x-0 top-0 h-[64%]' : 'relative shrink-0 h-[44%]'} bg-black`}>
          {playing && embed ? (
            <iframe src={`${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`} title={titleOf(item)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 w-full h-full z-10" />
          ) : (
            <>
              {clip ? (
                <video
                  key={item.url}
                  src={/streamable\.com/i.test(clip) ? `/api/image-proxy?url=${encodeURIComponent(clip)}` : clip}
                  poster={item.imageUrl ? externalImageSrcForImg(item.imageUrl) : undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={() => setClipFailed((prev) => new Set(prev).add(item.url))}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Cover key={item.url} item={item} eager />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent via-40% to-ink-raised" />
            </>
          )}
          {embed && !playing && (
            <button type="button" onClick={() => setPlaying(true)} aria-label="Play the video" className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-white/90 text-ink flex items-center justify-center shadow-2xl shadow-black/50 ring-4 ring-white/20 hover:scale-105 transition-transform">
              <Icon name="play" filled className="w-7 h-7 ml-1" />
            </button>
          )}
          {/* Progress, one bar a story */}
          <div className={`absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[max(.75rem,env(safe-area-inset-top))] ${playing ? 'opacity-0' : ''}`}>
            {stories.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
                <span className={`block h-full ${i === at ? 'bg-white' : 'bg-white/70'}`} style={{ transform: `scaleX(${i <= at ? 1 : 0})` }} />
              </span>
            ))}
          </div>
          <div className={`absolute inset-x-0 top-5 z-20 flex items-center gap-2 px-4 pt-[env(safe-area-inset-top)] ${playing ? 'opacity-0' : ''}`}>
            <span className={`${beat.tone} tone-chip rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-black/40 backdrop-blur`}>{beat.short}</span>
            <span className="ml-auto mr-12 font-hud text-[10px] tabular-nums text-white/70">
              {at + 1}/{stories.length}
            </span>
          </div>
        </div>

        {/* The digest, big enough to read at a glance. It sits at the foot on a fade that turns solid behind the words,
            so a short story leaves the whole picture showing and a long one scrolls up over it, still readable. */}
        {tall && <div className="shrink-0 h-[30%] sm:h-[32%] pointer-events-none" aria-hidden />}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
            <div className={`mt-auto px-6 sm:px-8 ${tall ? 'pt-12 bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--color-ink-raised)_85%,transparent)_3rem,var(--color-ink-raised)_6rem)]' : 'pt-2'}`}>
              <span className="font-hud text-[11.5px] uppercase tracking-[0.14em] text-paper-faint [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{sourceOf(item)}</span>
              <h2 className="mt-2 text-[28px] sm:text-[34px] font-bold leading-[1.1] text-balance text-paper [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">{titleOf(item)}</h2>
              {summaryOf(item) && <p className="mt-4 text-[18px] sm:text-[19px] leading-[1.55] text-paper-muted text-pretty">{summaryOf(item)}</p>}
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                {tagsOf(item)
                  .slice(0, 4)
                  .map((t) => (
                    <span key={t} className="font-hud text-[11px] uppercase tracking-wider text-paper-faint">#{t}</span>
                  ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 px-6 sm:px-8 pt-4 bg-ink-raised flex items-center gap-2">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 min-w-0 items-center gap-1.5 rounded-full bg-signal px-6 text-[15px] font-semibold text-ink hover:brightness-110">
              <span className="truncate">Read on {sourceOf(item)}</span> <Icon name="external" />
            </a>
            <Actions item={item} week={week} {...likes} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
