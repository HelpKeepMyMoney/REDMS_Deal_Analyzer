/**
 * Sort saved-deal list rows (investor / wholesaler sidebars, client deal picker).
 * @param {Array<{ dealName?: string, updatedAt?: string|null, createdAt?: string|null }>} list
 * @param {string} sortKey - name-asc|name-desc|updated-desc|updated-asc|created-desc|created-asc
 */
export function sortDealListItems(list, sortKey) {
  const lastDash = sortKey.lastIndexOf("-");
  const field = sortKey.slice(0, lastDash);
  const dir = sortKey.slice(lastDash + 1);
  const out = [...list];
  const time = (iso) => (iso ? new Date(iso).getTime() : 0);
  const effectiveUpdated = (row) => row?.sortUpdatedAt || row?.updatedAt || row?.noteUpdatedAt || null;
  out.sort((a, b) => {
    let cmp = 0;
    if (field === "name") {
      cmp = (a.dealName || "")
        .toLowerCase()
        .localeCompare((b.dealName || "").toLowerCase(), undefined, { sensitivity: "base" });
    } else if (field === "updated") {
      cmp = time(effectiveUpdated(a)) - time(effectiveUpdated(b));
    } else if (field === "created") {
      cmp = time(a.createdAt || effectiveUpdated(a)) - time(b.createdAt || effectiveUpdated(b));
    }
    if (cmp === 0) {
      cmp = (a.dealName || "")
        .toLowerCase()
        .localeCompare((b.dealName || "").toLowerCase(), undefined, { sensitivity: "base" });
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return out;
}

/**
 * Client deal dropdown: favorites (no Firestore dates) first A–Z, then saved deals sorted by sortKey.
 */
export function mergeClientDealSelectRows(userFavorites, savedDeals, sortKey) {
  const favRows = userFavorites.map((f) => ({
    id: f.dealId,
    dealName: f.dealName || f.dealId || "Untitled",
    createdAt: null,
    updatedAt: null,
  }));
  const dealRows = savedDeals.filter((d) => !userFavorites.some((f) => f.dealId === d.id));
  if (sortKey.startsWith("name")) {
    return sortDealListItems([...favRows, ...dealRows], sortKey);
  }
  const favSorted = [...favRows].sort((a, b) =>
    (a.dealName || "").toLowerCase().localeCompare((b.dealName || "").toLowerCase(), undefined, { sensitivity: "base" })
  );
  return [...favSorted, ...sortDealListItems(dealRows, sortKey)];
}

export function formatDealListDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}
