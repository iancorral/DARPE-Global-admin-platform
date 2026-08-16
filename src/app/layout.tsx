import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Registered as `--font-sans`, the variable the Tailwind theme actually reads —
// under any other name the stack silently falls back to the browser default.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
