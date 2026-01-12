# Phase 4 - Offline POS Manual Test Checklist

**Date:** January 3, 2025  
**Status:** Ready for Testing

---

## Test Environment Setup

### Prerequisites

1. **Backend running:** `npm run dev` (or `npm run dev:all` for backend + telegram bot)

   - Confirm backend is running on `http://localhost:3000`
   - Check API is accessible: `http://localhost:3000/api/health`

2. **Frontend running:** `npm run dev`

   - Confirm frontend is running on `http://localhost:5173`

3. **Test Users Created:**

   - **Cashier:**
     - Email: `cashier@test.com`
     - Password: `password123`
     - Role: CASHIER
   - **Admin:**
     - Email: `admin@test.com`
     - Password: `password123`
     - Role: ADMIN
   - **Regular User:**
     - Email: `user@test.com`
     - Password: `password123`
     - Role: USER

4. **Test Products Created:**

   - At least 5 products with:
     - `stock > 0`
     - `active_for_pos: true`
     - `price > 0`
     - `sku` (optional but recommended)
   - Example: "Green Dress" with stock=50, price=45000
   - Example: "Blue Shirt" with stock=30, price=35000

5. **Environment Configuration:**
   - `.env` should have:
     ```
     TERMINAL_PROVIDER=mock
     TERMINAL_MOCK_MODE=success
     JWT_SECRET=test-secret-key
     ```

---

## Test Suite 1: Online Store (MUST NOT BE BROKEN)

### Test 1.1 - Browse & View Products

**Objective:** Ensure online store product browsing works

**Steps:**

1. Navigate to `http://localhost:5173/`
2. Click on "Shop" or browse public products
3. Verify products are displayed with images, names, prices
4. Click on a product to view details
5. Verify description, pricing, images load correctly

**Expected Results:**

- ✓ Products display correctly
- ✓ Product details page loads without errors
- ✓ No console errors related to data fetching
- ✓ Images load properly

---

### Test 1.2 - Shopping Cart (Online)

**Objective:** Verify online shopping cart functionality

**Steps:**

1. On product detail page, select size/quantity
2. Click "Add to Cart"
3. Navigate to `/cart`
4. Verify cart shows added item with correct quantity and price
5. Modify quantity using +/- buttons
6. Remove item from cart
7. Verify cart updates

**Expected Results:**

- ✓ Items add to cart correctly
- ✓ Quantities and subtotals calculate correctly
- ✓ Cart persists (if using localStorage)
- ✓ Remove functionality works
- ✓ Total updates in real-time

---

### Test 1.3 - Online Checkout

**Objective:** Verify online checkout still works (mock payment)

**Steps:**

1. Add item(s) to cart
2. Go to `/checkout`
3. Enter shipping/delivery details
4. Select payment method (PAYME, CLICK, or CASH)
5. Complete checkout
6. Verify order confirmation page
7. Check admin orders list shows new order with `source: ONLINE`

**Expected Results:**

- ✓ Checkout form loads without errors
- ✓ Order is created with `source: ONLINE` (NOT `POS`)
- ✓ Stock is decremented for online orders
- ✓ Order appears in admin panel
- ✓ No errors in browser console

---

## Test Suite 2: POS System - Cashier Access

### Test 2.1 - Cashier Login to POS

**Objective:** Verify CASHIER role can access POS

**Steps:**

1. Navigate to `http://localhost:5173/pos/login`
2. Enter cashier credentials (cashier@test.com / password123)
3. Click Login
4. Verify redirect to `/pos` (main cashier screen)
5. Verify header shows "POS - Cashier Mode" and cashier name

**Expected Results:**

- ✓ Cashier login page renders
- ✓ Successful login redirects to `/pos`
- ✓ Cashier name displayed in header
- ✓ No errors in console

---

### Test 2.2 - POS Product Search & Display

**Objective:** Verify POS products endpoint filters correctly

**Steps:**

1. **Logged in as Cashier**, on `/pos` main screen
2. Verify products grid displays only:
   - Products with `active_for_pos: true`
   - Products with `stock > 0`
3. Type product name in search box (e.g., "Green")
4. Verify results filter in real-time
5. Clear search, verify all valid products reappear
6. Search by SKU (if products have SKU)
7. Verify matching results

**Expected Results:**

