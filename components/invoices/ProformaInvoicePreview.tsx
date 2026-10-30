import Image from "next/image";
import { proformaPartyTextLines } from "../../lib/proforma-party-text";
import type { Business, Invoice } from "../../lib/invoice-types";
import {
  calculateInvoiceTotals,
  calculateLineGross,
} from "../../lib/invoice-calculations";
import { money } from "../../lib/invoice-model";
export default function ProformaInvoicePreview({
  invoice,
  business,
}: {
  invoice: Invoice;
  business: Business;
}) {
  const { grossSubtotal, discountTotal, subtotal, taxRate, taxPart, total } =
    calculateInvoiceTotals(invoice);
  return (
    <article className="invoice-paper proforma-paper">
      <header className="proforma-header">
        <Image src="/weboin-logo.png" width={175} height={56} alt="Weboin" />
        <div>
          <strong>Pro-Invoice No - {invoice.number}</strong>
          <p>Date: {invoice.date}</p>
        </div>
      </header>
      <h2 className="proforma-title">PROFORMA INVOICE</h2>
      <div className="proforma-parties">
        <section>
          <h3>
            {proformaPartyTextLines(business.name.toUpperCase()).join("\n")}
          </h3>
          <p>{proformaPartyTextLines(business.address).join("\n")}</p>
          {business.gst.trim() && (
            <p>
              <b>GST Number:</b> {business.gst}
            </p>
          )}
        </section>
        <section className="proforma-client">
          <h3>
            {proformaPartyTextLines(
              (invoice.customer || "Customer name").toUpperCase(),
            ).join("\n")}
          </h3>
          <p>
            {proformaPartyTextLines(invoice.address || "Customer address").join(
              "\n",
            )}
          </p>
          {invoice.gst.trim() && (
            <p>
              <b>GST Number:</b> {invoice.gst}
            </p>
          )}
        </section>
      </div>
      <table className="proforma-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>SAC Code</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description || "Service name"}</td>
              <td>{item.sac || "—"}</td>
              <td>{money(Number(item.price || 0))}</td>
              <td>{item.quantity || "0"}</td>
              <td>{money(calculateLineGross(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className={`proforma-summary${discountTotal > 0 ? " has-discount" : ""}`}
      >
        {discountTotal > 0 && (
          <>
            <div>
              <span>Subtotal:</span>
              <b>{money(grossSubtotal)}</b>
            </div>
            <div>
              <span>Discount:</span>
              <b>{money(-discountTotal)}</b>
            </div>
          </>
        )}
        <div className="proforma-net-total">
          <span>Total:</span>
          <b>{money(subtotal)}</b>
        </div>
        {invoice.tax === "split" ? (
          <>
            <div>
              <span>CGST @{taxRate / 2}%:</span>
              <b>{money(taxPart)}</b>
            </div>
            <div>
              <span>SGST @{taxRate / 2}%:</span>
              <b>{money(taxPart)}</b>
            </div>
          </>
        ) : invoice.tax === "igst" ? (
          <div>
            <span>IGST @{taxRate}%:</span>
            <b>{money(taxPart)}</b>
          </div>
        ) : null}
        <div className="proforma-grand-total">
          <span>Total Amount:</span>
          <b>{money(total)}</b>
        </div>
      </div>
      <div className="proforma-bottom">
        <div>
          <b>NOTE -</b>
          <p>{invoice.note}</p>
          {business.accountName && (
            <p>
              <b>Account Name:</b> {business.accountName}
            </p>
          )}
          {(business.bank || business.branch) && (
            <p>
              {business.bank && (
                <>
                  <b>BANK: </b>
                  {business.bank}
                </>
              )}
              {business.bank && business.branch ? ", " : ""}
              {business.branch && (
                <>
                  <b>Branch: </b>
                  {business.branch}
                </>
              )}
            </p>
          )}
          {(business.account || business.ifsc) && (
            <p>
              {business.account && (
                <>
                  <b>Account No: </b>
                  {business.account}
                </>
              )}
              {business.account && business.ifsc ? ", " : ""}
              {business.ifsc && (
                <>
                  <b>IFSC Code: </b>
                  {business.ifsc}
                </>
              )}
            </p>
          )}
          {business.upi && (
            <p>
              <b>UPI ID: </b>
              {business.upi}
            </p>
          )}
        </div>
        <strong>Amounts in INR</strong>
      </div>
      <footer className="proforma-footer">
        <a href="https://www.weboin.com">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <ellipse cx="12" cy="12" rx="4" ry="10" />
            <path d="M2 12h20M4 7h16M4 17h16" />
          </svg>
          <span>www.weboin.com</span>
        </a>
        <a href={`tel:${business.phone.replace(/[^+0-9]/g, "")}`}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 6.5c-.7.1-1.2.8-1.2 1.5 0 4.7 3.5 8.5 8.3 9.2.8.1 1.5-.4 1.7-1.1l.4-1.5-3-1.5-1.3 1.3a9 9 0 0 1-3.4-3.4l1.3-1.3-1.5-3z" />
          </svg>
          <span>{business.phone}</span>
        </a>
      </footer>
    </article>
  );
}
