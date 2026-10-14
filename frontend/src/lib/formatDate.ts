export function formatDate(
  date: Date | string | number,
  locale = "en-GH",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}
