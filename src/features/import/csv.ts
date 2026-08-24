/**
 * A CSV reader, to RFC 4180.
 *
 * The register arrives as a CSV exported from Excel rather than as the .xlsx
 * itself. That is a deliberate choice: an .xlsx is a zip of XML, and a
 * hand-written parser for it fails by *silently shifting columns* — a student
 * ends up with somebody else's teacher and nothing looks wrong. CSV is a format
 * small enough to implement correctly and to test exhaustively, which for a
 * one-off import of real records matters more than saving a manual export.
 *
 * Handles what Excel actually emits: quoted fields, embedded commas, embedded
 * newlines, doubled quotes as an escape, CRLF, and a UTF-8 byte-order mark.
 */

/** Excel writes a BOM on UTF-8 CSV; it would otherwise join the first header. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Every row of a CSV, as arrays of raw field values.
 *
 * Parsed character by character rather than by splitting on commas, because a
 * field may legally contain a comma, a newline, or a quote — and splitting gets
 * every one of those wrong.
 */
export function parseCsv(input: string): string[][] {
  const text = stripBom(input);
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };

  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (index < text.length) {
    const char = text[index]!;

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }

      field += char;
      index += 1;
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      endField();
      index += 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      endRow();
      // CRLF is one line ending, not two.
      index += char === "\r" && text[index + 1] === "\n" ? 2 : 1;
      continue;
    }

    field += char;
    index += 1;
  }

  // A file that does not end in a newline still has a final row.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/**
 * The rows of a CSV with its header resolved to column positions.
 *
 * The header is found by name rather than by position, so inserting a column
 * in the spreadsheet does not silently import the wrong field into the wrong
 * place — the one failure mode that matters most here.
 */
export type CsvTable = {
  /** Column name, normalised, to its index. */
  columns: Map<string, number>;
  rows: string[][];
  /** Reads a named column from a row; "" when the column or cell is absent. */
  cell: (row: string[], column: string) => string;
};

function headerKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Reads a CSV whose header is the first row containing `requiredColumn`.
 *
 * The register's real header is not the first line — the sheet opens with a
 * title row — so the header is located by looking for a column that must be
 * there, rather than by assuming an offset.
 */
export function readCsvTable(input: string, requiredColumn: string): CsvTable {
  const all = parseCsv(input);
  const wanted = headerKey(requiredColumn);

  const headerIndex = all.findIndex((row) => row.some((cell) => headerKey(cell) === wanted));

  if (headerIndex === -1) {
    throw new Error(`No header row containing a "${requiredColumn}" column was found.`);
  }

  const columns = new Map<string, number>();
  all[headerIndex]!.forEach((name, index) => {
    const key = headerKey(name);
    // First occurrence wins: a trailing duplicate is a stray, not the column.
    if (key !== "" && !columns.has(key)) columns.set(key, index);
  });

  const rows = all.slice(headerIndex + 1).filter((row) => row.some((cell) => cell.trim() !== ""));

  return {
    columns,
    rows,
    cell: (row, column) => {
      const index = columns.get(headerKey(column));
      return index === undefined ? "" : (row[index] ?? "").trim();
    },
  };
}
