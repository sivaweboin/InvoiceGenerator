import type { Business, Invoice, Item } from "./invoice-types";

export type SavedInvoice = { id: string; invoice: Invoice; business: Business };
export type Workspace = {
  version: 1;
  business: Business;
  invoice: Invoice;
  history: SavedInvoice[];
};
export const defaultBusiness: Business = {
  signatureImage: "",
  name: "WEBOIN TECHNOLOGIES PRIVATE LIMITED",
  address:
    "766 , 1st floor, Shakti Towers, Anna\nSalai, Thousand Lights, Chennai,\nTamil Nadu - 600002",
  gst: "33AADCW0171E1ZS",
  email: "sales@weboin.com",
  phone: "+91 9403891477",
  accountName: "",
  bank: "",
  branch: "",
  account: "",
  ifsc: "",
  upi: "",
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value,
  );
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const createItem = (): Item => ({
  id: crypto.randomUUID(),
  description: "",
  sac: "998313",
  price: "",
  quantity: "1",
  discount: "0",
});
export const createInvoice = (
  number = `001/${today().slice(0, 4)}`,
  documentType: Invoice["documentType"] = "tax",
): Invoice => ({
  documentType,
  number,
  date: today(),
  customer: "",
  address: "",
  gst: "",
  tax: "split",
  rate: "18",
  note: "Thank you for doing business with Weboin.",
  items: [createItem()],
});
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved record");
  return value as Record<string, unknown>;
};
const string = (value: unknown, fallback = "") => {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new Error("Invalid saved field");
  return value;
};
export function normalizeInvoice(value: unknown): Invoice {
  const data = record(value);
  if (
    data.documentType !== undefined &&
    data.documentType !== "tax" &&
    data.documentType !== "proforma"
  )
    throw new Error("Unknown document type");
  if (!["split", "igst", "none"].includes(String(data.tax)))
    throw new Error("Unknown tax type");
  if (!Array.isArray(data.items) || !data.items.length)
    throw new Error("Invoice has no items");
  const ids = new Set<string>();
  const items = data.items.map((value) => {
    const item = record(value);
    let id = string(item.id) || crypto.randomUUID();
    if (ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    return {
      id,
      description: string(item.description),
      sac: string(item.sac),
      price: string(item.price),
      quantity: string(item.quantity),
      discount: string(item.discount, "0"),
    };
  });
  return {
    documentType: data.documentType === "proforma" ? "proforma" : "tax",
    number: string(data.number),
    date: string(data.date),
    customer: string(data.customer),
    address: string(data.address),
    gst: string(data.gst),
    tax: data.tax as Invoice["tax"],
    rate: string(data.rate),
    note: string(data.note),
    items,
  };
}
export function normalizeBusiness(
  value: unknown,
  migrateStarter = false,
): Business {
  const data = record(value);
  const business = Object.fromEntries(
    Object.entries(defaultBusiness).map(([key, fallback]) => [
      key,
      string(data[key], fallback),
    ]),
  ) as Business;
  if (
    migrateStarter &&
    business.name === "Weboin" &&
    business.address ===
      "766, 1st floor, Shakti Towers, Anna Salai, Chennai - 600 002."
  ) {
    business.name = defaultBusiness.name;
    business.address = defaultBusiness.address;
    if (!business.gst.trim()) business.gst = defaultBusiness.gst;
  }
  if (
    migrateStarter &&
    business.name === defaultBusiness.name &&
    business.address ===
      "766, 1st floor, Shakti Towers,\nAnna Salai, Thousand Lights, Chennai,\nTamil Nadu - 600002"
  )
    business.address = defaultBusiness.address;
  return business;
}
export function parseWorkspace(raw: string): Workspace {
  const data = record(JSON.parse(raw));
  if (data.version !== undefined && data.version !== 1)
    throw new Error("Unsupported backup version");
  if (!Array.isArray(data.history)) throw new Error("Invalid invoice library");
  const ids = new Set<string>();
  return {
    version: 1,
    business: normalizeBusiness(data.business, true),
    invoice: normalizeInvoice(data.invoice),
    history: data.history.map((value) => {
      const saved = record(value);
      const id = string(saved.id) || crypto.randomUUID();
      if (ids.has(id)) throw new Error("Duplicate saved invoice identifier");
      ids.add(id);
      return {
        id,
        invoice: normalizeInvoice(saved.invoice),
        business: normalizeBusiness(saved.business),
      };
    }),
  };
}
export function saveToLibrary(
  history: SavedInvoice[],
  invoice: Invoice,
  business: Business,
): SavedInvoice[] {
  const matches = (saved: SavedInvoice) =>
    saved.invoice.documentType === invoice.documentType &&
    saved.invoice.number.trim() === invoice.number.trim();
  const existing = history.find(matches);
  return [
    {
      id: existing?.id ?? crypto.randomUUID(),
      invoice: structuredClone({ ...invoice, number: invoice.number.trim() }),
      business: structuredClone(business),
    },
    ...history.filter((saved) => !matches(saved)),
  ];
}
export function nextInvoiceNumber(current: Invoice, history: SavedInvoice[]) {
  const match = current.number.match(/^(\d+)(.*)$/);
  let next = match ? BigInt(match[1]) + BigInt(1) : BigInt(1);
  const suffix = match?.[2] ?? `/${today().slice(0, 4)}`;
  const width = match?.[1].length ?? 3;
  const used = new Set(
    history
      .filter((s) => s.invoice.documentType === current.documentType)
      .map((s) => s.invoice.number.trim()),
  );
  while (used.has(`${String(next).padStart(width, "0")}${suffix}`)) next++;
  return `${String(next).padStart(width, "0")}${suffix}`;
}
