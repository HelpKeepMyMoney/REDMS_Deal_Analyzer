# REDMS Deal Analyzer

**Real Estate Deal Management System** for The BNIC Network LLC. Web app for analyzing purchase-and-flip and buy-and-hold deals, with 30-year projections and CPIN / LP offering summary.

## Features

- **Auth & module selection** — Sign in/sign up; after signup, users are redirected to the Profile page with a banner to complete their profile. After login, users see a module picker with only the options they can access (Admin, Investor, Wholesaler).
- **Deal analysis** — Enter property details, offer price, rehab level/cost, and financing to get a DEAL / NO DEAL badge and pass-fail checks (e.g. Flip Cash-on-Cash ≥ 25%, Investment Required within limit).
- **Metric cards** — NOI, Investor Flip Profit, Sell to Retail Investor (ARV), Investor Cap Rate, Rent-to-Price Ratio, Flip Cash-on-Cash, B&H Cash-on-Cash, Investment Required, Cap Rate. Cards turn red when thresholds are missed.
- **Purchase & Flip** — Flip sheet breakdown (ARV, fees, preferred ROI, profit split, investor/BNIC share, min sales price). Initial Referral and Investor Referral are configurable as percentages of Preferred ROI; rows are hidden when set to 0.
- **Buy & Hold** — B&H sheet (total investment, NOI, cap rate, cash-on-cash, investment required).
- **30-Year Buy & Hold Projection** — Year-by-year table: Rental Income, Prop Costs, Net Cash, Depreciation, Reserves, Net Cash/Tax, ROI, ROE, Prop Value; plus totals and summary stats.
- **CPIN / LP Offering** — LP offering summary (targeted ROI, minimum investment, distribution frequency, structure, exemption, KYC/AML, property details).
- **Firestore persistence** — Deals saved to Firestore; admins can create, edit, and share deals with users.
- **Find Properties** — Property search (RentCast API) with saved searches; admins can share searches with users.
- **Non-admin features** — My Favorites (browse, select, remove favorited deals); Express Interest (Save to Favorite, Request Zoom meeting, Start Buying — deal status and address shown next to Start Buying button; status colors: Available=green, Reserved=yellow, Under Contract=red, Sold=white); new-deals notification (deals shared since last login, dismissible). Selecting a deal from the sidebar (dropdown, My Favorites, or new shared deals) while on Find Properties switches the main view to the deal analyzer.
- **Admin** — User management (search by email, role, date created; create users; delete users; view deals, searches, and profile info when viewing a user), deal sharing (search by address or owner email; filter updates as you type), search sharing, interest requests, app parameters, Property Management (include/exclude properties for investors; Analyze Deal opens deal analyzer in new tab), **Deal Management** (deal cards with status, filters, sort, user assignment; view which deals a user can access), email notifications. Sticky Deal section in sidebar (dropdown + Find Properties button) stays visible when scrolling. Header sign-out and module switcher.
- **Wholesaler module** — Wholesaler-specific deal analyzer with risk overrides, proforma/report PDF export. Header dropdown to switch between Wholesaler and Investor modules. Proforma disclaimer shown on the web UI when a deal is selected; both Export Proforma and Wholesaler Report PDFs include the same disclaimer. Deal badge (✓ DEAL / ✗ NO DEAL) requires investor checks to pass and wholesale fee ≥ Min Wholesale Fee.
- **Profile page** — Contact information (first name, last name, phone number) stored in Firestore; subscription management with usage display (progress bar for free tier); upgrade options shown based on current tier (Investor/Pro can upgrade to higher tiers); tier tooltips with deals-per-month and overage cost; cancel subscription (keeps access until end of billing period, then downgrades to free); delete account (immediate access revocation); email and password update forms. Banner prompts users to complete profile when any contact field is empty.
- **Demo access** — Unauthenticated users can try the platform at `/demo`. Features: read-only access to the demo deal (17917 Mackay St, Detroit, MI 48212); Find Properties with investor properties (addresses blurred except for Mackay); View Deal and report downloads only for Mackay; Express Interest replaced with "Create account to analyze your own deals" CTA; full analyzer tabs (Purchase & Flip, Buy & Hold, 30-Yr Projection, Retail Investor, CPIN) with no tier blur; client-style disclaimer. "Try Demo" and "Free Demo" buttons on Home page (header, footer, hero, pricing, final CTA).

