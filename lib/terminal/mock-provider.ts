/**
 * Mock Terminal Provider for development and testing
 * Simulates terminal payment processing with configurable success/fail behavior
 */

import { TerminalProvider } from './interface';

const MOCK_MODE = process.env.TERMINAL_MOCK_MODE || 'success'; // success | fail | timeout

export class MockTerminalProvider implements TerminalProvider {
  async initiate(amount: number, metadata: any) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));

    const txnId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    if (MOCK_MODE === 'timeout') {
      throw new Error('Terminal timeout during initiation');
    }

    console.log(`[MOCK TERMINAL] Initiated transaction: ${txnId}, Amount: ${amount}`);

    return {
      transactionId: txnId,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
  }

  async confirm(transactionId: string) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));

    console.log(`[MOCK TERMINAL] Confirming transaction: ${transactionId}, Mode: ${MOCK_MODE}`);

    if (MOCK_MODE === 'success') {
      return {
        success: true,
        status: 'confirmed',
        message: 'Payment successful'
      };
    } else if (MOCK_MODE === 'fail') {
      return {
        success: false,
        status: 'declined',
        message: 'Card declined'
      };
    } else if (MOCK_MODE === 'timeout') {
      throw new Error('Terminal timeout during confirmation');
    }

    // Default to success if mode is unknown
    return {
      success: true,
      status: 'confirmed',
      message: 'Payment successful'
    };
  }

  async cancel(transactionId: string) {
    console.log(`[MOCK TERMINAL] Cancelled transaction: ${transactionId}`);
    return { success: true, message: 'Transaction cancelled' };
  }
}
