import { describe, expect, it } from "vitest";
import {
  createLanguageSchema,
  teachingHoursSchema,
  updateLanguageSchema,
} from "./schemas";

describe("createLanguageSchema", () => {
  it("accepts a language and normalises its code to lowercase", () => {
    const parsed = createLanguageSchema.parse({ name: "  Portuguese ", code: " PT " });

    expect(parsed).toEqual({ name: "Portuguese", code: "pt" });
  });

  it("rejects a code with anything but letters", () => {
    for (const code of ["p1", "p t", "pt-BR", "pt!"]) {
      expect(createLanguageSchema.safeParse({ name: "Portuguese", code }).success).toBe(false);
    }
  });

  it("holds the code to two to five letters", () => {
    expect(createLanguageSchema.safeParse({ name: "Portuguese", code: "p" }).success).toBe(false);
    expect(
      createLanguageSchema.safeParse({ name: "Portuguese", code: "abcdef" }).success
    ).toBe(false);
    expect(createLanguageSchema.safeParse({ name: "Portuguese", code: "por" }).success).toBe(true);
  });

  it("requires a real name", () => {
    expect(createLanguageSchema.safeParse({ name: " ", code: "pt" }).success).toBe(false);
  });

  it("accepts every code the academy already uses", () => {
    for (const code of ["es", "en", "fr", "it", "de", "ja", "sv"]) {
      expect(createLanguageSchema.safeParse({ name: "Any", code }).success).toBe(true);
    }
  });
});

describe("updateLanguageSchema", () => {
  it("carries the active flag and never the code", () => {
    const parsed = updateLanguageSchema.parse({
      id: "abc",
      name: "English",
      active: false,
      code: "zz",
    });

    expect(parsed).toEqual({ id: "abc", name: "English", active: false });
    expect(parsed).not.toHaveProperty("code");
  });

  it("requires an id", () => {
    expect(
      updateLanguageSchema.safeParse({ id: "", name: "English", active: true }).success
    ).toBe(false);
  });
});

describe("teachingHoursSchema", () => {
  it("accepts an ordinary working day", () => {
    expect(teachingHoursSchema.parse({ dayStartHour: 8, dayEndHour: 20 })).toEqual({
      dayStartHour: 8,
      dayEndHour: 20,
    });
  });

  it("accepts the widest possible day", () => {
    expect(
      teachingHoursSchema.safeParse({ dayStartHour: 0, dayEndHour: 24 }).success
    ).toBe(true);
  });

  it("accepts the single-hour day the academy's real 7am-9pm span sits inside", () => {
    expect(teachingHoursSchema.safeParse({ dayStartHour: 7, dayEndHour: 21 }).success).toBe(
      true
    );
  });

  it("refuses a day that ends before it starts", () => {
    const result = teachingHoursSchema.safeParse({ dayStartHour: 20, dayEndHour: 8 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("The day has to end after it starts.");
  });

  it("refuses a day of zero length", () => {
    expect(teachingHoursSchema.safeParse({ dayStartHour: 9, dayEndHour: 9 }).success).toBe(
      false
    );
  });

  it("refuses half hours", () => {
    expect(teachingHoursSchema.safeParse({ dayStartHour: 8.5, dayEndHour: 20 }).success).toBe(
      false
    );
  });

  it("refuses hours outside the clock", () => {
    expect(teachingHoursSchema.safeParse({ dayStartHour: -1, dayEndHour: 20 }).success).toBe(
      false
    );
    expect(teachingHoursSchema.safeParse({ dayStartHour: 8, dayEndHour: 25 }).success).toBe(
      false
    );
  });

  it("coerces the strings a select sends", () => {
    expect(teachingHoursSchema.parse({ dayStartHour: "7", dayEndHour: "21" })).toEqual({
      dayStartHour: 7,
      dayEndHour: 21,
    });
  });
});
