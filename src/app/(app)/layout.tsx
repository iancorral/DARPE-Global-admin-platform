import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/shared/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    /*
     * On a phone the shell is exactly the visible viewport and clips: the document
     * therefore cannot grow, whatever a page puts inside it. `main` is the single
     * scrolling surface, so an ordinary page scrolls there and a page that bounds
     * itself — the calendar — simply fills it and scrolls nothing.
     *
     * That is deliberately structural rather than arithmetic. The previous version
     * asked each page to subtract the navigation height from `100dvh` itself, and a
     * page only had to be slightly wrong for its overflow to reach the document.
     *
     * From `lg` up none of this applies: the sidebar returns and the page scrolls
     * normally.
     */
    <div className="flex h-dvh flex-col overflow-hidden lg:h-auto lg:min-h-dvh lg:flex-row lg:overflow-visible">
      <AppSidebar userName={user.name} userRole={user.role} />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-(--app-nav-space) lg:overflow-visible lg:pb-0">
        {children}
      </main>
    </div>
  );
}