# Database Schema Specification — Cloud Firestore

## 1. Design Principles
1. **Paise Precision:** All currency amounts are stored as 64-bit integer paise (e.g. ₹10,360 = `1036000` paise) to prevent floating-point inaccuracies.
2. **Materialized Aggregates:** Aggregate numbers are maintained atomically in `campaignAggregates/main` using Firestore transactions, avoiding unbounded collection queries.
3. **Audit Trails & Non-Destructive Mutations:** Financial records are never updated in place without versioning; soft reversals and adjustment records are created for corrections.
4. **Normalized Identifiers:** Auto-generated Firestore document IDs (`doc.id`), with human-readable serial numbers generated for public reference (e.g. `MF-2026-000142`).

---

## 2. Collection Specifications

### 2.1 `campaigns`
*Path:* `/campaigns/{campaignId}` (Initial document: `/campaigns/main`)
*Purpose:* Holds active campaign metadata, targets, unit rates, and feature toggles.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Document ID (`main`) |
| `name` | string | Campaign title ("Masjid Land Purchase & Development") |
| `targetAmountPaise` | number | Target in paise (`1100000000` = ₹1,10,00,000) |
| `landAreaCent` | number | Total land area in Cent (`19.5`) |
| `landAreaSqFt` | number | Total land area in Sq Ft (`8494.2`) |
| `centRatePaise` | number | Rate per Cent in paise (`56410300` = ₹5,64,103) |
| `sqFtRatePaise` | number | Rate per Sq Ft in paise (`129500` = ₹1,295) |
| `musallaRatePaise` | number | Rate per Musalla in paise (`1036000` = ₹10,360) |
| `musallaSqFt` | number | Area per Musalla (`8.0`) |
| `musallaPackage5Paise`| number | 5-Musalla package in paise (`5180000` = ₹51,800) |
| `minCustomAmountPaise`| number | Minimum custom donation (`10000` = ₹100) |
| `maxCustomAmountPaise`| number | Maximum custom donation (`100000000` = ₹10,00,000) |
| `liveScreenMode` | string | `totals_only` \| `anonymous_feed` \| `public_feed` |
| `pricingVersion` | number | Incremented on every rate change (e.g. `1`) |
| `updatedAt` | timestamp | Server timestamp of last update |
| `updatedBy` | string | UID of Super Admin who updated |

---

### 2.2 `campaignAggregates`
*Path:* `/campaignAggregates/{aggregateId}` (Initial document: `/campaignAggregates/main`)
*Purpose:* Single document queried by the public homepage and live presentation screen.

| Field Name | Type | Description |
|---|---|---|
| `totalVerifiedPaise` | number | Total confirmed collections (online + verified cash) in paise |
| `totalOnlinePaise` | number | Confirmed online collections in paise |
| `totalCashPaise` | number | Verified cash collections in paise |
| `pendingCashPaise` | number | Cash collections awaiting admin verification |
| `totalCentUnits` | number | Cumulative Cent sponsored |
| `totalSqFtUnits` | number | Cumulative Sq Ft sponsored |
| `totalMusallaUnits` | number | Cumulative Musallas sponsored |
| `totalDonorsCount` | number | Distinct donor count |
| `totalOffersCount` | number | Total verified offers count |
| `lastUpdated` | timestamp | Server timestamp of the latest atomic mutation |

---

### 2.3 `contributors`
*Path:* `/contributors/{contributorId}`
*Purpose:* Registry of donors and contributors. Searchable by normalized phone and name.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `fullName` | string | Full name of donor |
| `normalizedPhone` | string | Normalized 10-digit phone (e.g. `9876543210`) |
| `phoneCountryCode`| string | Dial code (`+91`) |
| `email` | string \| null | Optional email address |
| `address` | string \| null | Optional town/panchayath |
| `allowPublicDisplay`| boolean | Contributor consent for live screen / ticker |
| `totalContributedPaise`| number | Cumulative verified contribution in paise |
| `offerCount` | number | Count of offers made |
| `createdAt` | timestamp | Server timestamp |
| `updatedAt` | timestamp | Server timestamp |

*Indexes:*
- `normalizedPhone` (ASC)
- `fullName` (ASC)

---

### 2.4 `offers`
*Path:* `/offers/{offerId}`
*Purpose:* An offer or pledge made by a contributor (Cent, Sq. Ft., Musalla, or Custom).

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `offerNumber` | string | Formatted serial number (`OFF-2026-0001`) |
| `contributorId`| string | Reference to `/contributors/{id}` |
| `contributorName`| string | Snapshot of name at time of offer |
| `contributorPhone`| string | Snapshot of normalized phone |
| `offerType` | string | `cent` \| `sqft` \| `musalla` \| `custom` |
| `quantity` | number | Number of units (e.g. `2` Cent, `50` Sq. Ft., `1` Musalla) |
| `unitRatePaise` | number | Rate applied at time of offer creation |
| `pricingVersion` | number | Version of pricing used |
| `totalAmountPaise`| number | `quantity * unitRatePaise` (or custom amount in paise) |
| `status` | string | `pending` \| `verified` \| `failed` \| `cancelled` \| `refunded` |
| `paymentChannel`| string | `online_gateway` \| `cash_in_hand` |
| `createdAt` | timestamp | Server timestamp |
| `verifiedAt` | timestamp \| null | Timestamp when verified |

