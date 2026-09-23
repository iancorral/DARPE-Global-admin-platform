import type { NextConfig } from "next";
import { parseDevOrigins } from "./src/lib/dev-origins";

/**
 * Extra hosts allowed to load `/_next/*` dev resources, read only from
 * `DEV_ALLOWED_ORIGINS` (comma separated, exact hosts — see `src/lib/dev-origins`).
 *
 * Nothing is trusted by default. With the variable absent the key is left off
 * entirely and Next keeps its own defaults, which already cover localhost and the
 * hostname the dev server is bound to, so ordinary local development is unaffected.
 */
const devOrigins = parseDevOrigins(process.env.DEV_ALLOWED_ORIGINS);

if (devOrigins.rejected.length > 0) {
  console.warn(
    `[next.config] Ignoring ${devOrigins.rejected.length} invalid DEV_ALLOWED_ORIGINS ` +
      `entr${devOrigins.rejected.length === 1 ? "y" : "ies"}: ${devOrigins.rejected.join(", ")}. ` +
      `Use exact hosts only — no protocol, port, path or wildcard (e.g. 192.168.1.69).`
  );
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * The app loads nothing from anywhere else: `next/font` self-hosts both
 * typefaces at build time, every image is in `public/`, and the browser never
 * talks to Supabase directly — sessions are handled by server actions and the
 * proxy. So everything is `'self'`, and an injected `<script src>` to another
 * origin has nowhere to load from.
 *
 * `'unsafe-inline'` stays on scripts because Next's own bootstrap and streamed
 * payloads are inline; removing it needs a per-request nonce, which means
 * rewriting the header in the proxy. Worth doing later — it is the one loose
 * thread here, and the rest of the policy still blocks the usual routes in.
 *
 * Dev adds what Turbopack needs: `eval` for its module runtime and a WebSocket
 * for hot reload. Neither is ever sent in production.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  ...(devOrigins.allowed.length > 0 && { allowedDevOrigins: devOrigins.allowed }),

  /** Nothing gains from announcing the framework and its version. */
  poweredByHeader: false,

  /**
   * Security headers on every response. A private admin tool has no reason to
   * be framed, sniffed, or reachable over plain HTTP.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Two years, subdomains included: the app is only ever served over
          // HTTPS, and the header is ignored on localhost.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Belt and braces with `frame-ancestors` for older browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },

  /*
   * Next's floating dev badge sits over the bottom-left corner, which is where
   * the sidebar keeps the signed-in name and the sign-out button. It covered
   * both, and it appears in every screenshot taken of a dev build. Build output
   * is unaffected — the badge only ever existed in `next dev`.
   */
  devIndicators: false,
};

export default nextConfig;
