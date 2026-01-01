import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { requireSuperAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (SuperAdmin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireSuperAdmin(req);

    const users = getAll<User>('users').map(({ password, ...user }) => user);
    return successResponse(users);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get admin users error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

