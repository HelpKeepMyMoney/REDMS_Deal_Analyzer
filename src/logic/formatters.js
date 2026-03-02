/** Currency: null/NaN → "—", negative in parens */
export function formatCurrency(v, decimals = 0) {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `($${s})` : `$${s}`;
}

/** Percentage: null/NaN → "—" */
export function formatPct(v, decimals = 2) {
  if (v == null || isNaN(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

/** Number with commas (e.g. 3500 → "3,500") */
export function formatNumber(v) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString("en-US");
}
