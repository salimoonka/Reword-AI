import { v4 as uuidv4 } from 'uuid';
import type { CreatePaymentRequest, PaymentResponse } from './types';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YooKassaClient {
  private shopId: string;
  private secretKey: string;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID!;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY!;

    if (!this.shopId || !this.secretKey) {
      throw new Error('YooKassa credentials not configured');
    }
  }

  private get authHeader(): string {
    return (
      'Basic ' +
      Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
    );
  }

  /**
   * Create a payment
   */
  async createPayment(
    params: CreatePaymentRequest,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    const key = idempotencyKey || uuidv4();

    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
        'Idempotence-Key': key,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new YooKassaError(
        `Payment creation failed: ${response.status}`,
        response.status,
        error
      );
    }

    return response.json() as Promise<PaymentResponse>;
  }

  /**
   * Get payment status
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const response = await fetch(
      `${YOOKASSA_API_URL}/payments/${paymentId}`,
      {
        headers: {
          Authorization: this.authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new YooKassaError(
        `Payment fetch failed: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<PaymentResponse>;
  }
}

export class YooKassaError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'YooKassaError';
  }
}

// Singleton (server-side only)
let instance: YooKassaClient | null = null;
export function getYooKassaClient(): YooKassaClient {
  if (!instance) {
    instance = new YooKassaClient();
  }
  return instance;
}
