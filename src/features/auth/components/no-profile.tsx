import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";

/**
 * A signed-in account that DARPE has no record of.
 *
 * This happens for exactly one reason: somebody was created in Supabase Auth
 * without the matching `Profile` row, which is the app's own identity record.
 * Before this screen existed the two guards disagreed forever — the session
 * guard saw a valid user and sent them into the app, the app saw no profile and
 * sent them back to sign in — and the browser simply bounced between the two
 * with nothing on screen to explain it.
 *
 * So it is a dead end that says what is wrong and offers the only useful way
 * out. Signing out is a server action, because clearing the session cookie is
 * not something a page render is allowed to do.
 */
export function NoProfile({ email }: { email: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
        <span
          aria-hidden="true"
          className="inline-flex size-10 items-center justify-center rounded-xl bg-tone-amber text-tone-amber-fg"
        >
          <ShieldAlert className="size-5" />
        </span>

        <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
          Account not set up
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {email} doesn&apos;t have access to DARPE yet. Contact your administrator.
        </p>

        <form action={logout} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
