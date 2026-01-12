# Phase 1 - Offline POS Requirements (Detailed & Implementable)

**Date:** January 3, 2025  
**Objective:** Define exact requirements for Phases 2 & 3

---

## 1. User Flows

### 1.1 Cashier Login & POS Access

**Actor:** Cashier (CASHIER role user)

**Flow:**

1. Cashier opens `/pos/login`
2. Enters email + password
3. System authenticates against backend
4. System verifies user has CASHIER role (or ADMIN/SUPERADMIN)
5. System stores JWT token in localStorage
6. Redirect to `/pos` (main cashier screen)
7. Cashier sees POS dashboard ready for transactions

**Error Cases:**

- Invalid credentials → "Email or password incorrect"
- User lacks CASHIER role → "Access denied: cashier access required"
- Network error → "Connection failed, please retry"

---

### 1.2 POS Cash Sale (Full Flow)

**Actor:** Cashier

**Precondition:** Cashier logged into `/pos`

**Flow:**

1. **Product Search**

   - Cashier types "Green Dress" in search box
   - System queries backend: `GET /api/pos/products?search=green`
   - Returns products with: `id, name, price, stock, sku`
   - Displays results as grid/list
   - Only shows `active_for_pos=true` and `stock > 0`

2. **Add to Cart**

   - Cashier clicks "Add to Cart" or scans barcode (sku)
   - Quantity defaults to 1
   - Item added to local cart state
   - Cart panel updates with:
     - Product name, price, qty
     - Subtotal for item
     - Total order amount
   - System displays current stock in product grid (updates if another cashier bought)

3. **Adjust Quantity**

   - Cashier changes qty from 1 to 3 via +/- buttons
   - Subtotal updates instantly
   - Total updates
   - Cannot exceed available stock (validation on frontend)
   - Warning if qty > stock: "Only 5 in stock"

4. **Remove Item**

   - Cashier clicks X or Remove button
   - Item removed from cart
   - Totals recalculate

5. **Payment - Cash Method**

   - Cart shows: Items, Subtotal, Tax (if applicable), Total
   - Cashier clicks "Checkout" or "Complete Sale"
   - Modal opens with:
     - Order summary
     - Payment method selector: [Cash] [Terminal]
     - Cashier SELECTS "Cash"
     - Confirms with button: "Pay Cash - [Total Amount]"

6. **Backend Processing (Cash)**

   - POST `/api/pos/orders` with:
     ```json
     {
       "items": [{ "productId": "gen-1", "quantity": 3, "size": "M" }],
       "paymentMethod": "CASH",
       "cashierId": "user-123" // from token
     }
     ```
   - Backend logic:
     - Calculates total = 3 × product.price
     - Validates total > 0
     - Creates Order with:
       - `channel: "offline"`
       - `payment_method: "CASH"`
       - `payment_status: "paid"` (immediate)
       - `cashier_id: user-123`
       - `receipt_number: "RCP-20250103-001"` (auto-generated)
       - `status: "PAID"`
     - Creates OrderItems (snapshot: name, sku, qty, price)
     - **Atomic stock decrement:**
       - Checks if `product.stock >= qty`
       - If YES: decrements `product.stock -= qty`
       - Creates StockMovement record
       - Returns success
       - If NO: returns error "Only 5 in stock, cannot process 10"
     - Returns Order object with items

7. **Success Confirmation**

   - Modal shows: "✓ Payment Successful"
   - Displays:
     - Receipt number: RCP-20250103-001
     - Total amount paid
     - "Print Receipt" button
     - "New Sale" button