- ✓ Only active_for_pos + in-stock products shown
- ✓ Search filters by name and SKU
- ✓ Stock quantity displayed per product
- ✓ Products display price and SKU
- ✓ No console errors

---

### Test 2.3 - POS Cash Sale (Complete Flow)

**Objective:** Complete a full cash payment sale

**Steps:**

1. **Logged in as Cashier** on `/pos`
2. Click on a product (e.g., "Green Dress")
3. Product adds to cart with quantity 1
4. Verify cart panel shows: product name, price, qty, subtotal
5. Click +/- buttons to adjust quantity (e.g., qty=3)
6. Verify subtotal and total update: 3 × 45000 = 135000
7. Click "Checkout"
8. Modal appears with payment method options
9. Select "💵 Cash Payment (Instant)"
10. Click "Pay Cash" button
11. Wait for order processing
12. Verify success page with receipt number (RCP-YYYYMMDD-001 format)
13. Click "Print Receipt" → receipt page opens
14. Verify receipt displays:
    - Receipt number
    - Date/time
    - Cashier name
    - Item list with quantities and prices
    - Subtotal, tax, total
    - "PAID" status
15. Click browser print (Ctrl+P) and cancel (verify print dialog)
16. Click "New Sale" → back to `/pos` with empty cart

**Expected Results:**

- ✓ Product adds to cart correctly
- ✓ Quantity adjustments work, totals update
- ✓ Checkout modal shows both payment methods
- ✓ Cash payment completes instantly
- ✓ Order created with:
  - `channel: "offline"`
  - `payment_method: "CASH"`
  - `payment_status: "paid"`
  - `cashier_id: [cashier user id]`
  - `receipt_number: RCP-20250103-001` format
- ✓ Stock decremented: product.stock reduced by 3
- ✓ Receipt displays correctly with all required info
- ✓ Print functionality works
- ✓ Cart clears after sale

---

### Test 2.4 - POS Stock Validation (Insufficient Stock)

**Objective:** Verify system prevents overselling

**Steps:**

1. **Logged in as Cashier** on `/pos`
2. Find a product with low stock (e.g., "Blue Shirt" with stock=5)
3. Add to cart and set quantity to 6
4. Try to click +/- to increase beyond stock
5. Verify error message: "Only 5 available for Blue Shirt"
6. Reduce quantity to 5
7. Proceed to checkout with quantity=5
8. Complete cash payment
9. Verify order succeeds and stock is 0
10. Attempt another sale with the same product
11. Verify product no longer appears in search (stock=0)

**Expected Results:**

- ✓ Frontend prevents adding qty > stock
- ✓ Error message displayed
- ✓ Backend validates stock on order creation
- ✓ If stock < qty requested → order rejected with error
- ✓ Stock updates correctly (50 → 47 for 3 items, etc.)
- ✓ Out-of-stock products hidden from product list
- ✓ No overselling occurs

---

### Test 2.5 - POS Terminal Payment (Mock Success)

**Objective:** Complete a full terminal payment with success flow

**Prerequisites:** `.env` has `TERMINAL_MOCK_MODE=success`

**Steps:**

1. **Logged in as Cashier** on `/pos`
2. Add product to cart (e.g., qty=2)
3. Click "Checkout"
4. Modal appears, select "🏦 Terminal Payment (Pending Confirmation)"
5. Click "Pay Terminal"
6. Wait for order processing
7. Verify redirected to `/pos/payment/{orderId}`
8. **Payment page shows:**
   - "Terminal Payment Pending"
   - "⏳ Waiting for Terminal"
   - Amount displayed
   - Receipt number
9. Click "✓ Confirm Payment"
10. Status changes to "Processing..."
11. After ~1-2 seconds, shows "✓ Payment Confirmed!"
12. Green success box displayed with amount
13. Click "View & Print Receipt"
14. Verify receipt page loads (same as Test 2.3 step 14)
15. Verify order in backend has:
    - `payment_status: "paid"`
    - `terminal_transaction_id: TXN-...`
16. Verify stock was decremented

**Expected Results:**

- ✓ Order created with `payment_status: "pending"` initially
- ✓ Terminal transaction ID generated
- ✓ Stock NOT decremented until confirmation
- ✓ Confirmation succeeds (mock returns success)
- ✓ Order updated to `payment_status: "paid"`
- ✓ Stock decremented on confirmation
- ✓ Receipt page accessible
- ✓ No console errors

