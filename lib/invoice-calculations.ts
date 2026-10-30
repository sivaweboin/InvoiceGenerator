import type { Invoice, Item } from "./invoice-types";

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// Keep the live preview stable while a numeric input is temporarily incomplete.
const number = (value: string, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : 0;
};

export function calculateLineGross(item: Item) {
  return roundCurrency(number(item.price) * number(item.quantity));
}

export function calculateLineDiscount(
  item: Item,
  documentType: Invoice["documentType"],
) {
  if (documentType !== "proforma") return 0;
  return roundCurrency(
    (calculateLineGross(item) * number(item.discount, 100)) / 100,
  );
}

export function calculateLineTotal(
  item: Item,
  documentType: Invoice["documentType"],
) {
  return roundCurrency(
    calculateLineGross(item) - calculateLineDiscount(item, documentType),
  );
}

export function calculateInvoiceTotals(invoice: Invoice) {
  const grossSubtotal = roundCurrency(
    invoice.items.reduce((sum, item) => sum + calculateLineGross(item), 0),
  );
  const discountTotal = roundCurrency(
    invoice.items.reduce(
      (sum, item) => sum + calculateLineDiscount(item, invoice.documentType),
      0,
    ),
  );
  const subtotal = roundCurrency(
    invoice.items.reduce(
      (sum, item) => sum + calculateLineTotal(item, invoice.documentType),
      0,
    ),
  );
  const taxRate = invoice.tax === "none" ? 0 : number(invoice.rate, 100);
  const taxPart = roundCurrency(
    (subtotal * taxRate) / (invoice.tax === "split" ? 200 : 100),
  );
  const total = roundCurrency(
    subtotal + taxPart * (invoice.tax === "split" ? 2 : 1),
  );

  return { grossSubtotal, discountTotal, subtotal, taxRate, taxPart, total };
}
