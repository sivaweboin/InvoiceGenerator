import { createPdfDocument, invoiceFilename } from "./pdf-document";
import {
  calculateInvoiceTotals,
  calculateLineGross,
} from "./invoice-calculations";
import { loadPdfAssets } from "./pdf-assets";
import { assertValidInvoice } from "./invoice-validation";
import type { Business, Invoice } from "./invoice-types";

const NAVY = "#201a64";
const money = (value: number) =>
  `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
export function proformaFilename(invoice: Invoice) {
  return invoiceFilename(invoice, "Proforma");
}

export function createProformaPdf(
  invoice: Invoice,
  business: Business,
  logo?: string,
  fonts?: { regular: string; bold: string },
) {
  const { doc, fontFamily } = createPdfDocument(fonts);
  doc.setProperties({
    title: `Proforma Invoice ${invoice.number}`,
    author: business.name,
    subject: `Proforma Invoice for ${invoice.customer}`,
  });

  const text = (
    value: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    align: "left" | "right" | "center" = "left",
  ) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(NAVY);
    doc.text(value, x, y, { align });
  };
  const rule = (y: number) => {
    doc.setDrawColor("#858585");
    doc.setLineWidth(1);
    doc.line(8, y, 202, y);
  };
  const footer = () => {
    doc.setDrawColor(NAVY);
    doc.setLineWidth(0.35);
    doc.circle(11, 286, 3.5);
    doc.ellipse(11, 286, 1.5, 3.5);
    doc.line(7.7, 286, 14.3, 286);
    doc.line(8.1, 284.3, 13.9, 284.3);
    doc.line(8.1, 287.7, 13.9, 287.7);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(NAVY);
    doc.textWithLink("www.weboin.com", 18, 287, {
      url: "https://www.weboin.com",
    });
    doc.circle(173, 286, 3.5);
    // Phone handset inside the circular contact icon.
    doc.line(171.5, 284, 171, 284.5);
    doc.line(171, 284.5, 171.5, 286);
    doc.line(171.5, 286, 173, 287.5);
    doc.line(173, 287.5, 174.5, 288);
    doc.line(174.5, 288, 175, 287.5);
    doc.line(171.5, 286, 172.4, 285.4);
    doc.line(173.6, 286.6, 174.5, 286);
    doc.textWithLink(
      business.phone,
      205 - doc.getTextWidth(business.phone),
      287,
      {
        url: `tel:${business.phone.replace(/[^+0-9]/g, "")}`,
      },
    );
  };
  const pageHeader = (continuation = false) => {
    if (logo) doc.addImage(logo, "PNG", 2, 7, 62, 20);
    else text(business.name, 3, 23, 26, true);
    text(`Pro-Invoice No - ${invoice.number}`, 205, 17, 9, true, "right");
    text(`Date: ${invoice.date}`, 205, 23, 9, false, "right");
    if (continuation) {
      text("PROFORMA INVOICE", 105, 37, 19, true, "center");
      rule(44);
    } else {
      text("PROFORMA INVOICE", 105, 43, 20, true, "center");
    }
  };
  pageHeader();
  const companyBlock = (x: number, name: string) => {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    const nameLines: string[] = doc.splitTextToSize(
      (name || " ").toUpperCase(),
      x > 100 ? 69 : 78,
    );
    nameLines.forEach((line, index) =>
      text(line, x, 70 + index * 5, 9, true, x > 100 ? "right" : "left"),
    );
    return 70 + nameLines.length * 5;
  };
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  const businessLines: string[] = doc.splitTextToSize(business.address, 78);
  const customerLines: string[] = doc.splitTextToSize(
    invoice.address || " ",
    69,
  );
  const addressY = Math.max(
    companyBlock(10, business.name),
    companyBlock(202, invoice.customer || "Customer name"),
  );
  businessLines.forEach((line, index) =>
    text(line, 10, addressY + index * 5, 8),
  );
  customerLines.forEach((line, index) =>
    text(line, 202, addressY + index * 5, 8, false, "right"),
  );
  const gstY =
    addressY + Math.max(3, businessLines.length, customerLines.length) * 5;
  if (business.gst.trim())
    text(`GST Number: ${business.gst}`, 10, gstY, 8, true);
  if (invoice.gst.trim())
    text(`GST Number: ${invoice.gst}`, 202, gstY, 8, true, "right");

  const columns = [8, 91, 128, 155, 176, 202];
  const centers = [49.5, 109.5, 141.5, 165.5, 189];
  const drawTableHeader = (y: number) => {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(NAVY);
    ["DESCRIPTION", "SAC CODE", "PRICE", "QTY", "TOTAL"].forEach(
      (label, index) => doc.text(label, centers[index], y, { align: "center" }),
    );
    rule(y + 7);
    return y + 7;
  };
  let y = drawTableHeader(gstY + 10);
  const addPage = () => {
    footer();
    doc.addPage();
    pageHeader(true);
    y = 55;
  };
  if (logo) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.035 }));
    doc.addImage(logo, "PNG", 4, y + 5, 202, 64);
    doc.restoreGraphicsState();
  }

  for (const item of invoice.items) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    const descriptionLines: string[] = doc.splitTextToSize(
      item.description || " ",
      76,
    );
    let offset = 0;
    while (offset < descriptionLines.length) {
      if (y + 14 > 250) {
        addPage();
        y = drawTableHeader(y);
      }
      const count = Math.max(1, Math.floor((250 - y - 7) / 5));
      const chunk = descriptionLines.slice(offset, offset + count);
      const rowHeight = Math.max(14, chunk.length * 5 + 7);
      const textY = y + (rowHeight - (chunk.length - 1) * 5) / 2 + 1.5;
      chunk.forEach((line, index) =>
        text(line, columns[0] + 2, textY + index * 5, 9, true),
      );
      if (offset === 0) {
        text(item.sac, centers[1], textY, 9, true, "center");
        text(
          money(Number(item.price || 0)),
          centers[2],
          textY,
          9,
          true,
          "center",
        );
        text(item.quantity, centers[3], textY, 9, true, "center");
        text(
          money(calculateLineGross(item)),
          centers[4],
          textY,
          9,
          true,
          "center",
        );
      }
      y += rowHeight;
      offset += chunk.length;
    }
  }
  rule(y);

  const { grossSubtotal, discountTotal, subtotal, taxRate, taxPart, total } =
    calculateInvoiceTotals({ ...invoice, documentType: "proforma" });
  const rows: [string, number][] = [];
  if (discountTotal > 0) {
    rows.push(["SUBTOTAL", grossSubtotal], ["DISCOUNT", -discountTotal]);
  }
  rows.push(["TOTAL", subtotal]);
  if (invoice.tax === "split") {
    rows.push(
      [`CGST @${taxRate / 2}%`, taxPart],
      [`SGST @${taxRate / 2}%`, taxPart],
    );
  } else if (invoice.tax === "igst") {
    rows.push([`IGST @${taxRate}%`, taxPart]);
  }
  rows.push(["TOTAL AMOUNT", total]);

  const totalRowHeight = 8;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  const summaryLeft = centers[1] - doc.getTextWidth("SAC CODE") / 2;
  const totalsStart = y + 11;
  if (totalsStart + rows.length * totalRowHeight > 258) {
    addPage();
    y += 11;
  } else y = totalsStart;
  for (const [label, amount] of rows) {
    if (discountTotal > 0 && (label === "TOTAL" || label === "TOTAL AMOUNT")) {
      doc.setDrawColor("#999999");
      doc.setLineWidth(0.25);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(10);
      const summaryRight = centers[4] + doc.getTextWidth(money(amount)) / 2;
      doc.line(summaryLeft, y - 5, summaryRight, y - 5);
      doc.line(summaryLeft, y + 3, summaryRight, y + 3);
    }
    text(`${label}:`, summaryLeft, y, 10, true, "left");
    text(money(amount), centers[4], y, 10, true, "center");
    y += totalRowHeight;
  }

  y = Math.max(y + 8, doc.getNumberOfPages() === 1 ? 225 : y + 8);
  if (y > 255) addPage();
  text("NOTE -", 8, y, 9, true);
  text("Amounts in INR", 195, y, 9, true, "right");
  y += 6;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(9);
  const noteLines: string[] = doc.splitTextToSize(invoice.note || " ", 128);
  for (const line of noteLines) {
    if (y > 268) addPage();
    text(line, 8, y, 9);
    y += 5;
  }
  y += 2;
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
  ];
  for (const group of payment) {
    const entries = group.filter(([, value]) => value);
    if (!entries.length) continue;
    let x = 8;
    for (const [label, value] of entries) {
      let prefix = `${x > 8 ? ", " : ""}${label}: `;
      doc.setFontSize(9);
      doc.setFont(fontFamily, "bold");
      let labelWidth = doc.getTextWidth(prefix);
      doc.setFont(fontFamily, "normal");
      let valueWidth = doc.getTextWidth(value);
      if (x > 8 && x + labelWidth + valueWidth > 202) {
        y += 5;
        x = 8;
        prefix = `${label}: `;
        doc.setFont(fontFamily, "bold");
        labelWidth = doc.getTextWidth(prefix);
        doc.setFont(fontFamily, "normal");
        valueWidth = doc.getTextWidth(value);
      }
      const available = Math.max(20, 202 - x - labelWidth);
      const lines: string[] = doc.splitTextToSize(value, available);
      if (y + lines.length * 5 > 269) {
        addPage();
        x = 8;
        prefix = `${label}: `;
        doc.setFont(fontFamily, "bold");
        labelWidth = doc.getTextWidth(prefix);
      }
      text(prefix, x, y, 9, true);
      text(lines[0], x + labelWidth, y, 9);
      lines
        .slice(1)
        .forEach((line, index) =>
          text(line, x + labelWidth, y + (index + 1) * 5, 9),
        );
      y += (lines.length - 1) * 5;
      x += labelWidth + Math.min(valueWidth, available);
    }
    y += 5;
  }

  footer();
  return doc;
}

export async function downloadProformaPdf(
  invoice: Invoice,
  business: Business,
) {
  assertValidInvoice(invoice);
  const { logo, fonts } = await loadPdfAssets();
  const filename = proformaFilename(invoice);
  createProformaPdf(invoice, business, logo, fonts).save(filename);
  return filename;
}
