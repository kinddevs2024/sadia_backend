import { NextRequest } from 'next/server';
import { removeAsync } from '@/lib/db';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Admin]
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
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       403:
 *         description: Forbidden
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(req);

    const deleted = await removeAsync('products', params.id);

    if (!deleted) {
      return errorResponse('Product not found', 404);
    }

    return successResponse({ message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Delete product error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