---

### Test 2.6 - POS Terminal Payment (Mock Failure)

**Objective:** Handle terminal payment decline gracefully

**Prerequisites:** Change to `TERMINAL_MOCK_MODE=fail` in `.env`

**Steps:**

1. Restart backend
2. **Logged in as Cashier** on `/pos`
3. Add product to cart
4. Proceed to terminal payment
5. On payment page, click "✓ Confirm Payment"
6. Page shows "✗ Payment Failed" with error message
7. Red failure box displayed
8. Verify order still exists but has `payment_status: "failed"`
9. Verify stock was NOT decremented
10. Click "🔄 Retry Payment"
11. Status goes to "Processing..." again
12. Should fail again (same mock mode)
13. Click "💵 Try Cash Payment Instead"
14. Redirected back to `/pos` (alternative flow, not yet fully implemented)
15. OR click "Discard & Start Over" → back to `/pos`
16. Verify cart is empty

**Expected Results:**

- ✓ Mock terminal decline returns error
- ✓ Order marked as `payment_status: "failed"`
- ✓ Stock remains unchanged
- ✓ User can retry or discard
- ✓ Failed orders still visible in order history
- ✓ No partial stock deductions

---

## Test Suite 3: Admin POS Management (Future Enhancements)

### Test 3.1 - Admin View POS Orders

**Objective:** Verify admin can view all POS orders

**Steps:**

1. **Logged in as Admin**, navigate to `/admin`
2. Look for "POS Management" or "POS Orders" section
   - _Note: This may be a future implementation_
3. View list of all POS orders
4. Verify columns: Receipt#, Date, Cashier, Items, Total, Status
5. Click order to view details
6. Verify details match receipt data

**Expected Results:**

- ✓ POS orders list accessible from admin
- ✓ Only orders with `source: POS` shown
- ✓ Filters work (date range, cashier, status)
- ✓ Order details display correctly

---

### Test 3.2 - Admin Edit POS Product Stock

**Objective:** Admin can adjust product stock

**Steps:**

1. **Logged in as Admin**, navigate to admin product management
2. Find "Green Dress" product
3. Current stock shown as 47 (after our 3-item sale)
4. Click stock field to edit
5. Change to 100
6. Save
7. Verify StockMovement record created with:
   - `delta: +53`
   - `reason: "manual_adjustment"`
8. **Logged in as Cashier**, refresh `/pos`
9. Search for "Green Dress"
10. Verify stock shows 100

**Expected Results:**

- ✓ Admin can adjust stock
- ✓ StockMovement audit record created
- ✓ Stock change reflected immediately in POS
- ✓ Changelog/history accessible (future)

---

## Test Suite 4: Concurrent Purchase Protection

### Test 4.1 - Stock Safety Under Concurrent Requests

**Objective:** Verify stock doesn't go negative with parallel purchases

**Prerequisites:** Need to test with two browser windows or rapid requests

**Manual Test:**

1. Product "Blue Shirt" has stock=30
2. **Cashier 1** (browser window 1): Add 15 units to cart, proceed to checkout
3. **Cashier 2** (browser window 2): Add 20 units to cart, proceed to checkout
4. **Cashier 1** (before Cashier 2 completes): Click "Pay Cash"
5. Order 1 processes, stock reduced 30 → 15
6. **Cashier 2** tries to click "Pay Cash"
7. Expect error: "Only 15 in stock (requested 20)"
8. Cashier 2 reduces qty to 15
9. Completes order, stock → 0
10. Both orders succeed, final stock = 0, no negative values

**Expected Results:**

- ✓ Backend validates stock.quantity >= requested
- ✓ First order succeeds, stock updated
- ✓ Second order validation detects insufficient stock
- ✓ No race condition causing negative stock
- ✓ Clear error messaging

**Automated Test (Alternative):**
Use curl or Postman to send simultaneous POST requests to `/api/pos/orders`

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"blue-shirt-id","quantity":15}],"paymentMethod":"CASH"}'

# Terminal 2 (same time)
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"blue-shirt-id","quantity":20}],"paymentMethod":"CASH"}'
```

Verify only one succeeds (or both fail if not atomic), stock stays positive.

---

## Test Suite 5: Role-Based Access Control

### Test 5.1 - Non-Cashier Cannot Access POS

**Objective:** Regular users and non-CASHIER roles blocked from POS

**Steps:**

1. **Logged in as USER** (user@test.com)
2. Navigate to `http://localhost:5173/pos`
3. Verify redirected or access denied
4. Navigate to `/pos/login`
5. Log in with USER credentials
6. Attempt access to POS
7. Verify access denied or redirect to login

