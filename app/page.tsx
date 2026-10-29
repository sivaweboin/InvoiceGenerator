"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  calculateInvoiceTotals,
  calculateLineDiscount,
  calculateLineTotal,
} from "../lib/invoice-calculations";
import { proformaCompany } from "../lib/proforma-company";
import type { Business, Item, Invoice } from "../lib/invoice-types";
type Saved = { id: string; invoice: Invoice; business: Business };
const defaults: Business = {
  signatureImage: "",
  name: "Weboin",
  address: "766, 1st floor, Shakti Towers, Anna Salai, Chennai - 600 002.",
  gst: "",
  email: "sales@weboin.com",
  phone: "+91 9403891477",
  accountName: "",
  bank: "",
  branch: "",
  account: "",
  ifsc: "",
  upi: "",
};
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const blank = (number = "001/2026"): Invoice => ({
  documentType: "tax",
  number,
  date: today(),
  customer: "",
  address: "",
  gst: "",
  tax: "split",
  rate: "18",
  note: "Thank you for doing business with Weboin.",
  items: [
    {
      id: crypto.randomUUID(),
      description: "",
      sac: "998313",
      price: "",
      quantity: "1",
      discount: "0",
    },
  ],
});
const normalizeInvoice = (saved: Invoice): Invoice => ({
  ...saved,
  documentType: saved.documentType || "tax",
  items: saved.items.map((item) => ({
    ...item,
    discount: item.discount ?? "0",
  })),
});
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value,
  );
