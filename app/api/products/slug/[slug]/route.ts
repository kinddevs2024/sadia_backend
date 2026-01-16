import { NextRequest } from 'next/server';
import { getAllAsync, findOneAsync } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Product, Category, Inventory } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/products/slug/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    console.log(`Fetching product by slug: ${params.slug}`);
    
    const product = await findOneAsync<Product>('products', (p) => p.slug === params.slug);

    if (!product) {
      console.log(`Product not found for slug: ${params.slug}`);
      return errorResponse('Product not found', 404);
    }

    console.log(`Product found: ${product.id}, name: ${product.name}`);

    // Populate category
    const categories = await getAllAsync<Category>('categories');
    const category = categories.find(cat => cat.id === product.categoryId) || null;
    console.log(`Category found: ${category ? category.name : 'null'}`);

    // Populate inventory
    const inventory = await getAllAsync<Inventory>('inventory');
    const productInventory = inventory.filter(inv => inv.productId === product.id);
    console.log(`Inventory items for product ${product.id}: ${productInventory.length}`);

    // Get images (if stored separately, otherwise use product.images)
    const images = product.images || [];
    console.log(`Images count: ${images.length}`);

    const response = {
      ...product,
      category,
      inventory: productInventory,
      images: images.sort((a, b) => (a.order || 0) - (b.order || 0)),
    };

    console.log(`Returning product with ${productInventory.length} inventory items`);
    return successResponse(response);
  } catch (error: any) {
    console.error('Get product by slug error:', error);
    console.error('Error stack:', error.stack);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

