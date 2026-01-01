import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
export async function GET(req: NextRequest) {
  return successResponse({ status: 'ok', timestamp: new Date().toISOString() });
}

