import { jsPDF } from "jspdf";
import type { PdfFonts } from "./pdf-assets";
import type { Invoice } from "./invoice-types";

const safeName = (value: string) =>
  Array.from(value)
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
        ? "-"
        : character,
    )
    .join("")
    .replace(/\s+/g, "-")
    .replace(/^[. -]+|[. -]+$/g, "")
    .slice(0, 90);

export function invoiceFilename(invoice: Invoice, kind: "Tax" | "Proforma") {
  return `${kind}-Invoice-${safeName(invoice.number) || "draft"}-${safeName(invoice.customer) || "customer"}-${safeName(invoice.date)}.pdf`;
}

export function createPdfDocument(fonts?: PdfFonts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (fonts) {
    doc.addFileToVFS("calibri.ttf", fonts.regular);
    doc.addFont("calibri.ttf", "Calibri", "normal");
    doc.addFileToVFS("calibri-bold.ttf", fonts.bold);
    doc.addFont("calibri-bold.ttf", "Calibri", "bold");
  }
  return { doc, fontFamily: fonts ? "Calibri" : "helvetica" };
}
