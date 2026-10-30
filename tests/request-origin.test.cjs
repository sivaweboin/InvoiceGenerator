require("./register-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isSameOriginRequest } = require("../lib/request-origin.ts");

const request = (headers) => ({ headers: new Headers(headers) });
test("accepts direct and forwarded same-origin browser requests", () => {
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://example.tunnel.test",
        host: "localhost:3000",
        "x-forwarded-host": "example.tunnel.test",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
});
test("rejects cross-origin and malformed requests", () => {
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://attacker.test",
        host: "localhost:3000",
        "x-forwarded-host": "example.tunnel.test",
        "sec-fetch-site": "cross-site",
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      request({ origin: "https://attacker.test", host: "localhost:3000" }),
    ),
    false,
  );
  assert.equal(isSameOriginRequest(request({ host: "localhost:3000" })), false);
});
