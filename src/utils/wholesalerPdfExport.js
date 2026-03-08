/**
 * PDF Export for Wholesaler module.
 * Proforma: buyer-facing (offer price to buyer, no spread, no contract price).
 * Wholesaler Report: internal (contract price, spread, max offer).
 */
import { jsPDF } from "jspdf";
import { formatCurrency, formatPct } from "../logic/formatters.js";

const $ = formatCurrency;
const pct = formatPct;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const FONT_SANS = "helvetica";
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;
const SMALL_SIZE = 8;
const LINE_H = 6;
const SECTION_GAP = 12;

async function imageToBase64(url, format = "jpeg") {
  if (!url || url.startsWith("data:")) return url;
  try {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const mime = format === "png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(mime, format === "png" ? undefined : 0.8);
  } catch {
    return null;
  }
}

function addSectionHeading(doc, text, y, gap = SECTION_GAP) {
  doc.setFontSize(HEADING_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  return y + gap;
}

function addRow(doc, label, value, y, highlight = false) {
  const rowH = LINE_H;
  if (highlight) {
    doc.setFillColor(255, 248, 220);
    doc.rect(MARGIN, y - 1, PAGE_W - 2 * MARGIN, rowH + 1, "F");
  }
  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, highlight ? "bold" : "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(label, MARGIN, y + 4);
  doc.setFont(FONT_SANS, highlight ? "bold" : "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(String(value), PAGE_W - MARGIN - 60, y + 4, { align: "right" });
  return y + rowH;
}

function addPropertyGrid(doc, items, startY) {
  const cols = 4;
  const gap = 4;
  const usableW = PAGE_W - 2 * MARGIN;
  const colW = (usableW - (cols - 1) * gap) / cols;
  const cellH = 10;
  let col = 0;
  let rowY = startY;
  doc.setFontSize(7);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  for (const [label, val] of items) {
    const x = MARGIN + col * (colW + gap);
    doc.text(label, x, rowY + 3);
    doc.setFontSize(BODY_SIZE - 1);
    doc.setFont(FONT_SANS, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(String(val), x, rowY + 7, { maxWidth: colW - 2 });
    doc.setFontSize(7);
    doc.setFont(FONT_SANS, "normal");
    doc.setTextColor(100, 100, 100);
    col++;
    if (col >= cols) {
      col = 0;
      rowY += cellH;
    }
  }
  return rowY + (col > 0 ? cellH : 0);
}

function checkPageBreak(doc, y, minSpace = 40, pageCountRef = null) {
  if (y > PAGE_H - minSpace) {
    doc.addPage();
    if (pageCountRef) pageCountRef.pages = 3;
    return MARGIN;
  }
  return y;
}

/**
 * Proforma PDF for potential buyers. Shows offer price (Contract + Wholesale Fee), full cost stack,
 * Profit Summary, Annual P&L — Buy & Hold, and 30-year projection on a separate page.
 */
export async function generateWholesalerProformaPDF(inp, r, formatAddress) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  const offerPriceToBuyer = r.offerPriceToBuyer ?? (inp.offerPrice + (inp.wholesaleFee || 0));

  doc.setFontSize(TITLE_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(180, 100, 40);
  doc.text("Property Proforma", PAGE_W / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("REDMS Wholesaler · For Buyer Review", PAGE_W / 2, y, { align: "center" });
  y += 16;

  y = addSectionHeading(doc, "Property Information", y);
  const address = formatAddress(inp);
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont(FONT_SANS, "bold");
  doc.text("Address", MARGIN, y);
  doc.setFont(FONT_SANS, "normal");
  doc.text(address || "—", MARGIN, y + 5, { maxWidth: PAGE_W - 2 * MARGIN });
  y += 12;

  const propInfo = [
    ["Beds", inp.bedrooms ?? "—"],
    ["Baths", inp.bathrooms ?? "—"],
    ["Sq Ft", inp.sqft != null ? Number(inp.sqft).toLocaleString() : "—"],
    ["Year", inp.yearBuilt ?? "—"],
    ["Rent/mo", $(inp.totalRent)],
    ["Rehab", inp.rehabLevel ?? "—"],
    ["Rehab $", $(r.rehabCost)],
    ["ARV", $(r.arv)],
  ];
  y = addPropertyGrid(doc, propInfo, y);
  y += 12;

  // Offer Price to Investor (Contract Price + Wholesale Fee)
  y = addSectionHeading(doc, "Offer & Investment", y);
  y = addRow(doc, "Offer Price to Investor", $(offerPriceToBuyer), y, true);
  y += 10;

  // Full Cost Stack
  y = addSectionHeading(doc, "Cost Stack", y);
  y = addRow(doc, "Offer Price to Investor", $(offerPriceToBuyer), y);
  y = addRow(doc, "Rehab Cost", $(r.rehabCost), y);
  y = addRow(doc, "1st Mtg Upfront Points", $(r.mortgage1Pts), y);
  y = addRow(doc, "Upfront Out-of-Pocket", $(r.upfront), y);
  y = addRow(doc, "Closing Costs", $(r.closing), y);
  y = addRow(doc, "  · Title Insurance", $(r.titleIns), y);
  y = addRow(doc, "  · Settlement", $(inp.settlementCosts ?? 0), y);
  y = addRow(doc, "  · Misc Fees", $(inp.miscFees ?? 0), y);
  y = addRow(doc, "  · Acq Management Fee", $(r.acqMgmtFee), y);
  y = addRow(doc, "  · Buyer's Property Tax", $(r.buyerTax), y);
  y = addRow(doc, "  · Rehab Insurance", $(r.rehabIns), y);
  y = addRow(doc, "Holding Costs", $(r.holdingCosts), y);
  y = addRow(doc, "2nd Mtg Points", $(r.mortgage2Pts), y);
  y = addRow(doc, "Total Cost", $(r.totalCosts), y, true);
  y = addRow(
    doc,
    "Less: 2nd Mortgage",
    r.mortgage2Amt > 0 ? `(${$(r.mortgage2Amt)})` : $(0),
    y
  );
  y = addRow(
    doc,
    "Less: 1st Mortgage",
    r.mortgage1Amt > 0 ? `(${$(r.mortgage1Amt)})` : $(0),
    y
  );
  y = addRow(doc, "Total Investment", $(r.totalInvestment), y, true);
  y += 8;

  const pageCount = { pages: 2 };
  y = checkPageBreak(doc, y, 40, pageCount);

  // Key Metrics — Flipping Turnkey Rental Property Profit Summary (no Annualized ROI)
  y = addSectionHeading(doc, "Key Metrics — Flipping Turnkey Rental Property Profit Summary", y);
  y = addRow(doc, "ARV / Target Sale Price", $(r.arv), y);
  y = addRow(doc, "Less: Realtor/Sales Fee", `(${$(r.realtorFee)})`, y);
  if (r.mortgage1Amt > 0) {
    y = addRow(doc, "Less: 1st Mortgage Payoff", `(${$(r.mortgage1Amt)})`, y);
  }
  if (r.mortgage2Amt > 0) {
    y = addRow(doc, "Less: 2nd Mortgage Payoff", `(${$(r.mortgage2Amt)})`, y);
  }
  y = addRow(doc, "Net Proceeds", $(r.netProceedsAfterPayoffs), y);
  y = addRow(doc, "Less: Total Investment", `(${$(r.totalInvestment)})`, y);
  y = addRow(doc, "Gross Profit to Buyer", $(r.grossProfit), y, true);
  y = addRow(doc, "Cash-on-Cash ROI", pct(r.cashOnCash), y);
  y = addRow(doc, "Min Sales Price", $(r.minSalesPrice), y);
  y += 8;

  y = checkPageBreak(doc, y, 40, pageCount);

  // Annual P&L — Buy & Hold
  y = addSectionHeading(doc, "Annual P&L — Buy & Hold", y);
  y = addRow(doc, "Annual Gross Rent", $(r.annualGrossRent), y);
  y = addRow(doc, "Less: Annual Insurance", `(${$(r.bhAnnualIns)})`, y);
  y = addRow(doc, "Less: Detroit Property Tax", `(${$(r.bhAnnualTax)})`, y);
  y = addRow(doc, "Less: Prop Mgmt Fee", `(${$(r.bhAnnualPmFee)})`, y);
  y = addRow(doc, "Less: Business Costs", `(${$(r.bhBusinessCosts)})`, y);
  y = addRow(doc, "Net Operating Income / NOI", $(r.noi), y, true);
  if (r.bhAnnualMtg1 > 0) {
    y = addRow(doc, "Less: 1st Mortgage (annual)", `(${$(r.bhAnnualMtg1)})`, y);
  }
  if (r.bhAnnualMtg2 > 0) {
    y = addRow(doc, "Less: 2nd Mortgage (annual)", `(${$(r.bhAnnualMtg2)})`, y);
  }
  y = addRow(doc, "Cash Flow After Debt", $(r.bhCashFlowAfterDebt), y, true);
  y = addRow(doc, "Cap Rate", pct(r.capRate), y);
  y = addRow(doc, "Total B&H Investment", $(r.bhTotalInvestment), y);
  y = addRow(doc, "Year-1 Cash-on-Cash", pct(r.bhCashOnCash), y, true);
  y += 8;

  // Page footer(s) for portrait pages
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  const dateStr = new Date().toLocaleDateString();
  if (pageCount.pages === 2) {
    doc.text(`Generated ${dateStr} · Page 1 of 2`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
  } else {
    doc.setPage(1);
    doc.text(`Generated ${dateStr} · Page 1 of 3`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
    doc.setPage(2);
    doc.text(`Generated ${dateStr} · Page 2 of 3`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
  }

  // ─── 30-YEAR PROJECTION (landscape, separate page) ──────────────────────────
  doc.addPage("a4", "l");
  const LAND_W = 297;
  const LAND_H = 210;
  const LAND_MARGIN = 12;
  y = LAND_MARGIN;

  doc.setFontSize(HEADING_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("30-Year Buy & Hold Projection", LAND_MARGIN, y);
  doc.setDrawColor(200, 200, 200);
  doc.line(LAND_MARGIN, y + 2, LAND_W - LAND_MARGIN, y + 2);
  y += 10;

  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Initial investment: ${$(r.bhTotalInvestment)}. Rent and value grow over time.`, LAND_MARGIN, y);
  y += 6;

  const rowH = 5;
  const colW = [8, 24, 22, 20, 24, 20, 18, 14, 14, 26];
  const headers = ["Yr", "Rental Income", "Prop Costs", "Mtg Pmt", "Net Cash", "Depr", "Reserves", "ROI", "ROE", "Prop Value"];

  doc.setFontSize(7);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(180, 180, 180);
  let x = LAND_MARGIN;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, colW[i], 6, "S");
    doc.text(headers[i], x + 2, y + 4);
    x += colW[i];
  }
  y += 6;

  doc.setFont(FONT_SANS, "normal");
  doc.setFontSize(6);
  const highlightYears = [1, 5, 10, 15, 20, 25, 30];
  for (const p of r.projections) {
    if (highlightYears.includes(p.yr)) {
      doc.setFillColor(252, 248, 240);
      x = LAND_MARGIN;
      for (let i = 0; i < colW.length; i++) {
        doc.rect(x, y, colW[i], rowH, "F");
        x += colW[i];
      }
    }
    doc.setDrawColor(220, 220, 220);
    x = LAND_MARGIN;
    const cells = [
      String(p.yr),
      $(p.rentalIncome),
      `(${$(p.propCosts)})`,
      `(${$(p.mortgagePayment)})`,
      $(p.netCash),
      $(p.depr),
      `(${$(Math.abs(p.reserves_yr))})`,
      pct(p.roi),
      pct(p.roe),
      $(p.propValue),
    ];
    for (let i = 0; i < cells.length; i++) {
      doc.rect(x, y, colW[i], rowH, "S");
      doc.text(cells[i], x + 2, y + 3.5);
      x += colW[i];
    }
    y += rowH;
  }

  y += 1;
  doc.setFont(FONT_SANS, "bold");
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  const gt = r.gt;
  const totCells = [
    "∑",
    $(gt.rentalIncome),
    `(${$(gt.propCosts)})`,
    `(${$(gt.mortgagePayment)})`,
    $(gt.netCash),
    $(gt.depr),
    `(${$(Math.abs(gt.reserves_yr))})`,
    pct(r.bhTotalInvestment > 0 ? gt.netCash / r.bhTotalInvestment : 0),
    "—",
    $(r.projections[29]?.propValue),
  ];
  doc.setDrawColor(180, 180, 180);
  x = LAND_MARGIN;
  for (let i = 0; i < colW.length; i++) {
    doc.rect(x, y, colW[i], 6, "S");
    doc.text(totCells[i], x + 2, y + 4);
    x += colW[i];
  }
  y += 10;

  doc.setFont(FONT_SANS, "normal");
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(80, 80, 80);
  doc.text(`Total 30-yr Net Cash: ${$(gt.netCash)}`, LAND_MARGIN, y);
  doc.text(`Total Return: ${r.bhTotalInvestment > 0 ? ((gt.netCash / r.bhTotalInvestment) * 100).toFixed(0) : 0}%`, LAND_MARGIN + 70, y);
  doc.text(`Final Property Value: ${$(r.projections[29]?.propValue)}`, LAND_MARGIN + 140, y);

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page ${pageCount.pages} of ${pageCount.pages}`, LAND_W / 2, LAND_H - 8, { align: "center" });

  doc.save(`Proforma-${(address || "deal").replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}

/**
 * Wholesaler Report (internal). Contract price, spread, max offer.
 */
export async function generateWholesalerReportPDF(inp, r, formatAddress) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFontSize(TITLE_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(180, 100, 40);
  doc.text("Wholesaler Report", PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "italic");
  doc.setTextColor(120, 120, 120);
  doc.text("Internal use only — do not share with buyers", PAGE_W / 2, y, { align: "center" });
  y += 14;

  y = addSectionHeading(doc, "Property", y);
  const address = formatAddress(inp);
  doc.setFontSize(BODY_SIZE);
  doc.text(address || "—", MARGIN, y, { maxWidth: PAGE_W - 2 * MARGIN });
  y += 12;

  y = addSectionHeading(doc, "Wholesaler Metrics", y);
  y = addRow(doc, "Contract Price (to seller)", $(r.offerPrice), y);
  y = addRow(doc, "Wholesale Fee", $(inp.wholesaleFee), y);
  y = addRow(doc, "Offer Price to Investor", $(r.offerPriceToBuyer ?? (inp.offerPrice + (inp.wholesaleFee || 0))), y, true);
  y = addRow(doc, "Max Offer to Investor (Contract Price + Wholesale Fee)", $(r.maxOfferToBuyer ?? r.offerPriceToBuyer), y);
  y += 8;

  y = addSectionHeading(doc, "Investor Attractiveness", y);
  y = addRow(doc, "Investor Would Take Deal", r.investorWouldTakeDeal ? "Yes" : "No", y);
  y = addRow(doc, "Wholesaler Deal", r.isWholesalerDeal ? "Yes" : "No", y, true);
  y = addRow(doc, "Flip Cash-on-Cash", pct(r.cashOnCash), y);
  y = addRow(doc, "B&H Cash-on-Cash", pct(r.bhCashOnCash), y);
  y = addRow(doc, "Total Investment", $(r.totalInvestment), y);
  y = addRow(doc, "ARV", $(r.arv), y);
  y += 8;

  y = addSectionHeading(doc, "Cost Stack", y);
  const totalCosts =
    r.offerPrice + (inp.wholesaleFee || 0) + r.rehabCost + r.mortgage1Pts + r.upfront +
    r.closing + r.holdingCosts + r.mortgage2Pts;
  y = addRow(doc, "Contract Price (to seller)", $(r.offerPrice), y);
  y = addRow(doc, "Wholesale Fee", $(inp.wholesaleFee), y);
  y = addRow(doc, "Rehab Cost", $(r.rehabCost), y);
  y = addRow(doc, "1st Mtg Upfront Points", $(r.mortgage1Pts), y);
  y = addRow(doc, "Upfront Out-of-Pocket", $(r.upfront), y);
  y = addRow(doc, "Closing & Holding", $(r.closing + r.holdingCosts), y);
  y = addRow(doc, "Total Cost", $(totalCosts), y, true);
  y = addRow(doc, "Less: Mortgages", `(${$(r.mortgage1Amt + r.mortgage2Amt)})`, y);
  y = addRow(doc, "Total Investment", $(r.totalInvestment), y, true);
  y += 8;

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  doc.save(`Wholesaler-Report-${(address || "deal").replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}
