import { Notification, SystemSetting } from "../../models/index.js";
import * as custom from "./providers/customProvider.js";
import * as meta from "./providers/metaProvider.js";
export async function sendWhatsAppMessage({
  mobile,
  message,
  template,
  variables,
  otp,
  gatePass,
  event = "MESSAGE",
}) {
  const provider = process.env.WHATSAPP_PROVIDER || "none";
  const configured =
    ["custom", "meta"].includes(provider) &&
    process.env.WHATSAPP_API_URL &&
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_SENDER;
  const record = await Notification.create({
    gatePass,
    recipient: mobile,
    event,
    provider,
    status: configured ? "PENDING" : "UNCONFIGURED",
  });
  if (!configured) return { status: "UNCONFIGURED" };
  try {
    const result = await { custom, meta }[provider].send({
      mobile,
      message,
      template,
      variables,
      otp,
    });
    record.status = "SENT";
    record.providerMessageId = result.messageId;
  } catch {
    record.status = "FAILED";
    record.error =
      "Provider delivery request failed. Check provider configuration and dashboard.";
  }
  await record.save();
  // Never persist message bodies, OTPs, secure links, authorization headers or raw provider responses.
  return { status: record.status, id: record._id };
}
export async function notifyPass(pass, event, suffix = "") {
  await pass.populate("student");
  const settings = await SystemSetting.findOne({ key: "school" });
  const variables = {
    studentName: pass.student.name,
    classSection: `${pass.student.className}-${pass.student.section}`,
    passNumber: pass.gatePassNumber,
    reason: pass.reason,
    schoolName: settings?.schoolName || "Shree Ram Public School",
    exitTime: pass.timing.requestedExit.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
  };
  const key = {
    GATE_PASS_REQUESTED: "requested",
    GATE_PASS_APPROVED: "approved",
    STUDENT_EXITED: "exited",
    STUDENT_RETURNED: "returned",
  }[event];
  const template = settings?.notificationTemplates?.[key];
  const body = template
    ? template.replace(/\{\{(\w+)\}\}/g, (all, name) => variables[name] || all)
    : `Dear Parent,\n${event.replaceAll("_", " ")}\nStudent: ${variables.studentName}\nClass: ${variables.classSection}\nPass: ${pass.gatePassNumber}`;
  return sendWhatsAppMessage({
    mobile: pass.student.primaryMobile,
    gatePass: pass._id,
    event,
    message: `${body}\n${suffix}\n${variables.schoolName}\n${settings?.address || "Kanhra-Badhra Road, Charkhi Dadri"}`,
  });
}
