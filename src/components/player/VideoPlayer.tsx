"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Video } from "@/db/schema";
import { cn, formatClock, isDirectVideo } from "@/lib/utils";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({ video }: { video: Video }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playable = isDirectVideo(video.videoUrl);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [ended, setEnded] = useState(false);
  const [rateMenuOpen, setRateMenuOpen] = useState(false);
  const [error, setError] = useState(false);

  /* ---------- HLS (.m3u8) ou fonte direta ---------- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playable) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hls: any = null;

    async function setup() {
      const src = video.videoUrl;
      const isHls = /\.m3u8(\?.*)?$/i.test(src);
      if (isHls && !el!.canPlayType("application/vnd.apple.mpegurl")) {
        const mod = await import("hls.js");
        if (cancelled) return;
        if (mod.default.isSupported()) {
          hls = new mod.default({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(el!);
          hls.on(mod.default.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
            if (data?.fatal) setError(true);
          });
          return;
        }
      }
      el!.src = src;
    }
    setup();
    return () => {
      cancelled = true;
      hls?.destroy?.();
    };
  }, [video.videoUrl, playable]);

  /* ---------- autoplay (com fallback de mudo) ---------- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playable) return;
    el
      .play()
      .catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
  }, [playable]);

  /* ---------- fullscreen ---------- */
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---------- esconder controles ---------- */
  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2800);
  }, []);

  useEffect(() => {
    pokeControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [pokeControls]);

  function triggerFlash(kind: "play" | "pause") {
    setFlash(kind);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 700);
  }

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || !playable) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, [playable]);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void c.requestFullscreen?.();
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  }, []);

  const skip = useCallback((delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration || 0);
  }, []);

  /* ---------- teclado ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const el = videoRef.current;
      if (!el) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowright":
          skip(10);
          break;
        case "arrowleft":
          skip(-10);
          break;
        case "arrowup":
          e.preventDefault();
          el.volume = Math.min(1, el.volume + 0.1);
          el.muted = false;
          break;
        case "arrowdown":
          e.preventDefault();
          el.volume = Math.max(0, el.volume - 0.1);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFullscreen, toggleMute, skip]);

  async function togglePip() {
    const el = videoRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    if (!anyEl?.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await anyEl.requestPictureInPicture();
    } catch {
      /* picture-in-picture indisponível */
    }
  }

  const seekPct = duration > 0 ? (time / duration) * 100 : 0;
  const volPct = muted ? 0 : volume * 100;

  return (
    <div
      ref={containerRef}
      onMouseMove={pokeControls}
      onTouchStart={pokeControls}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
      }}
      className={cn(
        "relative h-[100dvh] w-full select-none overflow-hidden bg-black",
        !controlsVisible && playing && "cursor-none",
      )}
    >
      {playable ? (
        <video
          ref={videoRef}
          poster={video.thumbUrl ?? undefined}
          playsInline
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
            triggerFlash("play");
          }}
          onPause={() => {
            setPlaying(false);
            setControlsVisible(true);
            triggerFlash("pause");
          }}
          onEnded={() => {
            setEnded(true);
            setControlsVisible(true);
          }}
          onError={() => {
            setBuffering(false);
            setError(true);
          }}
          onVolumeChange={(e) => {
            setMuted(e.currentTarget.muted);
            setVolume(e.currentTarget.volume);
          }}
          className="h-full w-full object-contain"
        />
      ) : (
        <NonPlayableNotice url={video.videoUrl} />
      )}

      {/* spinner de carregamento */}
      {playable && buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-14 w-14 animate-spin text-brand" />
        </div>
      )}

      {/* erro de reprodução */}
      {playable && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
          <p className="text-lg font-bold text-white">
            Não foi possível reproduzir este vídeo
          </p>
          <p className="max-w-md text-sm text-zinc-400">
            O arquivo pode ter sido removido ou a fonte original não está
            acessível no momento.
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-black transition hover:bg-brand-300"
            >
              Voltar ao catálogo
            </Link>
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-600 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400"
            >
              Abrir fonte original
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* flash central de play/pause */}
      {flash && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="animate-flash-icon rounded-full bg-black/60 p-7 backdrop-blur-sm">
            {flash === "play" ? (
              <Play className="h-12 w-12 fill-white text-white" />
            ) : (
              <Pause className="h-12 w-12 fill-white text-white" />
            )}
          </span>
        </div>
      )}

      {/* overlay de fim de vídeo */}
      {ended && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70 backdrop-blur-sm">
          <p className="font-display text-3xl uppercase tracking-wide text-white sm:text-5xl">
            {video.title}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const el = videoRef.current;
                if (!el) return;
                el.currentTime = 0;
                void el.play().catch(() => {});
              }}
              className="focus-duck inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-bold text-black transition hover:bg-brand-300"
            >
              <RotateCcw className="h-4 w-4" />
              Assistir de novo
            </button>
            <Link
              href="/"
              className="focus-duck rounded-md border border-zinc-500 px-6 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-white hover:text-white"
            >
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      )}

      {/* barra superior */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-4 bg-gradient-to-b from-black/85 to-transparent px-5 pb-10 pt-5 transition-opacity duration-300",
          controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Link
          href="/"
          aria-label="Voltar ao catálogo"
          className="focus-duck rounded-full p-2 text-white transition hover:bg-white/10 hover:text-brand"
        >
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Você está assistindo
          </p>
          <h1 className="text-lg font-bold text-white sm:text-xl">{video.title}</h1>
        </div>
        <span className="ml-auto font-display text-lg uppercase tracking-[0.08em] opacity-70">
          <span className="text-zinc-100">DUCKE</span>
          <span className="text-brand">FLIX</span>
        </span>
      </div>

      {/* barra inferior de controles */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-5 pt-14 transition-opacity duration-300",
          controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <input
          type="range"
          aria-label="Progresso do vídeo"
          className="duck-range w-full"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            setTime(t);
            if (videoRef.current) videoRef.current.currentTime = t;
          }}
          style={
            {
              "--range-track": `linear-gradient(to right, #ffd21a ${seekPct}%, rgba(255,255,255,0.28) ${seekPct}%)`,
            } as React.CSSProperties
          }
        />

        <div className="mt-3 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => skip(-10)}
            aria-label="Voltar 10 segundos"
            className="focus-duck relative rounded-full p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center pt-[1px] text-[7px] font-extrabold">
              10
            </span>
          </button>

          <button
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="focus-duck rounded-full bg-brand p-2.5 text-black transition hover:scale-105 hover:bg-brand-300"
          >
            {playing ? (
              <Pause className="h-5 w-5 fill-black" />
            ) : (
              <Play className="h-5 w-5 fill-black" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            aria-label="Avançar 10 segundos"
            className="focus-duck relative rounded-full p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center pt-[1px] text-[7px] font-extrabold">
              10
            </span>
          </button>

          <div className="group/vol flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Ativar som" : "Silenciar"}
              className="focus-duck rounded-full p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              aria-label="Volume"
              className="duck-range duck-volume hidden w-0 transition-all duration-300 group-hover/vol:w-24 sm:block"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                const el = videoRef.current;
                if (!el) return;
                el.volume = v;
                el.muted = v === 0;
              }}
              style={
                {
                  "--range-track": `linear-gradient(to right, #ffd21a ${volPct}%, rgba(255,255,255,0.28) ${volPct}%)`,
                } as React.CSSProperties
              }
            />
          </div>

          <span className="ml-1 text-xs font-medium tabular-nums text-zinc-300 sm:text-sm">
            {formatClock(time)}
            <span className="text-zinc-500"> / {formatClock(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="relative">
              <button
                onClick={() => setRateMenuOpen((o) => !o)}
                aria-label="Velocidade de reprodução"
                className="focus-duck inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 hover:text-white"
              >
                <Gauge className="h-4 w-4" />
                {rate}x
              </button>
              {rateMenuOpen && (
                <>
                  <button
                    aria-label="Fechar menu"
                    onClick={() => setRateMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="animate-fade-in absolute bottom-full right-0 z-20 mb-2 w-32 overflow-hidden rounded-md border border-white/10 bg-panel py-1 shadow-2xl">
                    {RATES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRate(r);
                          if (videoRef.current) videoRef.current.playbackRate = r;
                          setRateMenuOpen(false);
                        }}
                        className={cn(
                          "block w-full px-4 py-2 text-left text-xs font-semibold transition hover:bg-white/10",
                          r === rate ? "text-brand" : "text-zinc-300",
                        )}
                      >
                        {r}x {r === 1 && "(normal)"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={togglePip}
              aria-label="Picture in picture"
              className="focus-duck hidden rounded-full p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white sm:block"
            >
              <PictureInPicture2 className="h-5 w-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="focus-duck rounded-full p-2 text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              {fullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NonPlayableNotice({ url }: { url: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-bold text-white">
        Este link não é um arquivo de vídeo direto
      </p>
      <p className="max-w-md text-sm text-zinc-400">
        Para reproduzir dentro do DuckeFlix, é preciso um link direto para um
        arquivo de vídeo (mp4, webm, m3u8...) ou um upload hospedado na
        plataforma.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-bold text-black transition hover:bg-brand-300"
      >
        Abrir link original
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
