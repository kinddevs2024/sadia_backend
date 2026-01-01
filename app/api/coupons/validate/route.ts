import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Coupon } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Coupon invalid or expired
 *       404:
 *         description: Coupon not found
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return errorResponse('Coupon code is required', 400);
    }

    const coupons = getAll<Coupon>('coupons');
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) {
      return errorResponse('Coupon not found', 404);
    }

    // Check if coupon is already used (if it's one-time)
    const isOneTime = (coupon as any).oneTime || coupon.oneTimeUse;
    if (isOneTime && coupon.used) {
      return errorResponse('Coupon has already been used', 400);
    }

    // Check if coupon has expired
    const expiresAt = (coupon as any).expiresAt || coupon.validUntil;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return errorResponse('Coupon has expired', 400);
    }

    return successResponse({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount: coupon.discount,
        discountType: coupon.discountType,
      },
    });
  } catch (error: any) {
    console.error('Validate coupon error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}


