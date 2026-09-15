/**
 * What a class is called, everywhere it is shown: a calendar card, the class
 * dialog, the dashboard's lists, the move banner.
 *
 * A group class is called by its group's name, exactly as DARPE's own timetable
 * writes it — "Grupo VII" — never by the list of its members. Four names do not
 * fit on a card, read as four separate classes, and change whenever somebody
 * joins; the group's name is what staff actually say. Who is in it is one tap
 * away, in the class dialog.
 *
 * An individual class is the student's name.
 */
export function sessionTitle(session: {
  groupName: string | null;
  participants: { studentName: string }[];
}): string {
  if (session.groupName) return session.groupName;

  const names = session.participants.map((participant) => participant.studentName);
  return names.length > 0 ? names.join(", ") : "Class";
}

/** "4 students", for a group class's detail line. Null for an individual class. */
export function groupSizeLabel(session: {
  groupName: string | null;
  participants: unknown[];
}): string | null {
  if (!session.groupName) return null;

  const count = session.participants.length;
  return `${count} ${count === 1 ? "student" : "students"}`;
}
