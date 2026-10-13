import axios from "axios";
import { isSmsOTPConfigured } from "../../config/env.js";

export async function sendApitxtOTP(mobile, otp) {
  if (!isSmsOTPConfigured()) throw new Error("APITxT SMS OTP is not configured.");
  const value = typeof mobile === "string" ? mobile.trim() : "";
  const normalized = /^[6-9]\d{9}$/.test(value) ? `91${value}` : value.replace(/^\+/, "");
  if (!/^91[6-9]\d{9}$/.test(normalized)) throw new Error("Invalid Indian mobile number.");
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) throw new Error("Invalid OTP.");
  const body = new URLSearchParams({
    authkey: process.env.APITXT_AUTH_KEY.trim(),
    mobile: normalized,
    otp,
    channel: "sms",
    country: "91",
  });
  if (process.env.APITXT_TEMPLATE_ID) body.set("template_id", process.env.APITXT_TEMPLATE_ID);
  try {
    const { data } = await axios.post("https://apitxt.com/api/sendOTP", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
      maxRedirects: 0,
    });
    if (data?.status !== "success") throw new Error("Provider rejected OTP.");
    return { success: true };
  } catch {
    // Never propagate provider bodies or Axios errors containing the API key / OTP.
    throw new Error("APITxT SMS OTP request failed.");
  }
}
