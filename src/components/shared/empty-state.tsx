import { cn } from "@/lib/utils";
import { DarpeMotif } from "./darpe-motif";

/**
 * What a section says when it has nothing to show.
 *
 * One sentence explaining the state, and where useful a second telling staff
 * what to do next — never a bare "No data". The `compact` tone is for places
 * where emptiness is ordinary and unremarkable (a day with no classes); the
 * default tone, with the motif, is for a list that is empty because nothing
 * has been created yet.
 */
export function EmptyState({
  children,
  action,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "compact";
  className?: string;
}) {
  if (tone === "compact") {
    return (
      <p className={cn("py-2 text-sm text-muted-foreground", className)}>{children}</p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md border border-dashed px-6 py-8 text-center",
        className
      )}
    >
      <DarpeMotif className="mb-3 size-12 text-primary/40" />
      <p className="max-w-prose text-sm text-muted-foreground">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
