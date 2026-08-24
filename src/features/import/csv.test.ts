import { describe, expect, it } from "vitest";
import { parseCsv, readCsvTable } from "./csv";

describe("parseCsv", () => {
  it("reads plain rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps a comma inside a quoted field", () => {
    // The failure this whole module exists to prevent: a name with a comma
    // must not become two columns and shift everything after it.
    expect(parseCsv('name,course\n"Beltrán, Ana",INGLÉS')).toEqual([
      ["name", "course"],
      ["Beltrán, Ana", "INGLÉS"],
    ]);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsv('note\n"line one\nline two"')).toEqual([["note"], ["line one\nline two"]]);
  });

  it("reads a doubled quote as one literal quote", () => {
    expect(parseCsv('note\n"she said ""hola"""')).toEqual([["note"], ['she said "hola"']]);
  });

  it("treats CRLF as a single line ending", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips the byte-order mark Excel writes", () => {
    expect(parseCsv("﻿name,course\nAna,INGLÉS")[0]).toEqual(["name", "course"]);
  });

  it("preserves empty fields in place", () => {
    // An empty cell must hold its column, or every value after it shifts left.
    expect(parseCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("reads a final row with no trailing newline", () => {
    expect(parseCsv("a\n1")).toEqual([["a"], ["1"]]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("readCsvTable", () => {
  // The register opens with a title row before the real header.
  const csv = [
    "REGISTRO DE CURSOS,,,",
    "No.,ALUMNO,GRUPO,MAESTRO,CURSO",
    "1,Ana Beltrán,GRUPO III,DHANNA,INGLÉS",
    "2,Luis Vargas,,GABI,FRANCÉS",
  ].join("\n");

  it("finds the header wherever it is, not at line one", () => {
    const table = readCsvTable(csv, "ALUMNO");

    expect(table.rows).toHaveLength(2);
    expect(table.cell(table.rows[0]!, "ALUMNO")).toBe("Ana Beltrán");
  });

  it("reads columns by name, so inserting one cannot shift the import", () => {
    const withExtra = csv.replace(
      "No.,ALUMNO,GRUPO,MAESTRO,CURSO",
      "No.,NOTAS,ALUMNO,GRUPO,MAESTRO,CURSO"
    ).replace("1,Ana Beltrán", "1,algo,Ana Beltrán")
      .replace("2,Luis Vargas", "2,,Luis Vargas");

    const table = readCsvTable(withExtra, "ALUMNO");

    expect(table.cell(table.rows[0]!, "ALUMNO")).toBe("Ana Beltrán");
    expect(table.cell(table.rows[0]!, "CURSO")).toBe("INGLÉS");
  });

  it("matches a column name regardless of accents and case", () => {
    const table = readCsvTable(csv, "alumno");

    expect(table.cell(table.rows[1]!, "maestro")).toBe("GABI");
  });

  it("returns empty for a column that is not there", () => {
    const table = readCsvTable(csv, "ALUMNO");

    expect(table.cell(table.rows[0]!, "TELEFONO")).toBe("");
  });

  it("drops blank rows", () => {
    const table = readCsvTable(`${csv}\n,,,,\n`, "ALUMNO");

    expect(table.rows).toHaveLength(2);
  });

  it("says so when the header cannot be found", () => {
    expect(() => readCsvTable("a,b\n1,2", "ALUMNO")).toThrow(/ALUMNO/);
  });
});
