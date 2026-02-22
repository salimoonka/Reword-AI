import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payment, error } = await supabase
      .from('external_payments')
      .select('yookassa_payment_id, yookassa_status, plan, processed, created_at')
      .eq('yookassa_payment_id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      paymentId: payment.yookassa_payment_id,
      status: payment.yookassa_status,
      plan: payment.plan,
      processed: payment.processed,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
