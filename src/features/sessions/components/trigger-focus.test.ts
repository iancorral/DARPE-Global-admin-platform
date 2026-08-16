import { describe, expect, it } from "vitest";
import { isVisibleElement } from "./trigger-focus";

/**
 * These exercise the predicate that decides whether a recorded trigger is still a
 * usable focus target — not real layout. There is no DOM here, so the elements are
 * stubs standing for the three states that matter. Whether a phone actually moves
 * focus is a browser behaviour and is verified by hand.
 */
const element = (isConnected: boolean, rectCount: number) =>
  ({
    isConnected,
    getClientRects: () => ({ length: rectCount }),
  }) as unknown as HTMLElement;

describe("isVisibleElement", () => {
  it("accepts a control that is in the document and drawn", () => {
    expect(isVisibleElement(element(true, 1))).toBe(true);
  });

  it("rejects a control inside the responsive view CSS has hidden", () => {
    // `display: none` keeps the element findable by id but gives it no boxes, and
    // focusing it does nothing — which is the bug this predicate exists to avoid.
    expect(isVisibleElement(element(true, 0))).toBe(false);
  });

  it("rejects a control removed by a refresh or a navigation", () => {
    expect(isVisibleElement(element(false, 1))).toBe(false);
  });

  it("rejects nothing at all", () => {
    expect(isVisibleElement(null)).toBe(false);
  });
});
