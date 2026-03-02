# REDMS Deal Analyzer

**Real Estate Deal Management System** for The BNIC Network LLC. Web app for analyzing purchase-and-flip and buy-and-hold deals, with 30-year projections and CPIN / LP offering summary.

## Features

- **Deal analysis** — Enter property details, offer price, rehab level/cost, and financing to get a DEAL / NO DEAL badge and pass-fail checks (e.g. Flip Cash-on-Cash ≥ 25%, Investment Required within limit).
- **Metric cards** — NOI, Investor Flip Profit, Sell to Retail Investor (ARV), Investor Cap Rate, Rent-to-Price Ratio, Flip Cash-on-Cash, B&H Cash-on-Cash, Investment Required, Cap Rate. Cards turn red when thresholds are missed.
- **Purchase & Flip** — Flip sheet breakdown (ARV, fees, preferred ROI, profit split, investor/BNIC share, min sales price).
- **Buy & Hold** — B&H sheet (total investment, NOI, cap rate, cash-on-cash, investment required).
- **30-Year Buy & Hold Projection** — Year-by-year table: Rental Income, Prop Costs, Net Cash, Depreciation, Reserves, Net Cash/Tax, ROI, ROE, Prop Value; plus totals and summary stats.
- **CPIN / LP Offering** — LP offering summary (targeted ROI, minimum investment, distribution frequency, structure, exemption, KYC/AML, property details).
- **Persistence** — Inputs are saved to `localStorage` and restored on reload.

## Tech Stack

- **React 18** + **Vite 5**
- **Vitest** + **jsdom** for tests

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
# or one-off
npm run test:run
```

## Project Structure

- `src/REDMS.jsx` — Main app (sidebar inputs, deal logic strip, metric cards, tabbed views).
- `src/REDMS.css` — Styles.
- `src/logic/` — Deal math and helpers:
  - `redmsCalc.js` — Core `calc()`, DEFAULT_INPUT.
  - `constants.js` — MAX_TPC, REHAB_COST, REHAB_TIME, REHAB_LEVELS, RANGES.
  - `formatters.js` — formatCurrency, formatPct.
  - `validation.js` — sanitizeInput, clampNumber.
  - `storage.js` — loadStoredInput, saveStoredInput.
- `src/components/` — Field, DetailRow, MetricCard.

## Property Data Sources

**Search & listings** — RentCast API (`VITE_RENTCAST_API_KEY`) for sale listings.

**Property details** (tax, APN, owner, legal description) — When "Fetch tax & owner" is checked:

- **Detroit, MI only** — Uses [Detroit Open Data](https://detroitdata.org/dataset/parcels) ArcGIS parcels API. **Free, no API key.** Other areas are not supported.

**Other sources:**

- **ATTOM** — [30-day free trial](https://api.developer.attomdata.com/signup), then paid. 150M+ property records.
- **Data.gov** — Free county/state assessor datasets; no unified address API. Detroit integration above uses the same open-data ecosystem.

## License

Private — The BNIC Network LLC.
