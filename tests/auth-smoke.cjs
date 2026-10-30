const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const password = randomBytes(24).toString("hex");
  const origin = "http://localhost:3015";
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3015"],
    {
      env: {
        ...process.env,
        AUTH_LOGIN_ID: "invoice@weboin.com",
        AUTH_PASSWORD: password,
        AUTH_JWT_SECRET: randomBytes(32).toString("hex"),
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${origin}/login`)).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForURL("**/login");
    await page.getByLabel("Login ID").fill("invoice@weboin.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Invalid login" })
      .waitFor();
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByLabel("Document type").waitFor();
    const session = (await context.cookies()).find(
      (c) => c.name === "weboin-session",
    );
    assert.ok(
      session.httpOnly && session.secure && session.sameSite === "Strict",
    );
    assert.equal(session.value.split(".").length, 3);
    await page.reload();
    await page.getByLabel("Document type").waitFor();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/login");
    await page.goto(origin);
    await page.waitForURL("**/login");
    await context.addCookies([
      { ...session, value: session.value.slice(0, -8) + "tampered" },
    ]);
    await page.goto(origin);
    await page.waitForURL("**/login");
    const csrf = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: {
        Origin: "https://invalid.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "invoice@weboin.com", password }),
    });
    assert.equal(csrf.status, 403);
    console.log(
      "Auth smoke passed: redirect, invalid/valid credentials, secure JWT cookie, reload, logout, tamper rejection, origin check.",
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
