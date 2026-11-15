"use client";

import { MotionConfig } from "framer-motion";
import { AudioProvider } from "@/components/audio/AudioProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AudioProvider>{children}</AudioProvider>
    </MotionConfig>
  );
}
