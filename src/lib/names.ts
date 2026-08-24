/**
 * How a person's name is written, when the surname may be missing.
 *
 * DARPE's own register holds many people by first name alone, so `lastName` is
 * optional in the schema. That makes the obvious `${firstName} ${lastName}`
 * actively dangerous: a null surname renders the literal word "null" on screen,
 * and TypeScript does not flag it because interpolating null is legal. Every
 * place that shows a full name goes through here instead.
 */
export type NameParts = {
  firstName: string;
  lastName?: string | null;
};

/** "Ana Beltrán", or just "Ana" when no surname is recorded. */
export function fullName(person: NameParts): string {
  const last = person.lastName?.trim();

  return last ? `${person.firstName.trim()} ${last}` : person.firstName.trim();
}

/**
 * The name to sort a list by: surname first, so a roster reads the way a roster
 * should. People with no surname sort by their first name among the rest rather
 * than being herded to one end.
 */
export function sortableName(person: NameParts): string {
  const last = person.lastName?.trim();

  return (last ? `${last} ${person.firstName}` : person.firstName).trim().toLowerCase();
}