**Expected Results:**

- ✓ USER role cannot access `/pos`
- ✓ Protected route enforces CASHIER+ role
- ✓ Redirect to appropriate page (login or home)

---

### Test 5.2 - Non-Admin Cannot Access Admin POS Section

**Objective:** Only ADMIN+ can manage POS settings

**Steps:**

1. **Logged in as CASHIER**
2. Attempt to access `/admin` or admin POS management
3. Verify access denied

**Expected Results:**

- ✓ CASHIER cannot access admin functions
- ✓ Clear message or redirect

---

## Test Suite 6: API Endpoint Validation

### Test 6.1 - GET /api/pos/orders (Cashier)

**Prerequisites:** Logged in as CASHIER (token obtained from login)

**Steps:**

```bash
curl -H "Authorization: Bearer CASHIER_TOKEN" \
  http://localhost:3000/api/pos/orders
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "id": "...", "receipt_number": "RCP-20250103-001", "status": "PAID", ... },
    ...
  ],
  "meta": { "total": 2, "limit": 50, "offset": 0 }
}
```

---

### Test 6.2 - POST /api/pos/orders (Create Order)

**Steps:**

```bash
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "gen-1", "quantity": 3}],
    "paymentMethod": "CASH",
    "cashierId": "user-id"
  }'
```