8. **Receipt Printing**
   - Cashier clicks "Print Receipt"
   - Opens `/pos/receipt/:orderId` in new tab/modal
   - Page displays:

     ```
     ═══════════════════════════════════
              SADIA.LUX RECEIPT
     ═══════════════════════════════════
     Receipt #: RCP-20250103-001
     Date/Time: 2025-01-03 14:30:00
     Cashier: Ahmed

     ───────────────────────────────────
     ITEMS:
     ───────────────────────────────────
     Green Dress × 3            90,000
     Blue Shirt × 1             45,000

     ───────────────────────────────────
     Subtotal:                 135,000
     Tax (0%):                      0
     ───────────────────────────────────
     TOTAL:                    135,000

     Payment: CASH - PAID
     ═══════════════════════════════════
     Thank you!
     ```

   - Cashier clicks browser print button
   - Receipt prints or saves as PDF
   - Cashier dismisses
   - Back to `/pos` for next transaction

**Error Cases During Cash Sale:**

- "Stock insufficient" → Show warning, block checkout
- "Network error during order creation" → Rollback cart, show error, allow retry
- "Payment processing failed" → Show error, keep cart intact

---

### 1.3 POS Terminal Payment (Mock Flow)

**Actor:** Cashier

**Precondition:** Cashier has items in cart, clicked Checkout

**Flow:**

1. **Checkout Modal Opens**

   - Shows order summary
   - Payment method selector: [Cash] [Terminal]
   - Cashier SELECTS "Terminal"
   - Button changes to "Process Terminal Payment"

2. **Terminal Transaction Initiated**

   - Cashier clicks "Process Terminal Payment"
   - Backend: `POST /api/pos/orders`
     ```json
     {
       "items": [...],
       "paymentMethod": "TERMINAL",
       "cashierId": "user-123"
     }
     ```
   - Backend logic:
     - Creates Order with `payment_status: "pending"`
     - Calls TerminalProvider.initiate(amount, metadata)
       - MockTerminalProvider returns:
         ```json
         {
           "transactionId": "TXN-20250103-ABC123",
           "status": "pending"
         }
         ```
     - Stores `terminal_transaction_id` in Order
     - DOES NOT decrease stock yet (status=pending)
     - Returns Order with transaction ID

3. **Terminal Pending UI**

   - Modal updates to show:

     ```
     Payment Status: PENDING
     Amount: 135,000
     Terminal Transaction ID: TXN-20250103-ABC123

     ⏳ Waiting for terminal confirmation...
     [Confirm Payment] [Cancel Transaction]
     ```

   - (In real scenario: terminal device shows prompt, customer taps/inserts card)
   - (In mock: simulates processing delay)

4. **Confirm Payment**

   - Cashier clicks "Confirm Payment" button
   - Frontend: `POST /api/pos/payments/confirm`
     ```json
     {
       "transactionId": "TXN-20250103-ABC123"
     }
     ```
   - Backend logic:
     - Calls TerminalProvider.confirm(transactionId)
       - MockTerminalProvider checks mode:
         - If TERMINAL_MOCK_MODE=success → returns `{ success: true, status: "confirmed" }`
         - If TERMINAL_MOCK_MODE=fail → returns `{ success: false, reason: "Card declined" }`
     - If success:
       - Updates Order: `payment_status: "paid"`, `status: "PAID"`
       - **Atomically decreases stock** for all items
       - Creates StockMovement records
       - Returns updated Order
     - If fail:
       - Updates Order: `payment_status: "failed"`
       - Does NOT decrease stock
       - Returns error response

5. **Payment Confirmed - Success Path**

   - Modal updates:

     ```
     ✓ Payment Confirmed
     Status: PAID
     Amount: 135,000

     [Print Receipt] [New Sale]
     ```

   - (Same as cash flow from here)

6. **Payment Confirmation - Failure Path**
   - Modal updates:

     ```
     ✗ Payment Failed
     Reason: Card declined

     [Retry] [Cancel & Try Cash] [Discard Sale]
     ```

   - Cashier options:
     - Retry → Goes back to pending confirmation
     - Try Cash → Converts order to cash payment (backend support needed)
     - Discard → Closes modal, clears cart

**Error Cases:**

- Terminal timeout (no response) → Show "Terminal not responding" with retry
- Network error → "Failed to confirm payment, retry or cancel"
- Double-click confirm → Backend idempotent (only processes once)

---

### 1.4 Stock Validation (Concurrent Sales Protection)

