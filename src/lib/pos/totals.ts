export function computeTotals(input: {
  subtotalCents: number;
  serviceChargeEnabled: boolean;
  serviceChargeRateBps: number; // 10000 = 100%
  vatRateBps: number; // 10000 = 100%
}) {
  const serviceChargeCents = input.serviceChargeEnabled
    ? Math.round((input.subtotalCents * input.serviceChargeRateBps) / 10_000)
    : 0;
  const vatBase = input.subtotalCents + serviceChargeCents;
  const vatCents = Math.round((vatBase * input.vatRateBps) / 10_000);
  const totalCents = input.subtotalCents + serviceChargeCents + vatCents;
  return { serviceChargeCents, vatCents, totalCents };
}