**Expected Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "...",
      "receipt_number": "RCP-...",
      "channel": "offline",
      "payment_method": "CASH",
      "payment_status": "paid",
      "status": "PAID",
      "total": 135000,
      ...
    },
    "items": [...]
  }
}
```

---

### Test 6.3 - POST /api/pos/payments/confirm (Terminal Confirm)

**Steps:**

```bash
# Create terminal order first (payment_status: pending)
# Then confirm:
curl -X POST http://localhost:3000/api/pos/payments/confirm \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-id"}'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "order": { ...order with payment_status: "paid" },
    "payment_status": "paid",
    "message": "Payment confirmed successfully"
  }
}
```

---

### Test 6.4 - GET /api/pos/products (Available Products)

**Steps:**

```bash
curl -H "Authorization: Bearer CASHIER_TOKEN" \
  'http://localhost:3000/api/pos/products?search=green&limit=10'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "gen-1",
      "name": "Green Dress",
      "sku": "GD-001",
      "price": 45000,
      "stock": 47,
      "categoryId": "..."
    }
  ],
  "meta": { "total": 1, "limit": 10, "offset": 0 }
}
```

**Note:** Only shows `active_for_pos: true` and `stock > 0`

---

### Test 6.5 - GET /api/pos/receipts/:id (Receipt Data)

**Steps:**

```bash
curl -H "Authorization: Bearer CASHIER_TOKEN" \
  http://localhost:3000/api/pos/receipts/order-id
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "receipt_number": "RCP-20250103-001",
    "date": "01/03/2025",
    "time": "14:30:00",
    "cashier": "Ahmed",
    "items": [...],
    "subtotal": 135000,
    "tax": 0,
    "total": 135000,
    "payment_method": "CASH",
    "payment_status": "paid"
  }
}
```

---

## Test Suite 7: Database & Data Integrity

### Test 7.1 - StockMovement Audit Trail

**Objective:** Verify all stock changes recorded

**Steps:**

1. Complete 2-3 POS sales with different quantities
2. Admin manually adjusts stock once
3. Check database: `/data/collections/stockMovements.json`
4. Verify entries for each sale:
   ```json
   {
     "id": "...",
     "productId": "...",
     "delta": -3,
     "reason": "purchase",
     "orderId": "...",
     "userId": "cashier-id",
     "createdAt": "..."
   }
   ```
5. Verify manual adjustment entry:
   ```json
   {
     "delta": 53,
     "reason": "manual_adjustment",
     "userId": "admin-id"
   }
   ```

**Expected Results:**

- ✓ Every POS order creates StockMovement record
- ✓ Reason correctly set to "purchase"
- ✓ orderId and userId populated
- ✓ Delta is negative for sales, positive for adjustments
- ✓ Audit trail is complete and immutable

---

### Test 7.2 - Order Data Completeness

**Objective:** Verify all required fields populated in orders

**Steps:**

1. Complete 1 CASH sale and 1 TERMINAL sale
2. Check `/data/collections/orders.json`
3. Verify CASH order has:
   - `id`, `receipt_number`, `orderNumber`
   - `status: "PAID"`, `channel: "offline"`, `source: "POS"`
   - `paymentMethod: "CASH"`, `payment_status: "paid"`
   - `total`, `createdAt`
   - `cashier_id`
4. Verify TERMINAL order has:
   - All above fields
   - PLUS `terminal_transaction_id: "TXN-..."`
   - `payment_status: "pending"` initially, then `"paid"` after confirm

**Expected Results:**

- ✓ All fields present and correctly populated
- ✓ No missing required data
- ✓ Proper formatting and types

---

### Test 7.3 - OrderItems Snapshots

**Objective:** Verify product snapshots stored at sale time

**Steps:**

1. After completing a sale, check `/data/collections/orderItems.json`
2. Find entries for the order
3. Verify each item has:
   - `productId`, `orderId`, `quantity`, `price`
   - `product_name` (snapshot of product.name)
   - `sku` (snapshot of product.sku, if available)

**Expected Results:**

- ✓ Snapshot data preserved at sale time
- ✓ Even if product data changes later, receipt shows original data
- ✓ No data loss or truncation

---

## Test Suite 8: Error Handling & Edge Cases

### Test 8.1 - Network Error Recovery

**Objective:** Graceful handling of network failures

**Steps:**

1. **Logged in as Cashier** with items in cart
2. Pause/throttle network (DevTools Network tab → throttling)
3. Click "Checkout"
4. While payment processing, disconnect network
5. Verify error message displayed: "Connection failed"
6. Reconnect network
7. Attempt checkout again
8. Verify succeeds without duplicate orders

**Expected Results:**

- ✓ User-friendly error message
- ✓ Cart preserved, not lost
- ✓ No duplicate orders created
- ✓ Retry functionality works

---

### Test 8.2 - Invalid Token / Session Expiry

**Objective:** Proper handling of auth failures

**Steps:**

1. **Logged in as Cashier** on `/pos`
2. Delete token from localStorage (DevTools)
3. Try to interact with POS (add to cart, checkout)
4. Verify redirected to login
5. OR verify error message and can re-login

**Expected Results:**

- ✓ Unauthorized actions blocked
- ✓ Clear message to re-login
- ✓ No broken UI state

---

### Test 8.3 - Empty/Invalid Input Validation

**Objective:** Backend rejects malformed requests

**Steps:**

```bash
# Missing items
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "CASH"}'

# Expected: 400 Bad Request - "Items array is required"

# Invalid paymentMethod
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [...], "paymentMethod": "INVALID"}'

# Expected: 400 Bad Request - "Payment method must be CASH or TERMINAL"

# Negative quantity
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Authorization: Bearer CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": "...", "quantity": -5}], "paymentMethod": "CASH"}'