**Scenario:** Two cashiers simultaneously buy the last 5 items

**Expected Behavior:**

1. Cashier A adds 5 items to cart, proceeds to checkout
2. Cashier B adds 5 items to cart, proceeds to checkout (sees stock=5)
3. Cashier A submits order → Backend decrements stock 5→0, SUCCESS
4. Cashier B submits order → Backend checks stock=0 < 5 requested, FAILS
5. Cashier B sees: "Only 0 in stock" or "Stock sold out"
6. Cashier B removes item or reduces qty

**Implementation:**

- Frontend: Show real-time stock (fetch before adding, refresh after each cart change)
- Backend: Atomic check-and-decrement in single operation (optimistic lock or database transaction)
- Graceful degradation: If atomicity impossible, log failure for audit

---

### 1.5 Admin POS Management

**Actor:** Admin

**Access:** `/admin` dashboard → New "POS Management" section

**Subsection A: POS Products**

1. **View Products for POS**

   - Table columns: SKU, Name, Price, Stock, Active for POS, Actions
   - Filters: Search by name/sku
   - Shows only products, filtered for visibility

2. **Edit Stock**

   - Click stock number → Inline edit input
   - Enter new qty (e.g., 100)
   - Click Save
   - Backend: Update `product.stock = 100`
   - Creates StockMovement: `{ delta: +50, reason: "manual_adjustment", userId: admin-123 }`
   - Refreshes list

3. **Toggle Active for POS**

   - Toggle switch in table
   - Backend: Update `product.active_for_pos`
   - Hidden products no longer appear in `/api/pos/products`

4. **Edit Price**
   - Click price → Inline edit
   - Change price
   - Backend: Update `product.price`
   - Note: Does NOT retroactively change past orders (they store snapshot)

**Subsection B: POS Orders**

1. **View POS Orders**

   - Table columns: Receipt#, Date, Cashier, Items, Total, Status, Actions
   - Filters:
     - Date range (from/to)
     - Cashier name
     - Status (pending, paid, failed, completed)
   - Sort: Newest first

2. **Order Details**

   - Click order → Modal/detail page
   - Shows:
     - Receipt number
     - Order date/time
     - Cashier name
     - Item list with quantities & prices
     - Subtotal, tax, total
     - Payment method & status
     - Terminal transaction ID (if applicable)

3. **View/Print Receipt**

   - Click "Print Receipt" → Opens `/pos/receipt/:orderId`
   - Same receipt template as cashier flow

4. **Refund/Cancel (Future Feature, Not Phase 1)**
   - Placeholder for admin to cancel orders
   - Scope: Phase 1 focuses on creation only

---

### 1.6 POS Order List (Cashier View)

**Route:** `/pos/orders`

**Access:** CASHIER+ role

**Visible to:** Cashier (sees own orders only) + Admin (sees all)

**Table:**

- Receipt#, Date, Total, Status, Items Count

**Filters:**

- Today / This Week / This Month / Custom range
- Status: Paid, Pending, Failed

**Details:** Click order → View receipt + print

---

## 2. Data Model Requirements

### Order Interface (Updated)

```typescript
export interface Order {
  id: string;
  userId?: string; // Online store customer
  cashier_id?: string; // POS cashier (User.id)
  orderNumber: string; // Legacy online field
  receipt_number?: string; // NEW: POS receipt RCP-YYYYMMDD-SEQ
  status: OrderStatus; // 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED'
  channel: "online" | "offline"; // NEW: distinguishes POS from online
  source: "ONLINE" | "POS" | "TELEGRAM"; // Keep for backwards compat

  // Payment fields
  total: number;
  payment_method: "CASH" | "TERMINAL" | "MANUAL_CARD" | "PAYME" | "CLICK"; // Extended
  payment_status?: "pending" | "paid" | "failed" | "refunded"; // NEW: separate from status
  terminal_transaction_id?: string; // NEW: reference to terminal provider

  // Discount fields (inherited from online)
  couponCode?: string;
  discount?: number;

  // Telegram field
  telegramUserId?: string;

  createdAt: string;
  updatedAt?: string;
}
```

