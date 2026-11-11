import assert from "node:assert/strict";
import test from "node:test";
import { retryRpc } from "../src/retry.js";

test("retries transient RPC failures and returns the successful result", async () => {
  let attempts = 0;
  const result = await retryRpc(async () => {
    attempts++;
    if (attempts < 3) throw Object.assign(new Error("temporary"), { code: "NETWORK_ERROR" });
    return "ok";
  }, { delayMs: 0, pause: async () => {} });

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("does not retry non-transient failures", async () => {
  let attempts = 0;

  await assert.rejects(() => retryRpc(async () => {
    attempts++;
    throw Object.assign(new Error("reverted"), { code: "CALL_EXCEPTION" });
  }, { delayMs: 0, pause: async () => {} }), /reverted/);

  assert.equal(attempts, 1);
});
