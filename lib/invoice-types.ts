export type Business = {
  signatureImage: string;
  name: string;
  address: string;
  gst: string;
  email: string;
  phone: string;
  accountName: string;
  bank: string;
  branch: string;
  account: string;
  ifsc: string;
  upi: string;
};
export type Item = {
  id: string;
  description: string;
  sac: string;
  price: string;
  quantity: string;
  discount: string;
  discountMode: "amount";
};
export type Invoice = {
  documentType: "tax" | "proforma";
  number: string;
  date: string;
  customer: string;
  address: string;
  gst: string;
  tax: string;
  rate: string;
  note: string;
  items: Item[];
};