### Product Interface (Updated)

```typescript
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  costPrice?: number;
  profit?: number;
  categoryId: string;
  images?: ProductImage[];

  // NEW: Stock & POS
  stock?: number; // Main stock quantity (integer >= 0)
  active_for_pos?: boolean; // Visibility in POS (default: true if not set)
  sku?: string; // Barcode/SKU for scanning

  createdAt: string;
  updatedAt?: string;
}
```

### OrderItem Interface (Stays Same, Minor Addition)

```typescript
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  size?: string;
  quantity: number;
  price: number; // Already stores snapshot

  // Optional additions for audit:
  product_name?: string; // Snapshot of product.name
  sku?: string; // Snapshot of product.sku
}
```

### StockMovement Interface (NEW)

```typescript
export interface StockMovement {
  id: string;
  productId: string;
  delta: number; // Positive or negative change
  reason: "purchase" | "manual_adjustment" | "return" | "damage";
  orderId?: string; // If linked to order
  userId: string; // Who made the change (cashier or admin)
  notes?: string;
  createdAt: string;
}
```

### Payment Interface (Already Exists, Verify)

```typescript
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  provider: PaymentProvider; // 'PAYME' | 'CLICK' | 'TERMINAL' | 'CASH'
  status: "PENDING" | "COMPLETED" | "FAILED";
  transaction_id?: string; // External transaction reference
  createdAt: string;
  updatedAt?: string;
}
```

---

## 3. Backend Endpoints (Detailed Specifications)

### 3.1 POS Orders - Create (POST /api/pos/orders)

**Authentication:** Required (Bearer token)  
**Authorization:** CASHIER, ADMIN, SUPERADMIN

**Request Body:**

```json
{
  "items": [
    {
      "productId": "gen-1",
      "quantity": 3,
      "size": "M"  // Optional
    }
  ],
  "paymentMethod": "CASH" | "TERMINAL",
  "cashierId": "user-123",  // Optional (use from token if not provided)
  "notes": "Special handling"  // Optional
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord-1234",
      "receipt_number": "RCP-20250103-001",
      "channel": "offline",
      "status": "PAID" | "PENDING",  // Depends on paymentMethod
      "payment_status": "paid" | "pending",
      "payment_method": "CASH" | "TERMINAL",
      "total": 135000,
      "cashier_id": "user-123",
      "terminal_transaction_id": "TXN-...",  // If terminal
      "createdAt": "2025-01-03T14:30:00Z"
    },
    "items": [
      {
        "id": "item-1",
        "orderId": "ord-1234",
        "productId": "gen-1",
        "product_name": "Green Dress",
        "sku": "GD-001",
        "quantity": 3,
        "price": 45000,
        "size": "M"
      }
    ]
  }
}
```

**Error Cases:**

- 400: Missing required fields
- 400: Stock insufficient → `{ "error": "Only 5 in stock (requested 10)" }`
- 401: Unauthorized (no token)
- 403: Forbidden (not CASHIER+)
- 500: Internal error

---

### 3.2 POS Orders - List (GET /api/pos/orders)

**Authentication:** Required  
**Authorization:** CASHIER, ADMIN, SUPERADMIN

**Query Parameters:**

```
?status=PAID|PENDING|FAILED|COMPLETED
?cashierId=user-123
?dateFrom=2025-01-01
?dateTo=2025-01-31
?limit=20
?offset=0
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ord-1234",
      "receipt_number": "RCP-20250103-001",
      "channel": "offline",
      "status": "PAID",
      "payment_status": "paid",
      "total": 135000,
      "cashier_id": "user-123",
      "cashier_name": "Ahmed", // Optionally populated
      "createdAt": "2025-01-03T14:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 3.3 POS Orders - Get By ID (GET /api/pos/orders/:id)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "order": {
      /* full Order object */
    },
    "items": [
      /* OrderItem[] */
    ],
    "cashier": {
      /* User object with name */
    }
  }
}
```

---

