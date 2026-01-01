import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Inventory } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/telegram/inventory:
 *   get:
 *     summary: Get inventory for Telegram bot
 *     tags: [Telegram]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory data
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    const inventory = getAll<Inventory>('inventory');

    if (productId) {
      const filtered = inventory.filter((inv) => inv.productId === productId);
      return successResponse(filtered);
    }

    return successResponse(inventory);
  } catch (error: any) {
    console.error('Get Telegram inventory error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

