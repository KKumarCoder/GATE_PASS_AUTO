import mongoose from "mongoose";
import app from "./app.js";
import { env, validateEnvironment } from "./config/env.js";
import { expirePasses } from "./services/expiry.service.js";
validateEnvironment();
if (env.otpDeliveryMode === "console")
  console.log(
    "[SRPS] Development OTP mode enabled. Codes will appear in this server terminal (local testing only).",
  );
await mongoose.connect(env.mongo, { autoIndex: env.node !== "production" });
const server = app.listen(env.port, "127.0.0.1", () =>
  console.log(`SRPS API listening on port ${env.port}`),
);
let expiring = false;
const timer = setInterval(async () => {
  if (expiring) return;
  expiring = true;
  try {
    await expirePasses();
  } catch (error) {
    console.error("Pass expiration job failed.", error);
  } finally {
    expiring = false;
  }
}, 60000);
timer.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearInterval(timer);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
