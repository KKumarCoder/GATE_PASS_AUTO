import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOTPDeliveryMode } from "../config/env.js";

test("console OTP is allowed only in development; invalid modes fail closed", () => {
  assert.doesNotThrow(() =>
    validateOTPDeliveryMode({
      node: "development",
      otpDeliveryMode: "console",
    }),
  );
  for (const node of ["production", "test", "staging", undefined]) {
    assert.throws(
      () => validateOTPDeliveryMode({ node, otpDeliveryMode: "console" }),
      /only with NODE_ENV=development/,
    );
  }
  assert.doesNotThrow(() =>
    validateOTPDeliveryMode({
      node: "production",
      otpDeliveryMode: "whatsapp",
    }),
  );
  assert.doesNotThrow(() =>
    validateOTPDeliveryMode({ node: "production", otpDeliveryMode: "sms" }),
  );
  assert.throws(
    () =>
      validateOTPDeliveryMode({
        node: "development",
        otpDeliveryMode: "consol",
      }),
    /must be whatsapp, sms or console/,
  );
});
