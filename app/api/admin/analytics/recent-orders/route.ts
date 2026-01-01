import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/analytics/recent-orders:
 *   get:
 *     summary: Get recent orders (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent orders
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    let orders = getAll<Order>('orders');

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Limit results
    orders = orders.slice(0, limit);

    return successResponse(orders);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get recent orders error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

