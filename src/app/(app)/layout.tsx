import { redirect } from "next/navigation";
import { getCurrentUser, getSignedInEmail } from "@/lib/auth";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppContent } from "@/components/shared/app-content";
import { NoProfile } from "@/features/auth/components/no-profile";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  /*
   * Two different failures, told apart rather than both redirecting.
   *
   * No session at all is ordinary: go and sign in. A valid session with no
   * `Profile` row is a setup mistake — an account added in Supabase Auth
   * without the app's own identity record — and redirecting it to /login was an
   * infinite loop, because the session guard would immediately send it back
   * here. It gets a screen that says so instead.
   */
  if (!user) {
    const email = await getSignedInEmail();
    if (email) return <NoProfile email={email} />;

    redirect("/login");
  }

  return (
    /*
     * `fixed inset-0` pins the shell to the viewport itself, so `main` is the
     * only thing that can ever scroll and the sidebar never moves.
     *
     * Deliberately not `h-full` or `h-dvh`. Both depend on an unbroken chain of
     * definite heights from `html` down, and anything that interrupts that
     * chain silently turns the shell into a content-height box again — the page
     * grows, the document gains its own scrollbar beside the one inside `main`,
     * and the sidebar scrolls away with it. Taking the shell out of flow
     * removes the dependency: there is no document height left to grow.
     */
    <div className="fixed inset-0 flex flex-col overflow-hidden lg:flex-row">
      <AppSidebar userName={user.name} userRole={user.role} userEmail={user.email} />
      <AppContent>{children}</AppContent>
      {/*
        Every mutation reports through `toast`, and without this mounted none
        of those messages ever reached the screen — successes and failures
        alike were silent.
      */}
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}
