import InvoiceForm, { type InvoiceFormProps } from "./InvoiceForm";
/** Proforma editor, including per-item discounts. */
export default function ProformaInvoiceForm(props: InvoiceFormProps) {
  return (
    <InvoiceForm
      {...props}
      itemHeading="Quote items and discounts"
      showDiscounts
    />
  );
}
