import type { MetadataRoute } from "next";

/**
 * Nothing here is for the public.
 *
 * Every page needs a session, so a crawler would only ever reach the login
 * screen — but an indexed login page for a private tool is an invitation to
 * try passwords against it, and it puts DARPE's admin in search results next
 * to their own website. Disallowing everything keeps it out.
 *
 * This is politeness, not protection: the session guard is what actually keeps
 * people out, and a crawler that ignores robots.txt still gets the login page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
