/**
 * TerminalProvider interface for payment processing
 * Abstraction layer to support multiple terminal payment providers
 */

export interface TerminalProvider {
  /**
   * Initiate a payment transaction
   * @param amount Amount in smallest currency unit (e.g., fils)
   * @param metadata Additional context (orderId, items, cashierId, etc.)
   * @returns transactionId and initial status
   */
  initiate(amount: number, metadata: any): Promise<{
    transactionId: string;
    status: string;
    timestamp: string;
  }>;

  /**
   * Confirm/finalize a pending transaction
   * @param transactionId ID from initiate()
   * @returns success boolean and final status
   */
  confirm(transactionId: string): Promise<{
    success: boolean;
    status: string;
    message?: string;
  }>;

  /**
   * Cancel a pending transaction
   * @param transactionId ID to cancel
   */
  cancel(transactionId: string): Promise<{
    success: boolean;
    message?: string;
  }>;
}

/**
 * Terminal transaction record for audit trail
 */
export interface TerminalTransaction {
  id: string;
  transactionId: string;     // External provider transaction ID
  orderId: string;
  amount: number;
  status: 'initiated' | 'confirmed' | 'failed' | 'cancelled';
  initiatedAt: string;
  confirmedAt?: string;
  metadata?: any;
}
