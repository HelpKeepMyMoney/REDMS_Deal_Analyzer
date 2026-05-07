import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Field } from "./Field.jsx";
import { FREE_TIER_PARAM_KEYS } from "../logic/tierConstants.js";

const IMAGE_PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23374151' width='400' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dy='.35em'%3ENo Image%3C/text%3E%3C/svg%3E";
import { REHAB_LEVELS, DETROIT_TAX_SEV_RATIO, DETROIT_TAX_RATE, DETROIT_TAX_FLAT } from "../logic/constants.js";
import { formatCurrency } from "../logic/formatters.js";
import { calcTitleInsurance } from "../logic/redmsCalc.js";
import { estimateMonthlyRent } from "../logic/rentEstimate.js";
import { buildStreetViewUrlFromAddress } from "../logic/propertySearchApi.js";
import { sortDealListItems, mergeClientDealSelectRows, formatDealListDate } from "../logic/dealListSort.js";
import styles from "../REDMS.module.css";

const $ = formatCurrency;

function normalizeWebAddress(url) {
    if (typeof url !== "string") return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function formatNotePreview(text, maxLen = 90) {
    if (typeof text !== "string") return "";
    const clean = text.trim().replace(/\s+/g, " ");
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen).trimEnd()}...`;
}

export function DealSidebar({
    isAdmin = true,
    canSaveDeal = false,
    isClient = false,
    isFreeTier = false,
    usageCount = 0,
    usageLimit = 3,
    atOverageWarningThreshold = false,
    wholesaler = false,
    sidebarCollapsed,
    currentDealId,
    currentDealIsShared = false,
    handleDealSelect,
    handleDeleteDeal,
    handleLoadDeal,
    handleRemoveFavorite,
    handleSaveDeal,
    savedDeals,
    userFavorites = [],
    favoritesLoading = false,
    refreshFavorites,
    newSharedDeals = [],
    onDismissNewDeals,
    inp,
    upd,
    setRehabLevel,
    r,
    costClr,
    costPct,
    maxTpc = 60000,
    saveInProgress,
    saveError,
    refreshDeals,
    savedDealsLoading,
    onOpenSearch,
    riskOverrides = {},
    onRiskOverridesChange,
    dealParamsLevel = null,
    config = null,
    onSaveUserConfig = null,
    refreshConfig = null,
    dealListSort = "name-asc",
    onDealListSortChange = null,
    dealImages = [],
    dealImagesLoading = false,
    dealImagesError = "",
    uploadingImage = false,
    deletingImagePath = "",
    onUploadDealImage,
    onDeleteDealImage,
    onPreviewDealImage,
    notesHistory = [],
    onAddDealNote,
    onUpdateDealNote,
    onDeleteDealNote,
    noteSaveStatus = "idle",
    noteSaveError = "",
}) {
    const [rentEstimateLoading, setRentEstimateLoading] = useState(false);
    const [retailCapRateEditing, setRetailCapRateEditing] = useState(null);
    const [dealParamsExpanded, setDealParamsExpanded] = useState(false);
    const [dealParamsOverrides, setDealParamsOverrides] = useState({});
    const [dealParamsSaving, setDealParamsSaving] = useState(false);
    const showDealParams = (dealParamsLevel === "full" || dealParamsLevel === "limited") && onSaveUserConfig && refreshConfig && config && !isClient;
    const imageInputRef = useRef(null);
    const noteSaving = noteSaveStatus === "saving";
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [noteDraft, setNoteDraft] = useState("");
    const [isEditingNote, setIsEditingNote] = useState(false);
    const dealParamKeys = dealParamsLevel === "limited" ? FREE_TIER_PARAM_KEYS : ["maxTpc", "minLoanAmount", "minFlipCoCPct", "minBhCoCPct", "minAcqMgmtFee", "minRealtorFee", "mortgagePointsRate", "initialReferralPct", "investorReferralPct"];
    const notesReadOnly = currentDealIsShared || isClient;

    const sortedSavedDeals = useMemo(
        () => sortDealListItems(savedDeals, dealListSort),
        [savedDeals, dealListSort]
    );
    const clientSelectRows = useMemo(
        () =>
            !isAdmin && isClient
                ? mergeClientDealSelectRows(userFavorites, savedDeals, dealListSort)
                : [],
        [isAdmin, isClient, userFavorites, savedDeals, dealListSort]
    );
    const currentDealMeta = useMemo(() => {
        if (!currentDealId) return null;
        const fromSaved = sortedSavedDeals.find((d) => d.id === currentDealId);
        if (fromSaved) return fromSaved;
        if (isClient) {
            return clientSelectRows.find((d) => d.id === currentDealId) ?? null;
        }
        return null;
    }, [currentDealId, sortedSavedDeals, isClient, clientSelectRows]);
    const showDealListSort =
        onDealListSortChange &&
        (sortedSavedDeals.length >= 1 || (isClient && clientSelectRows.length >= 1));
    const sortedNotes = useMemo(
        () =>
            [...(Array.isArray(notesHistory) ? notesHistory : [])].sort((a, b) => {
                const aDate = a?.updatedAt || a?.createdAt || "";
                const bDate = b?.updatedAt || b?.createdAt || "";
                return bDate.localeCompare(aDate);
            }),
        [notesHistory]
    );
    const activeNote = useMemo(
        () => sortedNotes.find((note) => note.id === activeNoteId) ?? null,
        [sortedNotes, activeNoteId]
    );

    useEffect(() => {
        if (!isNoteModalOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                setIsNoteModalOpen(false);
                setIsEditingNote(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isNoteModalOpen]);

    const openCreateNoteModal = () => {
        setActiveNoteId(null);
        setNoteDraft("");
        setIsEditingNote(true);
        setIsNoteModalOpen(true);
    };

    const openExistingNoteModal = (note) => {
        if (!note) return;
        setActiveNoteId(note.id);
        setNoteDraft(note.text ?? "");
        setIsEditingNote(false);
        setIsNoteModalOpen(true);
    };

    const closeNoteModal = () => {
        setIsNoteModalOpen(false);
        setIsEditingNote(false);
    };

    const handleSaveNote = () => {
        const clean = noteDraft.trim();
        if (!clean) return;
        if (activeNote?.id) {
            onUpdateDealNote?.(activeNote.id, clean);
            setActiveNoteId(activeNote.id);
            setIsEditingNote(false);
            return;
        }
        onAddDealNote?.(clean);
        closeNoteModal();
    };

    const handleDeleteNote = () => {
        if (!activeNote?.id) return;
        if (!window.confirm("Delete this note?")) return;
        onDeleteDealNote?.(activeNote.id);
        closeNoteModal();
    };

    const handleEstimateRent = async () => {
        setRentEstimateLoading(true);
        try {
            const { rent } = await estimateMonthlyRent({
                street: inp.street,
                city: inp.city,
                state: inp.state,
                zipCode: inp.zipCode,
                bedrooms: inp.bedrooms,
                bathrooms: inp.bathrooms,
                sqft: inp.sqft,
                basement: inp.basement,
                offerPrice: inp.offerPrice,
                rehabCost: inp.rehabCost,
                propertyType: inp.use || "Single Family",
            });
            upd("totalRent", rent);
        } catch (e) {
            console.error("Rent estimate failed:", e);
        } finally {
            setRentEstimateLoading(false);
        }
    };
    const showUsageRemaining = !isAdmin && canSaveDeal && !isClient && Number.isFinite(usageLimit) && usageLimit > 0;
    const remainingDeals = showUsageRemaining ? Math.max(0, usageLimit - usageCount) : 0;
    const usagePeriodLabel = isFreeTier ? "" : " this month";

    return (
        <aside
            id="redms-sidebar"
            className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}
            aria-hidden={sidebarCollapsed}
        >
            {showUsageRemaining && (
            <div className={styles["usage-remaining-wrap"]}>
                <div className={styles["usage-remaining"]}>
                    <span className={styles["usage-remaining-count"]}>{remainingDeals}</span>
                    <span className={styles["usage-remaining-label"]}>
                        {remainingDeals === 1 ? "deal" : "deals"} remaining{usagePeriodLabel}
                    </span>
                </div>
                <Link to="/profile#subscription-heading" className={styles["sidebar-upgrade-btn"]}>
                    Upgrade
                </Link>
            </div>
            )}

            {!isAdmin && newSharedDeals.length > 0 && (
            <div className={styles["new-deals-notification"]}>
                <div className={styles["new-deals-notification-header"]}>
                    <span className={styles["new-deals-notification-title"]}>
                        {newSharedDeals.length === 1
                            ? "1 deal has been shared with you"
                            : `${newSharedDeals.length} deals have been shared with you`}
                    </span>
                    <button
                        type="button"
                        className={styles["new-deals-notification-dismiss"]}
                        onClick={onDismissNewDeals}
                        aria-label="Dismiss notification"
                    >
                        ×
                    </button>
                </div>
                <p className={styles["new-deals-notification-msg"]}>
                    since your last login. Click a deal to view:
                </p>
                <ul className={styles["new-deals-notification-list"]}>
                    {newSharedDeals.map((d) => (
                        <li key={d.id}>
                            <button
                                type="button"
                                className={styles["new-deals-notification-link"]}
                                onClick={() => handleLoadDeal(d.id)}
                            >
                                {d.dealName}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            )}

            {!isAdmin && !wholesaler && (
            <div className={styles["saved-deals-sec"]} style={{ marginBottom: "1rem" }}>
                <div className={styles["sec-label"]}>My Favorites</div>
                <div className={styles["saved-deals-actions"]}>
                    <button
                        type="button"
                        className={styles["btn-refresh-deals"]}
                        onClick={refreshFavorites}
                        disabled={favoritesLoading}
                        aria-label="Refresh favorites"
                    >
                        {favoritesLoading ? "…" : "↻"}
                    </button>
                </div>
                <ul className={styles["saved-deals-list"]} aria-label="Favorite deals">
                    {userFavorites.length === 0 && !favoritesLoading && (
                        <li className={styles["saved-deals-empty"]}>
                            No favorites yet. View a shared deal and click &quot;Save to Favorite&quot; to add it.
                        </li>
                    )}
                    {userFavorites.map((fav) => (
                        <li key={fav.id} className={styles["saved-deals-item"]}>
                            <button
                                type="button"
                                className={styles["saved-deals-load"]}
                                onClick={() => handleLoadDeal(fav.dealId)}
                            >
                                {fav.dealName || fav.dealId || "Untitled"}
                            </button>
                            <button
                                type="button"
                                className={styles["saved-deals-delete"]}
                                onClick={(e) => handleRemoveFavorite(fav, e)}
                                aria-label={`Remove ${fav.dealName || fav.dealId} from favorites`}
                                title="Remove from favorites"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            )}

            <div className={isAdmin ? styles["deal-section-sticky"] : undefined}>
            <div className={styles["deal-select-wrap"]}>
                <label htmlFor="redms-deal-select" className={styles["deal-select-label"]}>
                    Deal
                </label>
                <select
                    id="redms-deal-select"
                    className={styles["deal-select"]}
                    value={currentDealId ?? ""}
                    onChange={handleDealSelect}
                    aria-label={isAdmin || canSaveDeal ? "Load a saved deal or blank template" : "Select a deal to view"}
                >
                    {isAdmin || canSaveDeal ? (
                        <>
                            <option value="">New deal (blank template)</option>
                            {sortedSavedDeals.map((deal) => (
                                <option key={deal.id} value={deal.id}>
                                    {deal.dealName}
                                </option>
                            ))}
                        </>
                    ) : (
                        <>
                            <option value="">— Select a deal —</option>
                            {clientSelectRows.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.dealName}
                                </option>
                            ))}
                        </>
                    )}
                </select>
                {showDealListSort && (
                <div className={styles["field-group"]} style={{ marginTop: "0.65rem" }}>
                    <label htmlFor="redms-deal-list-sort" className={styles["deal-select-label"]}>
                        Sort deals
                    </label>
                    <select
                        id="redms-deal-list-sort"
                        className={styles["deal-select"]}
                        value={dealListSort}
                        onChange={(e) => onDealListSortChange(e.target.value)}
                    >
                        <option value="name-asc">Name: A–Z</option>
                        <option value="name-desc">Name: Z–A</option>
                        <option value="updated-desc">Updated: Newest first</option>
                        <option value="updated-asc">Updated: Oldest first</option>
                        <option value="created-desc">Created: Newest first</option>
                        <option value="created-asc">Created: Oldest first</option>
                    </select>
                </div>
                )}
                {currentDealMeta && (currentDealMeta.createdAt || currentDealMeta.updatedAt) && (
                <div
                    style={{
                        marginTop: "0.5rem",
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                        lineHeight: 1.45,
                    }}
                >
                    {currentDealMeta.createdAt && (
                        <div>Created {formatDealListDate(currentDealMeta.createdAt)}</div>
                    )}
                    {currentDealMeta.updatedAt && (
                        <div>Updated {formatDealListDate(currentDealMeta.updatedAt)}</div>
                    )}
                </div>
                )}
            </div>

            {onOpenSearch && (
            <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
                <button
                    type="button"
                    onClick={onOpenSearch}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: 'var(--brand-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    🔍 Find Properties
                </button>
            </div>
            )}
            </div>

            <div className={styles["notes-sec"]}>
                <div className={styles["notes-sec-header"]}>
                    <div className={styles["sec-label"]}>Notes</div>
                    <button
                        type="button"
                        className={styles["btn-estimate-rent"]}
                        onClick={openCreateNoteModal}
                        disabled={notesReadOnly || !currentDealId}
                        title={!currentDealId ? "Select or save a deal first" : notesReadOnly ? "Read-only: cannot edit notes" : "Add a note"}
                    >
                        Add Note
                    </button>
                </div>
                {!currentDealId && (
                    <div className={styles["saved-deals-empty"]}>Select a deal to manage notes.</div>
                )}
                {currentDealId && sortedNotes.length === 0 && (
                    <div className={styles["saved-deals-empty"]}>No notes yet.</div>
                )}
                {currentDealId && sortedNotes.length > 0 && (
                    <ul className={styles["notes-list"]} aria-label="Deal notes">
                        {sortedNotes.map((note) => (
                            <li key={note.id} className={styles["notes-item"]}>
                                <button
                                    type="button"
                                    className={styles["notes-open"]}
                                    onClick={() => openExistingNoteModal(note)}
                                >
                                    <span className={styles["notes-date"]}>
                                        {formatDealListDate(note.updatedAt || note.createdAt || "")}
                                    </span>
                                    <span className={styles["notes-preview"]}>{formatNotePreview(note.text)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showDealParams && (
            <div style={{ marginBottom: "1rem" }}>
                <button
                    type="button"
                    onClick={() => setDealParamsExpanded((e) => !e)}
                    className={styles["sec-label"]}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "inherit", font: "inherit" }}
                >
                    {dealParamsExpanded ? "▼" : "▶"} Deal Parameters
                </button>
                {dealParamsExpanded && (
                <div style={{ marginTop: 8 }}>
                    <div className={styles["field-group"]}>
                        {dealParamKeys.map((key) => (
                            <Field
                                key={key}
                                label={key === "maxTpc" ? "Max TPC ($)" : key === "minLoanAmount" ? "Min Loan ($)" : key === "minFlipCoCPct" ? "Min Flip CoC %" : key === "minBhCoCPct" ? "Min B&H CoC %" : key === "minAcqMgmtFee" ? "Min Acq Mgmt Fee ($)" : key === "minRealtorFee" ? "Min Realtor Fee ($)" : key === "mortgagePointsRate" ? "Mortgage Points" : key === "initialReferralPct" ? "Initial Referral %" : key === "investorReferralPct" ? "Investor Referral %" : key}
                                name={key}
                                value={dealParamsOverrides[key] ?? config[key] ?? ""}
                                onChange={(k, v) => setDealParamsOverrides((p) => ({ ...p, [k]: v }))}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            setDealParamsSaving(true);
                            try {
                                const toSave = {};
                                for (const k of dealParamKeys) {
                                    const v = dealParamsOverrides[k] ?? config[k];
                                    if (v != null && v !== "") {
                                        const num = typeof v === "number" ? v : Number(v);
                                        if (!isNaN(num)) toSave[k] = num;
                                    }
                                }
                                await onSaveUserConfig(toSave);
                                await refreshConfig();
                                setDealParamsOverrides({});
                            } finally {
                                setDealParamsSaving(false);
                            }
                        }}
                        disabled={dealParamsSaving}
                        className={styles["btn-estimate-rent"]}
                        style={{ marginTop: 8 }}
                    >
                        {dealParamsSaving ? "Saving…" : "Save Parameters"}
                    </button>
                </div>
                )}
            </div>
            )}

            {wholesaler && onRiskOverridesChange && (
            <div>
                <div className={styles["sec-label"]}>Risk Parameters (per property)</div>
                <div className={styles["field-group"]}>
                    <Field
                        label="Min Wholesale Fee ($)"
                        name="minWholesaleFee"
                        value={riskOverrides.minWholesaleFee ?? ""}
                        onChange={(k, v) => onRiskOverridesChange({ ...riskOverrides, [k]: v })}
                        placeholder="5000"
                    />
                    <Field
                        label="Min Flip CoC %"
                        name="minFlipCoCPct"
                        value={riskOverrides.minFlipCoCPct ?? ""}
                        onChange={(k, v) => onRiskOverridesChange({ ...riskOverrides, [k]: v })}
                        placeholder="25"
                    />
                    <Field
                        label="Min B&H CoC %"
                        name="minBhCoCPct"
                        value={riskOverrides.minBhCoCPct ?? ""}
                        onChange={(k, v) => onRiskOverridesChange({ ...riskOverrides, [k]: v })}
                        placeholder="10"
                    />
                    <Field
                        label="Max TPC ($)"
                        name="maxTpc"
                        value={riskOverrides.maxTpc ?? ""}
                        onChange={(k, v) => onRiskOverridesChange({ ...riskOverrides, [k]: v })}
                        placeholder="60000"
                    />
                </div>
            </div>
            )}

            <div className={styles["propertyImageWrap"]} style={{ margin: '0 0 1rem', flexShrink: 0 }}>
                <img
                    src={inp?.image || inp?.imageFallback || IMAGE_PLACEHOLDER_SVG}
                    alt="Property"
                    className={styles["propertyImage"]}
                    loading="eager"
                    onError={(e) => {
                        const fallback = inp?.imageFallback || IMAGE_PLACEHOLDER_SVG;
                        if (e.target.src !== fallback) {
                            e.target.src = fallback;
                            e.target.onerror = () => { e.target.src = IMAGE_PLACEHOLDER_SVG; e.target.onerror = null; };
                        } else {
                            e.target.src = IMAGE_PLACEHOLDER_SVG;
                            e.target.onerror = null;
                        }
                    }}
                />
                {(!currentDealIsShared && !isClient) && (
                <div className={styles["deal-image-actions"]}>
                    <button
                        type="button"
                        onClick={() => {
                            const url = buildStreetViewUrlFromAddress(inp);
                            if (url) {
                                upd("image", url);
                                upd("imageFallback", inp?.imageFallback ?? "");
                            }
                        }}
                        disabled={!inp?.street && !inp?.city && !inp?.state && !inp?.zipCode}
                        className={styles["btn-estimate-rent"]}
                        title="Use Google Street View image for this address"
                        style={{ marginTop: 8, width: '100%' }}
                    >
                        Get Street View
                    </button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadDealImage) onUploadDealImage(file);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={!currentDealId || uploadingImage || !onUploadDealImage}
                        className={styles["btn-estimate-rent"]}
                        title={!currentDealId ? "Save the deal first before uploading images" : "Upload a deal image"}
                        style={{ marginTop: 8, width: "100%" }}
                    >
                        {uploadingImage ? "Uploading…" : "Upload Image"}
                    </button>
                </div>
                )}
                <div className={styles["deal-image-list-wrap"]}>
                    {dealImagesLoading && <div className={styles["deal-image-empty"]}>Loading images…</div>}
                    {!dealImagesLoading && dealImagesError && (
                        <div className={styles["deal-image-error"]}>{dealImagesError}</div>
                    )}
                    {!dealImagesLoading && !dealImagesError && dealImages.length === 0 && (
                        <div className={styles["deal-image-empty"]}>No uploaded images.</div>
                    )}
                    {!dealImagesLoading && !dealImagesError && dealImages.length > 0 && (
                        <ul className={styles["deal-image-list"]} aria-label="Deal images">
                            {dealImages.map((image) => (
                                <li key={image.fullPath} className={styles["deal-image-item"]}>
                                    <button
                                        type="button"
                                        className={styles["deal-image-open"]}
                                        onClick={() => onPreviewDealImage?.(image)}
                                        title={image.name}
                                    >
                                        {image.name}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles["deal-image-delete"]}
                                        onClick={() => onDeleteDealImage?.(image)}
                                        disabled={currentDealIsShared || isClient || deletingImagePath === image.fullPath || !onDeleteDealImage}
                                        aria-label={`Delete ${image.name}`}
                                        title={currentDealIsShared || isClient ? "Read-only: cannot delete image" : "Delete image"}
                                    >
                                        {deletingImagePath === image.fullPath ? "…" : "×"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {(currentDealIsShared || isClient) && (
                <div style={{ padding: '0 1rem', marginBottom: '0.5rem', fontSize: 11, color: 'var(--amber)' }}>
                    Read-only: This deal is shared with you
                </div>
            )}

            <fieldset disabled={currentDealIsShared || isClient} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div>
                <div className={styles["sec-label"]}>Property Info</div>
                <div className={styles["field-group"]}>
                    <Field
                        label="Street"
                        name="street"
                        value={inp.street ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="City"
                        name="city"
                        value={inp.city ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="State"
                        name="state"
                        value={inp.state ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="Zip Code"
                        name="zipCode"
                        value={inp.zipCode ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field label="Bedrooms" name="bedrooms" value={inp.bedrooms} onChange={upd} />
                    <Field
                        label="Bathrooms"
                        name="bathrooms"
                        value={inp.bathrooms}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field label="Sq Ft" name="sqft" value={inp.sqft} onChange={upd} />
                    <Field label="Year Built" name="yearBuilt" value={inp.yearBuilt} onChange={upd} />
                    <Field
                        label="Stories"
                        name="stories"
                        value={inp.stories}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field label="Lot Size" name="lotSize" value={inp.lotSize} onChange={upd} />
                    <div className={styles.field}>
                        <label htmlFor="redms-basement">Basement</label>
                        <select
                            id="redms-basement"
                            value={inp.basement}
                            onChange={(e) => upd("basement", e.target.value)}
                        >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Field
                            label="Section 8 Rent ($)"
                            name="totalRent"
                            value={inp.totalRent}
                            onChange={upd}
                        />
                        <button
                            type="button"
                            onClick={handleEstimateRent}
                            disabled={rentEstimateLoading}
                            className={styles["btn-estimate-rent"]}
                            title="Estimate monthly rent from address and property details (RentCast API or heuristic)"
                        >
                            {rentEstimateLoading ? "Estimating…" : "Estimate Rent"}
                        </button>
                    </div>
                    <Field
                        label="Property Owner"
                        name="propertyOwner"
                        value={inp.propertyOwner ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="APN"
                        name="apn"
                        value={inp.apn ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="Use"
                        name="use"
                        value={inp.use ?? ""}
                        onChange={upd}
                        type="text"
                    />
                    <Field
                        label="Web Page"
                        name="wedPage"
                        value={inp.wedPage ?? ""}
                        onChange={upd}
                        type="text"
                        placeholder="https://example.com"
                        inputClassName={styles.sidebarUrlInput}
                    />
                    {normalizeWebAddress(inp.wedPage) && (
                        <div className={styles.field}>
                            <label>Web Page Link</label>
                            <a
                                className={styles.sidebarExternalLink}
                                href={normalizeWebAddress(inp.wedPage)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={inp.wedPage.trim()}
                                style={{ color: "var(--brand-accent)", textDecorationColor: "var(--brand-accent)" }}
                            >
                                Listing
                            </a>
                        </div>
                    )}
                    <Field
                        label="Pics & Videos"
                        name="picsVideos"
                        value={inp.picsVideos ?? ""}
                        onChange={upd}
                        type="text"
                        placeholder="https://example.com"
                        inputClassName={styles.sidebarUrlInput}
                    />
                    {normalizeWebAddress(inp.picsVideos) && (
                        <div className={styles.field}>
                            <label>Pics & Videos Link</label>
                            <a
                                className={styles.sidebarExternalLink}
                                href={normalizeWebAddress(inp.picsVideos)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={inp.picsVideos.trim()}
                                style={{ color: "var(--brand-accent)", textDecorationColor: "var(--brand-accent)" }}
                            >
                                Pics & Videos
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Acquisition</div>
                <div className={styles["field-group"]}>
                    <div className={styles["field-narrow"]}>
                        <Field
                            label="Contract Price (to seller)"
                            name="offerPrice"
                            value={inp.offerPrice}
                            onChange={upd}
                        />
                    </div>
                    <div className={styles["field-narrow"]}>
                        <Field
                            label="Wholesale Fee ($)"
                            name="wholesaleFee"
                            value={inp.wholesaleFee}
                            onChange={upd}
                        />
                    </div>
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Financing</div>
                <div className={styles["field-group"]}>
                    <div className={styles.field}>
                        <label htmlFor="redms-mortgage1YN">1st Mortgage</label>
                        <select
                            id="redms-mortgage1YN"
                            value={inp.mortgage1YN}
                            onChange={(e) => upd("mortgage1YN", e.target.value)}
                        >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    {inp.mortgage1YN === "Yes" && (
                        <Field
                            label="Down Pmt %"
                            name="downPaymentPct"
                            value={inp.downPaymentPct}
                            onChange={upd}
                            step="0.5"
                        />
                    )}
                    {inp.mortgage1YN === "Yes" && (
                        <>
                            <Field
                                label="1st Mtg Rate %"
                                name="mortgage1Rate"
                                value={inp.mortgage1Rate != null ? Math.round(inp.mortgage1Rate * 10000) / 100 : ""}
                                onChange={(k, v) => upd(k, Math.round((v / 100) * 10000) / 10000)}
                                step="0.01"
                            />
                            <Field
                                label="1st Mtg Term (yrs)"
                                name="mortgage1Term"
                                value={inp.mortgage1Term}
                                onChange={upd}
                                step="1"
                            />
                        </>
                    )}

                    <div className={styles.field}>
                        <label htmlFor="redms-mortgage2YN" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                id="redms-mortgage2YN"
                                type="checkbox"
                                checked={inp.mortgage2YN === "Yes"}
                                onChange={(e) => upd("mortgage2YN", e.target.checked ? "Yes" : "No")}
                                style={{ margin: 0, width: 'auto' }}
                            />
                            2nd Mortgage (GAP Funding)
                        </label>
                    </div>
                    {inp.mortgage2YN === "Yes" && (
                        <>
                            <Field
                                label="2nd Mtg Amt ($)"
                                name="mortgage2Amt"
                                value={inp.mortgage2Amt}
                                placeholder={`Auto: ${$(r.calculatedMtg2Amt)}`}
                                onChange={upd}
                                type="number"
                            />
                            <Field
                                label="2nd Mtg Rate %"
                                name="mortgage2Rate"
                                value={inp.mortgage2Rate != null ? Math.round(inp.mortgage2Rate * 10000) / 100 : ""}
                                onChange={(k, v) => upd(k, Math.round((v / 100) * 10000) / 10000)}
                                step="0.01"
                            />
                        </>
                    )}
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Rehab Level</div>
                <div className={styles["rehab-btns"]} role="group" aria-label="Rehab level">
                    {REHAB_LEVELS.map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            className={`${styles.rb} ${inp.rehabLevel === lvl ? styles.on : ""}`}
                            onClick={() => setRehabLevel(lvl)}
                            aria-pressed={inp.rehabLevel === lvl}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
                <Field
                    label="Rehab Cost ($)"
                    name="rehabCost"
                    value={inp.rehabCost ?? 0}
                    onChange={upd}
                />
                <Field
                    label="Rehab Time (months)"
                    name="rehabMonths"
                    value={inp.rehabMonths ?? 0}
                    onChange={upd}
                    step="0.5"
                />
                <div className={styles["rehab-info"]}>
                    Rehab: {(inp.rehabMonths ?? 0)} mo + {inp.holdingMonthsBuffer} buffer
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Costs & Taxes</div>
                <div className={styles["field-group"]}>
                    <Field
                        label="Inspection ($)"
                        name="inspectionFee"
                        value={inp.inspectionFee}
                        onChange={upd}
                    />
                    <Field label="LLC Setup ($)" name="llcSetup" value={inp.llcSetup} onChange={upd} />
                    <Field
                        label="Appraisal ($)"
                        name="appraisalFee"
                        value={inp.appraisalFee}
                        onChange={upd}
                    />
                    <Field
                        label="Title Insurance ($)"
                        name="titleInsurance"
                        value={inp.titleInsurance ?? ""}
                        onChange={upd}
                        placeholder={`Est: ${$(calcTitleInsurance(inp.offerPrice ?? 0))}`}
                    />
                    <Field
                        label="Settlement ($)"
                        name="settlementCosts"
                        value={inp.settlementCosts}
                        onChange={upd}
                    />
                    <Field label="Misc Fees ($)" name="miscFees" value={inp.miscFees} onChange={upd} />
                    <Field
                        label="Acq Mgmt Fee %"
                        name="mgmtFeePct"
                        value={inp.mgmtFeePct}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field
                        label="Current Annual Tax ($)"
                        name="currentYearTax"
                        value={inp.currentYearTax}
                        onChange={upd}
                    />
                    <div className={styles["field-with-update"]}>
                        <Field
                            label="New Property Tax ($)"
                            name="newPropertyTax"
                            value={inp.newPropertyTax ?? ""}
                            onChange={upd}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const purchasePrice = Number(inp.offerPrice) || 0;
                                const sev = purchasePrice * DETROIT_TAX_SEV_RATIO;
                                const calculated = sev * DETROIT_TAX_RATE + DETROIT_TAX_FLAT;
                                upd("newPropertyTax", Math.round(calculated));
                            }}
                            className={styles["btn-estimate-rent"]}
                            title="Estimate: (50% of purchase price × tax rate) + trash fee"
                        >
                            Calculate
                        </button>
                    </div>
                    <Field
                        label="Rehab Insurance ($)"
                        name="rehabInsurance"
                        value={inp.rehabInsurance ?? ""}
                        onChange={upd}
                    />
                    <div className={styles["field-with-update"]}>
                        <Field
                            label="Landlord's Insurance ($)"
                            name="landlordsInsurance"
                            value={inp.landlordsInsurance ?? ""}
                            onChange={upd}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const offerPrice = Number(inp.offerPrice) || 0;
                                const rehabCost = Number(inp.rehabCost) ?? 0;
                                const calculated = (offerPrice + rehabCost) * 0.025;
                                upd("landlordsInsurance", Math.round(calculated));
                            }}
                            className={styles["btn-estimate-rent"]}
                            title="Recalculate: 2.5% of (purchase price + rehab cost)"
                        >
                            Update
                        </button>
                    </div>
                    <Field
                        label="Holding Buffer (months beyond rehab)"
                        name="holdingMonthsBuffer"
                        value={inp.holdingMonthsBuffer}
                        onChange={upd}
                    />
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Deal Parameters</div>
                <div className={styles["field-group"]}>
                    <Field
                        label="Retail Investor Cap Rate (%)"
                        name="retailCapRate"
                        value={retailCapRateEditing !== null ? retailCapRateEditing : (inp.retailCapRate != null ? (inp.retailCapRate * 100).toFixed(2) : "")}
                        onChange={(k, v) => {
                            const display = v == null ? "" : String(v);
                            setRetailCapRateEditing(display);
                            upd(k, v == null ? undefined : v / 100);
                        }}
                        onFocus={() => setRetailCapRateEditing(inp.retailCapRate != null ? (inp.retailCapRate * 100).toFixed(2) : "")}
                        onBlur={() => setRetailCapRateEditing(null)}
                        step="0.01"
                    />
                    {!wholesaler && (
                    <>
                    <Field
                        label="Preferred ROI %"
                        name="preferredROIPct"
                        value={inp.preferredROIPct}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field
                        label="Profit Split to BNIC %"
                        name="profitSplitPct"
                        value={inp.profitSplitPct}
                        onChange={upd}
                    />
                    </>
                    )}
                    <Field
                        label="Realtor/Sale Fee %"
                        name="realtorSaleFeePct"
                        value={inp.realtorSaleFeePct}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field
                        label="PM Fee % of rent"
                        name="pmFeePct"
                        value={inp.pmFeePct}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field
                        label="Vacancy %"
                        name="vacancyPct"
                        value={inp.vacancyPct}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field label="CapEx %" name="capexPct" value={inp.capexPct} onChange={upd} step="0.5" />
                    <Field
                        label="Annual Rent Increase %"
                        name="annualRentIncrease"
                        value={inp.annualRentIncrease}
                        onChange={upd}
                        step="0.5"
                    />
                    <Field
                        label="Annual Appreciation %"
                        name="annualAppreciation"
                        value={inp.annualAppreciation}
                        onChange={upd}
                        step="0.1"
                    />
                </div>
            </div>

            <div className={styles["cost-bar-wrap"]}>
                <div className={styles["cost-bar-header"]}>
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 9,
                            color: "var(--muted)",
                            letterSpacing: 1,
                        }}
                    >
                        B&H TOTAL INVESTMENT
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: costClr }}>
                        {$(r.bhTotalInvestment)}
                    </span>
                </div>
                <div className={styles["cost-bar-header"]}>
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 9,
                            color: "var(--muted)",
                        }}
                    >
                        MAX (Summary!B31)
                    </span>
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--muted)",
                        }}
                    >
                        ${(maxTpc / 1000).toFixed(0)}K
                    </span>
                </div>
                <div className={styles["cost-bar-track"]}>
                    <div
                        className={styles["cost-bar-fill"]}
                        style={{ width: costPct + "%", background: costClr }}
                    />
                </div>
                <div className={styles["cost-bar-foot"]}>{costPct.toFixed(1)}% of limit used</div>
            </div>

            </fieldset>

            {(isAdmin || (canSaveDeal && !isClient)) && (
            <div className={styles["saved-deals-sec"]}>
                <div className={styles["sec-label"]}>Saved deals</div>
                {atOverageWarningThreshold && !isAdmin && (
                <div style={{ padding: '6px 0', fontSize: 11, color: 'var(--amber)' }} role="status">
                    You&apos;ve used {usageCount} of {usageLimit} deals this month. Additional analyses are $10 each.
                </div>
                )}
                {saveError && (
                <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--red)' }} role="alert">
                    {saveError}
                </div>
                )}
                <div className={styles["saved-deals-actions"]}>
                    {(isAdmin || canSaveDeal) && (
                    <button
                        type="button"
                        className={styles["btn-save-deal"]}
                        onClick={handleSaveDeal}
                        disabled={saveInProgress || currentDealIsShared || isClient}
                        title={(currentDealIsShared || isClient) ? "Read-only: you cannot edit this shared deal" : ""}
                    >
                        {saveInProgress ? "Saving…" : currentDealId ? "Update deal" : "Save deal"}
                    </button>
                    )}
                    <button
                        type="button"
                        className={styles["btn-refresh-deals"]}
                        onClick={refreshDeals}
                        disabled={savedDealsLoading}
                        aria-label="Refresh list"
                    >
                        {savedDealsLoading ? "…" : "↻"}
                    </button>
                </div>
                <ul className={styles["saved-deals-list"]} aria-label="Saved property deals">
                    {savedDeals.length === 0 && !savedDealsLoading && (
                        <li className={styles["saved-deals-empty"]}>
                            No saved deals yet.
                        </li>
                    )}
                    {sortedSavedDeals.map((deal) => (
                        <li key={deal.id} className={styles["saved-deals-item"]}>
                            <button
                                type="button"
                                className={styles["saved-deals-load"]}
                                onClick={() => handleDealSelect({ target: { value: deal.id } })}
                            >
                                {deal.dealName}
                            </button>
                            {(deal.createdAt || deal.updatedAt) && (
                            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2, lineHeight: 1.35 }}>
                                {deal.createdAt && <div>Created {formatDealListDate(deal.createdAt)}</div>}
                                {deal.updatedAt && <div>Updated {formatDealListDate(deal.updatedAt)}</div>}
                            </div>
                            )}
                            {(isAdmin || (!deal.isShared && canSaveDeal)) && (
                            <button
                                type="button"
                                className={styles["saved-deals-delete"]}
                                onClick={(e) => handleDeleteDeal(deal.id, e)}
                                aria-label={`Delete ${deal.dealName}`}
                                title={deal.isShared ? "Cannot delete shared deals" : "Delete deal"}
                                disabled={deal.isShared}
                            >
                                ×
                            </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            )}

            <div className={styles["sidebar-footer"]}>
                <Link to="/terms#top" className={styles["sidebar-terms-link"]}>
                    Terms of Service
                </Link>
                <Link to="/privacy#top" className={styles["sidebar-terms-link"]}>
                    Privacy Policy
                </Link>
            </div>
            {isNoteModalOpen && (
                <div
                    className={styles["note-modal-backdrop"]}
                    role="button"
                    tabIndex={0}
                    aria-label="Close note modal"
                    onClick={closeNoteModal}
                    onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") closeNoteModal();
                    }}
                >
                    <div
                        className={styles["note-modal-content"]}
                        role="dialog"
                        aria-modal="true"
                        aria-label={activeNote ? "Deal note" : "Add deal note"}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles["image-modal-close"]}
                            onClick={closeNoteModal}
                            aria-label="Close note modal"
                        >
                            ×
                        </button>
                        <h3 className={styles["note-modal-title"]}>
                            {activeNote ? "Deal Note" : "Add Note"}
                        </h3>
                        {activeNote && (
                            <div className={styles["note-modal-date"]}>
                                Updated {formatDealListDate(activeNote.updatedAt || activeNote.createdAt || "")}
                            </div>
                        )}
                        <textarea
                            className={styles["note-modal-textarea"]}
                            value={isEditingNote || !activeNote ? noteDraft : activeNote.text}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            readOnly={!isEditingNote && Boolean(activeNote)}
                            rows={8}
                        />
                        {noteSaveStatus === "saving" && (
                            <div className={styles["note-save-status"]}>Saving note...</div>
                        )}
                        {noteSaveStatus === "saved" && (
                            <div className={styles["note-save-status-success"]}>Saved</div>
                        )}
                        {noteSaveStatus === "error" && (
                            <div className={styles["note-save-status-error"]}>{noteSaveError || "Could not save note changes."}</div>
                        )}
                        <div className={styles["note-modal-actions"]}>
                            {activeNote && !isEditingNote && (
                                <button
                                    type="button"
                                    className={styles["btn-estimate-rent"]}
                                    onClick={() => {
                                        setNoteDraft(activeNote.text ?? "");
                                        setIsEditingNote(true);
                                    }}
                                    disabled={notesReadOnly || noteSaving}
                                >
                                    Edit
                                </button>
                            )}
                            {(isEditingNote || !activeNote) && (
                                <button
                                    type="button"
                                    className={styles["btn-save-deal"]}
                                    onClick={handleSaveNote}
                                    disabled={notesReadOnly || noteSaving || !noteDraft.trim()}
                                >
                                    Save
                                </button>
                            )}
                            {activeNote && (
                                <button
                                    type="button"
                                    className={styles["note-modal-delete"]}
                                    onClick={handleDeleteNote}
                                    disabled={notesReadOnly || noteSaving}
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                type="button"
                                className={styles["btn-refresh-deals"]}
                                onClick={closeNoteModal}
                                disabled={noteSaving}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