# Expected: 400 Bad Request
```

**Expected Results:**

- ✓ All invalid inputs rejected with 400
- ✓ Clear error messages
- ✓ No partial data creation
- ✓ No data corruption

---

## Integration Tests

### Integration Test 1 - Complete POS Sales Workflow

**Objective:** Full end-to-end POS transaction

**Scenario:** Process 5 sales in sequence, mix of cash and terminal

**Steps:**

1. Log in as Cashier
2. **Sale 1 (Cash):** Green Dress × 2 → Cash → Receipt
3. **Sale 2 (Terminal, Success):** Blue Shirt × 1 → Terminal → Confirm → Receipt
4. **Sale 3 (Cash):** Green Dress × 1 → Cash → Receipt
5. **Sale 4 (Terminal, Success):** Blue Shirt × 2 → Terminal → Confirm → Receipt
6. **Sale 5 (Cash):** Green Dress × 1 → Cash → Receipt
7. **Total:** GD sold 4 units (original 50 → 46), BS sold 3 units (original 30 → 27)
8. Admin verifies:
   - `/api/pos/orders` shows all 5 orders
   - Stock is 46 and 27
   - StockMovements has 5 entries with total delta = -7
   - OrderItems has 5 order records with correct snapshots

**Expected Results:**

- ✓ All 5 orders created and completed
- ✓ All payments processed correctly
- ✓ Stock decremented accurately
- ✓ Audit trail complete
- ✓ No data loss or duplication

---

## Performance & Load Tests

### Load Test 1 - Rapid Consecutive Orders

**Objective:** System handles multiple quick orders

**Manual Test:**

1. **Cashier 1:** Complete sale every 30 seconds for 5 minutes (10 orders)
2. **Cashier 2** (if available): Do same in parallel
3. Monitor browser console and backend logs for errors
4. Check database consistency

**Expected Results:**

- ✓ No errors or timeouts
- ✓ All orders created with correct data
- ✓ No data corruption or duplicates
- ✓ Stock accurately decreased for each sale

---

## Final Sanity Checks

### Sanity Check 1 - Online Store Still Works

```
□ Browse public shop
□ View product details
□ Add to cart
□ Remove from cart
□ Checkout (non-POS)
□ Online order created with source: ONLINE
□ Stock decremented for online order
```

### Sanity Check 2 - POS Cash Sales Work

```
□ Cashier login to POS
□ Search products
□ Add to cart
□ Adjust quantities
□ Checkout with CASH
□ Order confirmed immediately
□ Receipt prints
□ Stock decremented
□ Receipt number in RCP-YYYYMMDD-## format
```

### Sanity Check 3 - POS Terminal Sales Work

```
□ Cashier checkout with TERMINAL
□ Order created with payment_status: pending
□ Terminal transaction ID generated
□ Payment confirmation page shows
□ Confirm button works
□ Stock decremented on confirmation
□ Receipt accessible
```

### Sanity Check 4 - Admin Functions Work

```
□ Admin can view POS orders list
□ Admin can see order details
□ Admin can view receipts
□ Admin can adjust product stock
□ Admin can toggle active_for_pos
```

### Sanity Check 5 - Role-Based Access Works

```
□ USER cannot access /pos
□ CASHIER can access /pos
□ ADMIN can access /admin POS section
□ Non-authenticated users redirected to login
```

---

## Known Limitations & Future Work

### Current Phase 1 Implementation

- ✓ Basic POS with cash and mock terminal payments
- ✓ Stock safety and audit trail
- ✓ Receipt printing
- ✓ Role-based access control

### Phase 2 (Future) Enhancements

- [ ] Real terminal provider integration (Payme/Click APIs)
- [ ] Terminal payment retries and reconciliation
- [ ] Discount/coupon support in POS
- [ ] Order returns and refunds
- [ ] Cashier performance analytics
- [ ] Multi-shift/register management
- [ ] Barcode/QR code scanning
- [ ] Customer loyalty integration
- [ ] Inventory alerts and low-stock warnings
- [ ] Advanced admin POS management UI

---

## Test Execution Notes

### Date: ****\_\_\_****

### Tester: ****\_\_\_****

### Environment: DEV / STAGING / PRODUCTION

### Backend Version: ****\_\_\_****

### Frontend Version: ****\_\_\_****

### Summary:

- Total Tests Run: \_\_\_\_
- Passed: \_\_\_\_
- Failed: \_\_\_\_
- Blocked: \_\_\_\_
- Known Issues: ********\_********

### Critical Issues Found:

1. ***
2. ***
3. ***

### Recommendations:

1. ***
2. ***
3. ***

---

## Sign-Off

**QA Lead:** ********\_******** **Date:** ****\_****

**Project Manager:** ********\_******** **Date:** ****\_****

**Ready for Production:** ☐ YES ☐ NO ☐ WITH CAVEATS

---

## Quick Reference - Key URLs

| Function          | URL                                                 |
| ----------------- | --------------------------------------------------- |
| Online Shop       | http://localhost:5173/shop                          |
| Online Checkout   | http://localhost:5173/checkout                      |
| POS Cashier Login | http://localhost:5173/pos/login                     |
| POS Main          | http://localhost:5173/pos                           |
| POS Orders        | http://localhost:5173/pos/orders (future)           |
| Admin Dashboard   | http://localhost:5173/admin                         |
| API Base          | http://localhost:3000/api                           |
| Health Check      | http://localhost:3000/api/health                    |
| API Docs          | http://localhost:3000/api/docs (if Swagger enabled) |

---

**END OF TEST CHECKLIST**
