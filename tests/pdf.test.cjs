require("./register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createInvoice, defaultBusiness } = require("../lib/invoice-model.ts");
const {
  createTaxInvoicePdf,
  taxInvoiceFilename,
} = require("../lib/generate-tax-invoice-pdf.ts");
const {
  createProformaPdf,
  proformaFilename,
} = require("../lib/generate-proforma-pdf.ts");
const business = {
  ...defaultBusiness,
  accountName: "Weboin",
  bank: "Example Bank",
  branch: "Chennai",
  account: "1234567890",
  ifsc: "TEST0000001",
  upi: "example@bank",
  gst: "33ABCDE1234F1Z5",
};
const fixture = (type) => ({
  ...createInvoice("001/2026", type),
  customer: "Example Customer",
  address:
    "First floor, Example Building, Anna Salai, Chennai, Tamil Nadu - 600002",
  gst: "33ABCDE1234F1Z5",
  items: [
    {
      id: "one",
      description: "Website design and development",
      sac: "998313",
      price: "10000",
      quantity: "2",
      discount: "10",
    },
  ],
});

test("PDF filenames distinguish type and sanitize unsafe customer/number characters", () => {
  const invoice = { ...fixture("tax"), customer: "A/B:*? Ltd" };
  const tax = taxInvoiceFilename(invoice);
  assert.match(tax, /^Tax-Invoice-001-2026-A-B----Ltd-/);
  assert.ok(!/[<>:"/\\|?*]/.test(tax));
  assert.ok(proformaFilename(invoice).startsWith("Proforma-Invoice-"));
});

for (const [type, create] of [
  ["tax", createTaxInvoicePdf],
  ["proforma", createProformaPdf],
]) {
  test(`${type} PDF includes amounts, date and customer GST`, () => {
    const doc = create(fixture(type), business);
    const output = doc.output();
    assert.equal(doc.getNumberOfPages(), 1);
    assert.ok(output.includes("33ABCDE1234F1Z5"));
    assert.ok(output.includes(type === "tax" ? "23,600.00" : "21,240.00"));
    assert.ok(output.includes("2026"));
  });
  test(`${type} PDF paginates long descriptions and retains final notes`, () => {
    const invoice = fixture(type);
    invoice.items[0].description =
      "A long service description requiring several lines of detailed deliverables. ".repeat(
        130,
      ) + "FINALITEMMARKER";
    invoice.note = "FINALNOTEMARKER";
    const doc = create(invoice, business);
    assert.ok(doc.getNumberOfPages() > 2);
    assert.ok(doc.output().includes("FINALITEMMARKER"));
    assert.ok(doc.output().includes("FINALNOTEMARKER"));
  });
  test(`${type} PDF embeds Calibri and produces QA samples`, () => {
    const fonts = {
      regular: fs.readFileSync("public/fonts/calibri.ttf").toString("base64"),
      bold: fs.readFileSync("public/fonts/calibri-bold.ttf").toString("base64"),
    };
    const logo =
      "data:image/png;base64," +
      fs.readFileSync("public/weboin-logo.png").toString("base64");
    const invoice = fixture(type);
    const doc = create(invoice, business, logo, fonts);
    assert.ok(doc.getFontList().Calibri.includes("bold"));
    assert.equal(doc.getNumberOfPages(), 1);
    assert.ok(doc.output("arraybuffer").byteLength > 100000);
    if (process.env.INVOICE_QA_DIR) {
      fs.mkdirSync(process.env.INVOICE_QA_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(process.env.INVOICE_QA_DIR, `${type}.pdf`),
        Buffer.from(doc.output("arraybuffer")),
      );
      invoice.items[0].description =
        "Detailed scope of services, milestones and deliverables. ".repeat(
          180,
        ) + "FINALITEMMARKER";
      invoice.note = "FINALNOTEMARKER";
      const long = create(invoice, business, logo, fonts);
      fs.writeFileSync(
        path.join(process.env.INVOICE_QA_DIR, `${type}-long.pdf`),
        Buffer.from(long.output("arraybuffer")),
      );
    }
  });
}
