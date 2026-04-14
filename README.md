# REDMS Deal Analyzer

**Real Estate Deal Management System** for The BNIC Network LLC. Web app for analyzing purchase-and-flip and buy-and-hold deals, with 30-year projections and CPIN / LP offering summary.

## Features

- **Auth & module selection** — Sign in/sign up; after signup, users are redirected to the Profile page with a banner to complete their profile. After login, users see a module picker with only the options they can access (Admin, Investor, Wholesaler).
- **Deal analysis** — Enter property details, offer price, rehab level/cost, and financing to get a DEAL / NO DEAL badge and pass-fail checks (e.g. Flip Cash-on-Cash ≥ 25%, Investment Required within limit). When **1st Mortgage** is **Yes**, **1st Mtg Upfront Points** is the greater of (loan × mortgage points rate) and **$2,995** (`MIN_FIRST_MTG_UPFRONT_POINTS` in code).
- **Metric cards** — NOI, Investor Flip Profit, Sell to Retail Investor (ARV), Investor Cap Rate, Rent-to-Price Ratio, Flip Cash-on-Cash, B&H Cash-on-Cash, Investment Required, Cap Rate. Cards turn red when thresholds are missed.
- **Purchase & Flip** — Flip sheet breakdown (ARV, fees, preferred ROI, profit split, investor/BNIC share, min sales price). Initial Referral and Investor Referral are configurable as percentages of Preferred ROI; rows are hidden when set to 0.
- **Buy & Hold** — B&H sheet (total investment, NOI, cap rate, cash-on-cash, investment required).
- **30-Year Buy & Hold Projection** — Year-by-year table: Rental Income, Prop Costs, Net Cash, Depreciation, Reserves, Net Cash/Tax, ROI, ROE, Prop Value; plus totals and summary stats.
- **CPIN / LP Offering** — LP offering summary (targeted ROI, minimum investment, distribution frequency, structure, exemption, KYC/AML, property details).
- **Firestore persistence** — Deals saved to Firestore; admins can create, edit, and share deals with users.
- **Find Properties** — Property search (RentCast API) with saved searches; admins can share searches with users. Admin view shows remaining free searches this month at top. RentCast API is called only when admin clicks Search (no pre-fetch or extra calls on Analyze Deal).
- **Non-admin features** — My Favorites (browse, select, remove favorited deals); Express Interest (Save to Favorite, Request Zoom meeting, Start Buying — deal status and address shown next to Start Buying button; status colors: Available=green, Reserved=yellow, Under Contract=red, Sold=white); new-deals notification (deals shared since last login, dismissible). Selecting a deal from the sidebar (dropdown, My Favorites, or new shared deals) while on Find Properties switches the main view to the deal analyzer. **Sidebar usage & upgrade** — Deals remaining this month (or lifetime for free tier) shown at top of sidebar; Upgrade button links to Profile Subscription section; Terms of Service and Privacy Policy links at bottom of sidebar.
- **Admin** — User management (search by email, role, date created; create users; delete users; view deals, searches, and profile info when viewing a user), deal sharing (search by address or owner email; filter updates as you type), search sharing, interest requests, app parameters, Property Management (include/exclude properties for investors; Analyze Deal opens deal analyzer in new tab), **Deal Management** (deal cards with status, filters, sort, user assignment; view which deals a user can access), email notifications. Sticky Deal section in sidebar (dropdown + Find Properties button) stays visible when scrolling. Header sign-out and module switcher.
- **Wholesaler module** — Wholesaler-specific deal analyzer with risk overrides, proforma/report PDF export. Header dropdown to switch between Wholesaler and Investor modules. Sidebar shows deals remaining this month and Upgrade button (same as Investor module). Proforma disclaimer shown on the web UI when a deal is selected; both Export Proforma and Wholesaler Report PDFs include the same disclaimer. Deal badge (✓ DEAL / ✗ NO DEAL) requires investor checks to pass and wholesale fee ≥ Min Wholesale Fee.
- **Profile page** — Contact information (first name, last name, phone number) stored in Firestore; subscription management with usage display (progress bar for free tier); upgrade options shown based on current tier (Investor/Pro can upgrade to higher tiers); tier tooltips with deals-per-month and overage cost; cancel subscription (keeps access until end of billing period, then downgrades to free); delete account (immediate access revocation); email and password update forms. Banner prompts users to complete profile when any contact field is empty. Anchor link `#subscription-heading` scrolls to Subscription section (used by sidebar Upgrade button).
- **Demo access** — Unauthenticated users can try the platform at `/demo`. Features: read-only access to the demo deal (17917 Mackay St, Detroit, MI 48212); Find Properties with investor properties (addresses blurred except for Mackay); View Deal and report downloads only for Mackay; Express Interest replaced with "Create account to analyze your own deals" CTA; full analyzer tabs (Purchase & Flip, Buy & Hold, 30-Yr Projection, Retail Investor, CPIN) with no tier blur; client-style disclaimer. "Try Demo" and "Free Demo" buttons on Home page (header, footer, hero, pricing, final CTA). Demo uses fallback data when API is unavailable (e.g. `npm run dev` without `vercel dev`).

