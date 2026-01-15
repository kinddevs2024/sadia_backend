import axios from 'axios';
import { getAllAsync } from './db';
import { User } from '@/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001'; // URL where bot is running

/**
 * Send notification to Telegram user by phone number
 */
export async function sendTelegramNotificationByPhone(phone: string, message: string): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN is not set, skipping Telegram notification');
      return false;
    }

    // Get telegramUserId by phone
    const userResponse = await axios.get(`${API_URL}/telegram/user-by-phone?phone=${encodeURIComponent(phone)}`);
    const telegramUserId = userResponse.data.data?.telegramUserId;

    if (!telegramUserId) {
      console.log(`[TELEGRAM] No telegramUserId found for phone ${phone}, skipping notification`);
      return false;
    }

    // Send notification via bot API
    const botResponse = await axios.post(`${API_URL}/telegram/send-notification`, {
      telegramUserId,
      message,
    });

    return botResponse.data.success === true;
  } catch (error: any) {
    console.error('[TELEGRAM] Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification to Telegram user by telegramUserId
 */
export async function sendTelegramNotificationByUserId(telegramUserId: string | number, message: string): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN is not set, skipping Telegram notification');
      return false;
    }

    // Send notification via bot API
    const botResponse = await axios.post(`${API_URL}/telegram/send-notification`, {
      telegramUserId,
      message,
    });

    return botResponse.data.success === true;
  } catch (error: any) {
    console.error('[TELEGRAM] Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification to all admins when a product is sold
 */
export async function notifyAdminsAboutSale(order: any, orderItems: any[]): Promise<void> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN is not set, skipping admin notification');
      return;
    }

    // Get all admin users (ADMIN and SUPERADMIN)
    const users = await getAllAsync<User>('users');
    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN');

    if (admins.length === 0) {
      console.log('[TELEGRAM] No admins found to notify');
      return;
    }

    // Format order items
    const itemsList = orderItems.map((item, index) => {
      const sizeText = item.size ? ` (Размер: ${item.size})` : '';
      return `${index + 1}. ${item.product_name || 'Товар'}${sizeText} - ${item.quantity} шт. × ${item.price.toLocaleString()} сум`;
    }).join('\n');

    // Format message
    const sourceLabels: { [key: string]: string } = {
      'ONLINE': '🌐 Онлайн магазин',
      'POS': '🏪 POS терминал',
      'OFFLINE': '🏬 Оффлайн магазин',
      'TELEGRAM': '📱 Telegram бот',
    };

    const paymentLabels: { [key: string]: string } = {
      'CASH': '💵 Наличные',
      'TERMINAL': '💳 Терминал',
      'TRANSFER': '🏦 Перевод',
    };

    const message = `🛍️ *Новая продажа!*\n\n` +
      `📦 Номер заказа: *${order.orderNumber || order.receipt_number || order.id}*\n` +
      `📍 Источник: ${sourceLabels[order.source] || order.source}\n` +
      `💰 Сумма: *${order.total.toLocaleString()} сум*\n` +
      `💳 Способ оплаты: ${paymentLabels[order.payment_method || order.paymentMethod] || order.payment_method || 'Не указан'}\n` +
      `📊 Статус: ${order.status === 'PAID' ? '✅ Оплачен' : order.status === 'PENDING' ? '⏳ Ожидает оплаты' : order.status}\n\n` +
      `📋 *Товары:*\n${itemsList}\n\n` +
      `⏰ ${new Date(order.createdAt).toLocaleString('ru-RU')}`;

    // Send notification to all admins who have telegramUserId
    const notificationPromises = admins
      .filter(admin => admin.telegramUserId)
      .map(admin => 
        sendTelegramNotificationByUserId(admin.telegramUserId!, message)
          .catch(err => {
            console.error(`[TELEGRAM] Failed to notify admin ${admin.email}:`, err);
            return false;
          })
      );

    await Promise.all(notificationPromises);
    console.log(`[TELEGRAM] Notified ${notificationPromises.length} admin(s) about new sale`);
  } catch (error: any) {
    console.error('[TELEGRAM] Error notifying admins:', error);
  }
}

