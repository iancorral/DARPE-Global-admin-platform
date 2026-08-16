import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

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
      <AppSidebar userName={user.name} userRole={user.role} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-(--app-nav-space) lg:pb-0">
        {children}
      </main>
      {/*
        Every mutation reports through `toast`, and without this mounted none
        of those messages ever reached the screen — successes and failures
        alike were silent.
      */}
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}