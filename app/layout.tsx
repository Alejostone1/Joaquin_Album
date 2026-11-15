import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/baloo-2";
import "@fontsource-variable/nunito";
import "@fontsource-variable/quicksand";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Joaquín — Mi pequeño universo",
  description: "Una historia de amor que apenas comienza.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#BDECD3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
