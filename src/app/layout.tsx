import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

/*
 * Two roles, two faces, nothing else.
 *
 * Instrument Sans carries everything operational: navigation, tables, forms,
 * badges, data. Newsreader is the editorial voice — the wordmark, the greeting
 * and page titles — and appears nowhere else, which is what keeps it feeling
 * deliberate rather than decorative.
 *
 * Both are self-hosted by next/font at build time, so there is no external
 * request and no layout shift beyond the swap.
 */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DARPE Admin",
  description: "Internal administration for DARPE Global.",
};

/**
 * `viewport-fit=cover` is what makes `env(safe-area-inset-*)` report real values.
 * Without it those insets are always 0, so the bottom navigation and the dialog
 * footer would sit under a phone's home indicator no matter what padding asked for.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      {/*
        A definite height all the way down — html, body, then the app shell —
        so the shell is exactly the viewport and nothing can push the document
        past it. `min-h-full` let the body grow a few pixels beyond the shell,
        which produced a second scrollbar next to the one inside `main`.
        Deliberately not `overflow-hidden`: the login page is free to scroll if
        its card ever outgrows a small screen.
      */}
      <body className="h-full">{children}</body>
    </html>
  );
}
