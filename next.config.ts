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

const nextConfig: NextConfig = {
  ...(devOrigins.allowed.length > 0 && { allowedDevOrigins: devOrigins.allowed }),
};

export default nextConfig;
