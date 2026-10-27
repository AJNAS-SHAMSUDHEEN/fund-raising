# Security, Privacy & Permissions Specification

## 1. Threat Model & Defense In Depth

The application handles public charitable donations, personal contributor information (names, mobile numbers), online payment credentials, and direct cash collections.

### Core Security Tenets
1. **Zero Client Trust:** The client browser never decides the price, rate, verification status, or aggregate total of any transaction.
2. **Server-Side Financial Mutations:** All financial mutations (order creation, signature verification, cash recording, verification, settings changes) execute strictly inside server-side Node.js route handlers (`app/api/*`) using the Firebase Admin SDK.
3. **Firestore Security Rules as Hard Boundary:** Firestore client SDK write access is completely blocked for sensitive collections (`campaignAggregates`, `payments`, `cashCollections`, `receipts`, `auditLogs`).
4. **Idempotency & Duplicate Prevention:** Every payment capture and webhook execution is wrapped in a transactional uniqueness check using the gateway order/payment ID.
5. **Privacy of Donor PII:** Phone numbers and email addresses are strictly private, accessible only to authenticated admins. Live tickers and public home screens default to anonymous descriptions unless explicit consent was obtained.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Public / Donor | Event Screen Operator | Collection Admin | Super Admin |
|---|---|---|---|---|
| View Public Homepage (`/`) | Read | Read | Read | Read |
| View Live Presentation (`/live`)| Read | Read | Read | Read |
| Create Online Payment Order | Execute (API) | Execute (API) | Execute (API) | Execute (API) |
| View Contributor PII (Phone/Email) | Denied | Denied | Read (Search/Lookup)| Full Read/Edit |
| Record Cash Collection | Denied | Denied | Create (Own records)| Create |
| Verify Cash Collection | Denied | Denied | Denied (Separation)| Approve/Reject |
| Modify Campaign Settings & Rates | Denied | Denied | Denied | Full Update |
| Manage Administrators & Roles | Denied | Denied | Denied | Full Control |
| View Financial Reconciliation Reports| Denied | Denied | Personal Summary | Full Reports |
| View System Audit Logs | Denied | Denied | Denied | Full Read |

---

## 3. Firestore Security Rules Blueprint

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getAdminDoc() {
      return get(/databases/$(database)/documents/admins/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && getAdminDoc().isActive == true;
    }
    
    function isSuperAdmin() {
      return isAdmin() && getAdminDoc().role == 'super_admin';
    }

    function isCollectionAdmin() {
      return isAdmin() && (getAdminDoc().role == 'collection_admin' || getAdminDoc().role == 'super_admin');
    }

    // 1. Campaign Settings
    match /campaigns/{campaignId} {
      allow read: if true; // Publicly readable for rates & info
      allow write: if false; // Only server Firebase Admin can update
    }

    // 2. Campaign Aggregates (Real-time totals)
    match /campaignAggregates/{aggregateId} {
      allow read: if true; // Publicly readable for real-time progress
      allow write: if false; // Strict server-side mutation only
    }

    // 3. Public Announcements (Live feed)
    match /publicAnnouncements/{announcementId} {
      allow read: if true; // Public read
      allow write: if false; // Generated only by server
    }

    // 4. Contributors
    match /contributors/{contributorId} {
      // Donors cannot list all contributors. Admins can search.
      allow read: if isCollectionAdmin();
      allow write: if false; // Managed via server APIs
    }

    // 5. Offers
    match /offers/{offerId} {
      allow read: if isCollectionAdmin();
      allow write: if false;
    }

    // 6. Payments
    match /payments/{paymentId} {
      allow read: if isSuperAdmin();
      allow write: if false;
    }

    // 7. Cash Collections
    match /cashCollections/{collectionId} {
      allow read: if isCollectionAdmin();
      allow write: if false;
    }

    // 8. Receipts
    match /receipts/{receiptId} {
      // Public can read an individual receipt if they know the document ID
      allow get: if true;
      allow list: if isCollectionAdmin();
      allow write: if false;
    }

    // 9. Admins
    match /admins/{uid} {
      allow read: if isAuthenticated() && (request.auth.uid == uid || isSuperAdmin());
      allow write: if false;
    }

    // 10. Audit Logs
    match /auditLogs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if false; // Append-only via server Admin SDK
    }
  }
}
```

---

## 4. Payment Gateway Security & Webhook Handling
- **Signature Verification:** Razorpay webhook calls verify the `x-razorpay-signature` header against the payload using HMAC SHA256 with the secret key `RAZORPAY_WEBHOOK_SECRET`.
- **Payment Verification API:** `/api/payments/verify` requires:
  - `razorpay_order_id`
  - `razorpay_payment_id`
  - `razorpay_signature`
  Calculates `crypto.createHmac('sha256', secret).update(order_id + "|" + payment_id).digest('hex')` and performs a timing-safe equality check.
- **Order Price Re-computation:** The server recalculates `amountPaise` from current active campaign rates in Firestore. Client-provided prices are completely discarded.
- **Duplicate Webhook Delivery:** Handled idempotently. If the payment record is already in `captured` state, the webhook returns HTTP 200 immediately without incrementing totals twice.

---

## 5. Cash Collection Segregation of Duties
- **Step 1:** Collection Admin enters cash received and issues provisional receipt. Collection status is set to `pending_verification`.
- **Step 2:** Cash is physically handed over to treasury or verified by a Super Admin / designated verifying officer.
- **Step 3:** The verifier approves the entry (`verifiedByUid != collectorUid` enforced where policy dictates). Only upon verification does the transaction run to update `campaignAggregates/main` and issue the final receipt.
- **Step 4:** Adjustments/cancellations require a mandatory reason and are logged to `auditLogs`. No financial document is ever physically deleted.