## Deal Management (Admin)

**Admin → Deal Management** provides a card-based view of all deals with:

- **Deal cards** — Mimic property search cards; show offer price, beds/baths/sqft, address, status badge, Deal/No Deal badge, metrics (Rehab Level, Est. Rent, Annual NOI, B&H Cash-on-Cash ROI, Investment Required, Loan Amount), Notes, and Updated date. Each card links to the deal screen (`/investor?dealId=...`).
- **Status & assignment** — Change deal status (Available, Reserved, Under Contract, Sold). When Reserved, Under Contract, or Sold, assign a user from the dropdown.
- **Filters** — Address/name, status, city, state, zip, min/max price, min beds/baths/sqft, assigned to, viewable by user.
- **Sort** — Name (A–Z, Z–A), Price (low/high), Investment Required (low/high), B&H Cash-on-Cash ROI (low/high), Updated (newest/oldest).
- **Viewable by user** — Filter to show only deals a specific user can view (owns, shared with, or shared with all).

In **Admin → Users**, when you click View on a user, a **User Detail Modal** opens showing the user's profile (first name, last name, phone), last login, all deals that user can access (owned, shared, or shared with all) with links and badges (Owner / Shared / Shared with all), saved searches, favorites, and per-user client parameters (Max TPC, Min Loan Amount, Min Flip/B&H CoC, etc.). Admins can edit profile, change role, save client params, and unshare/unassign deals and searches from the modal.

## New Property Tax Calculation

When estimating **New Property Tax** (sidebar "Calculate" button or fallback when no value is provided), the app uses the Detroit non-homestead formula:

```
newPropertyTax = (offerPrice × 0.5 × 0.0852737) + 240
```

- **SEV** = 50% of purchase price (Michigan taxable value)
- **Tax rate** = 85.2737 mills (2024 non-homestead)
- **Flat fee** = $240 (trash service)

Constants: `DETROIT_TAX_SEV_RATIO`, `DETROIT_TAX_RATE`, `DETROIT_TAX_FLAT` in `src/logic/constants.js`. Overridable via App Parameters.

## App Parameters (Admin)

Admins can override equation parameters in **Admin → App Parameters**:

