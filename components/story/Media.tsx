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

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

/** Foto con miniatura borrosa mientras carga (carga progresiva) o video privado. */
export function Media({ media, className = "", imgClassName = "", sizes = "(min-width: 1024px) 60vw, 100vw", priority, ambient, style, fill, gallery, galleryTitle }: Props) {
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
    return (
      <div className={`group relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
        <video
          src={`${media.orig}#t=0.1`}
          className={`h-full w-full object-cover ${imgClassName}`}
          playsInline
          preload="metadata"
          controls={!ambient}
          muted={ambient}
          autoPlay={ambient}
          loop={ambient}
          aria-label={media.alt}
        />
        {openable && (
          <button onClick={open} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-papel/85 text-tinta shadow-soft transition hover:scale-110" aria-label="Ver en grande">
            <ExpandIcon />
          </button>
        )}
      </div>
    );
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
