# Offline POS System - Backend Discovery & Plan

**Date:** January 3, 2025  
**Status:** Phase 0 - Discovery Complete

## Current State Analysis

### 1. Data Models (types/index.ts)

#### Order Model

```typescript
export interface Order {
  id: string;
  userId?: string;
  orderNumber: string;
  status: OrderStatus; // 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED'
  source: OrderSource; // 'ONLINE' | 'POS' | 'TELEGRAM'
  total: number;
  paymentMethod?: string;
  telegramUserId?: string;
  couponCode?: string;
  discount?: number;
  createdAt: string;
  updatedAt?: string;
}
```

**Current Status:** `source` field already supports 'POS' but missing:

- `channel` (as alias/replacement)
- `payment_status` (separate from order status)
- `payment_method` needs enum expansion
- `terminal_transaction_id` (nullable)
- `cashier_id` (nullable User ref)
- `receipt_number` (human-friendly ID)

#### OrderItem Model

```typescript
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  size?: string;
  quantity: number;
  price: number; // ✓ Stores price at sale time
}
```

**Status:** ✓ Already stores product snapshot (price). Could add `product_name`, `sku` for completeness.

#### Product Model

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
  createdAt: string;
  updatedAt?: string;
}
```

**Current Status:** Missing:

- `stock` (int) - essential for POS
- `active_for_pos` (bool) - filter POS products
- `sku/barcode` (string, optional)

#### Inventory Model (exists but limited)

```typescript
export interface Inventory {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  updatedAt?: string;
}
```

**Status:** Size-based inventory exists. Need to:

- Add Product-level stock field (main quantity)
- Create StockMovement table for audit trail

#### Payment Model (exists)

```typescript
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  provider: PaymentProvider; // 'PAYME' | 'CLICK' | 'TERMINAL' | 'CASH'
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt?: string;
}
```

**Status:** ✓ Already supports CASH and TERMINAL. Need to add:

- `terminal_transaction_id`
- `confirmation_data` (JSON for terminal responses)

### 2. Current POS Endpoints (/api/pos/orders)

**Route File:** `app/api/pos/orders/route.ts`

#### GET /api/pos/orders

- ✓ Filters orders by `source === 'POS'`
- ✓ Requires role: SUPERADMIN | ADMIN | CASHIER
- ✓ Returns sorted list (newest first)
- **Status:** Working, but needs filtering options (date, cashier, payment status)

#### POST /api/pos/orders (Create Order)

- ✓ Requires SUPERADMIN | ADMIN | CASHIER
- ✓ Accepts `items[]` and `paymentMethod`
- ✓ Calculates total from products
- ✓ Creates OrderItems
- ✓ Calls `decreaseInventoryOnPayment()`
- **Current behavior:** Immediately sets status to 'PAID' (assumes instant payment)
- **Issues:**
  - No terminal payment flow support (pending/confirm)
  - No stock safety checks (what if qty > available?)
  - No cashier_id tracking
  - No receipt_number generation
  - No payment record creation

**Payload Example:**

```json
{
  "items": [{ "productId": "gen-1", "size": "L", "quantity": 2 }],
  "paymentMethod": "CASH"
}
```

### 3. Stock/Inventory Logic

**File:** `lib/inventory-utils.ts`

**Current function:** `decreaseInventoryOnPayment(items)`

- Decreases inventory quantity for each item
- Uses size-based inventory lookup
- **Issues:**
  - Not atomic (race conditions possible with concurrent orders)
  - No validation that stock >= quantity before decrement
  - No stock movement audit trail

**Related endpoints:**

- GET/POST `/api/inventory` (admin-only, size-based management)

### 4. Authentication & Authorization

**File:** `middleware/auth.ts`

**Functions:**

- `authenticate(req)` - extracts & verifies JWT token
- `requireAuth(req)` - throws if not authenticated
- `requireRole(req, allowedRoles)` - checks role
- `requireAdmin(req)` - SUPERADMIN | ADMIN only
- `requireSuperAdmin(req)` - SUPERADMIN only

**Roles Defined:** 'SUPERADMIN' | 'ADMIN' | 'CASHIER' | 'USER'

**Status:** ✓ Infrastructure ready. POS endpoints already use `requireRole(req, ['SUPERADMIN', 'ADMIN', 'CASHIER'])`

### 5. Database Layer

**File:** `lib/db.ts`

- Supports **filesystem** (dev) and **Blob Storage** (production)
- Collections stored as JSON files in `/data/collections/`
- Functions: `getAll()`, `create()`, `getById()`, `update()`, `delete()` (sync)
- Async versions: `getAllAsync()`, `createAsync()`, etc.

**Status:**

- ✓ No built-in transactions
- Need atomic stock operations: use conditional update or lock mechanism

### 6. Payment Provider Layer

**Current Status:** No abstraction layer exists

**Needed for PHASE 2:**

- Create `/lib/terminal/` services
- Interface: `TerminalProvider`
- Implementation: `MockTerminalProvider`
- Environment: `TERMINAL_PROVIDER=mock`, `TERMINAL_MOCK_MODE=success|fail`

---

## Phase 2 Implementation Plan

### A. Data Model Updates

**Files to modify:** `types/index.ts`

1. **Extend Order interface:**

   ```typescript
   export interface Order {
     // ... existing fields
     channel?: "online" | "offline"; // alias for source
     payment_status?: "pending" | "paid" | "failed" | "refunded"; // separate from order status
     payment_method?: "cash" | "terminal" | "manual_card";
     terminal_transaction_id?: string; // for terminal payments
     cashier_id?: string; // ref to User
     receipt_number?: string; // human-friendly: RCP-20250103-001
   }
   ```

2. **Extend OrderItem interface:**

   ```typescript
   product_name?: string;  // snapshot of product name
   sku?: string;  // snapshot of product SKU
   ```

3. **Extend Product interface:**

   ```typescript
   stock?: number;  // main stock quantity
   active_for_pos?: boolean;  // visibility in POS
   sku?: string;  // barcode/SKU
   ```

4. **Create StockMovement interface:**
   ```typescript
   export interface StockMovement {
     id: string;
     productId: string;
     delta: number; // +5 or -2
     reason: "purchase" | "manual_adjustment" | "return" | "damage";
     orderId?: string;
     userId: string; // who made the change
     notes?: string;
     createdAt: string;
   }
   ```

### B. Terminal Provider Abstraction

**New directory:** `lib/terminal/`

Files:

- `interface.ts` - TerminalProvider interface
- `mock-provider.ts` - Mock implementation
- `factory.ts` - Provider factory based on env

```typescript
// lib/terminal/interface.ts
export interface TerminalProvider {
  initiate(
    amount: number,
    metadata: any
  ): Promise<{ transactionId: string; status: string }>;
  confirm(transactionId: string): Promise<{ success: boolean; status: string }>;
  cancel(transactionId: string): Promise<{ success: boolean }>;
}

