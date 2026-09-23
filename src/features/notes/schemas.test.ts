import { describe, expect, it } from "vitest";
import { createNoteSchema, updateNoteSchema } from "./schemas";

describe("createNoteSchema", () => {
  it("accepts a note that is only a title, only text, or only a checklist", () => {
    expect(createNoteSchema.safeParse({ title: "Call the bank" }).success).toBe(true);
    expect(createNoteSchema.safeParse({ body: "Ask about the group" }).success).toBe(true);
    expect(createNoteSchema.safeParse({ items: ["Book room"] }).success).toBe(true);
  });

  it("refuses an empty note", () => {
    expect(createNoteSchema.safeParse({ title: "  ", body: "" }).success).toBe(false);
  });

  it("refuses an empty checklist item", () => {
    expect(createNoteSchema.safeParse({ items: ["  "] }).success).toBe(false);
  });

  it("refuses a colour that is not on the palette", () => {
    expect(createNoteSchema.safeParse({ title: "x", color: "neon" }).success).toBe(false);
  });

  it("is private unless the note is written on the team board", () => {
    const privateNote = createNoteSchema.safeParse({ title: "x" });
    const teamTask = createNoteSchema.safeParse({ title: "x", shared: true });

    expect(privateNote.success && privateNote.data.shared).toBe(false);
    expect(teamTask.success && teamTask.data.shared).toBe(true);
  });
});

describe("updateNoteSchema", () => {
  it("takes a real profile id as the person a task is for, or nobody", () => {
    const id = "3f6b2c6a-9f1e-4f2a-9a0e-7b1f2c3d4e5f";

    expect(updateNoteSchema.safeParse({ id: "n1", field: "assigneeId", value: id }).success).toBe(
      true
    );
    expect(updateNoteSchema.safeParse({ id: "n1", field: "assigneeId", value: null }).success).toBe(
      true
    );
    expect(
      updateNoteSchema.safeParse({ id: "n1", field: "assigneeId", value: "gaby" }).success
    ).toBe(false);
  });

  it("edits one field at a time", () => {
    expect(updateNoteSchema.safeParse({ id: "n1", field: "pinned", value: true }).success).toBe(
      true
    );
    expect(
      updateNoteSchema.safeParse({ id: "n1", field: "dueOn", value: "2026-09-25" }).success
    ).toBe(true);
    expect(updateNoteSchema.safeParse({ id: "n1", field: "dueOn", value: null }).success).toBe(
      true
    );
  });

  it("refuses a field it does not know and a malformed date", () => {
    expect(
      updateNoteSchema.safeParse({ id: "n1", field: "ownerId", value: "someone" }).success
    ).toBe(false);
    expect(
      updateNoteSchema.safeParse({ id: "n1", field: "dueOn", value: "25/09/2026" }).success
    ).toBe(false);
  });
});
