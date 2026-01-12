import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order, OrderItem, User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/pos/orders/{id}:
 *   get:
 *     summary: Get POS order details (Cashier/Admin only)
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
 *         description: Order details with items
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
    if (order.channel !== 'offline' && order.source !== 'POS') {
      return errorResponse('Not a POS order', 400);
    }

    // Get order items
    const orderItems = getAll<OrderItem>('orderItems').filter(oi => oi.orderId === order.id);

    // Get cashier details (if available)
    let cashier = null;
    if (order.cashier_id) {
      const users = getAll<User>('users');
      cashier = users.find(u => u.id === order.cashier_id);
    }

    return successResponse({
      order,
      items: orderItems,
      cashier: cashier ? {
        id: cashier.id,
        firstName: cashier.firstName,
        lastName: cashier.lastName,
        email: cashier.email
      } : null
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get POS order error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