*Indexes:*
- `status` (ASC), `createdAt` (DESC)
- `contributorId` (ASC), `createdAt` (DESC)
- `offerType` (ASC), `createdAt` (DESC)

---

### 2.5 `payments` (Online Payments)
*Path:* `/payments/{paymentId}`
*Purpose:* Records online gateway transaction attempts and confirmed captures.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `offerId` | string | Reference to `/offers/{id}` |
| `contributorId`| string | Reference to `/contributors/{id}` |
| `gateway` | string | `razorpay` |
| `orderId` | string | Razorpay order ID (`order_...`) |
| `paymentId` | string \| null | Razorpay payment ID (`pay_...`) |
| `signature` | string \| null | HMAC SHA256 signature verified by server |
| `amountPaise` | number | Total amount in paise |
| `currency` | string | `INR` |
| `status` | string | `created` \| `authorized` \| `captured` \| `failed` |
| `failureReason`| string \| null | Error details if failed |
| `idempotencyKey`| string | Client-provided UUID to prevent double orders |
| `createdAt` | timestamp | Server timestamp |
| `capturedAt` | timestamp \| null | Timestamp of capture |

*Indexes:*
- `orderId` (ASC, unique)
- `paymentId` (ASC, unique)
- `status` (ASC), `createdAt` (DESC)

---

### 2.6 `cashCollections`
*Path:* `/cashCollections/{collectionId}`
*Purpose:* Cash collections received by field/office administrators.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `receiptNumber` | string | Unique serial (`CASH-2026-0001`) |
| `offerId` | string | Reference to `/offers/{id}` |
| `contributorId`| string | Reference to `/contributors/{id}` |
| `amountPaise` | number | Amount received in paise |
| `collectorUid` | string | Firebase UID of administrator who received cash |
| `collectorName`| string | Name of collector |
| `notes` | string \| null | Specific notes or manual receipt reference |
| `status` | string | `pending_verification` \| `verified` \| `rejected` \| `adjusted` |
| `verifiedByUid`| string \| null | Firebase UID of verifying admin (segregation of duties) |
| `verifiedAt` | timestamp \| null | Verification timestamp |
| `rejectionReason`| string \| null | Reason if rejected |
| `createdAt` | timestamp | Creation timestamp |

*Indexes:*
- `status` (ASC), `createdAt` (DESC)
- `collectorUid` (ASC), `createdAt` (DESC)

---

### 2.7 `receipts`
*Path:* `/receipts/{receiptId}`
*Purpose:* Verified digital receipts accessible by contributor or administrator.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Receipt Document ID |
| `receiptSerial` | string | Human readable serial number (`RCP-2026-000421`) |
| `offerId` | string | Reference to `/offers/{id}` |
| `contributorId`| string | Reference to `/contributors/{id}` |
| `contributorName`| string | Contributor name |
| `amountPaise` | number | Amount in paise |
| `amountInWords`| string | English text representation of Rupees |
| `offerType` | string | `cent` \| `sqft` \| `musalla` \| `custom` |
| `quantity` | number | Quantity sponsored |
| `paymentMethod`| string | `ONLINE (Razorpay)` \| `CASH` |
| `gatewayReference`| string \| null | Razorpay payment ID or Cash Receipt number |
| `issuedAt` | timestamp | Issue timestamp |
| `verificationToken`| string | Hash used for public QR code verification |

---

### 2.8 `admins`
*Path:* `/admins/{uid}`
*Purpose:* System user roles and permissions.

| Field Name | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | Administrator email |
| `displayName` | string | Administrator full name |
| `phone` | string \| null | Administrator phone |
| `role` | string | `super_admin` \| `collection_admin` \| `event_operator` |
| `isActive` | boolean | Account status |
| `createdAt` | timestamp | Account creation date |
| `createdBy` | string | UID of Super Admin who invited |

---

### 2.9 `publicAnnouncements`
*Path:* `/publicAnnouncements/{announcementId}`
*Purpose:* Live event display feed. Contributor name is omitted unless `allowPublicDisplay` is true.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `displayName` | string | Contributor name or "A Well Wisher / An Anonymous Donor" |
| `offerType` | string | `cent` \| `sqft` \| `musalla` \| `custom` |
| `quantity` | number | Units |
| `amountPaise` | number | Amount in paise |
| `timestamp` | timestamp | Server timestamp |
| `isHighlighted`| boolean | Set to true for large contributions (e.g. >= 1 Cent) |

---

### 2.10 `auditLogs`
*Path:* `/auditLogs/{auditId}`
*Purpose:* Immutable append-only audit trail for all financial and configuration changes.

| Field Name | Type | Description |
|---|---|---|
| `id` | string | Auto-generated document ID |
| `actorUid` | string | UID of user or `system_webhook` |
| `actorRole` | string | `super_admin` \| `collection_admin` \| `system` |
| `action` | string | e.g. `CASH_RECORDED`, `CASH_VERIFIED`, `SETTINGS_UPDATED` |
| `entityType` | string | `offer` \| `payment` \| `cashCollection` \| `campaign` |
| `entityId` | string | Document ID of affected entity |
| `previousState`| map \| null | State before modification |
| `newState` | map \| null | State after modification |
| `notes` | string \| null | Justification/notes |
| `ipAddress` | string \| null | Client IP |
| `timestamp` | timestamp | Server timestamp |
