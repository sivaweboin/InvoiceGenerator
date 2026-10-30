# Weboin Invoice Workspace

Create Tax and Proforma invoices, preview them, save an invoice library, and download named A4 PDFs. Proforma supports percentage discounts per item, applied before tax. Tax and Proforma keep separate layouts and can use the same document number without overwriting each other.

## Development

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use Business & bank to enter business details and upload an optional PNG/JPG signature. Customer GSTIN is optional; when provided, its format is checked. The app does not verify GST registration with an external service.

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm start
```

## Where to edit

| Area                                         | Files                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Workspace navigation and actions             | `app/page.tsx`                                                              |
| Tax editor and preview                       | `components/invoices/TaxInvoiceForm.tsx`, `TaxInvoicePreview.tsx`           |
| Proforma editor and preview                  | `components/invoices/ProformaInvoiceForm.tsx`, `ProformaInvoicePreview.tsx` |
| Shared invoice fields and line items         | `components/invoices/InvoiceForm.tsx`, `Field.tsx`                          |
| Business and signature settings              | `components/business/BusinessForm.tsx`                                      |
| Tax PDF layout                               | `lib/generate-tax-invoice-pdf.ts`                                           |
| Proforma PDF layout                          | `lib/generate-proforma-pdf.ts`                                              |
| PDF fonts, assets and filenames              | `lib/pdf-assets.ts`, `lib/pdf-document.ts`                                  |
| Currency, discount and tax arithmetic        | `lib/invoice-calculations.ts`                                               |
| Input validation                             | `lib/invoice-validation.ts`                                                 |
| Defaults, saved records and backup migration | `lib/invoice-model.ts`                                                      |
| Browser persistence and backup actions       | `hooks/use-invoice-workspace.ts`                                            |

`lib/generate-invoice-pdf.ts` remains a compatibility export for the Tax renderer. PDF downloads use jsPDF, independent of browser printing, and embed the bundled Calibri fonts. Download names include the document type, number, customer and date. Preview and PDF use the same calculation functions; their layout code is intentionally separate.

Amounts round to two decimal places per line. Discounts apply only to Proforma; split GST rounds each tax part before adding it to the total. The selected rate is user-entered, not inferred from SAC codes.

## Data and backups

Data is stored under `weboin-workspace-v1` in this browser's localStorage. Existing unversioned data is migrated on load. Every saved invoice captures its business details. Reopening a saved invoice also restores those details into the active workspace.

Use **Export backup** regularly and before clearing browser data. **Restore backup** validates the file before replacing business details, the draft, and the invoice library. Backups include bank details and signature images; keep them in a private location. Corrupt data is preserved for recovery, storage failures are shown, and changes from another tab pause saving to prevent overwrites. When a tab conflict occurs, export that tab's draft before reloading.

This is a single-browser workspace. Different browsers, devices, and origins (including `localhost` versus `127.0.0.1`) have separate data. No login, server database, shared invoice numbering, audit trail, or automatic remote backup is implemented. For multi-user office deployment, these need a server-backed design before relying on the app as the system of record.

## Verification

The Node test suite covers tax/discount calculations, rounding, validation, document-number collisions, immutable saved snapshots, backup migration, and PDF creation/pagination. Run `npm run format` after editing to keep the source consistently formatted.

For the optional browser workflow check, start the app and run `node tests/browser-smoke.cjs` with Playwright and Chrome available. `PLAYWRIGHT_MODULE` can point to an installed Playwright package; `INVOICE_URL` selects the local server. Tests use an isolated browser context and do not change your browser's saved invoices. Set `INVOICE_QA_DIR` to capture PDF or screenshot samples during verification.

## Single-account login

Copy .env.example to .env.local and set AUTH_PASSWORD to a unique, strong password. Set AUTH_JWT_SECRET to a random secret of at least 32 characters (generate one with Node crypto.randomBytes(32).toString("hex")). The default login ID is invoice@weboin.com. Set the same variables in your hosting environment and use HTTPS in production. Never use NEXT_PUBLIC_ for these settings or commit .env.local. Missing settings disable login.

Sessions use HS256 JWTs in an HTTP-only, SameSite=Strict cookie, have no JWT expiry, and use Secure cookies in production. The persistent cookie lasts up to 400 days (browsers may shorten or clear it). Sign out removes the browser session; rotating AUTH_JWT_SECRET invalidates all sessions. Login attempts are limited to ten failures per fifteen minutes per server process; use gateway/shared rate limiting for deployments with multiple instances.

Invoices remain in browser localStorage. Login gates app access but does not encrypt locally saved data or share it between devices. Signing out preserves invoices on that device. Anyone with access to the browser profile can inspect its local storage.
