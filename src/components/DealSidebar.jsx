import { useState } from "react";
import { Field } from "./Field.jsx";

const IMAGE_PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23374151' width='400' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dy='.35em'%3ENo Image%3C/text%3E%3C/svg%3E";
import { REHAB_LEVELS } from "../logic/constants.js";
import { formatCurrency } from "../logic/formatters.js";
import { calcTitleInsurance } from "../logic/redmsCalc.js";
import { estimateMonthlyRent } from "../logic/rentEstimate.js";
import styles from "../REDMS.module.css";

const $ = formatCurrency;

export function DealSidebar({
    isAdmin = true,
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
    refreshDeals,
    savedDealsLoading,
    onOpenSearch,
}) {
    const [rentEstimateLoading, setRentEstimateLoading] = useState(false);

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
    return (
        <aside
            id="redms-sidebar"
            className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}
            aria-hidden={sidebarCollapsed}
        >
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

            {!isAdmin && (
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

            <div className={styles["deal-select-wrap"]}>
                <label htmlFor="redms-deal-select" className={styles["deal-select-label"]}>
                    Deal
                </label>
                <select
                    id="redms-deal-select"
                    className={styles["deal-select"]}
                    value={currentDealId ?? ""}
                    onChange={handleDealSelect}
                    aria-label={isAdmin ? "Load a saved deal or blank template" : "Select a deal to view"}
                >
                    {isAdmin ? (
                        <>
                            <option value="">New deal (blank template)</option>
                            {savedDeals.map((deal) => (
                                <option key={deal.id} value={deal.id}>
                                    {deal.dealName}
                                </option>
                            ))}
                        </>
                    ) : (
                        <>
                            <option value="">— Select a deal —</option>
                            {userFavorites.map((fav) => (
                                <option key={fav.id} value={fav.dealId}>
                                    {fav.dealName || fav.dealId || "Untitled"}
                                </option>
                            ))}
                            {savedDeals
                                .filter((d) => !userFavorites.some((f) => f.dealId === d.id))
                                .map((deal) => (
                                    <option key={deal.id} value={deal.id}>
                                        {deal.dealName}
                                    </option>
                                ))}
                        </>
                    )}
                </select>
            </div>

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
            </div>

            {currentDealIsShared && (
                <div style={{ padding: '0 1rem', marginBottom: '0.5rem', fontSize: 11, color: 'var(--amber)' }}>
                    Read-only: This deal is shared with you
                </div>
            )}

            <fieldset disabled={currentDealIsShared} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                        label="Notes"
                        name="notes"
                        value={inp.notes ?? ""}
                        onChange={upd}
                        type="textarea"
                        rows={4}
                    />
                </div>
            </div>

            <div>
                <div className={styles["sec-label"]}>Acquisition</div>
                <div className={styles["field-group"]}>
                    <div className={styles["field-narrow"]}>
                        <Field
                            label="Offer / Purchase Price ($)"
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
                    <Field
                        label="New Property Tax ($)"
                        name="newPropertyTax"
                        value={inp.newPropertyTax ?? ""}
                        onChange={upd}
                    />
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
                        value={inp.retailCapRate * 100}
                        onChange={(k, v) => upd(k, v / 100)}
                        step="0.5"
                    />
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

            {isAdmin && (
            <div className={styles["saved-deals-sec"]}>
                <div className={styles["sec-label"]}>Saved deals</div>
                <div className={styles["saved-deals-actions"]}>
                    {isAdmin && (
                    <button
                        type="button"
                        className={styles["btn-save-deal"]}
                        onClick={handleSaveDeal}
                        disabled={saveInProgress || currentDealIsShared}
                        title={currentDealIsShared ? "Read-only: you cannot edit this shared deal" : ""}
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
                    {savedDeals.map((deal) => (
                        <li key={deal.id} className={styles["saved-deals-item"]}>
                            <button
                                type="button"
                                className={styles["saved-deals-load"]}
                                onClick={() => handleDealSelect({ target: { value: deal.id } })}
                            >
                                {deal.dealName}
                            </button>
                            {isAdmin && (
                            <button
                                type="button"
                                className={styles["saved-deals-delete"]}
                                onClick={(e) => handleDeleteDeal(deal.id, e)}
                                aria-label={`Delete ${deal.dealName}`}
                                title="Delete deal"
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
            </fieldset>
        </aside>
    );
}
