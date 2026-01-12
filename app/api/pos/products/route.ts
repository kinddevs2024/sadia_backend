import { NextRequest } from 'next/server';
import { getAllAsync } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Product } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pos/products
 * Returns only POS-активные товары с учётом оффлайн-цены
 */
export async function GET(req: NextRequest) {
  try {
    requireRole(req, ['SUPERADMIN', 'ADMIN', 'CASHIER']);

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const activeOnly = searchParams.get('active') ?? 'true';
    const hasStock = searchParams.get('has_stock') ?? 'true';

    let products = await getAllAsync<Product>('products');

    // Только активные для POS, если не отключено
    if (activeOnly !== 'false') {
      products = products.filter(p => p.active_for_pos !== false);
    }

    // Фильтр по остатку
    if (hasStock !== 'false') {
      products = products.filter(p => (p.stock ?? 0) > 0);
    }

    // Поиск по названию или SKU
    if (search) {
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          p.sku?.toLowerCase().includes(search)
      );
    }

    // Пагинация
    const total = products.length;
    const paged = products
      .sort(
        (a, b) =>
          (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) -
          (a.updatedAt ? new Date(a.updatedAt).getTime() : 0)
      )
      .slice(offset, offset + limit);

    // Подставляем оффлайн-цену в price (для фронта POS)
    const mapped = paged.map(product => ({
      ...product,
      price: product.offline_price ?? product.price,
    }));

    return successResponse({
      data: mapped,
      meta: { total, limit, offset },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get POS products error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

