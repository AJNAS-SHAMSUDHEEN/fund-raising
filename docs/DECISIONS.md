# Architectural & Business Decisions (ADR) — Masjid Fund

## ADR-001: Monetary Storage in Integer Paise
- **Decision:** All financial values are stored and calculated as 64-bit integer paise (1 INR = 100 paise).
- **Rationale:** JavaScript and JSON floating-point math introduces binary precision errors (e.g. `0.1 + 0.2 !== 0.3`). Converting all amounts to paise upon receipt and only dividing by 100 for display guarantees 100% financial integrity.

## ADR-002: Materialized Aggregation Document (`campaignAggregates/main`)
- **Decision:** A single summary document is maintained atomically via Firestore transactions on every verified transaction.
- **Rationale:** The public homepage and live presentation screen will be accessed by hundreds or thousands of concurrent users. Running queries across thousands of raw transaction documents would incur prohibitive Firestore read costs and slow response times. A single aggregate document provides instant real-time snapshot synchronization at minimal cost.

## ADR-003: Pure CSS Modules & Tokens Architecture
- **Decision:** Build the UI using CSS Modules backed by a centralized CSS Custom Properties design system (`src/styles/tokens.css` and `src/styles/globals.css`).
- **Rationale:** Avoids Tailwind dependency complexities and class bloat, gives pixel-perfect control over custom green/gold branding, allows rapid styling adjustments, and guarantees full compliance with web standards.

## ADR-004: Land Area & Rate Formulas
- **Configuration:**
  - 1 Cent = 435.6 Square Feet.
  - Total Target Area: 19.5 Cent = 8,494.2 Sq. Ft.
  - Target Amount: ₹1,10,00,000 (One Crore Ten Lakh Rupees).
  - Exact Per-Cent Target: ₹1,10,00,000 / 19.5 = ₹5,64,102.56. Displayed Indicative Rate = **₹5,64,103**.
  - Exact Per-Sq-Ft Target: ₹1,10,00,000 / 8,494.2 = ₹1,295.001. Displayed Indicative Rate = **₹1,295**.
  - Musalla Area: 8 Sq. Ft. Indicative Rate: 8 × ₹1,295 = **₹10,360**.
  - 5-Musalla Package: 5 × ₹10,360 = **₹51,800** (Corrected from inconsistent reference graphics to guarantee mathematical consistency).
- **Rule:** All unit rates and targets are dynamically configurable in `campaigns/main` in Firestore, allowing campaign managers to adjust them if needed.

## ADR-005: Dual-Channel Verification for Online Payments
- **Decision:** Implement both immediate client-return verification (`/api/payments/verify`) and asynchronous server-to-server webhook verification (`/api/payments/webhook`).
- **Rationale:** Mobile donors using Indian UPI apps (Google Pay, PhonePe, Paytm) frequently switch apps and may close the browser before the client redirect fires. The server webhook ensures no verified donation is ever lost.

## ADR-006: Contributor Deduplication & Privacy
- **Decision:** Normalize phone numbers to 10 digits (`normalizedPhone`). Lookup existing contributors before creating new ones. Document IDs are always auto-generated UUIDs (never phone numbers). Contributor PII is never exposed on public endpoints.
