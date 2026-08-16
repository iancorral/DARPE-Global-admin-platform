import { cn } from "@/lib/utils";

/**
 * The bounded page frame every screen sits in.
 *
 * Content stops at a comfortable measure instead of stretching edge to edge on
 * a wide monitor, where a search field the width of a desk is unusable and a
 * table row makes the eye travel further than it should.
 *
 * `wide` exists for the calendar only: its week grid genuinely needs the room,
 * and squeezing six day columns into the reading measure would cost more than
 * the alignment gains.
 */
export function PageContainer({
  children,
  width = "default",
  className,
}: {
  children: React.ReactNode;
  width?: "default" | "wide";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full p-4 lg:p-8",
        width === "wide" ? "max-w-420" : "max-w-360",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * A page's title block: the editorial line, what it is, and its actions.
 *
 * The `<h1>` is the one place per page the display face appears, which is what
 * keeps it meaningful. Actions wrap below the title on a phone rather than
 * squeezing it.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * A group of fields inside a form.
 *
 * A long form rendered as one flat column of inputs gives the eye nothing to
 * hold on to, so it is split into named groups — who they are, how to reach
 * them, what they study.
 *
 * The heading sits above its fields rather than in a column beside them. A
 * side label reads well only when both columns are a similar height, and here
 * they never were: two lines of explanation next to six fields left most of
 * the card empty down its left edge. Stacked, every field gets the full width
 * and there is no gap to explain away.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t px-5 py-6 first:border-t-0 lg:px-8">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-serif text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * The sheet a form sits on, and the bar its actions sit in.
 *
 * A form floating directly on the page background reads as a raw database
 * screen; on a card it reads as a document being filled in. The action bar is
 * tinted and sits at the foot of the same sheet, so "Create" always appears in
 * the same place on every form in the product.
 */
export function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">{children}</div>
  );
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 border-t bg-muted/40 px-5 py-4 lg:px-8">
      {children}
    </div>
  );
}

/**
 * A form beside the notes that explain it.
 *
 * A form card alone left most of a wide screen empty to its right. Rather than
 * stretching the fields to fill it — which only makes a name field the width of
 * a desk — the space carries what staff would otherwise have to be told: what a
 * choice on the form actually does, and what happens once it is saved. The
 * notes stick while the form scrolls, and drop below it on a phone.
 */
export function FormLayout({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
      <div className="min-w-0">{children}</div>
      {aside && <aside className="space-y-4 lg:sticky lg:top-0">{aside}</aside>}
    </div>
  );
}

/** One note in the column beside a form. */
export function FormNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1.5 space-y-2 text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

/**
 * A titled band of content, for pages that would otherwise be a stack of
 * identical cards. The rule and the small caps heading separate sections by
 * typography rather than by drawing another box around everything.
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t pt-5", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
