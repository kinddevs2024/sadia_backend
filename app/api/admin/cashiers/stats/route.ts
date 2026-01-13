import { NextRequest } from 'next/server';
import { getAll } from '@/lib/db';
import { requireRole } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { Order, OrderItem, User, Product } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/cashiers/stats:
 *   get:
 *     summary: Get cashier statistics (Admin/SuperAdmin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: string
 *         description: Filter by specific cashier ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Cashier statistics
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    requireRole(req, ['SUPERADMIN', 'ADMIN']);

    const searchParams = req.nextUrl.searchParams;
    const cashierId = searchParams.get('cashierId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get all orders from POS/OFFLINE sources
    let orders = getAll<Order>('orders').filter(
      o => (o.source === 'POS' || o.source === 'OFFLINE') && o.status === 'PAID'
    );

    // Filter by date range
    if (dateFrom || dateTo) {
      orders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        if (dateFrom && new Date(dateFrom) > orderDate) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (toDate < orderDate) return false;
        }
        return true;
      });
    }

    // Filter by cashier if specified
    if (cashierId) {
      orders = orders.filter(o => o.cashier_id === cashierId);
    }

    // Get all order items
    const orderItems = getAll<OrderItem>('orderItems');
    const products = getAll<Product>('products');

    // Get all cashiers
    const users = getAll<User>('users');
    const cashiers = users.filter(u => u.role === 'CASHIER' || u.role === 'ADMIN' || u.role === 'SUPERADMIN');

    // Group statistics by cashier
    const cashierStats: Record<string, {
      cashierId: string;
      cashierName: string;
      cashierEmail: string;
      totalOrders: number;
      totalRevenue: number;
      productStats: Record<string, {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }>;
    }> = {};

    // Initialize stats for all cashiers
    cashiers.forEach(cashier => {
      if (!cashierId || cashier.id === cashierId) {
        cashierStats[cashier.id] = {
          cashierId: cashier.id,
          cashierName: `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim() || cashier.email,
          cashierEmail: cashier.email,
          totalOrders: 0,
          totalRevenue: 0,
          productStats: {}
        };
      }
    });

    // Process orders
    orders.forEach(order => {
      if (!order.cashier_id) return;

      const cashierId = order.cashier_id;
      if (!cashierStats[cashierId]) {
        const cashier = users.find(u => u.id === cashierId);
        if (cashier) {
          cashierStats[cashierId] = {
            cashierId: cashier.id,
            cashierName: `${cashier.firstName || ''} ${cashier.lastName || ''}`.trim() || cashier.email,
            cashierEmail: cashier.email,
            totalOrders: 0,
            totalRevenue: 0,
            productStats: {}
          };
        } else {
          return; // Skip if cashier not found
        }
      }

      const stats = cashierStats[cashierId];
      stats.totalOrders++;
      stats.totalRevenue += order.total;

      // Get order items for this order
      const items = orderItems.filter(item => item.orderId === order.id);
      items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const productName = product?.name || item.product_name || 'Unknown Product';

        if (!stats.productStats[item.productId]) {
          stats.productStats[item.productId] = {
            productId: item.productId,
            productName,
            quantity: 0,
            revenue: 0
          };
        }

        stats.productStats[item.productId].quantity += item.quantity;
        stats.productStats[item.productId].revenue += item.price * item.quantity;
      });
    });

    // Convert to array and sort by total revenue
    const statsArray = Object.values(cashierStats)
      .filter(s => s.totalOrders > 0) // Only include cashiers with sales
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Convert productStats to arrays
    statsArray.forEach(stat => {
      stat.productStats = Object.values(stat.productStats).sort((a, b) => b.revenue - a.revenue) as any;
    });

    return successResponse({
      cashiers: statsArray,
      summary: {
        totalCashiers: statsArray.length,
        totalOrders: statsArray.reduce((sum, s) => sum + s.totalOrders, 0),
        totalRevenue: statsArray.reduce((sum, s) => sum + s.totalRevenue, 0)
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return errorResponse(error.message, 403);
    }
    console.error('Get cashier stats error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
