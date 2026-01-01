import { NextRequest } from 'next/server';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { uploadFileToBlob } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload file (Admin only)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       403:
 *         description: Forbidden
 */
export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('Invalid file type. Only images are allowed.', 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return errorResponse('File size exceeds 5MB limit', 400);
    }

    // Upload to Vercel Blob Storage
    const url = await uploadFileToBlob(file, file.name);
    
    // Extract filename from URL for response
    const filename = url.substring(url.lastIndexOf('/') + 1);

    return successResponse({ url, filename });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Upload error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

