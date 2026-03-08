export function formatKes(cents: number) {
  const value = Math.round(cents) / 100;
  const formatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  // Ensure "KES 1,200" style (space after code)
  return formatted.replace("KES", "KES").replace(/\u00A0/g, " ");
}

