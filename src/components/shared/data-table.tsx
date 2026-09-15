import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INTERACTIVE_ROW, INTERACTIVE_TABLE_ROW } from "@/lib/interaction";
import { cn } from "@/lib/utils";

/**
 * The one table in the product.
 *
 * Every list screen used to lay out its own `<table>`, so no two agreed on
 * column widths, alignment or row height: the browser divided the space by
 * content, and one long student name made every other column narrow. Columns
 * are declared here with an explicit width and the table is `table-fixed`, so
 * the same column is the same width on every screen and the layout does not
 * shift as the data changes.
 *
 * The rules this enforces, so no caller has to remember them:
 *
 * - **One column absorbs the slack.** Exactly one column omits `width`; it is
 *   the identifying one (a person's name), and it is the only one that grows.
 * - **Numbers are right-aligned and tabular.** Digits line up down a column or
 *   there is no point putting them in one.
 * - **A row that navigates is one link**, stretched over the row, so the whole
 *   row is clickable while staying a single tab stop. Interactive cells opt out
 *   with `interactive: true`, which lifts them above that link.
 * - **Below `md` the table becomes cards**, because six columns do not fit on a
 *   phone and a sideways-scrolling table is not a list anybody reads.
 */
export type Column<T> = {
  /** Stable key, used for React and nothing else. */
  key: string;
  header: string;
  /**
   * Any CSS width. Omit on exactly one column — the one that should take the
   * remaining space.
   */
  width?: string;
  align?: "left" | "right";
  /** True when the cell holds its own control, which must stay clickable. */
  interactive?: boolean;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  getKey,
  href,
  card,
  empty,
  footer,
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  /** Where the row goes when clicked. Omit for a table that only displays. */
  href?: (row: T) => string;
  /** The same row on a phone. Omit to keep the table at every width. */
  card?: (row: T) => React.ReactNode;
  empty: React.ReactNode;
  /** A note under the table — a count, a caveat about the figures. */
  footer?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      {card && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs md:hidden">
          {rows.map((row) => (
            <li key={getKey(row)}>
              {href ? (
                <Link
                  href={href(row)}
                  className={cn("flex min-h-11 items-center gap-3 px-4 py-3", INTERACTIVE_ROW)}
                >
                  {card(row)}
                </Link>
              ) : (
                <div className="flex min-h-11 items-center gap-3 px-4 py-3">{card(row)}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className={cn(card && "hidden md:block")}>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={column.align === "right" ? "text-right" : undefined}
                >
                  {column.header}
                </TableHead>
              ))}
              {/* The affordance column: fixed, so it never squeezes the data. */}
              {href && <TableHead style={{ width: "3rem" }} />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getKey(row)}
                // `relative` anchors the stretched link below.
                className={cn("group relative", href && INTERACTIVE_TABLE_ROW)}
              >
                {columns.map((column, index) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "truncate",
                      column.align === "right" && "text-right tabular-nums",
                      // Interactive cells must sit above the row's own link.
                      column.interactive && "relative z-10 overflow-visible"
                    )}
                  >
                    {/*
                      The link lives on the first cell and stretches over the
                      row: one link in the tab order, one announcement to a
                      screen reader, the whole row clickable.
                    */}
                    {href && index === 0 ? (
                      <Link
                        href={href(row)}
                        className="block after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </TableCell>
                ))}

                {href && (
                  <TableCell>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}
