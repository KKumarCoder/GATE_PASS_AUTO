import nodemailer from "nodemailer";
import { env, isEmailOTPConfigured } from "../config/env.js";

export async function sendEmailMessage({ to, subject, text }) {
  if (!isEmailOTPConfigured()) {
    throw new Error("Email delivery is not configured.");
  }
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 12_000,
  });
  try {
    await transporter.sendMail({ from: env.smtpFrom, to, subject, text });
  } catch {
    throw new Error("Email delivery failed. Check the SMTP configuration and mail server.");
  }
}

export async function sendEmailOTP(email, { otp, studentName, gatePassNumber, minutes }) {
  await sendEmailMessage({
    to: email,
    subject: "SRPS gate pass verification code",
    text: `Your SRPS gate pass verification code for ${studentName} (${gatePassNumber}) is ${otp}. It expires in ${minutes} minutes. Share it only with school reception if you approve this departure.`,
  });
}
