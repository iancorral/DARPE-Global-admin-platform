"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { startTimeOptions } from "../scheduling";

type Props = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  /**
   * The time this record already has, when editing one. Kept selectable even if it
   * is not on the half hour, so opening a form never rounds a stored time.
   */
  current?: string | null;
  disabled?: boolean;
};

/**
 * Choosing when something starts, everywhere it is chosen.
 *
 * A free-text time field let any minute through, which is how the same class could
 * be at 09:00 on one screen and 09:07 on another. Offering the half hours instead
 * makes the schedule staff actually keep the only one they can enter — and keeps
 * the create-class form, a recurring slot and a session edit in step, because all
 * three ask this one component.
 */
export function StartTimeSelect({ id, value, onValueChange, current, disabled }: Props) {
  const options = startTimeOptions(current ?? value);

  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => next !== null && onValueChange(next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
