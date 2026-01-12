import { NextRequest } from 'next/server';
import { getAllAsync, countAsync } from '@/lib/db';
import { requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const orders = await getAllAsync<Order>('orders');
    
    // Получаем начало сегодняшнего дня (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Фильтруем заказы за сегодня
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= today && orderDate <= todayEnd;
    });

    // Статистика за сегодня
    const todayRevenue = todayOrders
      .filter(o => o.status === 'PAID' || o.status === 'COMPLETED')
      .reduce((sum, order) => sum + (order.total || 0), 0);
    const todayOrdersCount = todayOrders.length;

    // Общая статистика за все время
    const allTimeRevenue = orders
      .filter(o => o.status === 'PAID' || o.status === 'COMPLETED')
      .reduce((sum, order) => sum + (order.total || 0), 0);
    const allTimeOrdersCount = orders.length;

    const stats = {
      today: {
        revenue: todayRevenue,
        orders: todayOrdersCount,
      },
      allTime: {
        revenue: allTimeRevenue,
        orders: allTimeOrdersCount,
      },
      // Дополнительная статистика для обратной совместимости
      totalProducts: await countAsync('products'),
      totalCategories: await countAsync('categories'),
      totalOrders: allTimeOrdersCount,
      totalUsers: await countAsync('users'),
      totalRevenue: allTimeRevenue,
      pendingOrders: orders.filter((o: Order) => o.status === 'PENDING').length,
      completedOrders: orders.filter((o: Order) => o.status === 'COMPLETED').length,
      bySource: {
        ONLINE: orders.filter((o: Order) => o.source === 'ONLINE').length,
        POS: orders.filter((o: Order) => o.source === 'POS').length,
        TELEGRAM: orders.filter((o: Order) => o.source === 'TELEGRAM').length,
      },
    };

    return successResponse(stats);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get dashboard stats error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