## Deal Management (Admin)

**Admin → Deal Management** provides a card-based view of all deals with:

- **Deal cards** — Mimic property search cards; show offer price, beds/baths/sqft, address, status badge, Deal/No Deal badge, metrics (Rehab Level, Est. Rent, Annual NOI, B&H Cash-on-Cash ROI, Investment Required, Loan Amount), Notes, and Updated date. Each card links to the deal screen (`/investor?dealId=...`).
- **Status & assignment** — Change deal status (Available, Reserved, Under Contract, Sold). When Reserved, Under Contract, or Sold, assign a user from the dropdown.
- **Filters** — Address/name, status, city, state, zip, min/max price, min beds/baths/sqft, assigned to, viewable by user.
- **Sort** — Name (A–Z, Z–A), Price (low/high), Investment Required (low/high), B&H Cash-on-Cash ROI (low/high), Updated (newest/oldest).
- **Viewable by user** — Filter to show only deals a specific user can view (owns, shared with, or shared with all).

In **Admin → Users**, when you click View on a user, the panel shows the user's profile (first name, last name, phone), all deals that user can access (owned, shared, or shared with all), with links to open each deal and badges for Owner / Shared / Shared with all.

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

- `src/App.jsx` — Routes, protected routes (Admin, Wholesaler, Investor), public `/demo` route.
- `src/pages/Landing.jsx` — Login/signup and module selection for logged-in users.
- `src/pages/Admin.jsx` — Admin dashboard (users, params, sharing, interest).
- `src/pages/Wholesaler.jsx` — Wholesaler deal analyzer.
- `src/REDMS.jsx` — Investor deal analyzer (sidebar inputs, deal logic strip, metric cards, tabbed views).
- `src/REDMS.module.css` — Styles.
- `src/pages/Profile.jsx` — Profile page (contact info, subscription, email, password).
- `src/pages/Demo.jsx` — Demo page (unauthenticated; loads Mackay deal via API, full analyzer UI).
- `src/logic/userProfileStorage.js` — User profile (firstName, lastName, phoneNumber) in Firestore `users/{userId}`.
- `src/logic/` — Deal math and helpers:
  - `redmsCalc.js` — Core `calc()`, DEFAULT_INPUT.
  - `constants.js` — MAX_TPC, REHAB_COST, REHAB_TIME, REHAB_LEVELS, RANGES, INITIAL_REFERRAL_PCT, INVESTOR_REFERRAL_PCT.
  - `formatters.js` — formatCurrency, formatPct.
  - `validation.js` — sanitizeInput, clampNumber.
  - `storage.js` — loadStoredInput, saveStoredInput; loadImportProperty, saveImportProperty (for property import across tabs).
  - `firestoreStorage.js` — deals (load, save, share).
  - `wholesalerDealStorage.js` — wholesaler deals (load, save) with risk overrides.
  - `userFavoritesStorage.js` — user favorites.
  - `userMetadataStorage.js` — last login (via API).
  - `interestApi.js` — interest requests (favorite, Zoom, buy).
- `src/components/` — Field, DetailRow, MetricCard, DealSidebar, DealInterestActions, PropertySearch, DealCard, AdminDropdown, WholesalerModuleDropdown.
- `api/` — Vercel serverless functions (10 total to stay under Hobby 12 limit). Consolidated: `api/admin-handler.js` (list-users, create-user, delete-user, set-role, set-user-config, account delete); `api/subscription-handler.js` (status, cancel, complete). Other: demo, user-metadata, auth/signup-notification, cron/subscription-cancel-period-end, interest/create, subscription/create, charge-overage, webhook. Rewrites in `vercel.json` route legacy URLs to consolidated handlers.
- `lib/` — Shared API utilities (firebase-admin, requireAuth, requireAdmin, resend, paypal, paypal-cancel). `paypal-cancel.js` provides subscription cancel and getCycleFromPlanId via REST API (no SDK) for admin-handler, webhook, and cron; avoids `@paypal/paypal-server-sdk` ESM issues in Vercel serverless.

