/**
 * Format price in Russian Rubles
 */
export function formatPrice(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string to Russian locale
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

/**
 * Calculate days remaining from a date
 */
export function daysRemaining(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const expires = new Date(dateString);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
