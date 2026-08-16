/**
 * What the calendar says when a request did not come back at all.
 *
 * A server action that returns `{ success: false, error }` has already explained
 * itself, and that message is always preferred. This is for the other case — the
 * request threw: the network dropped, the response could not be decoded, or the
 * client hit an unexpected fault. Staff get something they can act on, and the
 * exception itself never reaches the screen.
 */
export const REQUEST_FAILED_MESSAGE = "Could not complete the request. Please try again.";
