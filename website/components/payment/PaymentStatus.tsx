'use client';

import { useEffect, useState, useCallback } from 'react';
import Spinner from '../ui/Spinner';

interface PaymentStatusProps {
  paymentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentStatus({
  paymentId,
  onSuccess,
  onCancel,
}: PaymentStatusProps) {
  const [status, setStatus] = useState<string>('pending');
  const [elapsed, setElapsed] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/payment/status?id=${paymentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.status === 'succeeded' || data.processed) {
        onSuccess();
      } else if (data.status === 'canceled') {
        onCancel();
      }
    } catch {
      // Silently retry
    }
  }, [paymentId, onSuccess, onCancel]);

  useEffect(() => {
    // Poll every 3 seconds
    const interval = setInterval(() => {
      checkStatus();
      setElapsed((e) => e + 3);
    }, 3000);

    // Initial check
    checkStatus();

    return () => clearInterval(interval);
  }, [checkStatus]);

  // Timeout after 10 minutes
  if (elapsed > 600) {
    return (
      <div className="text-center">
        <p className="text-text-secondary">
          Время ожидания оплаты истекло. Если вы уже оплатили, подписка
          активируется автоматически в течение нескольких минут.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Spinner size="lg" />
      <p className="text-lg font-medium text-text-primary">
        {status === 'pending' && 'Ожидание оплаты...'}
        {status === 'waiting_for_capture' && 'Подтверждение платежа...'}
        {status === 'succeeded' && 'Оплата прошла!'}
        {status === 'canceled' && 'Платёж отменён'}
      </p>
      <p className="text-sm text-text-tertiary">
        Не закрывайте эту страницу до завершения оплаты
      </p>
    </div>
  );
}
