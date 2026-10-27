# System Architecture — Masjid Fund

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT CLIENTS                                    |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |  Public Homepage   |  |   Offer / Donate   |  |  Live Screen Presentation   |  |
|  |     Route: /       |  |   Route: /offer    |  |       Route: /live          |  |
|  +---------+----------+  +---------+----------+  +--------------+--------------+  |
|            |                       |                            |                 |
|            |                       |                            |                 |
|  +---------+-----------------------+----------------------------+--------------+  |
|  |                        Admin Portal (/admin/*)                              |  |
|  |   - Overview       - Cash Collection Entry    - Verification Queue          |  |
|  |   - Contributors   - Settings                 - Audit Logs                  |  |
|  +---------------------------------+-------------------------------------------+  |
+------------------------------------|----------------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
   (Real-time read via SDK)                        (Secure API calls)
              |                                             |
              v                                             v
+-------------------------------+             +-------------------------------------+
|        Cloud Firestore        |             | Next.js App Router API Routes       |
|                               |             | (Node.js Server Runtime)            |
| - campaignAggregates/main     |<----------->|                                     |
| - publicAnnouncements         |             | - /api/payments/create-order        |
| - campaigns/settings          |             | - /api/payments/verify-signature    |
| - contributors                |             | - /api/payments/webhook             |
| - offers                      |             | - /api/cash/record                  |
| - payments                    |             | - /api/cash/verify                  |
| - cashCollections             |             | - /api/admin/settings               |
| - auditLogs                   |             |                                     |
+-------------------------------+             +------------------+------------------+
                                                                 |
                                                                 v
                                                      +---------------------+
                                                      |  Razorpay Gateway   |
                                                      |  Orders & Webhooks  |
                                                      +---------------------+
```

---

## 2. Component Layers

### 2.1 Presentation Layer (Next.js 15+ App Router)
- **Engine:** Next.js with TypeScript and React 19.
- **Styling Architecture:** Pure CSS Modules backed by a central Design System (`src/styles/tokens.css` and `src/styles/globals.css`). 
- **Color Palette & Theme:** Deep Forest Green (`#0B3B24`), Rich Gold (`#C5A059`), Warm Cream (`#FDFBF7` / `#F5F2EB`), Slate Dark (`#1A2421`).
- **Typography:** Modern Google Fonts (`Outfit` for crisp numerical figures/headings, `Inter` for clean reading text).
- **Responsive Views:** Tailored viewports for Mobile (360px–480px), Tablet, Desktop, and 16:9 Presentation Projectors.

### 2.2 Server Runtime & API Layer
- **Environment:** Next.js Server Route Handlers running on Node.js (deployable on Vercel, Firebase App Hosting, or Cloud Run).
- **Security Context:** Privileged Firebase Admin SDK (`firebase-admin`) executing on the server with service account credentials stored strictly in environment variables.
- **Validation Engine:** Strict schema validation with Zod on all inbound payloads.
- **Idempotency Engine:** Firestore transactional locks using transaction IDs / Razorpay payment IDs as document keys.

### 2.3 Real-Time Aggregation Strategy
- **The Problem:** Reading hundreds of thousands of contribution documents to calculate total raised is slow, expensive, and non-scalable for real-time live tickers.
- **The Solution:** A dedicated materialized aggregate document: `campaignAggregates/main`.
- **Atomic Mutation:** Every confirmed payment or verified cash collection executes a Firestore transaction:
  1. Writes the verified `payment` or `cashCollection` document.
  2. Increments `totalVerifiedPaise` in `campaignAggregates/main`.
  3. Increments respective category counts (`totalCentPaise`, `totalSqFtPaise`, `totalMusallaPaise`, `totalCustomPaise`, `contributorCount`).
  4. Conditionally appends to `publicAnnouncements` (if contributor consented).
- **Client Real-Time Listener:** The public home page (`/`) and live presentation screen (`/live`) attach an `onSnapshot` listener to `campaignAggregates/main` and the latest 10 items of `publicAnnouncements`. Result: Immediate real-time refresh with minimal database reads.

---

## 3. Directory Structure Specification

```
Masjid Fund/
├── docs/                               # Project documentation & single source of truth
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY.md
│   ├── PAYMENT_FLOW.md
│   ├── UI_SPECIFICATION.md
│   ├── DECISIONS.md
│   └── DEVELOPMENT_STATUS.md
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Public Homepage
│   │   ├── offer/                      # Offer Calculator & Checkout
│   │   │   └── page.tsx
│   │   ├── receipt/                    # Digital receipt page
│   │   │   └── [id]/page.tsx
│   │   ├── live/                       # Live Event Presentation Screen
│   │   │   └── page.tsx
│   │   ├── admin/                      # Admin Portal
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx                # Dashboard Overview
│   │   │   ├── cash/page.tsx           # Cash Collection Entry
│   │   │   ├── verify/page.tsx         # Cash Verification Queue
│   │   │   ├── contributors/page.tsx   # Contributor Directory
│   │   │   ├── offers/page.tsx         # Offers & Payments Master List
│   │   │   ├── settings/page.tsx       # Campaign & Rate Settings
│   │   │   └── audit/page.tsx          # Audit Logs
│   │   └── api/                        # Secure Server Endpoints
│   │       ├── payments/
│   │       │   ├── create-order/route.ts
│   │       │   ├── verify/route.ts
│   │       │   └── webhook/route.ts
│   │       ├── cash/
│   │       │   ├── record/route.ts
│   │       │   └── verify/route.ts
│   │       └── admin/
│   │           └── settings/route.ts
│   ├── components/                     # Reusable UI components
│   │   ├── common/                     # Buttons, Badges, Modals, Inputs
│   │   ├── home/                       # Hero, ProgressMeter, LandStats, OfferCards
│   │   ├── offer/                      # CentSelector, SqFtSelector, MusallaSelector, Form
│   │   ├── live/                       # BigCounter, ProgressBar, AnnouncementTicker
│   │   └── admin/                      # Sidebar, StatsCard, TransactionTable
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts               # Client Firebase SDK initialization
│   │   │   ├── admin.ts                # Server Firebase Admin initialization
│   │   │   └── rules.json              # Firestore security rules
│   │   ├── razorpay/
│   │   │   └── client.ts               # Razorpay SDK helper
│   │   ├── calculations/
│   │   │   └── currency.ts             # Precision currency and land rate math
│   │   ├── types/                      # TypeScript domain types & interfaces
│   │   └── utils/                      # Formatting helpers (INR, date, formatters)
│   └── styles/
│       ├── tokens.css                  # Design system tokens (colors, spacing, shadows)
│       └── globals.css                 # Base resets, typography, global utilities
├── public/                             # Static assets, branding, badges
├── tests/                              # Automated test suites
│   ├── calculations.test.ts
│   ├── payment-verification.test.ts
│   └── cash-workflow.test.ts
├── .env.example
├── next.config.ts
├── tsconfig.json
└── package.json
```
