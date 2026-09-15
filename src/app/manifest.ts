import type { MetadataRoute } from "next";

/**
 * The web app manifest, which is what lets DARPE be installed.
 *
 * The three platforms staff actually use each read this differently, and all
 * three are covered here:
 *
 * - **Android / Chrome** installs from the manifest alone. The maskable icon is
 *   the one it needs: Android crops icons to whatever shape the launcher uses,
 *   and a non-maskable icon gets its edges cut off.
 * - **Windows / Edge** installs from the manifest too, and uses `theme_color`
 *   for the window's title bar.
 * - **iOS / Safari** ignores most of this and reads `apple-icon.png` plus the
 *   `apple-mobile-web-app-*` tags in the layout instead. Both are provided.
 *
 * `display: "standalone"` is what removes the browser chrome once installed —
 * DARPE is a tool staff open every day, not a page they browse to.
 *
 * The app still needs the network: nothing here makes it work offline, and
 * pretending otherwise would mean a service worker caching a scheduling tool,
 * which is a way to show somebody last week's calendar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DARPE Global Admin",
    short_name: "DARPE",
    description: "Internal administration for DARPE Global.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    // The app's own lavender ground, so the launch frame matches what paints
    // a moment later rather than flashing white.
    background_color: "#eee3f4",
    theme_color: "#482d79",
    icons: [
      {
        src: "/brand/darpe-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/darpe-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/darpe-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
