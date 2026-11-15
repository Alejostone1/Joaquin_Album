"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useEffect } from "react";
import { prefersReducedMotion } from "@/lib/quality";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Efectos ligados al scroll con GSAP, limitados al elemento y limpiados al desmontar.
 * Si la persona prefiere menos movimiento, no se ejecutan.
 */
export function useScrollFx(scope: React.RefObject<HTMLElement | null>, setup: (el: HTMLElement) => void, deps: unknown[] = []) {
  useIso(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => setup(el), el);
    return () => ctx.revert();
  }, deps);
}

export { gsap, ScrollTrigger };
