import { NextRequest } from 'next/server';
import { getAllAsync } from '@/lib/db';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order, OrderItem } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get analytics data (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
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
    const paymentMethod = searchParams.get('paymentMethod') || '';

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const orders = (await getAllAsync<Order>('orders')).filter((o) => {
      if (sourceFilter && o.source !== sourceFilter) return false;
      if (paymentMethod && o.paymentMethod !== paymentMethod && o.payment_method !== paymentMethod) return false;
      const createdAt = new Date(o.createdAt);
      if (start && createdAt < start) return false;
      if (end && createdAt > end) return false;
      return true;
    });
    const orderItems = await getAllAsync<OrderItem>('orderItems');

    // Группировка по дате и источнику
    const analyticsMap = new Map<string, {
      date: string;
      source: string;
      totalRevenue: number;
      totalOrders: number;
      productsSold: number;
      paidOrders: number;
      completedOrders: number;
      paidRevenue: number;
      completedRevenue: number;
    }>();

    // Обработка всех заказов
    orders.forEach(order => {
      // Получаем только оплаченные и завершенные заказы
      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        const date = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `${date}-${order.source}`;

        if (!analyticsMap.has(key)) {
          analyticsMap.set(key, {
            date,
            source: order.source,
            totalRevenue: 0,
            totalOrders: 0,
            productsSold: 0,
            paidOrders: 0,
            completedOrders: 0,
            paidRevenue: 0,
            completedRevenue: 0,
          });
        }

        const analyticsItem = analyticsMap.get(key)!;
        const orderTotal = order.total || 0;
        analyticsItem.totalRevenue += orderTotal;
        analyticsItem.totalOrders += 1;
        if (order.status === 'PAID') {
          analyticsItem.paidOrders += 1;
          analyticsItem.paidRevenue += orderTotal;
        }
        if (order.status === 'COMPLETED') {
          analyticsItem.completedOrders += 1;
          analyticsItem.completedRevenue += orderTotal;
          analyticsItem.paidOrders += 1;
          analyticsItem.paidRevenue += orderTotal;
        }

        // Подсчитываем количество товаров в заказе
        const items = orderItems.filter(item => item.orderId === order.id);
        analyticsItem.productsSold += items.reduce((sum, item) => sum + item.quantity, 0);
      }
    });

    // Преобразуем Map в массив
    const analytics = Array.from(analyticsMap.values());

    // Сортируем по дате (новые первыми)
    analytics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Подсчитываем общие итоги
    const totals = {
      totalRevenue: analytics.reduce((sum, item) => sum + item.totalRevenue, 0),
      totalOrders: analytics.reduce((sum, item) => sum + item.totalOrders, 0),
      productsSold: analytics.reduce((sum, item) => sum + item.productsSold, 0),
      paidOrders: analytics.reduce((sum, item) => sum + item.paidOrders, 0),
      completedOrders: analytics.reduce((sum, item) => sum + item.completedOrders, 0),
      paidRevenue: analytics.reduce((sum, item) => sum + item.paidRevenue, 0),
      completedRevenue: analytics.reduce((sum, item) => sum + item.completedRevenue, 0),
    };

    return successResponse({
      data: analytics,
      totals,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get analytics error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

