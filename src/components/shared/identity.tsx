import { cn } from "@/lib/utils";
import { TONE_CLASSES, avatarTone, initialsOf, languageTone } from "@/lib/tone";

/**
 * A person's initials in their stable tone.
 *
 * Decoration that helps the eye find a row again, so it is `aria-hidden`: the
 * name is always right beside it, and a screen reader gains nothing from
 * hearing two letters first. A person with no usable name renders as an empty
 * disc rather than a stray character.
 */
export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = initialsOf(name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        TONE_CLASSES[avatarTone(name)].avatar,
        className
      )}
    >
      {initials}
    </span>
  );
}

/**
 * A language, as a coloured dot plus its name.
 *
 * The name is always present — the dot narrows down which language at a
 * glance, but it never carries the meaning by itself.
 */
export function LanguageChip({
  name,
  code,
  className,
}: {
  name: string;
  code?: string | null;
  className?: string;
}) {
  const tone = TONE_CLASSES[languageTone({ name, code })];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone.chip,
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.dot)} />
      {name}
    </span>
  );
}
