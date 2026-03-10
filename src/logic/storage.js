const STORAGE_KEY = "redms-deal-input";
export const IMPORT_PROPERTY_KEY = "redms-import-property";

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
 * Load property data stored for import (e.g. from Admin Property Management).
 * Clears the key after reading. Returns null if missing or invalid.
 */
export function loadImportProperty() {
  try {
    const raw = localStorage.getItem(IMPORT_PROPERTY_KEY);
    if (!raw) return null;
    localStorage.removeItem(IMPORT_PROPERTY_KEY);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {
    /* ignore */
  }
  return null;
}

/**
 * Store property data for import in another tab.
 */
export function saveImportProperty(propertyData) {
  try {
    localStorage.setItem(IMPORT_PROPERTY_KEY, JSON.stringify(propertyData));
  } catch (_) {
    /* ignore */
  }
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