- **Max Total Project Cost**, **Min 1st Mortgage Loan Amount**, **Min Acquisition Mgmt Fee**, **Min Realtor/Sale Fee**, **Mortgage Points Rate** (upfront points still use `max(loan × rate, $2,995)` when 1st Mortgage is Yes; floor is `MIN_FIRST_MTG_UPFRONT_POINTS` in `src/logic/constants.js`, not editable in App Parameters)
- **Initial Referral** — % of Preferred ROI (default 11.11 ≈ 1/9); hidden in Profit Waterfall when 0
- **Investor Referral** — % of Preferred ROI (default 11.11 ≈ 1/9); hidden in Profit Waterfall when 0
- **Property searches used this month (RentCast sync)** — Manual sync from [RentCast API Dashboard](https://app.rentcast.io/app/api) when the app shows incorrect remaining count. Leave blank to use app tracking.

Values are stored in Firestore (`appConfig/params`) and apply to all deal calculations.

## Tech Stack

- **React 18** + **Vite 5**
- **react-helmet-async** — Document title, meta description, and canonical URLs on public routes
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

- `index.html` — Vite app shell for `/`. Marketing SEO lives here (description, robots, canonical, Open Graph, Twitter Card, **Google Search Console** `<meta name="google-site-verification" …>`). `__SEO_SITE_URL__` is replaced at build time; see `vite.config.js` `seo` plugin.
- `src/App.jsx` — Routes, protected routes (Admin, Wholesaler, Investor), public `/demo`, `/terms`, `/privacy` routes; `HelmetProvider` for per-route document titles and meta.
- `src/seo/constants.js` — `SITE_URL`, `SEO_TITLE`, `SEO_DESCRIPTION` for canonical URLs, JSON-LD, and `react-helmet-async`.
- `vite.config.js` — `seo` plugin replaces `__SEO_SITE_URL__` in `index.html` at build time and writes `dist/robots.txt` and `dist/sitemap.xml` from `VITE_SITE_URL` (default `https://redms-deal-analyzer.vercel.app`).
- `public/robots.txt`, `public/sitemap.xml` — Dev / fallback URLs; production build overwrites `robots.txt` and `sitemap.xml` in `dist/` with the configured site URL.
- `src/pages/Landing.jsx` — Login/signup and module selection for logged-in users.
- `src/pages/Admin.jsx` — Admin dashboard (users, params, sharing, interest).
- `src/pages/Wholesaler.jsx` — Wholesaler deal analyzer.
- `src/REDMS.jsx` — Investor deal analyzer (sidebar inputs, deal logic strip, metric cards, tabbed views).
- `src/REDMS.module.css` — Styles.
- `src/pages/Profile.jsx` — Profile page (contact info, subscription, email, password).
- `src/pages/Demo.jsx` — Demo page (unauthenticated; loads Mackay deal via API or fallback when API unavailable, full analyzer UI).
- `src/pages/Terms.jsx` — Terms of Service page (public).
- `src/pages/Privacy.jsx` — Privacy Policy page (public).
- `src/logic/userProfileStorage.js` — User profile (firstName, lastName, phoneNumber) in Firestore `users/{userId}`.
- `src/logic/propertySearchUsageStorage.js` — Property search usage tracking for RentCast API quota (monthly count in Firestore `appConfig/propertySearchUsage`).
- `src/logic/` — Deal math and helpers:
  - `redmsCalc.js` — Core `calc()`, DEFAULT_INPUT.
  - `constants.js` — MAX_TPC, REHAB_COST, REHAB_TIME, REHAB_LEVELS, RANGES, INITIAL_REFERRAL_PCT, INVESTOR_REFERRAL_PCT, MIN_FIRST_MTG_UPFRONT_POINTS (min $ for 1st mtg upfront points when 1st mortgage is Yes).
  - `formatters.js` — formatCurrency, formatPct.
  - `validation.js` — sanitizeInput, clampNumber.
  - `storage.js` — loadStoredInput, saveStoredInput; loadImportProperty, saveImportProperty (for property import across tabs).
  - `firestoreStorage.js` — deals (load, save, share).
  - `wholesalerDealStorage.js` — wholesaler deals (load, save) with risk overrides.
  - `userFavoritesStorage.js` — user favorites.
  - `userMetadataStorage.js` — last login (via API).
  - `interestApi.js` — interest requests (favorite, Zoom, buy).
- `src/components/` — Field, DetailRow, MetricCard, DealSidebar, DealInterestActions, PropertySearch, DealCard, AdminDropdown, WholesalerModuleDropdown, UserDetailModal.
- `api/` — Vercel serverless functions (10 total to stay under Hobby 12 limit). Consolidated: `api/admin-handler.js` (list-users, create-user, delete-user, set-role, set-user-config, account delete); `api/subscription-handler.js` (status, cancel, complete). Other: demo, user-metadata, auth/signup-notification, cron/subscription-cancel-period-end, interest/create, subscription/create, charge-overage, webhook, rentcast-usage. Rewrites in `vercel.json` route legacy URLs to consolidated handlers.
- `lib/` — Shared API utilities (firebase-admin, requireAuth, requireAdmin, resend, paypal, paypal-cancel). `paypal-cancel.js` provides subscription create, cancel, getPlanId, and getCycleFromPlanId via REST API (no SDK) for admin-handler, subscription/create, webhook, and cron; avoids `@paypal/paypal-server-sdk` ESM issues in Vercel serverless.

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
- **`VITE_SITE_URL`** — Public origin with no trailing slash (e.g. `https://your-domain.com`). Used for canonical links, Open Graph / Twitter image URLs in `index.html`, JSON-LD, and generated `robots.txt` / `sitemap.xml` in the production build. Defaults to `https://redms-deal-analyzer.vercel.app` if unset.
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

**SEO:** The marketing homepage (`/`) includes meta description, `robots`, canonical, Open Graph, and Twitter Card tags in `index.html`, plus a **`google-site-verification`** meta tag for [Google Search Console](https://search.google.com/search-console) property verification (update the `content` value in `index.html` if you replace the property or verification token). The placeholder `__SEO_SITE_URL__` (no trailing slash) is replaced at build time by the Vite `seo` plugin with `VITE_SITE_URL` or the default production origin—do not use `%VITE_SITE_URL%` in `index.html` hrefs (Vite treats `%` specially and the build can fail). Public pages use `react-helmet-async` for title, description, and canonical. The home page includes JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`). For a dedicated social preview image, add a 1200×630 asset and point `og:image` / `twitter:image` to it in `index.html`. An optional root-level `google*.html` verification file may also exist for the same property; prefer the meta tag in `index.html` so verification survives deploys without a separate upload step.

**Local dev with admin:** Run `vercel dev` (not `npm run dev`) so the API routes are available. The new-deals notification (Investor) persists dismissal via localStorage when the API is unavailable, so it won't reappear after the user dismisses it even when using `npm run dev`.

## Recent Changes

- **1st Mtg Upfront Points floor** — When 1st Mortgage is Yes, upfront points are `max(loan × mortgage points rate, $2,995)` (`MIN_FIRST_MTG_UPFRONT_POINTS` in `constants.js`, applied in `redmsCalc.js`). Affects flip totals, PDFs, and calculated 2nd mortgage amount.
- **Google Search Console** — Homepage verification uses `<meta name="google-site-verification" content="…" />` in `index.html` (in `<head>` before `<body>`) so crawlers see the token on the first HTML response. README documents placement and `VITE_SITE_URL` / SEO behavior.
- **Admin User Detail Modal** — Replaced inline user view with `UserDetailModal`: full-screen modal with profile edit, last login, deals (owned/shared), saved searches, favorites, and per-user client parameters. Admins can unshare/unassign deals and searches, change role, and save client params from the modal.
- **New Property Tax** — Sidebar "Calculate" button estimates Detroit non-homestead tax: `(offerPrice × 50% × 85.2737 mills) + $240` trash fee. Formula documented in README.
- **Terms of Service & Privacy Policy** — Added `/terms` and `/privacy` pages with full legal content. Links in Home footer, Terms/Privacy footers, and sidebar (Investor, Wholesaler, Demo). Section nav and account dropdown on legal pages match Home.
- **Demo fallback** — Demo page uses built-in fallback data when API returns non-JSON (e.g. `npm run dev` without `vercel dev`), avoiding parse errors.
- **Section scroll** — Home page section links (Professional Tools, Pricing, Who Uses REDMS, etc.) scroll to section headings correctly, accounting for sticky header and section padding. Works from Home header/footer and when navigating from Terms/Privacy.
- **Sidebar Upgrade button & usage** — Added Upgrade button below deals remaining in Investor sidebar; links to Profile Subscription section. Profile page scrolls to Subscription section when navigating with `#subscription-heading` (manual scroll with offset so heading stays visible). Wholesaler module sidebar now shows deals remaining and Upgrade button for non-admin users.
- **Firebase app config** — Load app config from Firestore only when user is authenticated; avoids "Missing or insufficient permissions" when auth state is not yet ready.
- **PayPal SDK / admin 500 fix** — Added `lib/paypal-cancel.js` (REST API only, no SDK) for subscription create, cancel, getPlanId, and getCycleFromPlanId. Admin-handler, subscription/create, webhook, and cron now use it instead of `paypal.js`, avoiding `@paypal/paypal-server-sdk` ESM export errors in Vercel serverless. Fixes 500 on `/api/admin/list-users` and `/api/subscription/create`.
- **Home page header** — Sign In and Try Demo links updated to button style matching Create Free Account (white background, blue text, rounded corners). Button text centered using flexbox.
- **Pricing section** — Client tier: price changed from "Custom" to "Included"; CTA link updated to `#client-fee-structure`.
- **Demo page** — Added Home button to header (desktop, mobile header, and mobile drawer) for quick navigation back to the landing page.
- **Landing page** — Feature copy updated: "Search analyzed prospective Detroit deals to find the best one that suits you."
- **Find Properties — RentCast usage** — Admin view shows remaining free searches this month at top. Usage tracked in Firestore; manual sync from RentCast dashboard available in Admin Parameters. `/api/rentcast-usage` attempts to fetch usage from RentCast API when available.
- **Find Properties — API call reduction** — RentCast API is called only when admin clicks Search. Removed pre-fetch of property details when results load and removed fetch on Analyze Deal; Analyze Deal uses search result data only (estimated tax when details unavailable).
- **Home page SEO** — Meta description, robots, canonical, Open Graph, Twitter Card in `index.html`; `VITE_SITE_URL` and Vite `seo` plugin for build-time URLs, `dist/robots.txt` and `dist/sitemap.xml`; `public/` copies for dev; JSON-LD on Home; `react-helmet-async` on Home, Landing, Terms, Privacy, Demo; improved logo `alt` text on those pages.

## License

Private — The BNIC Network LLC.
