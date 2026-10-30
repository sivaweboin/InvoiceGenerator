import Field from "./Field";
import { calculateLineTotal } from "../../lib/invoice-calculations";
import { money, createItem } from "../../lib/invoice-model";
import type { Invoice, Item } from "../../lib/invoice-types";
import type { Dispatch, SetStateAction } from "react";
export type InvoiceFormProps = {
  invoice: Invoice;
  setInvoice: Dispatch<SetStateAction<Invoice | null>>;
};
export default function InvoiceForm({
  invoice,
  setInvoice,
  itemHeading,
  showDiscounts,
}: InvoiceFormProps & { itemHeading: string; showDiscounts: boolean }) {
  const update = (key: keyof Omit<Invoice, "items">, value: string) =>
    setInvoice({ ...invoice, [key]: value });
  const updateItem = (id: string, key: keyof Item, value: string) =>
    setInvoice({
      ...invoice,
      items: invoice.items.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    });
  const lineTotal = (item: Item) =>
    calculateLineTotal(item, invoice.documentType);
  return (
    <>
      <div className="section-title">
        <span className="step">01</span>
        <h2>Invoice details</h2>
        <span className="pill">DRAFT</span>
      </div>
      <div className="fields two">
        <label className="field">
          <span>Document type</span>
          <select
            value={invoice.documentType}
            onChange={(e) =>
              update("documentType", e.target.value as Invoice["documentType"])
            }
          >
            <option value="tax">Tax Invoice</option>
            <option value="proforma">Proforma Invoice</option>
          </select>
        </label>
        <Field
          label="Invoice number"
          value={invoice.number}
          onChange={(v) => update("number", v)}
          required
        />
        <Field
          label="Invoice date"
          value={invoice.date}
          type="date"
          onChange={(v) => update("date", v)}
          required
        />
      </div>
      <div className="section-title">
        <span className="step">02</span>
        <h2>Who’s it for?</h2>
      </div>
      <div className="fields">
        <Field
          label="Customer / company name"
          value={invoice.customer}
          placeholder="e.g. Acme Technologies Pvt. Ltd."
          onChange={(v) => update("customer", v)}
          required
        />
        <Field
          label="Billing address"
          value={invoice.address}
          placeholder="Street, city, state and PIN code"
          onChange={(v) => update("address", v)}
          multiline
          required
        />
        <Field
          label="GST number (optional)"
          value={invoice.gst}
          placeholder="Customer GSTIN"
          onChange={(v) => update("gst", v.toUpperCase())}
        />
      </div>
      <div className="section-title">
        <span className="step">03</span>
        <h2>{itemHeading}</h2>
        <span className="muted">INR ₹</span>
      </div>
      <div className="items">
        {invoice.items.map((item, index) => (
          <div className="item-card" key={item.id}>
            <div className="item-top">
              <span>ITEM {String(index + 1).padStart(2, "0")}</span>
              <button
                type="button"
                className="remove"
                disabled={invoice.items.length === 1}
                aria-label={`Remove item ${index + 1}`}
                onClick={() =>
                  setInvoice({
                    ...invoice,
                    items: invoice.items.filter((i) => i.id !== item.id),
                  })
                }
              >
                ×
              </button>
            </div>
            <Field
              label="Service description"
              value={item.description}
              placeholder="What did you work on?"
              onChange={(v) => updateItem(item.id, "description", v)}
              required
            />
            <div className="fields three">
              <Field
                label="SAC code"
                value={item.sac}
                onChange={(v) => updateItem(item.id, "sac", v)}
              />
              <Field
                label="Price (₹)"
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(v) => updateItem(item.id, "price", v)}
                required
              />
              <Field
                label="Quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(v) => updateItem(item.id, "quantity", v)}
                required
              />
            </div>
            {showDiscounts && (
              <div className="fields two discount-row">
                <Field
                  label="Discount (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.discount}
                  onChange={(v) => updateItem(item.id, "discount", v)}
                />
              </div>
            )}
            <div className="line-total">
              Item total <strong>{money(lineTotal(item))}</strong>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="add-item"
        onClick={() =>
          setInvoice({
            ...invoice,
            items: [...invoice.items, createItem()],
          })
        }
      >
        ＋ Add another item
      </button>
      <div className="section-title">
        <span className="step">04</span>
        <h2>Taxes</h2>
      </div>
      <div className="fields two">
        <label className="field">
          <span>Tax type</span>
          <select
            value={invoice.tax}
            onChange={(e) => update("tax", e.target.value)}
          >
            <option value="split">CGST + SGST</option>
            <option value="igst">IGST</option>
            <option value="none">No tax</option>
          </select>
        </label>
        {invoice.tax !== "none" && (
          <Field
            label="Total tax rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={invoice.rate}
            onChange={(v) => update("rate", v)}
            required
          />
        )}
      </div>
      <Field
        label="Note to customer"
        value={invoice.note}
        multiline
        onChange={(v) => update("note", v)}
      />
      <button className="button primary save" type="submit">
        Save invoice to library <span>↗</span>
      </button>
    </>
  );
}
