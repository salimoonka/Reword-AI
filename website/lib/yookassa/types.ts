// ─── Payment creation request ─────────────────────────

export interface CreatePaymentRequest {
  amount: {
    value: string; // "299.00"
    currency: string; // "RUB"
  };
  capture: boolean; // true = auto‑capture
  confirmation: PaymentConfirmation;
  description?: string;
  metadata?: Record<string, string>;
  receipt?: FiscalReceipt; // FZ-54 compliance
}

export type PaymentConfirmation =
  | { type: 'redirect'; return_url: string }
  | { type: 'qr' };

// ─── Payment response from YooKassa ──────────────────

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: {
    value: string;
    currency: string;
  };
  description?: string;
  confirmation?: {
    type: 'redirect' | 'qr';
    confirmation_url?: string;
    confirmation_data?: string; // QR code data for SBP
  };
  payment_method?: {
    type: string;
    id: string;
    saved: boolean;
    title?: string;
  };
  metadata?: Record<string, string>;
  created_at: string;
  expires_at?: string;
  paid: boolean;
  refundable: boolean;
  test: boolean;
}

export type PaymentStatus =
  | 'pending'
  | 'waiting_for_capture'
  | 'succeeded'
  | 'canceled';

// ─── Webhook payload ────────────────────────────────

export interface YooKassaWebhookEvent {
  type: 'notification';
  event:
    | 'payment.succeeded'
    | 'payment.canceled'
    | 'payment.waiting_for_capture'
    | 'refund.succeeded';
  object: PaymentResponse;
}

// ─── Fiscal receipt (FZ-54) ─────────────────────────

export interface FiscalReceipt {
  customer: {
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: string;
    amount: {
      value: string;
      currency: string;
    };
    vat_code: number; // 1 = no VAT
    payment_subject: string; // 'service'
    payment_mode: string; // 'full_payment'
  }>;
}
