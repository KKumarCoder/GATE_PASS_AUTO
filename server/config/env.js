import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../.env",
  ),
  quiet: true,
});
export const env = {
  node: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongo: process.env.MONGODB_URI,
  access: process.env.JWT_ACCESS_SECRET,
  refresh: process.env.JWT_REFRESH_SECRET,
  frontend: process.env.FRONTEND_URL || "http://localhost:5173",
  otpMinutes: Math.min(
    5,
    Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES || 10)),
  ),
  otpDeliveryMode: process.env.OTP_DELIVERY_MODE || "whatsapp",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
};
export function isEmailOTPConfigured() {
  return Boolean(
    env.smtpHost &&
      Number.isInteger(env.smtpPort) &&
      env.smtpPort > 0 &&
      env.smtpPort <= 65535 &&
      env.smtpUser &&
      env.smtpPass &&
      env.smtpFrom,
  );
}
export function isSmsOTPConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
}
export function validateOTPDeliveryMode(config = env) {
  if (!["whatsapp", "sms", "console"].includes(config.otpDeliveryMode)) {
    throw new Error("OTP_DELIVERY_MODE must be whatsapp, sms or console.");
  }
  if (config.otpDeliveryMode === "console" && config.node !== "development") {
    throw new Error(
      "OTP_DELIVERY_MODE=console is allowed only with NODE_ENV=development.",
    );
  }
}
export function isConsoleOTPEnabled() {
  validateOTPDeliveryMode();
  return env.otpDeliveryMode === "console";
}
export function isSmsOTPEnabled() {
  validateOTPDeliveryMode();
  return env.otpDeliveryMode === "sms";
}
export function validateEnvironment() {
  validateOTPDeliveryMode();
  if (!env.mongo)
    throw new Error("MONGODB_URI is required (replica set / Atlas).");
  if (env.otpDeliveryMode === "sms") {
    for (const key of [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_VERIFY_SERVICE_SID",
    ])
      if (!process.env[key])
        throw new Error(`${key} is required when OTP_DELIVERY_MODE=sms.`);
  }
  for (const key of ["access", "refresh"])
    if (!env[key] || env[key].length < 32)
      throw new Error(`JWT ${key} secret must have at least 32 characters.`);
  if (env.access === env.refresh)
    throw new Error("Use different access and refresh secrets.");
  if (env.node === "production" && !env.frontend.startsWith("https://"))
    throw new Error("Production FRONTEND_URL must use HTTPS.");
}
