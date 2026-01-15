import { NextRequest } from 'next/server';
import { getByIdAsync, getAllAsync } from '@/lib/db';
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

    const order = await getByIdAsync<Order>('orders', id);

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Only allow access to POS orders
    if (order.channel !== 'offline' && order.source !== 'POS' && order.source !== 'OFFLINE') {
      return errorResponse('Not a POS order', 400);
    }

    // Get order items
    const allOrderItems = await getAllAsync<OrderItem>('orderItems');
    const orderItems = allOrderItems.filter(oi => oi.orderId === order.id);

    // Get cashier details
    let cashierName = 'Cashier';
    if (order.cashier_id) {
      const users = await getAllAsync<User>('users');
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
      size: item.size,
      subtotal: item.price * item.quantity
    }));

    // Calculate totals
    const subtotal = receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = 0; // Implement tax logic if needed
    const total = subtotal + tax;

    // Format date/time
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('ru-RU');
    const timeStr = orderDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
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
      payment_method: order.payment_method || order.paymentMethod || 'CASH',
      payment_status: order.payment_status || (order.status === 'PAID' ? 'paid' : 'pending'),
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
