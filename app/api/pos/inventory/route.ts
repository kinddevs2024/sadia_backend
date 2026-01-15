import { NextRequest } from 'next/server';
import { getAllAsync } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Inventory } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/pos/inventory:
 *   get:
 *     summary: Get inventory for POS (Cashier/Admin only)
 *     tags: [POS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *     responses:
 *       200:
 *         description: Inventory data
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireRole(req, ['SUPERADMIN', 'ADMIN', 'CASHIER']);

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    const inventory = await getAllAsync<Inventory>('inventory');

    if (productId) {
      const filtered = inventory.filter((inv) => inv.productId === productId);
      return successResponse(filtered);
    }

    return successResponse(inventory);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get POS inventory error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
