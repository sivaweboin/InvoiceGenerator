const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  const url = process.env.INVOICE_URL || "http://localhost:3000";
  const key = "weboin-workspace-v1";
  try {
    await page.goto(url);
    await page.getByRole("button", { name: "Download PDF" }).click();
    await page
      .getByRole("alert")
      .getByText("Enter the customer name.", { exact: false })
      .waitFor();
    await page
      .getByLabel("Customer / company name")
      .fill("Browser QA Customer");
    await page
      .getByLabel("Billing address")
      .fill("Example Road, Chennai, Tamil Nadu 600002");
    await page.getByLabel("Service description").fill("Website development");
    await page.getByLabel("Price (₹)").fill("10000");
    await page.getByRole("button", { name: "Save invoice to library" }).click();
    await page.waitForFunction(
      (key) =>
        JSON.parse(localStorage.getItem(key) || "null")?.history.length === 1,
      key,
    );
    let downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    let download = await downloadPromise;
    assert.ok(download.suggestedFilename().startsWith("Tax-Invoice-"));
    assert.equal(await download.failure(), null);
    const taxPaper = await page.locator(".invoice-paper").boundingBox();
    if (process.env.INVOICE_QA_DIR)
      await page
        .locator(".invoice-paper")
        .screenshot({ path: `${process.env.INVOICE_QA_DIR}/tax-preview.png` });
    await page.getByLabel("Document type").selectOption("proforma");
    const proformaPaper = await page.locator(".invoice-paper").boundingBox();
    if (process.env.INVOICE_QA_DIR)
      await page
        .locator(".invoice-paper")
        .screenshot({
          path: `${process.env.INVOICE_QA_DIR}/proforma-preview.png`,
        });
    assert.ok(Math.abs(taxPaper.width - proformaPaper.width) < 1);
    assert.ok(Math.abs(taxPaper.height - proformaPaper.height) < 2);
    await page.setViewportSize({ width: 390, height: 844 });
    const proformaMobile = await page.locator(".invoice-paper").boundingBox();
    await page.getByLabel("Document type").selectOption("tax");
    const taxMobile = await page.locator(".invoice-paper").boundingBox();
    assert.ok(Math.abs(taxMobile.width - proformaMobile.width) < 1);
    assert.ok(Math.abs(taxMobile.height - proformaMobile.height) < 2);
    await page.getByLabel("Document type").selectOption("proforma");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel("Discount (%)").fill("10");
    await page.getByRole("button", { name: "Save invoice to library" }).click();
    await page.waitForFunction(
      (key) =>
        JSON.parse(localStorage.getItem(key) || "null")?.history.length === 2,
      key,
    );
    assert.ok(
      (await page.locator(".proforma-grand-total").innerText()).includes(
        "10,620.00",
      ),
    );
    downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    download = await downloadPromise;
    assert.ok(download.suggestedFilename().startsWith("Proforma-Invoice-"));
    assert.equal(await download.failure(), null);
    downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export backup" }).click();
    download = await downloadPromise;
    const backupPath = await download.path();
    const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
    assert.equal(backup.history.length, 2);
    await page.reload();
    await page.getByLabel("Discount (%)").waitFor();
    assert.equal(
      await page.getByLabel("Customer / company name").inputValue(),
      "Browser QA Customer",
    );
    await page.getByRole("button", { name: "Business & bank" }).click();
    await page
      .getByLabel("Upload signature image")
      .setInputFiles("public/weboin-logo.png");
    await page.getByText("Signature saved in this browser").waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Business & bank" }).click();
    await page.getByText("Signature saved in this browser").waitFor();
    await page.getByText("Replace signature image").waitFor();
    await page.getByRole("button", { name: "Saved invoices" }).click();
    assert.equal(await page.locator(".history-row").count(), 2);
    await page
      .locator(".history-row")
      .filter({ hasText: "Tax invoice" })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    assert.equal(await page.getByLabel("Document type").inputValue(), "tax");
    assert.equal(await page.getByLabel("Discount (%)").count(), 0);
    await page.getByLabel("Restore backup").setInputFiles(backupPath);
    await page.getByLabel("Discount (%)").waitFor();
    await page.getByLabel("Restore backup").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
    assert.equal(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).history.length,
        key,
      ),
      2,
    );
    const second = await context.newPage();
    await second.goto(url);
    await second.getByLabel("Customer / company name").fill("Other tab");
    await page
      .getByText("This workspace changed in another tab.", { exact: false })
      .waitFor();
    await page
      .getByLabel("Customer / company name")
      .fill("Unsaved local draft");
    downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export backup" }).click();
    download = await downloadPromise;
    assert.equal(
      JSON.parse(await fs.readFile(await download.path(), "utf8")).invoice
        .customer,
      "Unsaved local draft",
    );
    await second.close();
    await page.evaluate((key) => localStorage.setItem(key, "{broken"), key);
    await page.reload();
    await page
      .getByText("Saved data could not be loaded.", { exact: false })
      .waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      "{broken",
    );
    await page.getByLabel("Restore backup").setInputFiles(backupPath);
    await page.getByLabel("Discount (%)").waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    const qaDirectory = process.env.INVOICE_QA_DIR;
    if (qaDirectory) {
      await fs.mkdir(qaDirectory, { recursive: true });
      await page.screenshot({
        path: `${qaDirectory}/mobile.png`,
        fullPage: true,
      });
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      "No mobile page overflow",
    );
    assert.deepEqual(errors, []);
    await page
      .getByLabel("Service description")
      .fill(
        "Long service details with milestones and deliverables. ".repeat(100),
      );
    assert.ok(
      await page.evaluate(() => {
        const table = document
          .querySelector(".proforma-table")
          .getBoundingClientRect();
        const footer = document
          .querySelector(".proforma-footer")
          .getBoundingClientRect();
        const paper = document
          .querySelector(".proforma-paper")
          .getBoundingClientRect();
        return footer.top >= table.bottom && paper.bottom >= footer.bottom;
      }),
      "Long Proforma preview keeps its footer below the table",
    );
    console.log(
      "Browser smoke passed: Tax/Proforma forms and downloads, save/reload/open, backups, corrupt data recovery, cross-tab conflicts, mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
