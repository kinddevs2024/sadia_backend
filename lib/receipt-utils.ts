/**
 * Receipt/Order number generation utilities for POS
 */

import { getAll } from './db';
import { Order } from '@/types';

/**
 * Generate a sequential receipt number in format: RCP-YYYYMMDD-SEQ
 * Example: RCP-20250103-001, RCP-20250103-002
 * @param createdAt ISO timestamp
 * @returns Formatted receipt number
 */
export function generateReceiptNumber(createdAt: string): string {
  const date = new Date(createdAt);
  
  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Count orders created today with receipt numbers
  const orders = getAll<Order>('orders');
  const todayOrders = orders.filter(o => 
    o.receipt_number?.startsWith(`RCP-${dateStr}`)
  );

  // Generate sequence number (1-indexed, padded to 3 digits)
  const seq = (todayOrders.length + 1).toString().padStart(3, '0');

  return `RCP-${dateStr}-${seq}`;
}

/**
 * Generate legacy order number (for online orders, if needed)
 * Format: ORD-TIMESTAMP-RANDOM
 * @returns Order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
