import { NextRequest } from 'next/server';
import { getAllAsync } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Product, Inventory } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pos/products
 * Returns only POS-активные товары с учётом оффлайн-цены
 * 
 * Search: Поиск работает по всем полям товара (название, описание, SKU, ID, цена, категория и т.д.)
 * Кассир может ввести любое значение, связанное с товаром, и товар будет найден
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
    const inventory = await getAllAsync<Inventory>('inventory');

    // Вычисляем stock из inventory для каждого товара (сумма quantity по всем размерам)
    const productStockMap = new Map<string, number>();
    inventory.forEach((inv) => {
      const currentStock = productStockMap.get(inv.productId) || 0;
      productStockMap.set(inv.productId, currentStock + (inv.quantity || 0));
    });

    // Обновляем stock в товарах из inventory
    products = products.map((p) => ({
      ...p,
      stock: productStockMap.get(p.id) ?? p.stock ?? 0,
    }));

    // Только активные для POS, если не отключено
    if (activeOnly !== 'false') {
      products = products.filter(p => p.active_for_pos !== false);
    }

    // Фильтр по остатку (используем вычисленный stock из inventory)
    if (hasStock !== 'false') {
      products = products.filter(p => (p.stock ?? 0) > 0);
    }

    // Поиск по всем полям товара
    if (search) {
      products = products.filter((p) => {
        // Функция для безопасного преобразования значения в строку для поиска
        const searchInField = (value: any): boolean => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(search);
        };

        // Поиск по всем текстовым полям товара
        return (
          searchInField(p.name) ||
          searchInField(p.slug) ||
          searchInField(p.description) ||
          searchInField(p.sku) ||
          searchInField(p.id) ||
          searchInField(p.price) ||
          searchInField(p.costPrice) ||
          searchInField(p.profit) ||
          searchInField(p.offline_price) ||
          searchInField(p.categoryId) ||
          searchInField(p.stock)
        );
      });
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

