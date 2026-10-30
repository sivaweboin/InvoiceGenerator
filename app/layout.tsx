import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weboin | Invoice",
  description:
    "Create, save and download Weboin Tax and Proforma invoices. Business and bank details saved on your device.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
