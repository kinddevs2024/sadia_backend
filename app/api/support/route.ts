import { NextRequest } from 'next/server';
import { create } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { SupportMessage } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/support:
 *   post:
 *     summary: Create support message
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - message
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Support message created
 *       400:
 *         description: Bad request
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { email, message } = data;

    if (!email || !message) {
      return errorResponse('Email and message are required', 400);
    }

    const supportMessage = create<SupportMessage>('supportMessages', {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      message,
      responded: false,
      createdAt: new Date().toISOString(),
    });

    return successResponse(supportMessage, 201);
  } catch (error: any) {
    console.error('Create support message error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

