import { createClient } from '@/lib/supabase/server';
import { getYooKassaClient } from '@/lib/yookassa/client';
import { PLANS, type PlanId } from '@/lib/yookassa/constants';
import type { CreatePaymentRequest } from '@/lib/yookassa/types';
import { NextResponse, type NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const requestSchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_yearly']),
  method: z.enum(['card', 'sbp']),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Неверные параметры', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { plan: planId, method } = parsed.data;
    const plan = PLANS[planId as PlanId];

    // 3. Check for existing active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status, expires_at, store')
      .eq('user_id', user.id)
      .single();

    if (
      existingSub?.status === 'active' &&
      existingSub.expires_at &&
      new Date(existingSub.expires_at) > new Date()
    ) {
      return NextResponse.json(
        { error: 'У вас уже есть активная подписка' },
        { status: 409 }
      );
    }

    // 4. Build YooKassa payment request
    const idempotencyKey = uuidv4();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const confirmation: CreatePaymentRequest['confirmation'] =
      method === 'sbp'
        ? { type: 'qr' }
        : { type: 'redirect', return_url: `${appUrl}/payment/success?plan=${planId}` };

    const paymentRequest: CreatePaymentRequest = {
      amount: {
        value: plan.price.toFixed(2),
        currency: plan.currency,
      },
      capture: true,
      confirmation,
      description: `Reword AI — ${plan.name}`,
      metadata: {
        user_id: user.id,
        plan: planId,
        idempotency_key: idempotencyKey,
        user_email: user.email || '',
      },
    };

    // 5. Add fiscal receipt if user has email (FZ-54)
    if (user.email) {
      paymentRequest.receipt = {
        customer: { email: user.email },
        items: [
          {
            description: `Подписка Reword AI ${plan.name}`,
            quantity: '1',
            amount: {
              value: plan.price.toFixed(2),
              currency: plan.currency,
            },
            vat_code: 1, // No VAT
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      };
    }

    // 6. Create payment via YooKassa API
    const yookassa = getYooKassaClient();
    const payment = await yookassa.createPayment(
      paymentRequest,
      idempotencyKey
    );

    // 7. Save payment record in external_payments table
    await supabase.from('external_payments').insert({
      user_id: user.id,
      yookassa_payment_id: payment.id,
      yookassa_status: payment.status,
      idempotency_key: idempotencyKey,
      amount_value: parseFloat(payment.amount.value),
      amount_currency: payment.amount.currency,
      description: paymentRequest.description,
      plan: planId,
      payment_method_type: method,
      confirmation_type: payment.confirmation?.type || null,
      confirmation_url: payment.confirmation?.confirmation_url || null,
      metadata: paymentRequest.metadata || {},
    });

    // 8. Return payment info to client
    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      confirmation: payment.confirmation,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Не удалось создать платёж. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
