"use client";
import { useState } from "react";
export default function Login() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="login-screen">
      <div className="login-backdrop" aria-hidden="true" inert>
        <aside className="login-backdrop-sidebar">
          <strong>WEBOIN</strong>
          <p>WORKSPACE</p>
          <div>Create invoice</div>
          <div>Business &amp; bank</div>
          <div>Saved invoices</div>
        </aside>
        <div className="login-backdrop-workspace">
          <header>Invoice workspace</header>
          <h2>Create invoice</h2>
          <p>Prepare and download your invoice.</p>
          <div className="login-backdrop-columns">
            <div className="login-backdrop-editor">
              <h3>Invoice details</h3>
              <p>Document type</p>
              <div className="login-backdrop-field">Tax Invoice</div>
              <p>Invoice number</p>
              <div className="login-backdrop-field">001/2026</div>
              <h3>Who’s it for?</h3>
              <p>Customer / company name</p>
              <div className="login-backdrop-field">Customer name</div>
              <p>Billing address</p>
              <div className="login-backdrop-field">Customer address</div>
            </div>
            <div className="login-backdrop-paper">
              <strong>WEBOIN</strong>
              <h2>TAX INVOICE</h2>
              <h3>BILL TO</h3>
              <p>Customer name</p>
              <p>Customer billing address</p>
              <div className="login-backdrop-table">
                DESCRIPTION　　　　　 PRICE　　 QTY　　 TOTAL
              </div>
              <p>Service description</p>
              <hr />
              <p className="login-backdrop-total">TOTAL AMOUNT　 ₹ 0.00</p>
            </div>
          </div>
        </div>
      </div>
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand">
          WEBOIN <span>INVOICE WORKSPACE</span>
        </div>
        <div className="login-heading-row">
          <div className="login-emblem" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="10" width="14" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <h1 id="login-heading">Login to continue</h1>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            const data = new FormData(event.currentTarget);
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: data.get("email"),
                  password: data.get("password"),
                }),
              });
              const result = await response.json();
              if (!response.ok) {
                setError(result.error || "Unable to log in.");
                return;
              }
              window.location.replace("/");
            } catch {
              setError("Unable to connect. Please try again.");
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            <span>Login ID</span>
            <input
              name="email"
              type="email"
              placeholder="Enter your login ID"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              maxLength={1024}
            />
          </label>
          {error && (
            <p role="alert" className="download-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={pending}>
            {pending ? "Logging in…" : "Log in to workspace →"}
          </button>
        </form>
      </section>
    </main>
  );
}
