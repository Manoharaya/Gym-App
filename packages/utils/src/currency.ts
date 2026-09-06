export function formatCentsToCurrency(cents: number, currency = 'AUD', locale = 'en-AU'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(dollars);
}
