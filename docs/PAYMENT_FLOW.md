# Payment & Cash Collection Workflows — Masjid Fund

## 1. Online Payment Workflow (Razorpay Integration)

### 1.1 Sequence Diagram

```
User (Browser)               Next.js Server API          Razorpay Gateway        Cloud Firestore
      |                              |                           |                       |
      |-- 1. Select Offer & Details->|                           |                       |
      |   (Type, Qty, Donor Details) |                           |                       |
      |                              |-- 2. Validate Pricing --->|                       |
      |                              |      & Create Order ----->|                       |
      |                              |<-- 3. Return order_id ----|                       |
      |                              |-- 4. Create Offer & Payment Docs (Status: Pending)->|
      |<-- 5. Return order_id, key --|                                                   |
      |                                                                                  |
      |-- 6. Open Razorpay Checkout Modal ---------------------->|                       |
      |-- 7. Contributor pays via UPI / Cards / NetBanking ----->|                       |
      |<-- 8. Payment Success (signature, payment_id) -----------|                       |
      |                                                                                  |
      |-- 9. POST /api/payments/verify ------------------------->|                       |
      |      (order_id, payment_id, signature)                   |                       |
      |                              |-- 10. Verify HMAC-SHA256 Signature                |
      |                              |-- 11. Run Firestore Transaction:                  |
      |                              |       - Lock Payment & Verify Idempotency        |
      |                              |       - Update Payment -> CAPTURED                |
      |                              |       - Update Offer -> VERIFIED                  |
      |                              |       - Atomic Increment campaignAggregates/main  |
      |                              |       - Generate Digital Receipt doc              |
      |                              |       - Insert publicAnnouncement (if consented)  |
      |                              |       - Log to auditLogs ------------------------>|
      |<-- 12. Return Receipt URL ---|                                                   |
      |                                                                                  |
      |   (Asynchronous Fallback: Razorpay Webhook `payment.captured`)                   |
      |                              |<-- Webhook POST ----------|                       |
      |                              |-- Verify Webhook Signature                        |
      |                              |-- Idempotent check: If already captured, skip;   |
      |                              |   else execute atomic update & receipt creation ->|
```

### 1.2 Webhook Handling & Failure Recovery
- **Webhook Endpoint:** `/api/payments/webhook`
- **Supported Events:** `payment.captured`, `payment.failed`
- **Fallback Guarantee:** If a donor completes payment on their UPI app but closes the browser before the callback reaches `/api/payments/verify`, the Razorpay webhook independently captures the event, marks the transaction as verified, generates the receipt, and updates campaign aggregates.
- **Duplicate Protection:** Uses `payments/{paymentId}` document as an atomic transaction lock. If `status == 'captured'`, subsequent requests return HTTP 200 without executing side effects.

---

## 2. Cash Collection Workflow (Multi-Admin Field Operations)

```
Collection Admin               Next.js Server API             Verifier / Super Admin        Cloud Firestore
      |                               |                                 |                          |
      |-- 1. Search/Add Contributor ->|                                 |                          |
      |-- 2. Select Offer & Qty ----->|                                 |                          |
      |-- 3. Input Cash Received ---->|                                 |                          |
      |-- 4. POST /api/cash/record -->|                                 |                          |
      |      (auth token included)    |-- 5. Validate Collector Role     |                          |
      |                               |-- 6. Write Offer & Cash Docs    |                          |
      |                               |      (Status: PENDING_VERIFY) --+------------------------->|
      |                               |-- 7. Increment pendingCashPaise-+------------------------->|
      |<-- 8. Provisional Receipt ----|                                 |                          |
      |                                                                 |                          |
      |    (Cash physically deposited / verified)                       |                          |
      |                                                                 |-- 9. Inspect Queue in    |
      |                                                                 |      /admin/verify ----->|
      |                               |                                 |-- 10. POST /api/cash/verify
      |                               |<-- 11. Verify Authenticated ----|
      |                               |    Super/Verifier Identity      |
      |                               |-- 12. Enforce Segregation Rules |
      |                               |-- 13. Firestore Transaction:    |
      |                               |       - Cash -> VERIFIED        |
      |                               |       - Offer -> VERIFIED       |
      |                               |       - totalVerifiedPaise += X |
      |                               |       - pendingCashPaise -= X   |
      |                               |       - Issue Final Receipt     |
      |                               |       - publicAnnouncements Feed|
      |                               |       - Append to auditLogs ----+------------------------->|
      |                               |<-- 14. Verification Done -------|                          |
```

### 2.1 Reversals & Adjustments
- If a cash entry is rejected or entered erroneously:
  - Transition status to `rejected` with mandatory reason text.
  - If already verified: A formal `reversal` record is created; a negative adjustment transaction is applied to `campaignAggregates/main` with explicit approval from Super Admin.
  - Audit trail retains both the original and reversing transaction.
