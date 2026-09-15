import Link from "next/link";
import { KeyRound } from "lucide-react";

/**
 * Shown while somebody is still on the password their account was created with.
 *
 * It sits on the dashboard because that is where everyone lands, and it does
 * not offer a way to dismiss it: the thing it is about is not finished until
 * the password has actually been changed, and a notice that can be waved away
 * is one nobody ever acts on. It disappears by itself the moment they do.
 */
export function TemporaryPasswordNotice() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-tone-amber-line bg-tone-amber px-4 py-3">
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-amber-solid/15 text-tone-amber-fg"
      >
        <KeyRound className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-tone-amber-fg">
        You&apos;re signed in with a temporary password.
      </p>
      <Link
        href="/settings#your-account"
        className="text-sm font-semibold text-tone-amber-fg underline underline-offset-4"
      >
        Change password
      </Link>
    </div>
  );
}
