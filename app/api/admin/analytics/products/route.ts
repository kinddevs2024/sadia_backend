import { NextRequest } from 'next/server';
import { getAllAsync } from '@/lib/db';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order, OrderItem, Product } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/analytics/products:
 *   get:
 *     summary: Get product sales analytics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product sales analytics
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const { searchParams } = req.nextUrl;
    const sourceFilter = searchParams.get('source') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const orders = (await getAllAsync<Order>('orders')).filter((o) => {
      if (sourceFilter && o.source !== sourceFilter) return false;
      if (o.status !== 'PAID' && o.status !== 'COMPLETED') return false;
      const createdAt = new Date(o.createdAt);
      if (start && createdAt < start) return false;
      if (end && createdAt > end) return false;
      return true;
    });

    const orderItems = await getAllAsync<OrderItem>('orderItems');
    const products = await getAllAsync<Product>('products');

    // Группировка по товарам
    const productSalesMap = new Map<string, {
      productId: string;
      productName: string;
      totalQuantity: number;
      totalRevenue: number;
      ordersCount: number;
      dates: Map<string, { quantity: number; revenue: number }>;
    }>();

    // Обработка всех заказов
    orders.forEach(order => {
      const orderItemsForOrder = orderItems.filter(item => item.orderId === order.id);
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];

      orderItemsForOrder.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        if (!productSalesMap.has(item.productId)) {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            productName: product.name,
            totalQuantity: 0,
            totalRevenue: 0,
            ordersCount: 0,
            dates: new Map(),
          });
        }

        const productSales = productSalesMap.get(item.productId)!;
        productSales.totalQuantity += item.quantity;
        productSales.totalRevenue += (item.price || product.price) * item.quantity;

        // Группировка по датам
        if (!productSales.dates.has(orderDate)) {
          productSales.dates.set(orderDate, { quantity: 0, revenue: 0 });
        }
        const dateData = productSales.dates.get(orderDate)!;
        dateData.quantity += item.quantity;
        dateData.revenue += (item.price || product.price) * item.quantity;
      });
    });

    // Подсчет уникальных заказов для каждого товара
    orders.forEach(order => {
      const orderItemsForOrder = orderItems.filter(item => item.orderId === order.id);
      const productIdsInOrder = new Set(orderItemsForOrder.map(item => item.productId));
      
      productIdsInOrder.forEach(productId => {
        const productSales = productSalesMap.get(productId);
        if (productSales) {
          productSales.ordersCount += 1;
        }
      });
    });

    // Преобразуем в массив и сортируем по выручке
    const productSales = Array.from(productSalesMap.values())
      .map(product => ({
        ...product,
        dates: Array.from(product.dates.entries()).map(([date, data]) => ({
          date,
          quantity: data.quantity,
          revenue: data.revenue,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return successResponse({
      products: productSales,
      totalProducts: productSales.length,
      totalRevenue: productSales.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalQuantity: productSales.reduce((sum, p) => sum + p.totalQuantity, 0),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get product analytics error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
