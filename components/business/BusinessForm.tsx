import Field from "../invoices/Field";
import Image from "next/image";
import type { Business } from "../../lib/invoice-types";
import type { Dispatch, SetStateAction } from "react";
export default function BusinessForm({
  business,
  setBusiness,
  setStatus,
}: {
  business: Business;
  setBusiness: Dispatch<SetStateAction<Business>>;
  setStatus: (message: string) => void;
}) {
  const updateBusiness = (key: keyof Business, value: string) =>
    setBusiness((previous) => ({ ...previous, [key]: value }));
  return (
    <>
      <div className="section-title">
        <span className="step">01</span>
        <h2>Business details</h2>
      </div>
      <div className="fields">
        {(
          [
            ["name", "Business name"],
            ["address", "Business address"],
            ["gst", "GST number"],
            ["email", "Email"],
            ["phone", "Phone"],
          ] as [keyof Business, string][]
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={business[key]}
            multiline={key === "address"}
            onChange={(v) => updateBusiness(key, v)}
          />
        ))}
      </div>
      <div className="section-title">
        <span className="step">02</span>
        <h2>Payment details</h2>
      </div>
      <div className="info-box">
        Saved automatically for your next invoice. Bank details are stored only
        in this browser.
      </div>
      <div className="fields">
        {(
          [
            ["accountName", "Account holder name"],
            ["bank", "Bank name"],
            ["branch", "Branch"],
            ["account", "Account number"],
            ["ifsc", "IFSC code"],
            ["upi", "UPI ID"],
          ] as [keyof Business, string][]
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={business[key]}
            onChange={(v) => updateBusiness(key, v)}
          />
        ))}
      </div>
      <div className="section-title">
        <h2>Authorized signature</h2>
      </div>
      <p className="info-box">
        Upload Mr Saravanan’s signature (PNG or JPG, up to 1 MB). It is saved in
        this browser and included in downloaded PDFs.
      </p>
      <div className="field">
        <span>Mr Saravanan’s signature image</span>
        {business.signatureImage && (
          <div className="signature-saved" role="status">
            <Image
              src={business.signatureImage}
              alt="Saved signature"
              width={160}
              height={65}
              unoptimized
            />
            <span>Signature saved in this browser</span>
          </div>
        )}
        <label className="signature-upload">
          <span>
            {business.signatureImage
              ? "Replace signature image"
              : "Upload signature image"}
          </span>
          <input
            type="file"
            className="signature-file-input"
            accept="image/png,image/jpeg"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                !["image/png", "image/jpeg"].includes(file.type) ||
                file.size > 1024 * 1024
              ) {
                setStatus("Choose a PNG or JPG image smaller than 1 MB.");
                e.target.value = "";
                return;
              }
              try {
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const image = new window.Image();
                image.src = data;
                await image.decode();
                updateBusiness("signatureImage", data);
              } catch {
                setStatus(
                  "This image could not be read. Choose a valid PNG or JPG.",
                );
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {business.signatureImage && (
        <button
          className="button secondary"
          type="button"
          onClick={() => updateBusiness("signatureImage", "")}
        >
          Remove signature image
        </button>
      )}
    </>
  );
}
