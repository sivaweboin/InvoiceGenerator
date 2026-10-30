"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useInvoiceWorkspace } from "../hooks/use-invoice-workspace";
import {
  createInvoice,
  nextInvoiceNumber,
  saveToLibrary,
  normalizeInvoice,
} from "../lib/invoice-model";
import { validateInvoice } from "../lib/invoice-validation";
import BusinessForm from "../components/business/BusinessForm";
import TaxInvoiceForm from "../components/invoices/TaxInvoiceForm";
import ProformaInvoiceForm from "../components/invoices/ProformaInvoiceForm";
import TaxInvoicePreview from "../components/invoices/TaxInvoicePreview";
import ProformaInvoicePreview from "../components/invoices/ProformaInvoicePreview";
export default function Home() {
  const {
    business,
    setBusiness,
    invoice,
    setInvoice,
    history,
    setHistory,
    storageStatus,
    exportBackup,
    importBackup,
  } = useInvoiceWorkspace();
  const [tab, setTab] = useState("invoice");
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  if (!invoice)
    return <main className="loading">Opening your invoice workspace…</main>;
  function saveInvoice() {
    if (!invoice) return;
    const errors = validateInvoice(invoice);
    if (errors.length) {
      setStatus(errors.join(" "));
      return;
    }
    const existing = history.find(
      (saved) =>
        saved.invoice.documentType === invoice.documentType &&
        saved.invoice.number.trim() === invoice.number.trim(),
    );
    if (
      existing &&
      existing.id !== editingId &&
      !window.confirm(
        `Invoice ${invoice.number} already exists for ${existing.invoice.customer}. Replace that saved invoice?`,
      )
    )
      return;
    const saved = saveToLibrary(history, invoice, business);
    setHistory(saved);
    setEditingId(saved[0].id);
    setStatus("Invoice saved to your library");
  }
  function newInvoice() {
    if (!invoice) return;
    if (
      (invoice.customer.trim() ||
        invoice.items.some((i) => i.description.trim())) &&
      !window.confirm(
        "Start a new invoice? Save this draft to the library first if you need to keep it.",
      )
    )
      return;
    setInvoice(
      createInvoice(nextInvoiceNumber(invoice, history), invoice.documentType),
    );
    setTab("invoice");
    setStatus("");
    setEditingId(null);
  }
  return (
    <div className="workspace">
      <aside className="sidebar no-print">
        <Link href="/" className="brand">
          <Image
            src="/weboin-logo.png"
            alt="Weboin"
            width={160}
            height={51}
            priority
          />
        </Link>
        <div className="workspace-label">BUSINESS WORKSPACE</div>
        {/* <div className="backup-controls">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              try {
                exportBackup();
                setStatus("Backup downloaded.");
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? error.message
                    : "Backup export failed.",
                );
              }
            }}
          >
            Export backup
          </button>
          <label className="field">
            <span>Restore backup</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await importBackup(file);
                  setStatus("");
                } catch (error) {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Unable to restore backup.",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </div> */}
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
          <div className="topbar-account">
            <span className="avatar" aria-hidden="true">
              W
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="sign-out-button">
                Sign out
              </button>
            </form>
          </div>
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
              }}
            >
              {tab === "invoice" &&
                (invoice.documentType === "proforma" ? (
                  <ProformaInvoiceForm
                    invoice={invoice}
                    setInvoice={setInvoice}
                  />
                ) : (
                  <TaxInvoiceForm invoice={invoice} setInvoice={setInvoice} />
                ))}

              {tab === "business" && (
                <BusinessForm
                  business={business}
                  setBusiness={setBusiness}
                  setStatus={setStatus}
                />
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
                            if (
                              (invoice.customer.trim() ||
                                invoice.items.some((i) =>
                                  i.description.trim(),
                                )) &&
                              !window.confirm(
                                "Open this saved invoice and replace the current draft?",
                              )
                            )
                              return;
                            setInvoice(
                              normalizeInvoice(structuredClone(saved.invoice)),
                            );
                            setBusiness({ ...saved.business });
                            setEditingId(saved.id);
                            setTab("invoice");
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="remove"
                          aria-label={`Delete invoice ${saved.invoice.number}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete saved invoice ${saved.invoice.number}? Export a backup first if needed.`,
                              )
                            )
                              setHistory(
                                history.filter((s) => s.id !== saved.id),
                              );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </form>
            <div className="status-row">
              <div className="save-status" role="status">
                <i />
                {status}
              </div>
              <p className="storage-status" role="status">
                {storageStatus}
              </p>
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
                disabled={downloading}
                onClick={async () => {
                  const errors = validateInvoice(invoice);
                  if (errors.length) {
                    setTab("invoice");
                    setStatus(errors.join(" "));
                    setDownloadError(errors.join(" "));
                    return;
                  }
                  try {
                    setDownloading(true);
                    setDownloadError("");
                    setStatus("Generating PDF…");
                    const filename =
                      invoice.documentType === "proforma"
                        ? await import("../lib/generate-proforma-pdf").then(
                            ({ downloadProformaPdf }) =>
                              downloadProformaPdf(invoice, business),
                          )
                        : await import("../lib/generate-tax-invoice-pdf").then(
                            ({ downloadInvoicePdf }) =>
                              downloadInvoicePdf(invoice, business),
                          );
                    setStatus(`Downloaded ${filename}`);
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Unknown error";
                    setStatus(`PDF download failed: ${message}`);
                    setDownloadError(`PDF download failed: ${message}`);
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? "Generating PDF…" : "Download PDF"}
              </button>
            </div>
            {downloadError && (
              <p className="download-error no-print" role="alert">
                {downloadError}
              </p>
            )}
            {invoice.documentType === "proforma" ? (
              <ProformaInvoicePreview invoice={invoice} business={business} />
            ) : (
              <TaxInvoicePreview invoice={invoice} business={business} />
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
