import twilio from "twilio";

function config() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } =
    process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Twilio SMS OTP is not configured.");
  }
  return {
    client: twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
    serviceSid: TWILIO_VERIFY_SERVICE_SID,
  };
}

function formatMobile(mobile) {
  if (typeof mobile !== "string") throw new Error("Invalid mobile number.");
  const value = mobile.trim();
  if (/^[6-9]\d{9}$/.test(value)) return `+91${value}`;
  if (/^\+91[6-9]\d{9}$/.test(value)) return value;
  throw new Error("Invalid Indian mobile number.");
}

export async function sendTwilioOTP(mobile) {
  const { client, serviceSid } = config();
  try {
    const result = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: formatMobile(mobile),
        channel: "sms",
        ...(process.env.TWILIO_VERIFY_TEMPLATE_SID
          ? { templateSid: process.env.TWILIO_VERIFY_TEMPLATE_SID }
          : {}),
      });
    return { success: result.status === "pending", status: result.status };
  } catch {
    throw new Error("Twilio SMS OTP request failed.");
  }
}

export async function verifyTwilioOTP(mobile, otp) {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return { success: false, status: "invalid" };
  }
  const { client, serviceSid } = config();
  try {
    const result = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: formatMobile(mobile),
        code: otp,
      });
    return { success: result.status === "approved", status: result.status };
  } catch {
    throw new Error("Twilio SMS OTP verification failed.");
  }
}
