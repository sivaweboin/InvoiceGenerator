const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./register-typescript.cjs");
const {
  createInvoice,
  defaultBusiness,
  saveToLibrary,
  nextInvoiceNumber,
  parseWorkspace,
} = require("../lib/invoice-model.ts");
const { calculateInvoiceTotals } = require("../lib/invoice-calculations.ts");
const { validateInvoice } = require("../lib/invoice-validation.ts");
const valid = (type = "tax") => ({
  ...createInvoice("001/2026", type),
  customer: "Example",
  address: "Chennai",
  items: [
    {
      id: "a",
      description: "Service",
      sac: "998313",
      price: "10000",
      quantity: "2",
      discount: "2000",
      discountMode: "amount",
    },
  ],
});
test("tax invoice ignores proforma discounts and splits tax", () => {
  const t = calculateInvoiceTotals(valid());
  assert.equal(t.total, 23600);
  assert.equal(t.discountTotal, 0);
  assert.equal(t.taxPart, 1800);
});
test("proforma discounts apply before tax", () => {
  const t = calculateInvoiceTotals(valid("proforma"));
  assert.equal(t.subtotal, 18000);
  assert.equal(t.discountTotal, 2000);
  assert.equal(t.total, 21240);
});
test("legacy percentage discounts migrate to fixed amounts without changing totals", () => {
  const invoice = valid("proforma");
  invoice.items[0].discount = "10";
  delete invoice.items[0].discountMode;
  const raw = JSON.stringify({
    version: 1,
    invoice,
    business: defaultBusiness,
    history: [{ id: "saved", invoice, business: defaultBusiness }],
  });
  const migrated = parseWorkspace(raw);
  for (const item of [migrated.invoice, migrated.history[0].invoice]) {
    assert.equal(item.items[0].discount, "2000");
    assert.equal(calculateInvoiceTotals(item).total, 21240);
  }
  assert.equal(
    parseWorkspace(JSON.stringify(migrated)).invoice.items[0].discount,
    "2000",
  );
});
test("IGST and no-tax calculations", () => {
  assert.equal(
    calculateInvoiceTotals({ ...valid(), tax: "igst" }).taxPart,
    3600,
  );
  assert.equal(
    calculateInvoiceTotals({ ...valid(), tax: "none" }).total,
    20000,
  );
});
test("currency rounding and zero amounts remain valid", () => {
  const i = valid();
  i.items[0].price = "0";
  assert.equal(validateInvoice(i).length, 0);
  assert.equal(calculateInvoiceTotals(i).total, 0);
  i.items[0].price = "0.05";
  i.items[0].quantity = "1";
  assert.equal(calculateInvoiceTotals(i).total, 0.05);
});
test("reject invalid fields before saving or exporting", () => {
  for (const [key, value] of [
    ["customer", " "],
    ["address", ""],
    ["date", "2026-02-30"],
    ["rate", "Infinity"],
  ])
    assert.ok(validateInvoice({ ...valid(), [key]: value }).length);
  for (const [key, value] of [
    ["price", "NaN"],
    ["price", "-1"],
    ["quantity", "0"],
    ["discount", "20001"],
  ]) {
    const i = valid("proforma");
    i.items[0][key] = value;
    assert.ok(validateInvoice(i).length);
  }
});
test("tax and proforma with same number coexist, resave preserves id", () => {
  let history = saveToLibrary([], valid(), defaultBusiness);
  const id = history[0].id;
  history = saveToLibrary(history, valid("proforma"), defaultBusiness);
  assert.equal(history.length, 2);
  history = saveToLibrary(history, valid(), defaultBusiness);
  assert.equal(history.length, 2);
  assert.equal(history[0].id, id);
});
test("number generation skips occupied numbers for same type", () => {
  const history = saveToLibrary(
    [],
    { ...valid(), number: "002/2026" },
    defaultBusiness,
  );
  assert.equal(nextInvoiceNumber(valid(), history), "003/2026");
});
test("saved business and item snapshots do not mutate", () => {
  const i = valid();
  const b = { ...defaultBusiness };
  const history = saveToLibrary([], i, b);
  i.items[0].description = "changed";
  b.name = "changed";
  assert.equal(history[0].invoice.items[0].description, "Service");
  assert.equal(history[0].business.name, defaultBusiness.name);
});
test("legacy backups migrate defaults without discarding records", () => {
  const i = valid();
  delete i.documentType;
  delete i.items[0].discount;
  const data = parseWorkspace(
    JSON.stringify({ invoice: i, business: defaultBusiness, history: [] }),
  );
  assert.equal(data.invoice.documentType, "tax");
  assert.equal(data.invoice.items[0].discount, "0");
});
test("old starter business details upgrade without changing saved snapshots or custom details", () => {
  const starter = {
    ...defaultBusiness,
    name: "Weboin",
    address: "766, 1st floor, Shakti Towers, Anna Salai, Chennai - 600 002.",
    gst: "",
  };
  const saved = saveToLibrary([], valid(), starter);
  const data = parseWorkspace(
    JSON.stringify({
      version: 1,
      invoice: valid(),
      business: starter,
      history: saved,
    }),
  );
  assert.equal(data.business.name, defaultBusiness.name);
  assert.equal(data.business.gst, "33AADCW0171E1ZS");
  assert.equal(data.business.address.split("\n").length, 3);
  assert.equal(data.history[0].business.name, "Weboin");
  const custom = parseWorkspace(
    JSON.stringify({
      version: 1,
      invoice: valid(),
      business: { ...starter, name: "My Business" },
      history: [],
    }),
  );
  assert.equal(custom.business.name, "My Business");
  assert.equal(custom.business.gst, "");
});
test("previous default address updates to the requested three lines", () => {
  const previousAddress =
    "766, 1st floor, Shakti Towers,\nAnna Salai, Thousand Lights, Chennai,\nTamil Nadu - 600002";
  const data = parseWorkspace(
    JSON.stringify({
      version: 1,
      invoice: valid(),
      business: { ...defaultBusiness, address: previousAddress },
      history: [],
    }),
  );
  assert.equal(
    data.business.address,
    "766 , 1st floor, Shakti Towers, Anna\nSalai, Thousand Lights, Chennai,\nTamil Nadu - 600002",
  );
});
test("invalid backups fail before replacing data", () => {
  for (const raw of [
    "bad JSON",
    "{}",
    JSON.stringify({
      version: 99,
      business: defaultBusiness,
      invoice: valid(),
      history: [],
    }),
    JSON.stringify({
      business: defaultBusiness,
      invoice: { ...valid(), items: [] },
      history: [],
    }),
  ])
    assert.throws(() => parseWorkspace(raw));
});
test("library does not silently discard older invoices", () => {
  let history = [];
  for (let n = 0; n < 105; n++)
    history = saveToLibrary(
      history,
      { ...valid(), number: String(n) },
      defaultBusiness,
    );
  assert.equal(history.length, 105);
});