## Property Data Sources

**Search & listings** — RentCast API (`VITE_RENTCAST_API_KEY`) for sale listings.

**Property details** (tax, APN, owner, legal description) — When "Fetch tax & owner" is checked:

- **Detroit, MI only** — Uses [Detroit Open Data](https://detroitdata.org/dataset/parcels) ArcGIS parcels API. **Free, no API key.** Other areas are not supported.

**Other sources:**

- **ATTOM** — [30-day free trial](https://api.developer.attomdata.com/signup), then paid. 150M+ property records.
- **Data.gov** — Free county/state assessor datasets; no unified address API. Detroit integration above uses the same open-data ecosystem.

## Deployment (Firebase + Vercel)

Admin features (user management, interest API, user metadata, subscriptions) use **Vercel serverless functions** instead of Firebase Cloud Functions (no Blaze plan required). Shared utilities live in `lib/` (not under `api/`) to stay under Vercel Hobby's 12-function limit.

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
- **Cron** (for subscription period-end cancellations):
  - `CRON_SECRET` — Random secret; Vercel sends it as Bearer token when invoking cron. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **PayPal** (for `/api/subscription/*` — create, webhook, charge-overage, status):
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` — from [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox)
  - `PAYPAL_MODE` — `sandbox` or `live`
  - `PAYPAL_WEBHOOK_ID` — from PayPal Developer Dashboard → Webhooks (after creating webhook with URL `https://your-domain/api/subscription/webhook`)
  - `PAYPAL_PLAN_INVESTOR_MONTHLY`, `PAYPAL_PLAN_INVESTOR_ANNUAL`, `PAYPAL_PLAN_PRO_MONTHLY`, `PAYPAL_PLAN_PRO_ANNUAL`, `PAYPAL_PLAN_WHOLESALER_MONTHLY`, `PAYPAL_PLAN_WHOLESALER_ANNUAL` — Plan IDs from PayPal

**Firebase Auth:** Add your Vercel domain (e.g. `redms-deal-analyzer.vercel.app`) to [Authorized domains](https://console.firebase.google.com/project/_/authentication/settings).

**Firestore rules:** Deploy with `firebase deploy --only firestore:rules`. The `users` collection stores profile contact info (firstName, lastName, phoneNumber); users can read/write only their own document.

**Demo setup (optional):** Create a deal for 17917 Mackay St, Detroit, MI 48212 in Firestore, set `sharedWithAll: true`, and optionally set `DEMO_DEAL_ID` in Vercel env. If no deal exists, the demo API returns fallback sample data.

**Static assets:** Images live in `public/assets/` so Vercel rewrites (which exclude `assets/`) serve them correctly. Logo remains at `public/logo.png`.

**Local dev with admin:** Run `vercel dev` (not `npm run dev`) so the API routes are available. The new-deals notification (Investor) persists dismissal via localStorage when the API is unavailable, so it won't reappear after the user dismisses it even when using `npm run dev`.

## Recent Changes

- **Firebase app config** — Load app config from Firestore only when user is authenticated; avoids "Missing or insufficient permissions" when auth state is not yet ready.
- **PayPal SDK / admin 500 fix** — Added `lib/paypal-cancel.js` (REST API only, no SDK) for subscription cancel and getCycleFromPlanId. Admin-handler, subscription webhook, and cron now use it instead of `paypal.js`, avoiding `@paypal/paypal-server-sdk` ESM export errors in Vercel serverless. Fixes 500 on `/api/admin/list-users`.
- **Home page header** — Sign In and Try Demo links updated to button style matching Create Free Account (white background, blue text, rounded corners). Button text centered using flexbox.
- **Pricing section** — Client tier: price changed from "Custom" to "Included"; CTA link updated to `#client-fee-structure`.
- **Demo page** — Added Home button to header (desktop, mobile header, and mobile drawer) for quick navigation back to the landing page.
- **Landing page** — Feature copy updated: "Search analyzed prospective Detroit deals to find the best that suit you."

## License

Private — The BNIC Network LLC.
