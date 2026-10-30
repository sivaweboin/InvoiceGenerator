import InvoiceForm, { type InvoiceFormProps } from "./InvoiceForm";
/** Tax invoice editor. Shared fields live in InvoiceForm. */
export default function TaxInvoiceForm(props: InvoiceFormProps) {
  return (
    <InvoiceForm
      {...props}
      itemHeading="The work, itemized"
      showDiscounts={false}
    />
  );
}
