"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaDTO } from "@/lib/types";
import { useLightbox } from "./Lightbox";

type Props = {
  media: MediaDTO;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** para videos: reproducir en silencio y en bucle (fondos) */
  ambient?: boolean;
  style?: React.CSSProperties;
  /** pantalla completa: si la foto es vertical, se muestra entera sobre un fondo difuminado */
  fill?: boolean;
  /** si se indica, tocar la foto abre el visor a pantalla completa con estas fotos */
  gallery?: MediaDTO[];
  galleryTitle?: string;
  /** clases extra para la barra de controles del video (p. ej. dejar espacio a botones flotantes) */
  controlsClassName?: string;
};

/** Foto con miniatura borrosa mientras carga (carga progresiva) o video privado. */
export function Media({ media, className = "", imgClassName = "", sizes = "(min-width: 1024px) 60vw, 100vw", priority, style, fill, gallery, galleryTitle, controlsClassName = "" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // si la foto ya cargó antes de que la página se activara, onLoad no se dispara: lo comprobamos al montar
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) setLoaded(true);
      else setFailed(true);
    }
  }, [media.id]);
  const lightbox = useLightbox();
  const openable = !!gallery && !!lightbox;
  const open = (e?: React.MouseEvent) => {
    if (!openable) return;
    e?.stopPropagation();
    const idx = Math.max(0, gallery!.findIndex((g) => g.id === media.id));
    lightbox!(gallery!, idx, galleryTitle);
  };
  const portrait = !!media.width && !!media.height && media.height > media.width * 1.05;

  if (fill && portrait && media.kind === "IMAGE") {
    return (
      <div className={`relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.sm} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
        <Media media={media} className="relative mx-auto h-full w-auto max-w-full !bg-transparent" imgClassName="!object-contain" sizes={sizes} priority={priority} style={{ aspectRatio: `${media.width} / ${media.height}` }} gallery={gallery} galleryTitle={galleryTitle} />
      </div>
    );
  }

  if (media.kind === "VIDEO") {
    return <VideoTile media={media} className={className} imgClassName={imgClassName} style={style} onOpen={openable ? open : undefined} contain={fill} controlsClassName={controlsClassName} />;
  }

  return (
    <div
      className={`relative overflow-hidden bg-salvia-100 ${openable ? "cursor-zoom-in" : ""} ${className}`}
      style={{ ...style, backgroundImage: media.blur ? `url(${media.blur})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
      onClick={openable ? open : undefined}
      role={openable ? "button" : undefined}
      tabIndex={openable ? 0 : undefined}
      aria-label={openable ? `Ver en grande: ${media.alt}` : undefined}
      onKeyDown={openable ? (e) => (e.key === "Enter" || e.key === " ") && open() : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={media.md}
        srcSet={`${media.sm} 480w, ${media.md} 1280w, ${media.lg} 2048w`}
        sizes={sizes}
        alt={media.alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-[opacity,filter,transform] duration-700 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"} ${imgClassName}`}
      />
      {failed && !loaded && (
        <div className="absolute inset-0 grid place-items-center bg-salvia-100/80 p-3 text-center font-ui text-xs font-bold text-tinta-soft">
          La foto no cargó.
          <br />
          Recarga la página.
        </div>
      )}
    </div>
  );
}

const fmt = (t: number) => {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * Video dentro de la historia: empieza solo y en silencio cuando aparece en pantalla.
 * Tiene controles propios: pausa, barra para adelantar, sonido y pantalla completa.
 */
function VideoTile({ media, className, imgClassName, style, onOpen, contain, controlsClassName = "" }: { media: MediaDTO; className: string; imgClassName: string; style?: React.CSSProperties; onOpen?: (e?: React.MouseEvent) => void; contain?: boolean; controlsClassName?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const userPaused = useRef(false);
  const [hint, setHint] = useState<"play" | "pause" | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!userPaused.current) v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
      setHint("play");
    } else {
      userPaused.current = true;
      v.pause();
      setHint("pause");
    }
    setTimeout(() => setHint(null), 600);
  };
  const toggleSound = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    // con sonido, se ve completo una vez (sin repetir); en silencio, se repite como fondo
    v.loop = v.muted;
    if (!v.muted) {
      userPaused.current = false;
      v.play().catch(() => {});
    }
  };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = ref.current;
    if (!v || !dur) return;
    v.currentTime = (Number(e.target.value) / 1000) * dur;
    setTime(v.currentTime);
  };
  const pct = dur ? (time / dur) * 100 : 0;

  // miniatura del administrador (va dentro de botones): vista previa sin controles
  if (!onOpen) {
    return (
      <div className={`relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
        <video
          ref={ref}
          src={`${media.orig}#t=0.1`}
          className={`h-full w-full ${contain ? "object-contain" : "object-cover"} ${imgClassName}`}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setError(true)}
          aria-label={media.alt}
        />
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-tinta/70 px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider text-papel">▶ Video</span>
        {error && <span className="absolute inset-0 grid place-items-center p-2 text-center font-ui text-xs font-bold text-papel/90">No se puede previsualizar</span>}
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
      <video
        ref={ref}
        src={`${media.orig}#t=0.1`}
        className={`h-full w-full ${contain ? "object-contain" : "object-cover"} transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        muted
        loop
        playsInline
        preload="metadata"
        onClick={toggle}
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          userPaused.current = true;
          setPlaying(false);
        }}
        onError={() => setError(true)}
        aria-label={media.alt}
      />
      {!ready && !error && <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-bosque-700 to-bosque-900" />}
      {error && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center font-ui text-sm font-bold text-papel/90">
          Este video no se puede reproducir en este navegador.
        </div>
      )}
      {/* señal de pausa/reproducir al tocar */}
      {hint && (
        <span key={hint + time} className="pointer-events-none absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-[jq-pop_.6s_ease-out_forwards] place-items-center rounded-full bg-tinta/55 text-2xl text-papel">
          {hint === "play" ? "▶" : "❚❚"}
        </span>
      )}
      {!playing && !error && !hint && (
        <button onClick={toggle} className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-papel bg-tinta/50 pl-1 text-2xl text-papel shadow-lift backdrop-blur transition hover:scale-110" aria-label="Reproducir video">
          ▶
        </button>
      )}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-tinta/70 px-2.5 py-1 font-ui text-[11px] font-bold uppercase tracking-wider text-papel">Video</span>
      {/* controles */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[2] flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-papel ${controlsClassName} opacity-100 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100`}
        style={!playing ? { opacity: 1 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={toggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-papel/20 text-sm font-bold hover:bg-papel/35" aria-label={playing ? "Pausar" : "Reproducir"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="w-[4.6rem] shrink-0 font-ui text-[11px] font-bold tabular-nums">
          {fmt(time)} / {fmt(dur)}
        </span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(pct * 10)}
          onChange={seek}
          className="jq-range h-1.5 min-w-0 flex-1 cursor-pointer"
          style={{ ["--p" as string]: `${pct}%` }}
          aria-label="Avanzar o retroceder el video"
        />
        <button onClick={toggleSound} className="grid h-9 shrink-0 place-items-center rounded-full bg-papel/20 px-3 font-ui text-xs font-bold hover:bg-papel/35" aria-label={muted ? "Activar sonido" : "Silenciar"}>
          {muted ? "🔇 Sonido" : "🔊"}
        </button>
        {onOpen && (
          <button
            onClick={(e) => {
              ref.current?.pause();
              userPaused.current = true;
              onOpen(e);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-papel/20 hover:bg-papel/35"
            aria-label="Ver en pantalla completa"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
