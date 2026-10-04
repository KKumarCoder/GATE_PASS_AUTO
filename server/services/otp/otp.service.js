import crypto from "node:crypto";
import bcrypt from "bcrypt";
import {
  GatePass,
  OTPVerification,
  SystemSetting,
  Student,
  RateBucket,
  Notification,
} from "../../models/index.js";
import {
  env,
  isConsoleOTPEnabled,
  isSmsOTPEnabled,
  isEmailOTPConfigured,
  isSmsOTPConfigured,
} from "../../config/env.js";
import { assert, event, transaction, hash } from "../../utils/core.js";
import {
  sendWhatsAppMessage,
  notifyPass,
} from "../whatsapp/whatsapp.service.js";
import { sendTwilioOTP, verifyTwilioOTP } from "./twilio.service.js";
import { sendEmailOTP } from "../email.service.js";
export async function sendOTP(req, pass, requestedChannel) {
  const consoleMode = isConsoleOTPEnabled();
  const smsMode = isSmsOTPEnabled();
  const channel = consoleMode
    ? "console"
    : requestedChannel || (smsMode ? "sms" : "whatsapp");
  assert(
    pass.status === "PARENT_VERIFICATION_PENDING" && pass.expiresAt > new Date(),
    409,
    "This pass is not waiting for parent verification.",
  );
  await pass.populate("student");
  if (channel === "email") {
    assert(pass.student.email, 409, "Add a student email before sending an email OTP.");
    assert(isEmailOTPConfigured(), 503, "Email OTP is not configured. Check the SMTP settings.");
  }
  if (channel === "sms") {
    assert(isSmsOTPConfigured(), 503, "SMS OTP is not configured. Check the Twilio settings.");
  }
  const otp =
    channel !== "sms"
      ? crypto.randomInt(100000, 1000000).toString()
      : null;
  const hashedOTP = otp ? await bcrypt.hash(otp, 12) : undefined;
  const settings = await SystemSetting.findOne({ key: "school" });
  const minutes = channel === "sms"
    ? env.otpMinutes
    : Math.min(env.otpMinutes, settings?.otpExpiryMinutes || 10);
  const expiresAt = new Date(Date.now() + minutes * 60000);
  const sentAt = new Date();
  const recipient = channel === "email" ? pass.student.email : pass.student.primaryMobile;
  await transaction(async (session) => {
    const window = Math.floor(Date.now() / 900000);
    try {
      await RateBucket.findOneAndUpdate(
        {
          key: `otp:${channel}:${hash(recipient)}:${window}`,
          count: { $lt: 5 },
        },
        {
          $inc: { count: 1 },
          $set: { expiresAt: new Date((window + 2) * 900000) },
        },
        { upsert: true, session },
      );
    } catch (e) {
      if (e.code === 11000)
        assert(
          false,
          429,
          "This contact has reached its OTP request limit. Try again later.",
        );
      throw e;
    }
    const latest = await GatePass.findOne({
      _id: pass._id,
      status: "PARENT_VERIFICATION_PENDING",
      expiresAt: { $gt: new Date() },
    }).session(session);
    assert(latest, 409, "Pass is no longer waiting for verification.");
    // Writing the pass serializes OTP issuance against approval/cancellation and other sends.
    latest.updatedAt = new Date();
    latest.markModified("updatedAt");
    await latest.save({ session });
    const locked = await Student.findOneAndUpdate(
      {
        _id: pass.student._id,
        $or: [
          { lastOtpAt: { $exists: false } },
          { lastOtpAt: { $lte: new Date(Date.now() - 60000) } },
        ],
      },
      { lastOtpAt: new Date() },
      { session },
    );
    assert(
      locked,
      429,
      "Wait 60 seconds before requesting another OTP for this student.",
    );
    const recent = await OTPVerification.findOne({
      [channel === "email" ? "emailAddress" : "mobileNumber"]: recipient,
      sentAt: { $gt: new Date(Date.now() - 60000) },
    }).session(session);
    assert(
      !recent,
      429,
      "Wait 60 seconds before sending another OTP to this contact.",
    );
    await OTPVerification.findOneAndUpdate(
      { gatePass: pass._id },
      {
        studentId: pass.student._id,
        mobileNumber: channel === "email" ? null : pass.student.primaryMobile,
        emailAddress: channel === "email" ? pass.student.email : null,
        hashedOTP: hashedOTP || null,
        purpose: "GATE_PASS_APPROVAL",
        deliveryMethod:
          channel === "console"
            ? "DEVELOPMENT_CONSOLE"
            : channel === "sms"
              ? "TWILIO_SMS"
              : channel === "email"
                ? "EMAIL"
                : "WHATSAPP",
        expiresAt,
        attemptCount: 0,
        verified: false,
        sentAt,
      },
      { upsert: true, session },
    );
    await event(req, pass, "OTP_SENT", session);
    if (consoleMode) {
      await Notification.create(
        [
          {
            gatePass: pass._id,
            recipient: pass.student.primaryMobile,
            event: "OTP_SENT",
            provider: "development-console",
            status: "DEVELOPMENT_ONLY",
          },
        ],
        { session },
      );
      await event(req, pass, "DEVELOPMENT_OTP_ISSUED", session);
    }
  });
  if (consoleMode) {
    // Explicit local-development exception: log once, only after the transaction commits.
    // Do not include the code in API responses, notification records or audit details.
    console.log(
      `[SRPS DEV OTP] Pass: ${pass.gatePassNumber} | OTP: ${otp} | Expires: ${expiresAt.toISOString()} | LOCAL TEST ONLY`,
    );
    return { status: "DEVELOPMENT_ONLY", deliveryMethod: "console", expiresAt };
  }
  if (channel === "sms") {
    return sendTwilioOTPForPass(pass, expiresAt);
  }
  if (channel === "email") {
    const notification = await Notification.create({
      gatePass: pass._id,
      recipient: pass.student.email,
      event: "OTP_SENT",
      provider: "smtp-email",
      status: "PENDING",
    });
    let deliveryFailed = false;
    try {
      await sendEmailOTP(pass.student.email, {
        otp,
        studentName: pass.student.name,
        gatePassNumber: pass.gatePassNumber,
        minutes,
      });
    } catch {
      deliveryFailed = true;
    }
    if (deliveryFailed) {
      notification.status = "FAILED";
      notification.error = "Email OTP delivery failed. Check the SMTP configuration and mail server.";
      await notification.save();
      await OTPVerification.updateOne(
        { gatePass: pass._id, sentAt },
        { expiresAt: new Date(), verified: true },
      );
      assert(false, 502, "Unable to send email OTP.");
    }
    notification.status = "SENT";
    await notification.save();
    return { status: "SENT", deliveryMethod: "email", expiresAt };
  }
  return sendWhatsAppMessage({
    mobile: pass.student.primaryMobile,
    otp,
    message: `Your SRPS gate pass approval OTP is ${otp}. It expires in ${minutes} minutes. Share it only with school reception if you approve ${pass.student.name}'s departure.`,
    gatePass: pass._id,
    event: "OTP_SENT",
  });
}
async function sendTwilioOTPForPass(pass, expiresAt) {
  const notification = await Notification.create({
    gatePass: pass._id,
    recipient: pass.student.primaryMobile,
    event: "OTP_SENT",
    provider: "twilio-sms",
    status: "PENDING",
  });
  try {
    const result = await sendTwilioOTP(pass.student.primaryMobile);
    assert(result.success, 502, "Unable to initiate SMS OTP.");
    notification.status = "SENT";
    await notification.save();
    return { status: "SENT", deliveryMethod: "sms", expiresAt };
  } catch {
    notification.status = "FAILED";
    notification.error =
      "SMS OTP delivery request failed. Check the SMS provider configuration and dashboard.";
    await notification.save();
    assert(false, 502, "Unable to initiate SMS OTP.");
  }
}
export async function parentVerified(req, pass, method, session) {
  pass.parentVerification = {
    required: true,
    verified: true,
    method,
    verifiedAt: new Date(),
  };
  pass.status = "PARENT_VERIFIED";
  await event(
    req,
    pass,
    ["OTP", "SMS_OTP", "EMAIL_OTP", "DEVELOPMENT_OTP"].includes(method)
      ? "OTP_VERIFIED"
      : "PARENT_APPROVED",
    session,
  );
  if (method === "DEVELOPMENT_OTP")
    await event(req, pass, "DEVELOPMENT_OTP_VERIFIED", session);
  pass.status = "ADMIN_APPROVAL_PENDING";
  pass.approvalLinkHash = undefined;
  pass.approvalLinkExpires = undefined;
  await pass.save({ session });
  await event(req, pass, "ADMIN_APPROVAL_PENDING", session);
}
export async function verifyOTP(req, passId, otp) {
  const consoleMode = isConsoleOTPEnabled();
  // Count attempts atomically before comparison; failed attempts must survive transaction rollback.
  const record = await OTPVerification.findOneAndUpdate(
    {
      gatePass: passId,
      ...(consoleMode
        ? {}
        : { deliveryMethod: { $ne: "DEVELOPMENT_CONSOLE" } }),
      verified: false,
      attemptCount: { $lt: 5 },
      expiresAt: { $gt: new Date() },
    },
    { $inc: { attemptCount: 1 } },
    { new: true },
  ).select("+hashedOTP");
  assert(record, 400, "OTP expired, missing, or attempt limit reached.");
  const smsMode = record.deliveryMethod === "TWILIO_SMS";
  if (smsMode) {
    let result;
    try {
      result = await verifyTwilioOTP(record.mobileNumber, otp);
    } catch {
      assert(false, 502, "Unable to verify SMS OTP.");
    }
    assert(result.success, 400, "Incorrect or expired OTP.");
  } else {
    assert(await bcrypt.compare(otp, record.hashedOTP), 400, "Incorrect OTP.");
  }
  const pass = await transaction(async (session) => {
    const consumed = await OTPVerification.findOneAndUpdate(
      {
        _id: record._id,
        sentAt: record.sentAt,
        ...(record.deliveryMethod === "TWILIO_SMS"
          ? { deliveryMethod: "TWILIO_SMS" }
          : { hashedOTP: record.hashedOTP }),
        verified: false,
        expiresAt: { $gt: new Date() },
      },
      { verified: true },
      { session },
    );
    assert(consumed, 409, "OTP was already used or replaced.");
    const pass = await GatePass.findOne({
      _id: passId,
      status: "PARENT_VERIFICATION_PENDING",
      expiresAt: { $gt: new Date() },
    })
      .populate("student")
      .session(session);
    assert(pass, 409, "Pass no longer awaiting verification.");
    if (record.deliveryMethod === "EMAIL") {
      assert(
        pass.student.email === record.emailAddress,
        409,
        "Registered email changed; request a new OTP.",
      );
    } else {
      assert(
        pass.student.primaryMobile === record.mobileNumber,
        409,
        "Registered mobile changed; request a new OTP.",
      );
    }
    await parentVerified(
      req,
      pass,
      record.deliveryMethod === "DEVELOPMENT_CONSOLE"
        ? "DEVELOPMENT_OTP"
        : record.deliveryMethod === "EMAIL"
          ? "EMAIL_OTP"
          : record.deliveryMethod === "TWILIO_SMS"
            ? "SMS_OTP"
            : "OTP",
      session,
    );
    return pass;
  });
  await notifyPass(pass, "PARENT_VERIFIED");
  return pass;
}
