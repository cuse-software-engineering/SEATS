// A deliberate log out must not be remembered as "where the customer was": the guard of App sends a logged-out
// visitor to the login with the screen to come back to, except right after Log out, when the next login starts at
// the concert rounds. The menu sets the marker before it clears the session; the guard consumes it once.
let leaving = false;
export const markLogOut = (): void => { leaving = true; };
export const consumeLogOut = (): boolean => { const was = leaving; leaving = false; return was; };
