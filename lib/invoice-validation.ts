import type { Invoice } from "./invoice-types";

export function validateInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  if (!invoice.number.trim()) errors.push("Enter an invoice number.");
  const date = new Date(`${invoice.date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(invoice.date) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== invoice.date
  )
    errors.push("Enter a valid invoice date.");
  if (!invoice.customer.trim()) errors.push("Enter the customer name.");
  if (!invoice.address.trim()) errors.push("Enter the billing address.");
  // if (
  //   invoice.gst.trim() &&
  //   !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(invoice.gst.trim())
  // )
  //   errors.push("Customer GSTIN must be a valid 15-character format.");
  if (!["tax", "proforma"].includes(invoice.documentType))
    errors.push("Choose a document type.");
  if (!["split", "igst", "none"].includes(invoice.tax))
    errors.push("Choose a tax type.");
  const validNumber = (value: string, min: number, max: number) =>
    value.trim() !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= min &&
    Number(value) <= max;
  if (invoice.tax !== "none" && !validNumber(invoice.rate, 0, 100))
    errors.push("Tax rate must be between 0 and 100.");
  if (!invoice.items.length) errors.push("Add at least one service.");
  invoice.items.forEach((item, index) => {
    const label = `Item ${index + 1}`;
    if (!item.description.trim()) errors.push(`${label}: enter a description.`);
    if (!validNumber(item.price, 0, 1e9))
      errors.push(`${label}: price must be between 0 and 1,000,000,000.`);
    if (!validNumber(item.quantity, 0.01, 1e6))
      errors.push(`${label}: quantity must be between 0.01 and 1,000,000.`);
    if (
      invoice.documentType === "proforma" &&
      !validNumber(item.discount || "0", 0, 100)
    )
      errors.push(`${label}: discount must be between 0 and 100%.`);
    if (Number(item.price) * Number(item.quantity) > 1e12)
      errors.push(`${label}: total exceeds the supported amount.`);
  });
  return errors;
}
export function assertValidInvoice(invoice: Invoice) {
  const errors = validateInvoice(invoice);
  if (errors.length) throw new Error(errors.join(" "));
}
