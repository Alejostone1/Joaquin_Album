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
};

/** Foto con miniatura borrosa mientras carga (carga progresiva) o video privado. */
export function Media({ media, className = "", imgClassName = "", sizes = "(min-width: 1024px) 60vw, 100vw", priority, style, fill, gallery, galleryTitle }: Props) {
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
    return <VideoTile media={media} className={className} imgClassName={imgClassName} style={style} onOpen={openable ? open : undefined} />;
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

/**
 * Video dentro de la historia: se reproduce solo, en silencio y en bucle cuando aparece
 * en pantalla (y se pausa al salir). Tocarlo lo abre en grande con sonido.
 */
function VideoTile({ media, className, imgClassName, style, onOpen }: { media: MediaDTO; className: string; imgClassName: string; style?: React.CSSProperties; onOpen?: (e?: React.MouseEvent) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`group relative overflow-hidden bg-bosque-900 ${onOpen ? "cursor-zoom-in" : ""} ${className}`} style={style} onClick={onOpen}>
      <video
        ref={ref}
        src={`${media.orig}#t=0.1`}
        className={`h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onError={() => setError(true)}
        aria-label={media.alt}
      />
      {!ready && !error && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-bosque-700 to-bosque-900" />}
      {error && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center font-ui text-sm font-bold text-papel/90">
          Este video no se puede reproducir en este navegador.
        </div>
      )}
      {onOpen && (
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-papel/90 px-3 py-1.5 font-ui text-xs font-bold text-tinta shadow-soft transition group-hover:scale-105">
          ▶ Ver con sonido
        </span>
      )}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-tinta/70 px-2.5 py-1 font-ui text-[11px] font-bold uppercase tracking-wider text-papel">Video</span>
    </div>
  );
}
