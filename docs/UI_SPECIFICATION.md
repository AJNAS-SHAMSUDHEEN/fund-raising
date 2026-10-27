# UI/UX Specification & Design System — Masjid Fund

## 1. Visual Identity & Design Direction

### 1.1 Color Palette
An original, dignified, institutional aesthetic tailored for an Islamic charitable foundation:
- **Primary Brand (Deep Forest Green):**
  - `--color-primary-900`: `#082819`
  - `--color-primary-800`: `#0B3B24` (Core Brand)
  - `--color-primary-700`: `#125636`
  - `--color-primary-100`: `#E8F3EC`
- **Secondary Accent (Warm Gold):**
  - `--color-gold-600`: `#A98539`
  - `--color-gold-500`: `#C5A059` (Core Accent)
  - `--color-gold-400`: `#E0BE78`
  - `--color-gold-100`: `#FBF6EA`
- **Backgrounds & Neutrals (Warm Cream & Slate):**
  - `--color-bg-base`: `#FBF9F4` (Warm Cream Canvas)
  - `--color-bg-surface`: `#FFFFFF` (Card Surface)
  - `--color-bg-subtle`: `#F3EFE6` (Subtle container)
  - `--color-text-main`: `#14221A` (Dark slate for maximum legibility)
  - `--color-text-muted`: `#52635A`
  - `--color-border`: `#E5E0D5`
- **Status Indicators:**
  - `--color-success`: `#107C41`
  - `--color-warning`: `#D97706`
  - `--color-danger`: `#DC2626`

### 1.2 Typography
- **Headings & Financial Displays:** `Outfit`, sans-serif (Geometric, high-impact numbers, tabular numerals for ticker accuracy).
- **Body & Forms:** `Inter`, sans-serif (Clean, readable at small sizes, optimal for forms and receipts).
- **Scale:**
  - Display (Hero / Live Screen): `3rem` to `5.5rem` (48px – 88px), `font-weight: 800`
  - Heading 1: `2.25rem` (36px), `font-weight: 700`
  - Heading 2: `1.5rem` (24px), `font-weight: 600`
  - Body Large: `1.125rem` (18px)
  - Body Regular: `1rem` (16px)
  - Small / Caption: `0.875rem` (14px)

### 1.3 Spacing & Border Radii
- Grid Baseline: `4px`
- Border Radii:
  - Small (chips, tags): `6px`
  - Regular (inputs, buttons): `10px`
  - Large (cards, dialogs): `16px`
  - Extra Large (hero containers): `24px`

---

## 2. Key Screen Blueprints

### 2.1 Public Homepage (`/`)
1. **Navigation Bar:** Institution crest, campaign title, "Live Screen" link, "Login" button, and high-visibility "Offer Now" CTA button.
2. **Hero Section:**
   - Campaign banner: "Land Acquisition & Development for Central Masjid".
   - Target Goal: ₹1,10,00,000.
   - Raised Total: ₹X,XX,XXX (real-time live ticker).
   - Remaining Target: ₹Y,YY,YYY.
   - Progress Meter: Smoothly filled gold/emerald gradient with percentage badge (e.g. `45.2%`).
3. **Land & Sponsorship Metrics Grid:**
   - 19.5 Cents Total | 8,494.2 Sq. Ft. Total.
   - Remaining Cent & Sq. Ft. visual meter.
4. **Offer Categories (Interactive Cards):**
   - **Cent Card:** ₹5,64,103 / Cent. "Sponsor 1 or more Cent".
   - **Sq. Ft. Card:** ₹1,295 / Sq. Ft. "Sponsor land in square feet".
   - **Musalla Card:** ₹10,360 / Musalla (8 Sq. Ft.). "Sponsor a prayer space".
   - **Custom Card:** "Contribute any amount according to your ability".
5. **Live Transparency Feed:** Latest verified contributions (with anonymity preserved when chosen).
6. **Campaign Information & Contact:** Bank transfer details, committee members, WhatsApp contact, 80G tax note/disclaimer, FAQ.

### 2.2 Offer Selection & Checkout (`/offer`)
- Step-based or interactive single-screen calculator:
  - Category selector chips (Cent | Sq. Ft. | Musalla | Custom).
  - Dynamic Quantity Stepper (+/- buttons, direct numeric input).
  - Rate breakdown card showing:
    `[Quantity] [Unit] × [Applicable Rate] = [Total ₹]`
  - Donor Information Form with phone validation.
  - Public display consent checkbox: *"Display my name and contribution on the live screen and public ticker"*.
  - Order review summary modal.
  - "Proceed to Secure Payment" button triggering Razorpay.

### 2.3 Live Presentation Screen (`/live`)
- Optimized for projectors, TV screens, and 16:9 displays.
- Dark forest green background (`#082819`) with glowing gold typography.
- Giant progress ring / horizontal bar visible from 30+ feet away.
- Big numbers: `Total Target`, `Raised So Far`, `Remaining`.
- Real-time popups with gentle audio chime (optional toggle) when new contributions arrive.
- Minimal distraction: No standard headers or scrollbars; auto-scaling layout.

### 2.4 Digital Receipt (`/receipt/[id]`)
- Formal layout suitable for print (A4) or mobile screenshot/PDF saving.
- Islamic header ornament, Institution name, registration info.
- Official Receipt Number, Date, Time, Payment Gateway / Cash collector reference.
- Itemized breakdown of Cent/Sq.Ft/Musalla/Donation.
- Amount in Figures (e.g. `₹51,800.00`) and Words (`Rupees Fifty-One Thousand Eight Hundred Only`).
- Digital Verification QR code linking to `/receipt/[id]`.

### 2.5 Admin Portal (`/admin/*`)
- Sidebar Navigation: Dashboard Overview, Cash Entry, Verification Queue, Contributor Directory, Transactions, Settings, Audit Logs.
- High-contrast, dense data tables with search, status filters, date range filters, and CSV export.
- POS-style fast Cash Entry screen optimized for field workers on mobile devices or desk computers.
