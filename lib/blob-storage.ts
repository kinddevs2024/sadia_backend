import { put } from '@vercel/blob';

/**
 * Upload file to Vercel Blob Storage
 * @param file - File to upload
 * @param filename - Optional custom filename (will generate if not provided)
 * @returns URL of the uploaded file
 */
export async function uploadFileToBlob(
  file: File | Blob,
  filename?: string
): Promise<string> {
  try {
    // Generate filename if not provided
    let blobFilename: string;
    
    if (filename) {
      // Use provided filename, add uploads/ prefix if not already present
      blobFilename = filename.startsWith('uploads/') ? filename : `uploads/${filename}`;
    } else {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file instanceof File && file.name
        ? file.name.substring(file.name.lastIndexOf('.'))
        : '';
      blobFilename = `uploads/${timestamp}-${randomString}${fileExtension}`;
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Vercel Blob
    const { url } = await put(blobFilename, buffer, {
      access: 'public',
      contentType: file instanceof File ? file.type : undefined,
    });

    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload file buffer to Vercel Blob Storage
 * @param buffer - Buffer to upload
 * @param filename - Filename for the blob
 * @param contentType - Optional content type
 * @returns URL of the uploaded file
 */
export async function uploadBufferToBlob(
  buffer: Buffer,
  filename: string,
  contentType?: string
): Promise<string> {
  try {
    const { url } = await put(filename, buffer, {
      access: 'public',
      contentType,
    });

    return url;
  } catch (error) {
    console.error('Error uploading buffer to Vercel Blob:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

