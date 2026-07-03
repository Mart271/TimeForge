/**
 * Client-side break flag. The backend has no break entity — a break is
 * "stop the running entry, remember when, start a new entry on resume" —
 * so the break clock lives in localStorage (shared across tabs, survives
 * reloads). A running entry always outranks this flag.
 */
const BREAK_KEY = "timeforge.break-start";

export function readBreakStart(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BREAK_KEY);
}

export function setBreakStart(iso: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(BREAK_KEY, iso);
}

export function clearBreakFlag(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(BREAK_KEY);
}
