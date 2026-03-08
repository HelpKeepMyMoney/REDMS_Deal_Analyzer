/**
 * PDF Export for REDMS Deal Analyzer
 * Generates a novice-investor-friendly printout with cover, Purchase & Flip, and Buy & Hold pages.
 */
import { jsPDF } from "jspdf";
import { formatCurrency, formatPct, formatNumber } from "../logic/formatters.js";

const $ = formatCurrency;
const pct = formatPct;
const fmtNum = formatNumber;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const FONT_SANS = "helvetica";
const FONT_MONO = "courier";
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;
const SMALL_SIZE = 8;
const LINE_H = 6;
const SECTION_GAP = 12;

/** Load image from URL and return as base64 data URL, or null on failure. format: 'jpeg' | 'png' */
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

/** Load image and return { data, width, height } for aspect-ratio preservation. */
async function imageToBase64WithSize(url, format = "jpeg") {
  if (!url) return null;
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
    const data = canvas.toDataURL(mime, format === "png" ? undefined : 0.8);
    return { data, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  }
}

/** Add a section heading with optional divider. gap overrides SECTION_GAP. */
function addSectionHeading(doc, text, y, gap = SECTION_GAP) {
  doc.setFontSize(HEADING_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  return y + gap;
}

/** Add a labeled row. Set highlight=true for highlighted (bold, background) rows. */
function addRow(doc, label, value, x, y, indent = 0, highlight = false) {
  const rowH = LINE_H;
  if (highlight) {
    doc.setFillColor(255, 248, 220);
    doc.rect(MARGIN, y - 1, PAGE_W - 2 * MARGIN, rowH + 1, "F");
  }
  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, highlight ? "bold" : (indent ? "normal" : "bold"));
  doc.setTextColor(highlight ? 40 : 80, highlight ? 40 : 80, highlight ? 40 : 80);
  doc.text(label, MARGIN + indent, y + 4);
  doc.setFont(FONT_SANS, highlight ? "bold" : "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(String(value), PAGE_W - MARGIN - 60, y + 4, { align: "right" });
  return y + rowH;
}

/** Add property info in a 4-column grid. Returns new y. */
function addPropertyGrid(doc, items, startY) {
  const cols = 4;
  const gap = 4;
  const usableW = PAGE_W - 2 * MARGIN;
  const colW = (usableW - (cols - 1) * gap) / cols;
  const cellH = 10;
  let y = startY;
  let col = 0;
  let rowY = y;
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

/** Add a highlighted metric box. Optional subtext (e.g. explanation) shown below value. */
function addMetricBox(doc, label, value, x, y, w, h, subtext = null) {
  doc.setFillColor(248, 249, 250);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(label, x + 4, y + 5);
  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(value, x + 4, y + 12);
  if (subtext) {
    doc.setFontSize(6);
    doc.setFont(FONT_SANS, "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(subtext, x + 4, y + 17, { maxWidth: w - 8 });
  }
  return y + h + 4;
}

/**
 * Generate and download the deal summary PDF.
 * @param {Object} inp - Deal input (from DealSidebar/state)
 * @param {Object} r - Calc result from redmsCalc
 * @param {Function} formatAddress - formatAddress(inp) for full address
 */
const LOGO_SIZE = 28;
const LOGO_CORNER_SIZE = 12;

/** Add logo to upper-right corner of a page. yPos: vertical position (below the heading line). */
function addLogoToCorner(doc, logoData, pageW, margin, size = LOGO_CORNER_SIZE, yPos = null) {
  if (!logoData) return;
  try {
    const logoX = pageW - margin - size;
    const logoY = yPos ?? margin;
    doc.addImage(logoData, "PNG", logoX, logoY, size, size);
  } catch {
    /* skip if addImage fails */
  }
}

export async function generateDealPDF(inp, r, formatAddress) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  // ─── COVER PAGE ─────────────────────────────────────────────────────────
  const logoUrl = `${window.location.origin}/logo.png`;
  const logoData = await imageToBase64(logoUrl, "png");

  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "The information presented is for illustrative purposes only and are not guaranteed projections.",
    PAGE_W / 2,
    y,
    { align: "center", maxWidth: PAGE_W - 2 * MARGIN }
  );
  y += 10;

  doc.setFontSize(TITLE_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(180, 100, 40);
  doc.text("Property Deal Summary", PAGE_W / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("The BNIC Network LLC · REDMS Deal Analyzer", PAGE_W / 2, y, { align: "center" });
  y += 10;

  // Logo and property image side by side, both 55mm height
  const ROW_H = 55;
  const GAP = 8;
  const usableW = PAGE_W - 2 * MARGIN;
  const logoW = ROW_H;
  const propImgW = usableW - logoW - GAP;

  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", MARGIN, y, logoW, ROW_H);
    } catch {
      doc.setFillColor(230, 230, 230);
      doc.rect(MARGIN, y, logoW, ROW_H, "F");
    }
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(MARGIN, y, logoW, ROW_H, "F");
  }

  const imgUrl = inp?.image || inp?.imageFallback || "";
  const imgLoaded = await imageToBase64WithSize(imgUrl);
  const propX = MARGIN + logoW + GAP;

  if (imgLoaded?.data) {
    try {
      const { data, width, height } = imgLoaded;
      const aspect = width / height;
      let outW = propImgW;
      let outH = ROW_H;
      if (aspect > propImgW / ROW_H) {
        outW = propImgW;
        outH = propImgW / aspect;
      } else {
        outH = ROW_H;
        outW = ROW_H * aspect;
      }
      const imgX = propX + (propImgW - outW) / 2;
      const imgY = y + (ROW_H - outH) / 2;
      doc.addImage(data, "JPEG", imgX, imgY, outW, outH);
    } catch {
      doc.setFillColor(230, 230, 230);
      doc.rect(propX, y, propImgW, ROW_H, "F");
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(150, 150, 150);
      doc.text("Property Photo", propX + propImgW / 2, y + ROW_H / 2 - 2, { align: "center" });
    }
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(propX, y, propImgW, ROW_H, "F");
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(150, 150, 150);
    doc.text("Property Photo (add via Find Properties)", propX + propImgW / 2, y + ROW_H / 2 - 2, { align: "center" });
  }
  y += ROW_H + 10;

  // Property Info Section (4-column grid)
  y = addSectionHeading(doc, "Property Information", y);

  const address = formatAddress(inp);
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont(FONT_SANS, "bold");
  doc.text("Address", MARGIN, y);
  doc.setFont(FONT_SANS, "normal");
  doc.text(address || "—", MARGIN, y + 5, { maxWidth: usableW });
  y += 10;

  const propInfo = [
    ["Beds", inp.bedrooms ?? "—"],
    ["Baths", inp.bathrooms ?? "—"],
    ["Sq Ft", inp.sqft != null ? Number(inp.sqft).toLocaleString() : "—"],
    ["Year", inp.yearBuilt ?? "—"],
    ["Lot Size", fmtNum(inp.lotSize)],
    ["Stories", inp.stories ?? "—"],
    ["Basement", inp.basement ?? "—"],
    ["Type", inp.use || "Single Family"],
    ["Rent/mo", $(inp.totalRent)],
    ["Rehab", inp.rehabLevel ?? "—"],
    ["Rehab $", $(r.rehabCost)],
    ["APN", inp.apn || "—"],
  ];

  y = addPropertyGrid(doc, propInfo, y);
  if (inp.notes) {
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    const lines = doc.text("Notes: " + inp.notes, MARGIN, y + 4, { maxWidth: usableW });
    const lineCount = Array.isArray(lines) ? lines.length : 1;
    y += lineCount * 6 + 12;
  }
  y += 18;

  // Key metrics for cover (three cards) — reduced gap to save space
  y = addSectionHeading(doc, "Key Investment Metrics", y, 8);

  const boxW = (PAGE_W - 2 * MARGIN - 8) / 3;
  const boxH = 24;
  let boxY = y;
  boxY = addMetricBox(
    doc,
    "Investment Required",
    $(r.bhTotalInvestment),
    MARGIN,
    boxY,
    boxW,
    boxH,
    "Total cash needed to acquire and hold the property"
  );
  boxY = addMetricBox(
    doc,
    "Buy & Hold Cash-on-Cash ROI",
    pct(r.bhCashOnCash),
    MARGIN + boxW + 4,
    y,
    boxW,
    boxH,
    "Your annual return as a % of money invested"
  );
  addMetricBox(
    doc,
    "Projected Annual NOI",
    $(r.noi),
    MARGIN + 2 * (boxW + 4),
    y,
    boxW,
    boxH,
    "Rental income minus operating expenses (before mortgage)"
  );
  y = boxY + 4;

  // Footer on cover
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 1 of 4`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  // ─── PAGE 2: PURCHASE & FLIP ───────────────────────────────────────────
  doc.addPage();
  y = MARGIN;
  y = addSectionHeading(doc, "Purchase & Flip — Cost Stack", y);
  addLogoToCorner(doc, logoData, PAGE_W, MARGIN, LOGO_CORNER_SIZE, MARGIN + 4);
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(100, 100, 100);
  doc.text("What you pay to acquire, rehab, and hold the property before selling.", MARGIN, y);
  y += 10;

  const totalCosts =
    r.offerPrice + inp.wholesaleFee + r.rehabCost + r.mortgage1Pts + r.upfront +
    r.closing + r.holdingCosts + r.mortgage2Pts;

  const flipCosts = [
    ["Contract Price (to seller)", $(r.offerPrice)],
    ["Wholesale Fee", $(inp.wholesaleFee)],
    ["Rehab Cost", $(r.rehabCost)],
    ["1st Mortgage Upfront Points", $(r.mortgage1Pts)],
    ["Upfront (Inspection, LLC, Appraisal)", $(r.upfront)],
    ["Closing Costs (Title, Settlement, Fees, etc.)", $(r.closing)],
    ["Holding Costs (Tax during rehab)", $(r.holdingCosts)],
    ["2nd Mortgage Points", $(r.mortgage2Pts)],
  ];

  for (const [label, val] of flipCosts) {
    y = addRow(doc, label, val, MARGIN, y);
  }
  doc.setFont(FONT_SANS, "bold");
  y = addRow(doc, "Total Cost", $(totalCosts), MARGIN, y + 2, 0, true);
  y += 2;
  doc.setFont(FONT_SANS, "normal");
  y = addRow(doc, "Less: 2nd Mortgage", r.mortgage2Amt > 0 ? `(${$(r.mortgage2Amt)})` : $(0), MARGIN, y);
  y = addRow(doc, "Less: 1st Mortgage", r.mortgage1Amt > 0 ? `(${$(r.mortgage1Amt)})` : $(0), MARGIN, y);
  doc.setFont(FONT_SANS, "bold");
  y = addRow(doc, "TOTAL INVESTMENT", $(r.totalInvestment), MARGIN, y + 2, 0, true);
  y += 16;

  y = addSectionHeading(doc, "Purchase & Flip — Profit Waterfall", y);
  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(100, 100, 100);
  doc.text("How sale proceeds are split between costs, preferred return, and profit.", MARGIN, y);
  y += 10;

  const flipProfit = [
    ["ARV / Target Sale Price", $(r.arv), false],
    ["Less: Realtor/Sales Fee", `(${$(r.realtorFee)})`, false],
    ...(r.mortgage1Amt > 0 ? [["Less: 1st Mortgage Payoff", `(${$(r.mortgage1Amt)})`, false]] : []),
    ...(r.mortgage2Amt > 0 ? [["Less: 2nd Mortgage Payoff", `(${$(r.mortgage2Amt)})`, false]] : []),
    ["Net Proceeds", $(r.netProceedsAfterPayoffs), false],
    ["Less: Total Investment", `(${$(r.totalInvestment)})`, false],
    ["Gross Profit", $(r.grossProfit), true],
    ["Less: Preferred ROI to Investor", `(${$(r.preferredROI)})`, false],
    ...(r.initialReferralDeduct > 0 ? [["Less: Initial Referral", `(${$(r.initialReferralDeduct)})`, false]] : []),
    ["Profit to Split", $(r.profitToSplit), false],
    [`Investor Share (${100 - inp.profitSplitPct}%)`, $(r.investorSplit), true],
    ...(r.investorSplitReferral > 0 ? [["Less: Investor Referral", `(${$(r.investorSplitReferral)})`, false]] : []),
    [`BNIC Share (${inp.profitSplitPct}%)`, $(r.bnicSplit), false],
    ["+ Preferred ROI to Investor", $(r.preferredROI), true],
  ];

  for (const [label, val, highlight] of flipProfit) {
    y = addRow(doc, label, val, MARGIN, y, 0, highlight);
  }
  doc.setFont(FONT_SANS, "bold");
  y = addRow(doc, "TOTAL INVESTOR PROFIT", $(r.totalInvestorROI), MARGIN, y + 2, 0, true);
  y += 4;
  doc.setFont(FONT_SANS, "normal");
  y = addRow(doc, "Flip Cash-on-Cash ROI", pct(r.cashOnCash), MARGIN, y);
  y = addRow(doc, "Min Sales Price (to break even)", $(r.minSalesPrice), MARGIN, y);
  y += 8;

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 2 of 4`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  // ─── PAGE 3: BUY & HOLD + 30-YEAR PROJECTION ────────────────────────────
  doc.addPage();
  y = MARGIN;
  y = addSectionHeading(doc, "Buy & Hold — Annual P&L & Investment Summary", y);
  addLogoToCorner(doc, logoData, PAGE_W, MARGIN, LOGO_CORNER_SIZE, MARGIN + 4);

  const bhInfo = [
    ["Annual Gross Rent", $(r.annualGrossRent), false],
    ["Less: Insurance", `(${$(r.bhAnnualIns)})`, false],
    ["Less: Property Tax", `(${$(r.bhAnnualTax)})`, false],
    ["Less: Property Management Fee", `(${$(r.bhAnnualPmFee)})`, false],
    ["Less: Business Costs", `(${$(r.bhBusinessCosts)})`, false],
    ["Net Operating Income (NOI)", $(r.noi), true],
    ...(r.bhAnnualMtg1 > 0 ? [["Less: 1st Mortgage (annual)", `(${$(r.bhAnnualMtg1)})`, false]] : []),
    ...(r.bhAnnualMtg2 > 0 ? [["Less: 2nd Mortgage (annual)", `(${$(r.bhAnnualMtg2)})`, false]] : []),
    ["Cash Flow After Debt", $(r.bhCashFlowAfterDebt), false],
    ["Cap Rate", pct(r.capRate), true],
    ["Total B&H Investment", $(r.bhTotalInvestment), false],
    ["Year-1 Cash-on-Cash", pct(r.bhCashOnCash), true],
    ["ARV (Sell to Retail Investor)", $(r.arv), false],
    ["Equity Created", $(r.arv - r.bhTotalInvestment), false],
  ];

  for (const [label, val, highlight] of bhInfo) {
    y = addRow(doc, label, val, MARGIN, y, 0, highlight);
  }
  y += 14;

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 3 of 4`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  // ─── PAGE 4: 30-YEAR PROJECTION (landscape, separate page) ────────────────
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
  addLogoToCorner(doc, logoData, LAND_W, LAND_MARGIN, LOGO_CORNER_SIZE, LAND_MARGIN + 4);
  y += 10;

  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Initial investment: ${$(r.bhTotalInvestment)}. Rent and value grow over time.`, LAND_MARGIN, y);
  y += 6;

  // Table - sized to fit 30 rows + header + totals on one page
  // Usable height: ~186mm. 32 rows at 5mm = 160mm.
  const rowH = 5;
  const colW = [8, 24, 22, 20, 24, 20, 18, 14, 14, 26];
  const headers = ["Yr", "Rental Income", "Prop Costs", "Mtg Pmt", "Net Cash", "Depr", "Reserves", "ROI", "ROE", "Prop Value"];

  // Header row - no fill, bold black text for readability
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

  // Totals row - light fill so values remain readable
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
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 4 of 4`, LAND_W / 2, LAND_H - 8, { align: "center" });

  // Save
  const filename = `Deal_Summary_${(formatAddress(inp) || "Property").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.pdf`;
  doc.save(filename);
}

/** Format whole dollars with commas (e.g. 125000 → "$125,000") */
function formatWholeDollars(v) {
  if (v == null || isNaN(v)) return "—";
  const s = Math.round(v).toLocaleString("en-US");
  return `$${s}`;
}

/**
 * Generate and download the Retail Investor PDF (3 pages).
 * Cover: Property info (no notes), title with Sales Price, retail metrics.
 * Page 2: Buy & Hold P&L with retail Cap Rate, Total Retail Investment, Retail Year-1 Cash-on-Cash; no ARV/Equity lines.
 * Page 3: 30-year projection with retail ROI; Initial Investment = Sell to Retail Investor amount.
 */
export async function generateRetailInvestorPDF(inp, r, formatAddress) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  const logoUrl = `${window.location.origin}/logo.png`;
  const logoData = await imageToBase64(logoUrl, "png");

  // ─── COVER PAGE ─────────────────────────────────────────────────────────
  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    "The information presented is for illustrative purposes only and are not guaranteed projections.",
    PAGE_W / 2,
    y,
    { align: "center", maxWidth: PAGE_W - 2 * MARGIN }
  );
  y += 10;

  doc.setFontSize(TITLE_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(180, 100, 40);
  doc.text("Retail Investor Property Summary", PAGE_W / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(BODY_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("The BNIC Network LLC · REDMS Deal Analyzer", PAGE_W / 2, y, { align: "center" });
  y += 10;

  const ROW_H = 55;
  const GAP = 8;
  const usableW = PAGE_W - 2 * MARGIN;
  const logoW = ROW_H;
  const propImgW = usableW - logoW - GAP;

  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", MARGIN, y, logoW, ROW_H);
    } catch {
      doc.setFillColor(230, 230, 230);
      doc.rect(MARGIN, y, logoW, ROW_H, "F");
    }
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(MARGIN, y, logoW, ROW_H, "F");
  }

  const imgUrl = inp?.image || inp?.imageFallback || "";
  const imgLoaded = await imageToBase64WithSize(imgUrl);
  const propX = MARGIN + logoW + GAP;

  if (imgLoaded?.data) {
    try {
      const { data, width, height } = imgLoaded;
      const aspect = width / height;
      let outW = propImgW;
      let outH = ROW_H;
      if (aspect > propImgW / ROW_H) {
        outW = propImgW;
        outH = propImgW / aspect;
      } else {
        outH = ROW_H;
        outW = ROW_H * aspect;
      }
      const imgX = propX + (propImgW - outW) / 2;
      const imgY = y + (ROW_H - outH) / 2;
      doc.addImage(data, "JPEG", imgX, imgY, outW, outH);
    } catch {
      doc.setFillColor(230, 230, 230);
      doc.rect(propX, y, propImgW, ROW_H, "F");
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(150, 150, 150);
      doc.text("Property Photo", propX + propImgW / 2, y + ROW_H / 2 - 2, { align: "center" });
    }
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(propX, y, propImgW, ROW_H, "F");
    doc.setFontSize(SMALL_SIZE);
    doc.setTextColor(150, 150, 150);
    doc.text("Property Photo (add via Find Properties)", propX + propImgW / 2, y + ROW_H / 2 - 2, { align: "center" });
  }
  y += ROW_H + 10;

  // Property Info Section — title: "Property Information: Sales Price: $X,XXX" (no notes)
  const salesPriceStr = formatWholeDollars(r.arv);
  y = addSectionHeading(doc, `Property Information: Sales Price: ${salesPriceStr}`, y);

  const address = formatAddress(inp);
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont(FONT_SANS, "bold");
  doc.text("Address", MARGIN, y);
  doc.setFont(FONT_SANS, "normal");
  doc.text(address || "—", MARGIN, y + 5, { maxWidth: usableW });
  y += 10;

  const propInfo = [
    ["Beds", inp.bedrooms ?? "—"],
    ["Baths", inp.bathrooms ?? "—"],
    ["Sq Ft", inp.sqft != null ? Number(inp.sqft).toLocaleString() : "—"],
    ["Year", inp.yearBuilt ?? "—"],
    ["Lot Size", fmtNum(inp.lotSize)],
    ["Stories", inp.stories ?? "—"],
    ["Basement", inp.basement ?? "—"],
    ["Type", inp.use || "Single Family"],
    ["Rent/mo", $(inp.totalRent)],
    ["APN", inp.apn || "—"],
  ];
  y = addPropertyGrid(doc, propInfo, y);
  // No notes for retail printout
  y += 18;

  // Key metrics — Investment Required (retail), Buy & Hold Cash-on-Cash ROI (retail), Projected Annual NOI
  y = addSectionHeading(doc, "Key Investment Metrics", y, 8);

  const boxW = (PAGE_W - 2 * MARGIN - 8) / 3;
  const boxH = 24;
  let boxY = y;
  boxY = addMetricBox(
    doc,
    "Investment Required",
    $(r.retailTotalInvestment),
    MARGIN,
    boxY,
    boxW,
    boxH,
    "Total Retail Investment Amount"
  );
  boxY = addMetricBox(
    doc,
    "Buy & Hold Cash-on-Cash ROI",
    pct(r.retailCashOnCash),
    MARGIN + boxW + 4,
    y,
    boxW,
    boxH,
    "Retail Investor Year-1 Cash-on-Cash"
  );
  addMetricBox(
    doc,
    "Projected Annual NOI",
    $(r.noi),
    MARGIN + 2 * (boxW + 4),
    y,
    boxW,
    boxH,
    "Rental income minus operating expenses (before mortgage)"
  );
  y = boxY + 4;

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 1 of 3`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  // ─── PAGE 2: BUY & HOLD (retail version) ─────────────────────────────────
  doc.addPage();
  y = MARGIN;
  y = addSectionHeading(doc, "Buy & Hold — Annual P&L & Investment Summary", y);
  addLogoToCorner(doc, logoData, PAGE_W, MARGIN, LOGO_CORNER_SIZE, MARGIN + 4);

  const bhInfo = [
    ["Annual Gross Rent", $(r.annualGrossRent), false],
    ["Less: Insurance", `(${$(r.bhAnnualIns)})`, false],
    ["Less: Property Tax", `(${$(r.bhAnnualTax)})`, false],
    ["Less: Property Management Fee", `(${$(r.bhAnnualPmFee)})`, false],
    ["Less: Business Costs", `(${$(r.bhBusinessCosts)})`, false],
    ["Net Operating Income (NOI)", $(r.noi), true],
    ...(r.bhAnnualMtg1 > 0 ? [["Less: 1st Mortgage (annual)", `(${$(r.bhAnnualMtg1)})`, false]] : []),
    ...(r.bhAnnualMtg2 > 0 ? [["Less: 2nd Mortgage (annual)", `(${$(r.bhAnnualMtg2)})`, false]] : []),
    ["Cash Flow After Debt", $(r.bhCashFlowAfterDebt), false],
    ["Cap Rate", pct(r.capRateRetail, 2), true],
    ["Total Retail Investment", $(r.retailTotalInvestment), false],
    ["Year-1 Cash-on-Cash", pct(r.retailCashOnCash), true],
  ];

  for (const [label, val, highlight] of bhInfo) {
    y = addRow(doc, label, val, MARGIN, y, 0, highlight);
  }
  y += 14;

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 2 of 3`, PAGE_W / 2, PAGE_H - 10, { align: "center" });

  // ─── PAGE 3: 30-YEAR RETAIL PROJECTION ───────────────────────────────────
  doc.addPage("a4", "l");
  const LAND_W = 297;
  const LAND_H = 210;
  const LAND_MARGIN = 12;
  y = LAND_MARGIN;

  doc.setFontSize(HEADING_SIZE);
  doc.setFont(FONT_SANS, "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("30-Year Retail Investor Projection", LAND_MARGIN, y);
  doc.setDrawColor(200, 200, 200);
  doc.line(LAND_MARGIN, y + 2, LAND_W - LAND_MARGIN, y + 2);
  addLogoToCorner(doc, logoData, LAND_W, LAND_MARGIN, LOGO_CORNER_SIZE, LAND_MARGIN + 4);
  y += 10;

  doc.setFontSize(SMALL_SIZE);
  doc.setFont(FONT_SANS, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Initial investment: ${$(r.arv)}. Rent and value grow over time.`, LAND_MARGIN, y);
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
  const retailInv = r.retailTotalInvestment;
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
    const retailRoi = retailInv > 0 ? p.netCash / retailInv : 0;
    x = LAND_MARGIN;
    const cells = [
      String(p.yr),
      $(p.rentalIncome),
      `(${$(p.propCosts)})`,
      `(${$(p.mortgagePayment)})`,
      $(p.netCash),
      $(p.depr),
      `(${$(Math.abs(p.reserves_yr))})`,
      pct(retailRoi),
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
    pct(retailInv > 0 ? gt.netCash / retailInv : 0),
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
  doc.text(`Total Return: ${retailInv > 0 ? ((gt.netCash / retailInv) * 100).toFixed(0) : 0}%`, LAND_MARGIN + 70, y);
  doc.text(`Final Property Value: ${$(r.projections[29]?.propValue)}`, LAND_MARGIN + 140, y);

  doc.setFontSize(SMALL_SIZE);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Page 3 of 3`, LAND_W / 2, LAND_H - 8, { align: "center" });

  const filename = `Retail_Investor_${(formatAddress(inp) || "Property").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.pdf`;
  doc.save(filename);
}
