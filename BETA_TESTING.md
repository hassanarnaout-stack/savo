# Saveo — Closed Beta Testing Plan

This document is the script for a closed beta test with real customers and real suppliers. Each scenario should be run start-to-finish by an actual person on an actual device — not just checked against the code.

---

## Before You Start

1. Confirm Beta Mode settings via `/admin` (or directly in the `beta_settings` table): decide whether this round is fully open or invite-only.
2. If invite-only, add the test participants' emails via `BetaService.addInvite()` (or a direct DB insert into `beta_invites`) before they try to register.
3. Have at least one admin account, one pre-approved supplier account, and a clean customer account ready.

---

## Customer Scenarios

### C1 — Register
- [ ] Go to `/register`, create a new account with a real-looking email/password.
- [ ] If beta is invite-only and this email wasn't invited: confirm you get a clear "invite-only" message, not a generic error.
- [ ] If invited: confirm registration succeeds and you're signed in.

### C2 — Browse
- [ ] Visit the homepage — confirm all sections load (Deals, Trending, Mystery Boxes, Recommended For You, etc.)
- [ ] Open a category page and a search — confirm results are relevant and only approved, public products appear.
- [ ] Open a product detail page — confirm price, stock, images, and cross-sell/related sections all render.

### C3 — Add to Cart
- [ ] Add 2-3 different products to the cart from different pages (PDP, homepage rail, category page).
- [ ] Open the cart drawer — confirm quantities, prices, and "Complete your deal" suggestions are correct.
- [ ] Adjust a quantity up and down, remove an item — confirm totals update correctly.

### C4 — Checkout
- [ ] Proceed to checkout, fill in a real Kuwait address (governorate/area/block/street).
- [ ] Select Cash on Delivery (the only live payment method — see PRODUCTION.md §7).
- [ ] Place the order — confirm you land on the order confirmation/detail page with the correct order number.
- [ ] If a Saveo Plus member: confirm the membership discount and free-delivery are reflected correctly in the total.

### C5 — Receive Order (simulated)
- [ ] Have a supplier/admin move the order through ACCEPTED → PREPARING → SHIPPED → DELIVERED (see Supplier/Admin scenarios below).
- [ ] As the customer, refresh the order detail page after each transition — confirm the status and timeline update.
- [ ] Confirm no notification errors appear in server logs at each transition (see `src/lib/notifications/console-channel.ts` output).

### C6 — Review
- [ ] After DELIVERED, leave a product review if the feature is available on that PDP.
- [ ] **If something is wrong with the order:** use "Report an issue" on the order detail page (Phase 5) — submit a report and confirm it shows up for the admin (see Admin scenario A3).

---

## Supplier Scenarios

### S1 — Register
- [ ] Go to `/supplier/register`, submit company info.
- [ ] If beta is invite-only and this email wasn't invited: confirm a clear rejection message.
- [ ] Confirm the account lands in a "pending" state and cannot access the full dashboard yet.

### S2 — Add Product
- [ ] Once verified (see Admin scenario A1), log in and go to `/supplier/products/new`.
- [ ] Fill in all fields including a barcode (test with a real EAN-13 like `4006381333931`).
- [ ] Submit — confirm the product is created but shows **"Pending Admin Review"** (Phase 5 Product Quality Control) and is NOT visible on the public site yet.
- [ ] Confirm it appears in the admin's `/admin/products/pending` queue.

### S3 — Manage Stock
- [ ] Go to `/supplier/inventory`, adjust stock on a product up and down.
- [ ] Confirm `InventoryHistory` reflects the change (visible via the product's history page).
- [ ] Set stock below the low-stock threshold — confirm it shows up on the Admin Operations Dashboard's "Low Stock" card.

### S4 — Process Order
- [ ] Once a customer places an order containing this supplier's product (see C4), go to `/supplier/orders`.
- [ ] Move the order through ACCEPTED → PREPARING → SHIPPED → DELIVERED.
- [ ] Confirm each transition is only allowed in the correct sequence (e.g. can't skip straight to DELIVERED).

### S5 — View Earnings
- [ ] After a DELIVERED order, go to `/supplier/reports`.
- [ ] Confirm the sale appears in Realized Sales (not just GMV) — see the GMV vs Realized Sales distinction documented in the codebase.
- [ ] Confirm commission math looks correct for the product's category/agreement.

---

## Admin Scenarios

### A1 — Approve Supplier
- [ ] Go to `/admin/suppliers`, open the pending supplier from S1.
- [ ] Walk through the **Onboarding Checklist** (Phase 5): Company Info, Contact Verification, Product Quality, Barcode Check, Images Check, Pricing Review, Commission Agreement.
- [ ] Mark the checklist status as Approved — confirm the supplier can now fully use their dashboard.
- [ ] Try marking a supplier Rejected on a separate test account — confirm they're blocked appropriately.

### A2 — Approve Product
- [ ] Go to `/admin/products/pending`, find the product from S2.
- [ ] Confirm you can see its images, barcode, price, and description clearly enough to make a real quality judgment.
- [ ] Approve it — confirm it becomes visible on the public site within the page's cache window (`revalidate` — up to 30-60s).
- [ ] On a second test product, Reject it with a reason — confirm the reason shows up on the supplier's product list.

### A3 — Monitor Orders
- [ ] Go to `/admin/operations` (the new Operations Dashboard) each "morning" of the test — confirm Orders Today, Sales Today, Pending Approvals, Low Stock, Failed Payments, and Open Customer Issues all show real, correct numbers.
- [ ] Go to `/admin/support`, find the issue reported in C6 — change its status OPEN → PROCESSING → RESOLVED, add resolution notes.
- [ ] Confirm the customer sees the updated status on their order detail page.

---

## What "Beta Ready" Looks Like

All checkboxes above pass, for at least:
- 3 different customer accounts completing C1-C6
- 2 different supplier accounts completing S1-S5
- 1 admin account completing A1-A3 against real submissions from the above

If any scenario fails, log it as a bug with: which step, what you expected, what actually happened, and a screenshot — the same format used throughout this project's development.
