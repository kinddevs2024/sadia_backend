import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order, OrderItem, User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/pos/receipts/{id}:
 *   get:
 *     summary: Get formatted receipt data for printing
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipt data in printable format
 *       404:
 *         description: Order not found
 *       403:
 *         description: Forbidden
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireRole(req, ['SUPERADMIN', 'ADMIN', 'CASHIER']);

    const { id } = params;

    const orders = getAll<Order>('orders');
    const order = orders.find(o => o.id === id);

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Only allow access to POS orders
    if (order.channel !== 'offline' && order.source !== 'POS' && order.source !== 'OFFLINE') {
      return errorResponse('Not a POS order', 400);
    }

    // Get order items
    const orderItems = getAll<OrderItem>('orderItems').filter(oi => oi.orderId === order.id);

    // Get cashier details
    let cashierName = 'Cashier';
    if (order.cashier_id) {
      const users = getAll<User>('users');
      const cashier = users.find(u => u.id === order.cashier_id);
      if (cashier) {
        cashierName = `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim() || cashier.email;
      }
    }

    // Format items for receipt
    const receiptItems = orderItems.map(item => ({
      name: item.product_name || item.productId,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity
    }));

    // Calculate totals
    const subtotal = receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0; // Implement tax logic if needed
    const total = subtotal + tax;

    // Format date/time
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const timeStr = orderDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return successResponse({
      receipt_number: order.receipt_number || order.orderNumber,
      date: dateStr,
      time: timeStr,
      cashier: cashierName,
      items: receiptItems,
      subtotal,
      tax,
      total,
      payment_method: order.paymentMethod || order.payment_method,
      payment_status: order.payment_status || order.status,
      terminal_transaction_id: order.terminal_transaction_id
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get receipt error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