### 3.4 POS Orders - Receipt Data (GET /api/pos/orders/:id/receipt-data)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "receipt_number": "RCP-20250103-001",
    "date": "2025-01-03",
    "time": "14:30:00",
    "cashier": "Ahmed",
    "items": [
      {
        "name": "Green Dress",
        "sku": "GD-001",
        "quantity": 3,
        "price": 45000,
        "subtotal": 135000
      }
    ],
    "subtotal": 135000,
    "tax": 0,
    "total": 135000,
    "payment_method": "CASH",
    "payment_status": "paid"
  }
}
```

---

### 3.5 POS Payments - Confirm (POST /api/pos/payments/confirm)

**Authentication:** Required  
**Authorization:** CASHIER, ADMIN, SUPERADMIN

**Request Body:**

```json
{
  "transactionId": "TXN-20250103-ABC123",
  "orderId": "ord-1234" // Alternative identifier
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "order": {
      /* updated Order with payment_status: "paid" */
    },
    "payment_status": "paid",
    "message": "Payment confirmed successfully"
  }
}
```

**Error Cases:**

- 400: Invalid transaction ID
- 404: Order/transaction not found
- 409: Already confirmed / state mismatch
- 500: Terminal provider error → `{ "error": "Terminal communication failed" }`

---

### 3.6 POS Products - List (GET /api/pos/products)

**Authentication:** Required  
**Authorization:** CASHIER, ADMIN, SUPERADMIN

**Query Parameters:**

```
?search=green
?limit=50
?offset=0
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "gen-1",
      "name": "Green Dress",
      "sku": "GD-001",
      "price": 45000,
      "stock": 25,
      "categoryId": "cat-1"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

**Filtering Rules:**

- Only products where `active_for_pos === true`
- Only products where `stock > 0`
- Search matches: `name` or `sku` (case-insensitive, partial)

---

## 4. Terminal Provider Abstraction

### 4.1 TerminalProvider Interface

**File:** `lib/terminal/interface.ts`

```typescript
export interface TerminalProvider {
  /**
   * Initiate a payment transaction
   * @param amount Amount in smallest currency unit (e.g., fils)
   * @param metadata { orderId, items, cashierId, etc. }
   * @returns transactionId and initial status
   */
  initiate(
    amount: number,
    metadata: any
  ): Promise<{
    transactionId: string;
    status: string;
    timestamp: string;
  }>;

  /**
   * Confirm/finalize a pending transaction
   * @param transactionId ID from initiate()
   * @returns success boolean and final status
   */
  confirm(transactionId: string): Promise<{
    success: boolean;
    status: string;
    message?: string;
  }>;

  /**
   * Cancel a pending transaction
   * @param transactionId ID to cancel
   */
  cancel(transactionId: string): Promise<{ success: boolean }>;
}
```

### 4.2 MockTerminalProvider Implementation

**File:** `lib/terminal/mock-provider.ts`

```typescript
import { TerminalProvider } from "./interface";

const MOCK_MODE = process.env.TERMINAL_MOCK_MODE || "success"; // success | fail | timeout

export class MockTerminalProvider implements TerminalProvider {
  async initiate(amount: number, metadata: any) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500));

    const txnId = `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    if (MOCK_MODE === "timeout") {
      throw new Error("Terminal timeout");
    }

    return {
      transactionId: txnId,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
  }

  async confirm(transactionId: string) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1000));

    if (MOCK_MODE === "success") {
      return {
        success: true,
        status: "confirmed",
        message: "Payment successful",
      };
    } else if (MOCK_MODE === "fail") {
      return {
        success: false,
        status: "declined",
        message: "Card declined",
      };
    } else {
      throw new Error("Terminal timeout during confirmation");
    }
  }

  async cancel(transactionId: string) {
    return { success: true };
  }
}
```

### 4.3 Provider Factory

**File:** `lib/terminal/factory.ts`

```typescript
import { TerminalProvider } from "./interface";
import { MockTerminalProvider } from "./mock-provider";

const PROVIDER_TYPE = process.env.TERMINAL_PROVIDER || "mock";

