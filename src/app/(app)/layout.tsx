import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/shared/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppSidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
    </div>
  );
}