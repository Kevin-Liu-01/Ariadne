/**
 * The web Live Player's identity lives in localStorage: the signed token minted at
 * check-in. It is the only client-side state; everything else is fetched live.
 */
const KEY = "ariadne.playerToken";

export function getPlayerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setPlayerToken(token: string): void {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    // private mode / storage disabled: the session just won't persist a reload.
  }
}

export function clearPlayerToken(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
