"use client";

import { useState } from "react";
import type { MediaDTO } from "@/lib/types";

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
};

/** Foto con miniatura borrosa mientras carga (carga progresiva) o video privado. */
export function Media({ media, className = "", imgClassName = "", sizes = "(min-width: 1024px) 60vw, 100vw", priority, ambient, style, fill }: Props) {
  const [loaded, setLoaded] = useState(false);
  const portrait = !!media.width && !!media.height && media.height > media.width * 1.05;
  if (fill && portrait && media.kind === "IMAGE") {
    return (
      <div className={`relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.sm} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
        <Media media={media} className="relative mx-auto h-full w-auto max-w-full !bg-transparent" imgClassName="!object-contain" sizes={sizes} priority={priority} style={{ aspectRatio: `${media.width} / ${media.height}` }} />
      </div>
    );
  }
  if (media.kind === "VIDEO") {
    return (
      <div className={`relative overflow-hidden bg-bosque-900 ${className}`} style={style}>
        <video
          src={media.orig}
          className={`h-full w-full object-cover ${imgClassName}`}
          playsInline
          preload="metadata"
          controls={!ambient}
          muted={ambient}
          autoPlay={ambient}
          loop={ambient}
          aria-label={media.alt}
        />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden bg-salvia-100 ${className}`}
      style={{ ...style, backgroundImage: media.blur ? `url(${media.blur})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
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
        className={`h-full w-full object-cover transition-[opacity,filter] duration-700 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"} ${imgClassName}`}
      />
    </div>
  );
}
