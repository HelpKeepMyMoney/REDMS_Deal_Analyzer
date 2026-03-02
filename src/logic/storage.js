const STORAGE_KEY = "redms-deal-input";

/**
 * Load persisted input from localStorage. Returns null if missing or invalid.
 */
export function loadStoredInput() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {
    /* ignore */
  }
  return null;
}

/**
 * Persist input to localStorage.
 */
export function saveStoredInput(inp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inp));
  } catch (_) {
    /* ignore */
  }
}
