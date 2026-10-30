import Image from "next/image";
import type { Business, Invoice, Item } from "../../lib/invoice-types";
import {
  calculateInvoiceTotals,
  calculateLineTotal,
} from "../../lib/invoice-calculations";
import { money } from "../../lib/invoice-model";
export default function TaxInvoicePreview({
  invoice,
  business,
}: {
  invoice: Invoice;
  business: Business;
}) {
  const { subtotal, taxRate, taxPart, total } = calculateInvoiceTotals(invoice);
  const lineTotal = (item: Item) =>
    calculateLineTotal(item, invoice.documentType);
  return (
    <article className="invoice-paper">
      <div className="paper-content">
        <div className="invoice-top">
          <Image src="/weboin-logo.png" width={175} height={56} alt="Weboin" />
          <div>
            <b>INVOICE NO.</b>
            <span>{invoice.number}</span>
            <b>DATE</b>
            <span>
              {invoice.date
                ? new Date(invoice.date + "T00:00:00").toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    },
                  )
                : "—"}
            </span>
          </div>
        </div>
        <h2 className="invoice-title">TAX INVOICE</h2>
        <div className="bill-to">
          <span className="paper-label">BILL TO</span>
          <h3>{invoice.customer || "Customer name"}</h3>
          <p>{invoice.address || "Customer billing address"}</p>
          {invoice.gst.trim() && (
            <p>
              <b>GSTIN:</b> {invoice.gst}
            </p>
          )}
        </div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>SAC CODE</th>
              <th>Price</th>
              <th>Qty</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description || "Service description"}</td>
                <td>{item.sac || "—"}</td>
                <td>{money(Number(item.price || 0))}</td>
                <td>{item.quantity || "0"}</td>
                <td>{money(lineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </div>
          {invoice.tax === "split" ? (
            <>
              <div>
                <span>CGST @ {taxRate / 2}%</span>
                <b>{money(taxPart)}</b>
              </div>
              <div>
                <span>SGST @ {taxRate / 2}%</span>
                <b>{money(taxPart)}</b>
              </div>
            </>
          ) : (
            invoice.tax === "igst" && (
              <div>
                <span>IGST @ {taxRate}%</span>
                <b>{money(taxPart)}</b>
              </div>
            )
          )}
          <div className="grand-total">
            <span>Grand total</span>
            <b>{money(total)}</b>
          </div>
        </div>
        <div className="invoice-bottom">
          <span className="note-currency">Amounts in INR</span>
          <div>
            <span className="paper-label">NOTE -</span>
            <p>{invoice.note}</p>
            <div className="payment-lines">
              {(
                [
                  [["Account Name", business.accountName]],
                  [
                    ["BANK", business.bank],
                    ["Branch", business.branch],
                  ],
                  [
                    ["Account No", business.account],
                    ["IFSC Code", business.ifsc],
                  ],
                  [["UPI ID", business.upi]],
                ] as [string, string][][]
              ).map((group, row) => {
                const entries = group.filter(([, value]) => value);
                return entries.length ? (
                  <p key={row}>
                    {entries.map(([label, value], index) => (
                      <span key={label}>
                        {index > 0 && ", "}
                        <b className="payment-highlight">{label}: </b>
                        {value}
                      </span>
                    ))}
                  </p>
                ) : null;
              })}
            </div>
          </div>
          <div className="signature">
            {business.signatureImage ? (
              <Image
                src={business.signatureImage}
                alt="Mr Saravanan signature"
                width={160}
                height={60}
                unoptimized
              />
            ) : (
              <div className="signature-placeholder">Signature placeholder</div>
            )}
            {/* <strong>Mr Saravanan</strong> */}
            <span>FOUNDER & CEO</span>
          </div>
        </div>
      </div>
      <footer className="invoice-footer">
        <div className="footer-contact">
          <a href={`mailto:${business.email}`}>{business.email}</a>
        </div>
        <a
          className="footer-map"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}
          target="_blank"
          rel="noreferrer"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{business.address}</span>
        </a>
        <a
          className="footer-phone"
          href={`tel:${business.phone.replace(/[^+0-9]/g, "")}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.8 9.5a16 16 0 0 0 6.7 6.7l1.2-1.2a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z" />
          </svg>
          {business.phone}
        </a>
      </footer>
    </article>
  );
}
