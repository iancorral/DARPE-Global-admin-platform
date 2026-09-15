import { describe, expect, it } from "vitest";
import { groupSizeLabel, sessionTitle } from "./session-title";

const members = [
  { studentName: "Ana Ruiz" },
  { studentName: "Beto Luna" },
  { studentName: "Carla Paz" },
];

describe("sessionTitle", () => {
  it("names a group class by its group, not by who is in it", () => {
    expect(sessionTitle({ groupName: "Grupo VII", participants: members })).toBe("Grupo VII");
  });

  it("names an individual class by its student", () => {
    expect(
      sessionTitle({ groupName: null, participants: [{ studentName: "Ana Ruiz" }] })
    ).toBe("Ana Ruiz");
  });

  it("still says something for a class nobody is attached to", () => {
    expect(sessionTitle({ groupName: null, participants: [] })).toBe("Class");
  });

  it("keeps the group's name even when every member has left", () => {
    expect(sessionTitle({ groupName: "Grupo II", participants: [] })).toBe("Grupo II");
  });
});

describe("groupSizeLabel", () => {
  it("counts a group's students, singular and plural", () => {
    expect(groupSizeLabel({ groupName: "Grupo VII", participants: members })).toBe(
      "3 students"
    );
    expect(groupSizeLabel({ groupName: "Grupo VII", participants: [members[0]] })).toBe(
      "1 student"
    );
  });

  it("has nothing to say about an individual class", () => {
    expect(groupSizeLabel({ groupName: null, participants: members })).toBeNull();
  });
});