export interface TerminalTransaction {
  id: string;
  amount: number;
  status: "initiated" | "confirmed" | "failed" | "cancelled";
  createdAt: string;
}
```

### C. POS Endpoints - Expanded Routes

**Current:** `/api/pos/orders` (GET/POST)

**Expand POST /api/pos/orders:**

- Input validation: payment_method required
- If `cash` → `payment_status = 'paid'` immediately
- If `terminal` → `payment_status = 'pending'`, get transactionId
- Atomic stock decrement with safety check
- Create receipt_number (sequential or timestamp-based)
- Create Payment record
- Create StockMovement records

**New endpoints:**

1. `POST /api/pos/payments/confirm`

   - Input: `transactionId` or `orderId`
   - Transitions payment_status from pending → paid
   - Updates Order status
   - Decreases stock (if not already done)

2. `GET /api/pos/products`

   - Query params: `search?`, `limit?`, `offset?`
   - Filters: `active_for_pos = true` AND `stock > 0`
   - Returns: `id`, `name`, `price`, `stock`, `sku`
   - **Difference from /api/products:** POS-only visibility

3. `GET /api/pos/orders/:id/receipt-data`

   - Returns normalized receipt JSON
   - Includes: order, items, totals, payment info, receipt_number, cashier name

4. (Optional) `POST /api/pos/orders/:id/confirm-payment`
   - Legacy endpoint (alias for /api/pos/payments/confirm)

### D. Inventory Safety

**New function in `lib/inventory-utils.ts`:**

```typescript
export function atomicDecreaseStock(
  productId: string,
  quantity: number,
  reason: "purchase" | "manual_adjustment"
): boolean {
  // 1. Check current stock >= quantity
  // 2. Update stock with condition check
  // 3. Create StockMovement record
  // 4. Return success/failure
}
```

**Fallback for non-transactional DB:**

- Use optimistic locking (check + update in quick succession)
- Log failures for admin review

### E. Authorization (Already in place)

- ✓ `/api/pos/*` endpoints require CASHIER+ role
- ✓ `/api/admin/*` endpoints require ADMIN+ role

---

## Phase 3 Implementation Plan (Frontend)

### Routes to Add

- `/pos` - Main POS/cashier mode
- `/pos/orders` - POS orders list (for cashier/admin)
- `/pos/receipt/:orderId` - Print-friendly receipt

### Admin Extensions

- Extend `/admin` dashboard with "POS Products" management
- Extend `/admin` with "POS Orders" list

---

## Files to Modify/Create

### Backend

1. **types/index.ts** - Extend Order, Product, OrderItem; add StockMovement
2. **lib/terminal/** - New directory with abstraction
3. **lib/inventory-utils.ts** - Add atomic stock functions
4. **app/api/pos/orders/route.ts** - Expand POST, add middleware for terminal flow
5. **app/api/pos/payment/route.ts** - NEW: payment confirmation
6. **app/api/pos/products/route.ts** - NEW: POS product listing
7. **.env.example** - Document TERMINAL_PROVIDER, TERMINAL_MOCK_MODE

### Frontend

1. **src/pages/pos/Main.jsx** - Extend with full POS UI
2. **src/pages/pos/Receipt.jsx** - NEW: print receipt page
3. **src/components/pos/POSLayout.jsx** - Extend with features
4. **src/pages/Admin/POSManagement.jsx** - NEW: admin POS section
5. **src/services/pos.service.js** - NEW: POS API service layer

---

## Testing Checklist (Phase 4)

See: `OFFLINE_POS_TESTS.md`

---

## Next Steps

1. ✓ Phase 0: Discovery (COMPLETED)
2. → Phase 1: Define requirements in detail
3. → Phase 2: Implement backend changes
4. → Phase 3: Implement frontend
5. → Phase 4: Manual testing
