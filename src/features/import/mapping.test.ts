import { describe, expect, it } from "vitest";
import {
  excelSerialToDate,
  groupDisplayName,
  isGroupLabel,
  languageFromSpanish,
  normalizeKey,
  readMonto,
  splitPersonName,
  studentStatusFromEstado,
} from "./mapping";

describe("languageFromSpanish", () => {
  it("maps every language the register uses", () => {
    expect(languageFromSpanish("ESPAÑOL")).toBe("Spanish");
    expect(languageFromSpanish("INGLÉS")).toBe("English");
    expect(languageFromSpanish("FRANCÉS")).toBe("French");
    expect(languageFromSpanish("ITALIANO")).toBe("Italian");
    expect(languageFromSpanish("ALEMÁN")).toBe("German");
    expect(languageFromSpanish("JAPONÉS")).toBe("Japanese");
    expect(languageFromSpanish("SUECO")).toBe("Swedish");
  });

  it("survives missing accents and stray casing", () => {
    expect(languageFromSpanish("ingles")).toBe("English");
    expect(languageFromSpanish("  Frances  ")).toBe("French");
  });

  it("refuses to guess at an unknown language", () => {
    expect(languageFromSpanish("PORTUGUÉS")).toBeNull();
    expect(languageFromSpanish("")).toBeNull();
  });
});

describe("splitPersonName", () => {
  it("takes the first word as the given name", () => {
    expect(splitPersonName("Ana Beltrán")).toEqual({
      firstName: "Ana",
      lastName: "Beltrán",
    });
  });

  it("keeps both surnames together", () => {
    expect(splitPersonName("María Martínez López")).toEqual({
      firstName: "María",
      lastName: "Martínez López",
    });
  });

  it("collapses loose spacing", () => {
    expect(splitPersonName("  Ana   Beltrán ")).toEqual({
      firstName: "Ana",
      lastName: "Beltrán",
    });
  });

  it("leaves an empty surname for a single word, for the caller to report", () => {
    expect(splitPersonName("Dhanna")).toEqual({ firstName: "Dhanna", lastName: "" });
  });
});

describe("studentStatusFromEstado", () => {
  it("treats everyone currently studying as active, however they pay", () => {
    expect(studentStatusFromEstado("PAGADO")).toBe("ACTIVE");
    expect(studentStatusFromEstado("PENDIENTE")).toBe("ACTIVE");
    expect(studentStatusFromEstado("BENEFICIO")).toBe("ACTIVE");
  });

  it("archives somebody the register marks as stopped", () => {
    // The register has no temporary pause: INACTIVO means they have left.
    expect(studentStatusFromEstado("INACTIVO")).toBe("ARCHIVED");
  });

  it("refuses an unrecognised state instead of defaulting", () => {
    expect(studentStatusFromEstado("QUIEN SABE")).toBeNull();
    expect(studentStatusFromEstado("")).toBeNull();
  });
});

describe("readMonto", () => {
  it("reads a peso figure as cents", () => {
    expect(readMonto("2380.0")).toEqual({
      kind: "amount",
      amountCents: 238_000,
      currency: "MXN",
    });
  });

  it("reads a dollar figure and keeps the currency", () => {
    expect(readMonto("380 USD")).toEqual({
      kind: "amount",
      amountCents: 38_000,
      currency: "USD",
    });
  });

  it("handles thousands separators and a currency symbol", () => {
    expect(readMonto("$1,260")).toEqual({
      kind: "amount",
      amountCents: 126_000,
      currency: "MXN",
    });
  });

  it("keeps free text as a note rather than reading it as zero", () => {
    expect(readMonto("asesoria")).toEqual({ kind: "note", text: "asesoria" });
    expect(readMonto("hablarle a finales de agosto")).toEqual({
      kind: "note",
      text: "hablarle a finales de agosto",
    });
  });

  it("reports an empty cell as empty, not as zero", () => {
    expect(readMonto("")).toEqual({ kind: "empty" });
    expect(readMonto("   ")).toEqual({ kind: "empty" });
  });
});

describe("excelSerialToDate", () => {
  it("converts a serial to the day it means", () => {
    // 46244 is 2026-08-10 in Excel's reckoning (day zero is 1899-12-30).
    expect(excelSerialToDate(46244)?.toISOString().slice(0, 10)).toBe("2026-08-10");
    expect(excelSerialToDate(46205)?.toISOString().slice(0, 10)).toBe("2026-07-02");
  });

  it("rejects a number that cannot be a real date in this register", () => {
    expect(excelSerialToDate(0)).toBeNull();
    expect(excelSerialToDate(1)).toBeNull();
    expect(excelSerialToDate(999_999)).toBeNull();
    expect(excelSerialToDate(Number.NaN)).toBeNull();
  });
});

describe("isGroupLabel", () => {
  it("recognises a group", () => {
    expect(isGroupLabel("GRUPO III")).toBe(true);
    expect(isGroupLabel("grupo x")).toBe(true);
  });

  it("does not treat a sample class as a group", () => {
    // "CLASE MUESTRA" says how the student arrived, not which cohort they are in.
    expect(isGroupLabel("CLASE MUESTRA")).toBe(false);
  });

  it("treats an empty cell as no group", () => {
    expect(isGroupLabel("")).toBe(false);
    expect(isGroupLabel("   ")).toBe(false);
  });
});

describe("groupDisplayName", () => {
  it("writes the name the way DARPE would", () => {
    expect(groupDisplayName("GRUPO III")).toBe("Grupo III");
    expect(groupDisplayName("grupo vii")).toBe("Grupo VII");
  });
});

describe("normalizeKey", () => {
  it("makes two spellings of one name comparable", () => {
    expect(normalizeKey("  José   MARTÍNEZ ")).toBe("jose martinez");
  });
});
