import { BusDriver, GatePass, Notification } from "../models/index.js";
import { isEmailOTPConfigured } from "../config/env.js";
import { sendEmailMessage } from "./email.service.js";

const completedExit = { $in: ["EXITED", "NO_RETURN_REQUIRED"] };

export async function sendBusDriverExitNotice(passId, gate, retry = false) {
  const expectedStatus = retry ? { $in: ["FAILED", "UNCONFIGURED"] } : "PENDING";
  const pass = await GatePass.findOneAndUpdate(
    {
      _id: passId,
      status: completedExit,
      busNumber: { $type: "string", $ne: "" },
      busDriverNoticeStatus: expectedStatus,
    },
    { $set: { busDriverNoticeStatus: "SENDING" } },
    { new: true },
  ).populate("student");
  if (!pass) {
    return { status: "ALREADY_SENT", message: "Bus driver notification is not available for retry." };
  }

  if (!pass.student) {
    await GatePass.updateOne(
      { _id: pass._id, busDriverNoticeStatus: "SENDING" },
      { $set: { busDriverNoticeStatus: "FAILED" } },
    );
    await Notification.create({
      gatePass: pass._id,
      recipient: "unavailable",
      event: "BUS_DRIVER_EXIT_NOTICE",
      provider: "smtp-email",
      status: "FAILED",
      error: "Student record was deleted; the historical exit notice cannot be sent.",
    });
    return { status: "FAILED", message: "The student record was deleted; this historical exit notice cannot be sent." };
  }

  const driver = await BusDriver.findOne({ busNumber: pass.busNumber });
  if (!isEmailOTPConfigured() || !driver?.email) {
    await GatePass.updateOne(
      { _id: pass._id, busDriverNoticeStatus: "SENDING" },
      { $set: { busDriverNoticeStatus: "UNCONFIGURED" } },
    );
    await Notification.create({
      gatePass: pass._id,
      recipient: driver?.email || "unconfigured",
      event: "BUS_DRIVER_EXIT_NOTICE",
      provider: "smtp-email",
      status: "UNCONFIGURED",
      error: !isEmailOTPConfigured()
        ? "SMTP email delivery is not configured."
        : "Bus driver email is missing.",
    });
    return { status: "UNCONFIGURED", message: "Bus driver email or SMTP settings are missing." };
  }

  const notification = await Notification.create({
    gatePass: pass._id,
    recipient: driver.email,
    event: "BUS_DRIVER_EXIT_NOTICE",
    provider: "smtp-email",
    status: "PENDING",
  });
  const localTime = new Date(pass.timing.actualExit).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  try {
    await sendEmailMessage({
      to: driver.email,
      subject: `Student has left campus · Bus ${pass.busNumber}`,
      text: [
        "Shree Ram Public School — student departure notification",
        "",
        `Bus number: ${pass.busNumber}`,
        `Student: ${pass.student.name}`,
        `Class: ${pass.student.className}-${pass.student.section}`,
        `Village: ${pass.student.villageName || "Not recorded"}`,
        `Gate pass: ${pass.gatePassNumber}`,
        `Reason: ${pass.reason}`,
        `Exit recorded: ${localTime} IST`,
        `Gate: ${gate}`,
        "",
        "The student has exited campus. Please do not wait for this student on the bus route.",
      ].join("\n"),
    });
  } catch {
    notification.status = "FAILED";
    notification.error = "Bus driver email delivery failed. Check SMTP configuration and notifications.";
    await notification.save();
    await GatePass.updateOne(
      { _id: pass._id, busDriverNoticeStatus: "SENDING" },
      { $set: { busDriverNoticeStatus: "FAILED" } },
    );
    return { status: "FAILED", message: "Exit recorded, but the bus driver email could not be sent." };
  }

  notification.status = "SENT";
  await notification.save();
  await GatePass.updateOne(
    { _id: pass._id, busDriverNoticeStatus: "SENDING" },
    { $set: { busDriverNoticeStatus: "SENT" } },
  );
  return { status: "SENT", message: "Bus driver has been notified by email." };
}
