import { createPdfDocument, invoiceFilename } from "./pdf-document";
import { loadPdfAssets } from "./pdf-assets";
import { assertValidInvoice } from "./invoice-validation";
import {
  calculateInvoiceTotals,
  calculateLineTotal,
} from "./invoice-calculations";
import type { Business, Invoice } from "./invoice-types";

// Edit this file to change the downloaded PDF's layout, labels and filename.
const NAVY = "#201a64";
const money = (n: number) =>
  `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function taxInvoiceFilename(invoice: Invoice) {
  return invoiceFilename(invoice, "Tax");
}

/** Creates a real, editable-text A4 PDF, independently of the page and print styles. */
export function createTaxInvoicePdf(
  invoice: Invoice,
  business: Business,
  logo?: string,
  fonts?: { regular: string; bold: string },
) {
  const { doc, fontFamily } = createPdfDocument(fonts);
  const documentLabel = "Tax Invoice";
  doc.setProperties({
    title: `${documentLabel} ${invoice.number}`,
    author: business.name,
    subject: `${documentLabel} for ${invoice.customer}`,
  });
  let y = 20;
  const text = (
    value: string,
    x: number,
    top: number,
    size = 10,
    bold = false,
    align: "left" | "right" | "center" = "left",
  ) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(NAVY);
    doc.text(value, x, top, { align });
  };
  const footer = () => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;
    const phoneUrl = `tel:${business.phone.replace(/[^+0-9]/g, "")}`;
    doc.setFillColor(NAVY);
    doc.rect(0, 272, 210, 25, "F");
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor("#ffffff");
    doc.textWithLink(business.email, 15, 282, {
      url: `mailto:${business.email}`,
    });
    doc.textWithLink(
      business.phone,
      195 - doc.getTextWidth(business.phone),
      282,
      { url: phoneUrl },
    );
    // Vector location pin avoids missing icon glyphs in PDF readers.
    doc.setDrawColor("#ffffff");
    doc.setLineWidth(0.35);
    doc.circle(73, 278.7, 1.7, "S");
    doc.circle(73, 278.7, 0.55, "S");
    doc.line(71.6, 279.7, 73, 282.2);
    doc.line(74.4, 279.7, 73, 282.2);
    const address: string[] = doc.splitTextToSize(business.address, 70);
    address.forEach((line, index) =>
      doc.textWithLink(line, 78, 280 + index * 4.5, { url: mapUrl }),
    );
  };
  const nextPage = () => {
    footer();
    doc.addPage();
    y = 22;
    text(`TAX INVOICE  /  ${invoice.number}`, 15, 14, 9, true);
  };
  const room = (height: number) => {
    if (y + height > 263) nextPage();
  };
  const paragraph = (value: string, width = 180, size = 10, bold = false) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value || " ", width);
    for (const line of lines) {
      room(5);
      text(line, 15, y, size, bold);
      y += 5;
    }
    y += 2;
  };
  // Reference template coordinates in A4 millimetres.
  const pageHeader = () => {
    if (logo) doc.addImage(logo, "PNG", 5, 9, 63, 20);
    else text(business.name, 7, 24, 29, true);
    text(`INVOICE NO - ${invoice.number}`, 203, 16, 10, true, "right");
    text(
      `DATE - ${invoice.date.split("-").reverse().join("/")}`,
      203,
      23,
      10,
      true,
      "right",
    );
    text("TAX INVOICE", 105, 36, 22, true, "center");
    doc.setDrawColor("#555555");
    doc.setLineWidth(0.4);
    doc.line(88, 40, 122, 40);
  };
  pageHeader();
  text("BILL TO -", 13, 48, 13, true);
  text(invoice.customer, 13, 57, 12, false);
  doc.setFontSize(10);
  doc.setFont(fontFamily, "normal");
  const address: string[] = doc.splitTextToSize(invoice.address, 95);
  address.forEach((line, index) => text(line, 13, 64 + index * 4.5, 10));
  const tableTop = Math.max(81, 71 + address.length * 4.5);
  text(`GST Number: ${invoice.gst || ""}`, 13, tableTop - 5, 10, false);
  const columns = [13, 72, 99, 136, 160, 197];
  const centers = [42.5, 85.5, 117.5, 148, 178.5];
  const grid = (top: number, height: number, totals = false) => {
    doc.setDrawColor("#999999");
    doc.setLineWidth(0.5);
    doc.rect(13, top, 184, height);
    (totals ? [160] : columns.slice(1, -1)).forEach((x) =>
      doc.line(x, top, x, top + height),
    );
  };
  const tableHeader = () => {
    doc.setFillColor(NAVY);
    doc.rect(13, y, 184, 15, "F");
    grid(y, 15);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(11);
    doc.setTextColor("#ffffff");
    ["DESCRIPTION", "SAC CODE", "PRICE", "QTY", "TOTAL"].forEach(
      (label, index) =>
        doc.text(label, centers[index], y + 9, { align: "center" }),
    );
    y += 15;
  };
  const continuation = () => {
    footer();
    doc.addPage();
    pageHeader();
    y = 49;
    tableHeader();
  };
  y = tableTop;
  tableHeader();
  // Render exactly the services entered; never add filler rows.
  const items = invoice.items;
  for (const item of items) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(11);
    const lines: string[] = doc.splitTextToSize(item.description || " ", 53);
    const amount = calculateLineTotal(item, "tax");
    let offset = 0;
    while (offset < lines.length) {
      if (y + 20 > 255) continuation();
      const count = Math.max(
        1,
        Math.min(lines.length - offset, Math.floor((250 - y) / 5)),
      );
      const chunk = lines.slice(offset, offset + count);
      const height = Math.max(20, chunk.length * 5 + 8);
      // Keep the watermark in the downloaded PDF only.
      if (logo && item === items[0] && offset === 0) {
        doc.saveGraphicsState();
        doc.setGState(doc.GState({ opacity: 0.025 }));
        doc.addImage(logo, "PNG", 1, y + 27, 202, 64);
        doc.restoreGraphicsState();
      }
      grid(y, height);
      chunk.forEach((line, index) =>
        text(
          line,
          centers[0],
          y + (height - chunk.length * 5) / 2 + 4 + index * 5,
          11,
          false,
          "center",
        ),
      );
      if (offset === 0 && item.description) {
        text(item.sac, centers[1], y + height / 2 + 1, 10, false, "center");
        text(
          Number(item.price || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          }),
          centers[2],
          y + height / 2 + 1,
          10,
          false,
          "center",
        );
        text(
          item.quantity,
          centers[3],
          y + height / 2 + 1,
          11,
          false,
          "center",
        );
        text(money(amount), centers[4], y + height / 2 + 1, 9, false, "center");
      }
      y += height;
      offset += count;
    }
  }
  const {
    subtotal,
    taxRate: rate,
    taxPart: tax,
    total,
  } = calculateInvoiceTotals({ ...invoice, documentType: "tax" });
  const rows: [string, number][] = [["TOTAL", subtotal]];
  if (invoice.tax === "split")
    rows.push([`CGST @${rate / 2}%`, tax], [`SGST @${rate / 2}%`, tax]);
  else if (invoice.tax === "igst") rows.push([`IGST @${rate}%`, tax]);
  rows.push(["GRAND TOTAL", total]);
  if (y + rows.length * 14 > 255) {
    footer();
    doc.addPage();
    pageHeader();
    y = 49;
  }
  rows.forEach(([label, amount]) => {
    grid(y, 14, true);
    text(label, 86.5, y + 8.5, 11, label === "GRAND TOTAL", "center");
    text(money(amount), 178.5, y + 8.5, 9, label === "GRAND TOTAL", "center");
    y += 14;
  });
  // Preserve the reference's whitespace between the table and payment block.
  if (y + 53 > 268) {
    footer();
    doc.addPage();
    pageHeader();
    y = 49;
  }
  y = Math.max(y + 10, doc.getNumberOfPages() === 1 ? 221 : y + 10);
  const signatureTop = y + 13;
  text("NOTE -", 13, y, 10, true);
  text("Amounts in INR", 197, y, 10, false, "right");
  y += 6;
  paragraph(invoice.note, 126, 10);
  // Compact payment lines match the supplied invoice reference.
  const payment: [string, string][][] = [
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
    [["GST Number", business.gst]],
  ];
  for (const group of payment) {
    const entries = group.filter(([, value]) => value);
    if (!entries.length) continue;
    let x = 13;
    for (let i = 0; i < entries.length; i++) {
      const [label, value] = entries[i];
      const prefix = `${i ? ", " : ""}${label}: `;
      doc.setFontSize(10);
      doc.setFont(fontFamily, "bold");
      const labelWidth = doc.getTextWidth(prefix);
      doc.setFont(fontFamily, "normal");
      const valueWidth = doc.getTextWidth(value);
      // Wrap a long pair as a unit instead of crossing into the signature.
      if (x > 13 && x + labelWidth + valueWidth > 145) {
        y += 5;
        x = 13;
      }
      const available = Math.max(30, 145 - x - labelWidth);
      const lines: string[] = doc.splitTextToSize(value, available);
      room(lines.length * 5);
      text(prefix, x, y, 10, true);
      lines.forEach((line, index) =>
        text(line, x + labelWidth, y + index * 5, 10),
      );
      y += (lines.length - 1) * 5;
      x += labelWidth + Math.min(valueWidth, available) + 2;
    }
    y += 5;
  }
  let signatureY = Math.max(signatureTop, Math.min(y - 14, 244));
  if (business.signatureImage) {
    const image = doc.getImageProperties(business.signatureImage);
    const scale = Math.min(40 / image.width, 15 / image.height);
    const w = image.width * scale,
      h = image.height * scale;
    doc.addImage(
      business.signatureImage,
      image.fileType,
      194 - w,
      signatureY,
      w,
      h,
    );
  } else {
    doc.setDrawColor("#c8c4d6");
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(154, signatureY, 40, 14);
    doc.setLineDashPattern([], 0);
    text("Signature placeholder", 174, signatureY + 8, 7, false, "center");
  }
  signatureY += 19;
  // text("Mr Saravanan", 194, signatureY, 10, true, "right");
  text("FOUNDER & CEO", 194, signatureY, 10, false, "right");
  footer();
  return doc;
}

export async function downloadInvoicePdf(invoice: Invoice, business: Business) {
  assertValidInvoice(invoice);
  const { logo, fonts } = await loadPdfAssets();
  const filename = taxInvoiceFilename(invoice);
  createTaxInvoicePdf(invoice, business, logo, fonts).save(filename);
  return filename;
}
