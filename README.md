# REDMS Deal Analyzer

**Real Estate Deal Management System** for The BNIC Network LLC. Web app for analyzing purchase-and-flip and buy-and-hold deals, with 30-year projections and CPIN / LP offering summary.

## Features

- **Auth & module selection** — Sign in/sign up; after login, users see a module picker with only the options they can access (Admin, Investor, Wholesaler).
- **Deal analysis** — Enter property details, offer price, rehab level/cost, and financing to get a DEAL / NO DEAL badge and pass-fail checks (e.g. Flip Cash-on-Cash ≥ 25%, Investment Required within limit).
- **Metric cards** — NOI, Investor Flip Profit, Sell to Retail Investor (ARV), Investor Cap Rate, Rent-to-Price Ratio, Flip Cash-on-Cash, B&H Cash-on-Cash, Investment Required, Cap Rate. Cards turn red when thresholds are missed.
- **Purchase & Flip** — Flip sheet breakdown (ARV, fees, preferred ROI, profit split, investor/BNIC share, min sales price). Initial Referral and Investor Referral are configurable as percentages of Preferred ROI; rows are hidden when set to 0.
- **Buy & Hold** — B&H sheet (total investment, NOI, cap rate, cash-on-cash, investment required).
- **30-Year Buy & Hold Projection** — Year-by-year table: Rental Income, Prop Costs, Net Cash, Depreciation, Reserves, Net Cash/Tax, ROI, ROE, Prop Value; plus totals and summary stats.
- **CPIN / LP Offering** — LP offering summary (targeted ROI, minimum investment, distribution frequency, structure, exemption, KYC/AML, property details).
- **Firestore persistence** — Deals saved to Firestore; admins can create, edit, and share deals with users.
- **Find Properties** — Property search (RentCast API) with saved searches; admins can share searches with users.
- **Non-admin features** — My Favorites (browse, select, remove favorited deals); Express Interest (Save to Favorite, Request Zoom meeting, Start Buying); new-deals notification (deals shared since last login, dismissible).
- **Admin** — User management (search by email, role, date created; view deals and searches assigned to each user), deal sharing, search sharing, interest requests, app parameters, email notifications. Header sign-out and module switcher.
- **Wholesaler module** — Wholesaler-specific deal analyzer with risk overrides, proforma/report PDF export. Header dropdown to switch between Wholesaler and Investor modules.

## App Parameters (Admin)

Admins can override equation parameters in **Admin → App Parameters**:

- **Max Total Project Cost**, **Min 1st Mortgage Loan Amount**, **Min Acquisition Mgmt Fee**, **Min Realtor/Sale Fee**, **Mortgage Points Rate**
- **Initial Referral** — % of Preferred ROI (default 11.11 ≈ 1/9); hidden in Profit Waterfall when 0
- **Investor Referral** — % of Preferred ROI (default 11.11 ≈ 1/9); hidden in Profit Waterfall when 0

Values are stored in Firestore (`appConfig/params`) and apply to all deal calculations.

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

- `src/App.jsx` — Routes, protected routes (Admin, Wholesaler, Investor).
- `src/pages/Landing.jsx` — Login/signup and module selection for logged-in users.
- `src/pages/Admin.jsx` — Admin dashboard (users, params, sharing, interest).
- `src/pages/Wholesaler.jsx` — Wholesaler deal analyzer.
- `src/REDMS.jsx` — Investor deal analyzer (sidebar inputs, deal logic strip, metric cards, tabbed views).
- `src/REDMS.module.css` — Styles.
- `src/logic/` — Deal math and helpers:
  - `redmsCalc.js` — Core `calc()`, DEFAULT_INPUT.
  - `constants.js` — MAX_TPC, REHAB_COST, REHAB_TIME, REHAB_LEVELS, RANGES, INITIAL_REFERRAL_PCT, INVESTOR_REFERRAL_PCT.
  - `formatters.js` — formatCurrency, formatPct.
  - `validation.js` — sanitizeInput, clampNumber.
  - `storage.js` — loadStoredInput, saveStoredInput.
  - `firestoreStorage.js` — deals (load, save, share).
  - `wholesalerDealStorage.js` — wholesaler deals (load, save) with risk overrides.
  - `userFavoritesStorage.js` — user favorites.
  - `userMetadataStorage.js` — last login (via API).
  - `interestApi.js` — interest requests (favorite, Zoom, buy).
- `src/components/` — Field, DetailRow, MetricCard, DealSidebar, DealInterestActions, PropertySearch, AdminDropdown, WholesalerModuleDropdown.
- `api/` — Vercel serverless functions.

## Property Data Sources

**Search & listings** — RentCast API (`VITE_RENTCAST_API_KEY`) for sale listings.

**Property details** (tax, APN, owner, legal description) — When "Fetch tax & owner" is checked:

- **Detroit, MI only** — Uses [Detroit Open Data](https://detroitdata.org/dataset/parcels) ArcGIS parcels API. **Free, no API key.** Other areas are not supported.

**Other sources:**

- **ATTOM** — [30-day free trial](https://api.developer.attomdata.com/signup), then paid. 150M+ property records.
- **Data.gov** — Free county/state assessor datasets; no unified address API. Detroit integration above uses the same open-data ecosystem.

## Deployment (Firebase + Vercel)

Admin features (user management, interest API, user metadata) use **Vercel serverless functions** instead of Firebase Cloud Functions (no Blaze plan required).

**Vercel environment variables:**
- All `VITE_*` vars for the frontend
- **Firebase Admin** (for `/api/admin/*`, `/api/interest/*`, `/api/user-metadata/*` routes):
  - `FIREBASE_PROJECT_ID` — same as `VITE_FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL` — from your [Firebase service account JSON](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk)
  - `FIREBASE_PRIVATE_KEY` — from the same JSON (paste the full key including `-----BEGIN PRIVATE KEY-----`; use literal `\n` for newlines in Vercel)
- **Resend** (for interest and signup notification emails — used by `api/interest/create.js` and `api/auth/signup-notification.js`):
  - `RESEND_API_KEY` — Sign up at [resend.com](https://resend.com) (3,000 emails/month free)
  - `RESEND_FROM_EMAIL` — Verified sender domain
- **Admin notifications** — `ADMIN_NOTIFICATION_EMAIL` — Email address for interest notifications (favorites, Zoom requests, etc.) and new user signups

**Firebase Auth:** Add your Vercel domain (e.g. `redms-deal-analyzer.vercel.app`) to [Authorized domains](https://console.firebase.google.com/project/_/authentication/settings).

**Local dev with admin:** Run `vercel dev` (not `npm run dev`) so the API routes are available. The new-deals notification (Investor) persists dismissal via localStorage when the API is unavailable, so it won't reappear after the user dismisses it even when using `npm run dev`.

## License

Private — The BNIC Network LLC.
