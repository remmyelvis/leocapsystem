export function formatCurrency(
  amount: number,
  currency = "GHS",
  locale = "en-GH"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
