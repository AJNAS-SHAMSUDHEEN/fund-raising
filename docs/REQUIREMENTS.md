# Requirements Specification — Masjid Fund Real-Time Fundraising & Land Offer Platform

## 1. Executive Summary
A production-grade, secure, responsive, real-time fundraising and land-offer management web application designed for a public charitable/institutional campaign in Kerala, India.

- **Initial Campaign Target:** ₹1,10,00,000 (One Crore Ten Lakh Rupees / INR 11,000,000)
- **Land Area:** 19.5 Cent (~8,494.2 Sq. Ft. at 1 Cent = 435.6 Sq. Ft.)
- **Indicative Unit Rates:**
  - Per Cent: ₹5,64,103 (exact target/area: ₹5,64,102.56)
  - Per Square Foot: ₹1,295 (exact target/area: ₹1,295.06)
  - Musalla Sponsorship: ₹10,360 for 8 Sq. Ft. (5 Musalla Package = ₹51,800)
- **Currency & Precision:** Stored internally in integer Paise (1 INR = 100 Paise).


















---

## 2. Stakeholders & Personas
1. **Public Contributor / Donor:** Browses the campaign, views real-time progress, selects land offers (Cent, Sq. Ft.), Musalla sponsorships, or custom contributions, completes payment via Razorpay, downloads/prints digital receipts.
2. **Super Administrator:** Manages administrative accounts, configures campaign targets and pricing versions, verifies cash records, reviews reconciliation reports, exports audit logs, controls live presentation settings.
3. **Collection Administrator:** Field/mosque collector who registers/searches contributors by phone/name, records cash donations, issues provisional receipts, and submits collections for verification.
4. **Event Screen Operator:** Manages the live big-screen projector display (`/live`) during fundraising events with full-screen, high-contrast, real-time animation, sound toggles, and anonymous/public donor modes.

---

## 3. Functional Requirements

### 3.1 Public Homepage (`/`)
- Dynamic header with institution logo, title, and trust credentials.
- Real-time fundraising metric bar:
  - Total Verified Amount Raised
  - Target Goal (₹1,10,00,000)
  - Remaining Target Amount
  - Percentage Achieved with animated progress bar
- Land metrics display (19.5 Cents / 8,494.2 Sq. Ft. covered vs remaining).
- Four Offer Category Cards:
  1. Cent-based sponsorship (₹5,64,103 / Cent)
  2. Square-foot sponsorship (₹1,295 / Sq. Ft.)
  3. Musalla sponsorship (₹10,360 / Musalla)
  4. General / Custom Donation
- Call-to-actions: "Offer Now" and "Donate Now" leading directly to the calculator.
- Recent Public Contributions ticker (anonymous by default, or name + amount if consented).
- Institutional information, transparency notice, contact details, FAQ, and policy links.

### 3.2 Offer Selection & Payment Page (`/donate` or `/offer`)
- Dynamic calculator tabs for:
  - **Cent-based offer:** Quantity counter (+/- buttons & direct input), auto-calculated total.
  - **Sq. Ft.-based offer:** Quantity counter (+/- buttons & direct input), auto-calculated total.
  - **Musalla offer:** Single Musalla counter or 5-Musalla package quick select, calculated total.
  - **Custom Amount:** Direct number input with quick chips (₹500, ₹1,000, ₹5,000, ₹10,000, ₹25,000, ₹50,000) adhering to min (₹100) and max limits.
- Dynamic breakdown: Unit rate × Quantity = Gross Amount.
- Contributor Details Form:
  - Full Name (required)
  - Indian Mobile Number (10 digits, validated with +91 country code)
  - Email Address (optional)
  - Display preference: Anonymous vs Public display on live tickers.
- Order Summary modal / step with explicit notice that this is a charitable sponsorship/contribution.
- Razorpay Checkout integration with server-side validation of amount and pricing version.

### 3.3 Receipt Page (`/receipt/[id]`)
- Printable, downloadable PDF/print-styled digital receipt.
- Unique receipt serial number (e.g. `MF-2026-XXXX`).
- Verification QR code leading to public receipt verification URL.
- Detailed breakdown: Contributor details, payment method, gateway transaction reference, date/time, offer category, quantity, unit, amount in words and figures.

### 3.4 Live Event Presentation Screen (`/live`)
- Designed specifically for 16:9 big screens and projectors.
- Dark forest green & gold theme with maximum contrast and high legibility.
- Real-time listeners for instant target progress updates without page reload.
- Milestone celebratory animations (confetti / banner upon new major contributions).
- Three configurable display modes:
  1. *Totals & Progress only*
  2. *Anonymous Contribution Announcements* (e.g., "A brother contributed 2 Cent — ₹11,28,206")
  3. *Public Contributor Names & Amounts* (only for contributors who explicitly consented).
- Connection health indicator (live WebSocket/Firestore listener status).

### 3.5 Administrative Portal (`/admin`)
- **Authentication:** Firebase Auth with email/password and multi-factor/session security.
- **Role-Based Views:**
  - **Overview:** Executive summary metrics, online vs cash breakdown, pending cash verification queue, recent 20 transactions, visual collection charts.
  - **Offers & Transactions:** Searchable, filterable list (by date range, status, payment gateway, offer type, collector). Ability to export filtered data to CSV.
  - **Contributor Registry:** Search by phone number or name, view historic contributions, deduplication assistant.
  - **Cash Collection Entry:** Quick-entry POS interface for collection agents. Automatic capturing of agent UID, provisional receipt generation.
  - **Cash Verification Queue:** Segregation-of-duties review workflow. Approver verifies cash receipt against physical deposit before marking verified.
  - **Campaign Settings (Super Admin only):** Target amount, land area, price per unit, active offer toggles, live screen display mode toggles.
  - **Audit Logs:** Immutable chronological log of all financial mutations, status transitions, and administrative logins.

---

## 4. Non-Functional Requirements
- **Financial Accuracy:** Double-entry audit pattern; zero floating-point math on currency. All currency operations handled in integer paise.
- **Idempotency:** Payment webhooks and API endpoints enforce unique transaction ID locking to prevent duplicate credit.
- **Latency & Performance:** Aggregated campaign totals stored in dedicated aggregate document (`campaignAggregates/main`) so that home page reads do not query millions of individual records.
- **Mobile-First UX:** Fully tested on mobile viewports (down to 360px width) up to 4K projector displays.
- **Security:** Strict Firebase Security Rules restricting client-side writes to sensitive financial collections; all status mutations done via secure API routes with authenticated admin tokens.