export function getTerminalProvider(): TerminalProvider {
  switch (PROVIDER_TYPE) {
    case "mock":
      return new MockTerminalProvider();
    case "real": // Future
    // return new RealTerminalProvider();
    default:
      return new MockTerminalProvider();
  }
}
```

### 4.4 Environment Configuration

**.env.example additions:**

```
# Terminal Payment Provider
TERMINAL_PROVIDER=mock
TERMINAL_MOCK_MODE=success  # success | fail | timeout
```

---

## 5. Stock Safety & Atomicity

### 5.1 Atomic Decrement Logic

**Requirement:** Stock cannot go negative even with parallel orders

**Implementation (Filesystem DB):**

```typescript
// lib/inventory-utils.ts

export function atomicDecreaseStock(
  productId: string,
  quantity: number,
  reason: "purchase" | "manual_adjustment" | "return" = "purchase",
  userId: string,
  orderId?: string
): { success: boolean; newStock?: number; error?: string } {
  try {
    // 1. Read current stock
    const products = getAll<Product>("products");
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const currentStock = product.stock || 0;

    // 2. Validate sufficient stock
    if (currentStock < quantity) {
      return {
        success: false,
        error: `Only ${currentStock} in stock (requested ${quantity})`,
      };
    }

    // 3. Decrement stock (optimistic: assume no concurrent edit)
    product.stock = currentStock - quantity;
    product.updatedAt = new Date().toISOString();

    // 4. Write back (in real DB, this would be atomic transaction)
    update<Product>("products", product.id, product);

    // 5. Record stock movement
    create<StockMovement>("stockMovements", {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId,
      delta: -quantity,
      reason,
      orderId,
      userId,
      createdAt: new Date().toISOString(),
    });

    return { success: true, newStock: product.stock };
  } catch (error) {
    return { success: false, error: "Stock update failed" };
  }
}
```

---

## 6. Receipt Generation

### 6.1 Receipt Number Format

**Format:** `RCP-YYYYMMDD-SEQ`

**Example:** `RCP-20250103-001`, `RCP-20250103-002`

**Generation Logic:**

```typescript
function generateReceiptNumber(createdAt: string): string {
  const date = new Date(createdAt);
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const todayOrders = getAll<Order>("orders").filter((o) =>
    o.receipt_number?.startsWith(`RCP-${dateStr}`)
  );
  const seq = (todayOrders.length + 1).toString().padStart(3, "0");
  return `RCP-${dateStr}-${seq}`;
}
```

---

## 7. Validation Rules

### 7.1 POS Order Creation Validation

```
✓ paymentMethod must be 'CASH' or 'TERMINAL'
✓ items array must not be empty
✓ items[i].productId must exist
✓ items[i].quantity must be > 0 and integer
✓ items[i].quantity must not exceed product.stock
✓ Product must have active_for_pos === true
✓ Product must have stock > 0
✓ Total must be > 0
```

### 7.2 Terminal Payment Validation

```
✓ Order must exist and be in "pending" status
✓ payment_status must be "pending"
✓ transactionId must match order.terminal_transaction_id
✓ Terminal provider must confirm successfully
✓ Stock must be decremented atomically on confirm
```

---

## Summary Table

| Aspect                            | Cash             | Terminal                                 |
| --------------------------------- | ---------------- | ---------------------------------------- |
| Status after POST /api/pos/orders | PAID             | PENDING                                  |
| payment_status after POST         | paid             | pending                                  |
| Stock decremented                 | YES, immediately | NO, on confirm                           |
| Receipt printed                   | YES              | YES                                      |
| User sees                         | Receipt page     | Pending modal                            |
| On confirm                        | (N/A)            | Stock decremented, status → PAID         |
| On decline                        | (N/A)            | payment_status → failed, stock unchanged |

---

## Phase 1 Complete

This document provides all implementable specifications for Phases 2 & 3. All data models, endpoints, flows, and business logic are defined in detail.

**Next:** Proceed to Phase 2 - Backend Implementation