function Field({
  label,
  value,
  onChange,
  multiline = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          {...props}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  );
}
export default function Home() {
  const [business, setBusiness] = useState(defaults);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<Saved[]>([]);
  const [tab, setTab] = useState("invoice");
  const [status, setStatus] = useState("Loading your workspace…");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("weboin-workspace-v1");
      if (raw) {
        const data = JSON.parse(raw);
        if (
          !data.business ||
          !data.invoice ||
          !Array.isArray(data.invoice.items) ||
          !Array.isArray(data.history)
        )
          throw new Error("Invalid data");
        setBusiness({ ...defaults, ...data.business });
        setInvoice(normalizeInvoice(data.invoice));
        setHistory(
          data.history.map((saved: Saved) => ({
            ...saved,
            invoice: normalizeInvoice(saved.invoice),
          })),
        );
      } else setInvoice(blank());
      setStatus("All changes saved on this device");
    } catch {
      setInvoice(blank());
      setStatus("Saved data could not be loaded. A fresh draft is ready.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !invoice) return;
    try {
      localStorage.setItem(
        "weboin-workspace-v1",
        JSON.stringify({ business, invoice, history }),
      );
      setStatus("All changes saved on this device");
    } catch {
      setStatus(
        "Browser storage is unavailable or full. Changes are not saved.",
      );
    }
  }, [business, invoice, history, ready]);
  if (!invoice)
    return <main className="loading">Opening your invoice workspace…</main>;
  const update = (key: keyof Invoice, value: string) =>
    setInvoice({ ...invoice, [key]: value });
  const updateBusiness = (key: keyof Business, value: string) =>
    setBusiness({ ...business, [key]: value });
  const lineTotal = (item: Item) =>
    calculateLineTotal(item, invoice.documentType);
  const { grossSubtotal, discountTotal, subtotal, taxRate, taxPart, total } =
    calculateInvoiceTotals(invoice);
  const updateItem = (id: string, key: keyof Item, value: string) =>
    setInvoice({
      ...invoice,
      items: invoice.items.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    });
  function saveInvoice() {
    if (!invoice) return;
    setHistory((previous) =>
      [
        {
          id: crypto.randomUUID(),
          invoice: structuredClone(invoice),
          business: { ...business },
        },
        ...previous.filter((s) => s.invoice.number !== invoice.number),
      ].slice(0, 100),
    );
  }
  function newInvoice() {
    const match = invoice!.number.match(/^(\d+)(.*)$/);
    const number = match
      ? `${String(Number(match[1]) + 1).padStart(match[1].length, "0")}${match[2]}`
      : `${String(history.length + 1).padStart(3, "0")}/${new Date().getFullYear()}`;
    setInvoice(blank(number));
    setTab("invoice");
  }
  return (
    <div className="workspace">
      <aside className="sidebar no-print">
        <a href="/" className="brand">
          <Image
            src="/weboin-logo.png"
            alt="Weboin"
            width={160}
            height={51}
            priority
          />
        </a>
        <div className="workspace-label">BUSINESS WORKSPACE</div>
        <nav>
          {[
            ["invoice", "▤", "Create invoice"],
            ["business", "⚙", "Business & bank"],
            ["history", "◷", "Saved invoices"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
            >
              <span>{icon}</span>
              {label}
              {id === "history" && <small>{history.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="local-icon">⌁</span>
          <strong>Your own little office.</strong>
          <p>Details stay in this browser, ready for your next invoice.</p>
          <div className="device-badge">
            <i /> Local workspace
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar no-print">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <b>
              {tab === "business"
                ? "Business & bank"
                : tab === "history"
                  ? "Saved invoices"
                  : "Create invoice"}
            </b>
          </span>
          <span className="avatar">W</span>
        </header>
        <div className="page-heading no-print">
          <div>
            <div className="eyebrow">LESS ADMIN. MORE BUSINESS.</div>
            <h1>
              {tab === "business"
                ? "Make it yours."
                : tab === "history"
                  ? "Your invoice library."
                  : "A great invoice, in minutes."}
            </h1>
            <p>
              {tab === "business"
                ? "Set up once. Your details appear on every invoice."
                : tab === "history"
                  ? "Pick up where you left off. Everything is stored on this device."
                  : "Fill in the details. We’ll take care of the numbers."}
            </p>
          </div>
          <button className="button secondary" onClick={newInvoice}>
            ＋ New invoice
          </button>
        </div>
        <div className="content-grid">
          <section className="editor no-print">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveInvoice();
                setStatus("Invoice saved to your library");
              }}
            >
              {tab === "invoice" && (
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
                          update(
                            "documentType",
                            e.target.value as Invoice["documentType"],
                          )
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
                    <h2>
                      {invoice.documentType === "proforma"
                        ? "Quote items and discounts"
                        : "The work, itemized"}
                    </h2>
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
                                items: invoice.items.filter(
                                  (i) => i.id !== item.id,
                                ),
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
                          onChange={(v) =>
                            updateItem(item.id, "description", v)
                          }
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
                        {invoice.documentType === "proforma" && (
                          <div className="fields two discount-row">
                            <Field
                              label="Discount (%)"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.discount}
                              onChange={(v) =>
                                updateItem(item.id, "discount", v)
                              }
                            />
                            <div className="discount-hint">
                              Discount amount:{" "}
                              {money(
                                calculateLineDiscount(
                                  item,
                                  invoice.documentType,
                                ),
                              )}
                            </div>
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
                        items: [
                          ...invoice.items,
                          {
                            id: crypto.randomUUID(),
                            description: "",
                            sac: "998313",
                            price: "",
                            quantity: "1",
                            discount: "0",
                          },
                        ],
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
              )}
              {tab === "business" && (
                <>
                  <div className="section-title">
                    <span className="step">01</span>
                    <h2>Business details</h2>
                  </div>
                  <div className="fields">
                    {(
                      [
                        ["name", "Business name"],
                        ["address", "Business address"],
                        ["gst", "GST number"],
                        ["email", "Email"],
                        ["phone", "Phone"],
                      ] as [keyof Business, string][]
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        value={business[key]}
                        multiline={key === "address"}
                        onChange={(v) => updateBusiness(key, v)}
                      />
                    ))}
                  </div>
                  <div className="section-title">
                    <span className="step">02</span>
                    <h2>Payment details</h2>
                  </div>
                  <div className="info-box">
                    Saved automatically for your next invoice. Bank details are
                    stored only in this browser.
                  </div>
                  <div className="fields">
                    {(
                      [
                        ["accountName", "Account holder name"],
                        ["bank", "Bank name"],
                        ["branch", "Branch"],
                        ["account", "Account number"],
                        ["ifsc", "IFSC code"],
                        ["upi", "UPI ID"],
                      ] as [keyof Business, string][]
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        value={business[key]}
                        onChange={(v) => updateBusiness(key, v)}
                      />
                    ))}
                  </div>
                  <div className="section-title">
                    <h2>Authorized signature</h2>
                  </div>
                  <p className="info-box">
                    Upload Mr Saravanan’s signature (PNG or JPG, up to 1 MB). It
                    is saved in this browser and included in downloaded PDFs.
                  </p>
                  <label className="field">
                    <span>Mr Saravanan’s signature image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (
                          !["image/png", "image/jpeg"].includes(file.type) ||
                          file.size > 1024 * 1024
                        ) {
                          setStatus(
                            "Choose a PNG or JPG image smaller than 1 MB.",
                          );
                          e.target.value = "";
                          return;
                        }
                        try {
                          const data = await new Promise<string>(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () =>
                                resolve(String(reader.result));
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            },
                          );
                          const image = new window.Image();
                          image.src = data;
                          await image.decode();
                          updateBusiness("signatureImage", data);
                        } catch {
                          setStatus(
                            "This image could not be read. Choose a valid PNG or JPG.",
                          );
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {business.signatureImage && (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => updateBusiness("signatureImage", "")}
                    >
                      Remove signature image
                    </button>
                  )}
                </>
              )}
              {tab === "history" && (
                <>
                  <div className="section-title">
                    <h2>Saved invoices</h2>
                    <span className="pill">{history.length} SAVED</span>
                  </div>
                  {!history.length ? (
                    <div className="empty">
                      <span>▤</span>
                      <h3>A fresh start.</h3>
                      <p>Your saved invoices will appear here.</p>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setTab("invoice")}
                      >
                        Create your first invoice
                      </button>
                    </div>
                  ) : (
                    history.map((saved) => (
                      <div className="history-row" key={saved.id}>
                        <div>
                          <strong>{saved.invoice.number}</strong>
                          <p>
                            {saved.invoice.documentType === "proforma"
                              ? "Proforma invoice"
                              : "Tax invoice"}{" "}
                            · {saved.invoice.customer} · {saved.invoice.date}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setInvoice(structuredClone(saved.invoice));
                            setBusiness({ ...saved.business });
                            setTab("invoice");
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="remove"
                          aria-label={`Delete invoice ${saved.invoice.number}`}
                          onClick={() =>
                            setHistory(history.filter((s) => s.id !== saved.id))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </form>
            <div className="save-status" role="status">
              <i />
              {status}
            </div>
          </section>
          <section className="preview-panel">
            <div className="preview-toolbar no-print">
              <div>
                <i /> LIVE PREVIEW
              </div>
              <span>A4 · Portrait</span>
              <button
                className="print-button"
                onClick={async () => {
                  const form = document.querySelector("form");
                  if (tab === "invoice" && form && !form.reportValidity())
                    return;
                  if (
                    !invoice.customer ||
                    !invoice.number ||
                    !invoice.date ||
                    invoice.items.some(
                      (i) =>
                        !i.description || !i.price || Number(i.quantity) <= 0,
                    )
                  ) {
                    setTab("invoice");
                    setStatus(
                      "Complete the required invoice fields before downloading.",
                    );
                    return;
                  }
                  try {
                    setStatus("Generating PDF…");
                    const filename =
                      invoice.documentType === "proforma"
                        ? await import("../lib/generate-proforma-pdf").then(
                            ({ downloadProformaPdf }) =>
                              downloadProformaPdf(invoice, business),
                          )
                        : await import("../lib/generate-invoice-pdf").then(
                            ({ downloadInvoicePdf }) =>
                              downloadInvoicePdf(invoice, business),
                          );
                    setStatus(`Downloaded ${filename}`);
                  } catch {
                    setStatus("PDF download failed. Please try again.");
                  }
                }}
              >
                ↓ Download PDF
              </button>
            </div>
            {invoice.documentType === "proforma" ? (
              <article className="invoice-paper proforma-paper">
                <header className="proforma-header">
                  <Image
                    src="/weboin-logo.png"
                    width={175}
                    height={56}
                    alt="Weboin"
                  />
                  <strong>Pro-Invoice No - {invoice.number}</strong>
                </header>
                <h2 className="proforma-title">PROFORMA INVOICE</h2>
                <div className="proforma-parties">
                  <section>
                    <h3>{proformaCompany.name}</h3>
                    <p>{proformaCompany.address}</p>
                    <p>
                      <b>GST Number:</b> {proformaCompany.gst}
                    </p>
                  </section>
                  <section>
                    <h3>{invoice.customer || "Customer name"}</h3>
                    <p>{invoice.address || "Customer address"}</p>
                    {invoice.gst && (
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
                        <td>{money(lineTotal(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="proforma-summary">
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
                            <b>BANK - </b>
                            {business.bank}
                          </>
                        )}
                        {business.bank && business.branch ? ", " : ""}
                        {business.branch && (
                          <>
                            <b>Branch - </b>
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
                  <a href="https://www.weboin.com">www.weboin.com</a>
                  <a href={`tel:${business.phone.replace(/[^+0-9]/g, "")}`}>
                    {business.phone}
                  </a>
                </footer>
              </article>
            ) : (
                <article className="invoice-paper">
                <div className="paper-content">
                  <div className="invoice-top">
                    <Image
                      src="/weboin-logo.png"
                      width={175}
                      height={56}
                      alt="Weboin"
                    />
                    <div>
                      <b>INVOICE NO.</b>
                      <span>{invoice.number}</span>
                      <b>DATE</b>
                      <span>
                        {invoice.date
                          ? new Date(
                              invoice.date + "T00:00:00",
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <h2 className="invoice-title">TAX INVOICE</h2>
                  <div className="bill-to">
                    <span className="paper-label">BILL TO</span>
                    <h3>{invoice.customer || "Customer name"}</h3>
                    <p>{invoice.address || "Customer billing address"}</p>
                    {invoice.gst && (
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
                                  <b className="payment-highlight">
                                    {label}:{" "}
                                  </b>
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
                        <div className="signature-placeholder">
                          Signature placeholder
                        </div>
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
                  <a href={`tel:${business.phone.replace(/[^+0-9]/g, "")}`}>
                    {business.phone}
                  </a>
                </footer>
                </article>
            )}
            {/* <p className="preview-tip no-print">
              Made for your business. Ready for your customer.
              <br />
              Download a PDF, automatically named with the invoice number and customer.
            </p> */}
          </section>
        </div>
        <footer className="app-footer no-print">
          <span>© {new Date().getFullYear()} Weboin</span>
          {/* <span>Thoughtfully simple invoicing.</span> */}
        </footer>
      </main>
    </div>
  );
}
