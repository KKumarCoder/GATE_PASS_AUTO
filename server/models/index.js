import mongoose from "mongoose";
const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });
const make = (name, shape, indexes = []) => {
  const schema = new Schema(shape, { timestamps: true, strict: "throw" });
  for (const [keys, options] of indexes) schema.index(keys, options);
  return model(name, schema);
};
export const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "RECEPTION",
  "SECURITY_GUARD",
];
export const statuses = [
  "DRAFT",
  "PARENT_VERIFICATION_PENDING",
  "PARENT_VERIFIED",
  "ADMIN_APPROVAL_PENDING",
  "APPROVED",
  "READY_FOR_EXIT",
  "EXITED",
  "RETURNED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "NO_RETURN_REQUIRED",
];
export const User = make("User", {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  employeeId: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true },
  permissions: { type: [String], default: undefined },
  assignedGate: String,
  department: String,
  active: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0 },
  resetHash: { type: String, select: false },
  resetExpires: Date,
});
export const Session = make(
  "Session",
  {
    user: ref("User"),
    tokenHash: { type: String, unique: true },
    expiresAt: Date,
  },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const Student = make(
  "Student",
  {
    admissionNumber: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    villageName: { type: String, required: true, default: "Not recorded" },
    rollNumber: String,
    gender: String,
    dateOfBirth: Date,
    photo: String,
    fatherName: String,
    motherName: String,
    guardianName: String,
    primaryMobile: { type: String, required: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    lastOtpAt: { type: Date, select: false },
    alternativeMobile: String,
    address: String,
    transportType: String,
    busRoute: String,
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ALUMNI"],
      default: "ACTIVE",
    },
  },
  [
    [{ name: 1 }, {}],
    [{ className: 1, section: 1 }, {}],
  ],
);
export const BusDriver = make(
  "BusDriver",
  {
    staffId: { type: String, trim: true },
    busNumber: { type: String, unique: true, required: true },
    driverName: { type: String, required: true },
    phone: String,
    mobile: String,
    email: { type: String, lowercase: true, trim: true },
    photo: String,
  },
  [[{ staffId: 1 }, { unique: true, sparse: true }]],
);
export const GatePass = make(
  "GatePass",
  {
    gatePassNumber: { type: String, unique: true },
    student: ref("Student"),
    busNumber: String,
    busDriverNoticeStatus: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT", "FAILED", "UNCONFIGURED"],
    },
    requestedBy: ref("User"),
    requestType: String,
    reason: String,
    passDate: String,
    guardian: {
      type: { type: String },
      name: String,
      mobile: String,
      relationship: String,
    },
    parentVerification: {
      required: { type: Boolean, default: true },
      verified: { type: Boolean, default: false },
      method: String,
      verifiedAt: Date,
    },
    approval: {
      status: String,
      approvedBy: ref("User"),
      approvedAt: Date,
      rejectionReason: String,
    },
    timing: {
      requestedExit: Date,
      expectedReturn: Date,
      actualExit: Date,
      exitGate: String,
      actualReturn: Date,
    },
    qr: { tokenHash: String, shareTokenHash: String, generatedAt: Date },
    approvalLinkHash: { type: String, select: false },
    approvalLinkExpires: Date,
    status: { type: String, enum: statuses, default: "DRAFT", index: true },
    isEmergency: Boolean,
    emergency: {
      authority: String,
      contactAttempt: String,
      overrideBy: ref("User"),
    },
    expiresAt: Date,
  },
  [
    [{ student: 1, createdAt: -1 }, {}],
    [{ student: 1, passDate: 1 }, { unique: true, partialFilterExpression: { passDate: { $type: "string" } } }],
    [{ createdAt: -1 }, {}],
    [{ "qr.tokenHash": 1 }, { unique: true, sparse: true }],
    [{ "qr.shareTokenHash": 1 }, { unique: true, sparse: true }],
  ],
);
export const GatePassDailyLock = make(
  "GatePassDailyLock",
  {
    student: ref("Student"),
    passDate: { type: String, required: true },
  },
  [[{ student: 1, passDate: 1 }, { unique: true }]],
);
export const OTPVerification = make(
  "OTPVerification",
  {
    deliveryMethod: {
      type: String,
      enum: ["WHATSAPP", "TWILIO_SMS", "EMAIL", "DEVELOPMENT_CONSOLE"],
      default: "WHATSAPP",
    },
    gatePass: { ...ref("GatePass"), unique: true },
    studentId: ref("Student"),
    mobileNumber: String,
    emailAddress: String,
    hashedOTP: { type: String, select: false },
    purpose: String,
    expiresAt: Date,
    attemptCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    sentAt: Date,
  },
  [
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
    [{ mobileNumber: 1, sentAt: -1 }, {}],
    [{ emailAddress: 1, sentAt: -1 }, {}],
  ],
);
export const VisitorPass = make(
  "VisitorPass",
  {
    passNumber: { type: String, unique: true },
    name: String,
    mobile: String,
    photo: String,
    idType: String,
    idLastFour: String,
    purpose: String,
    personToMeet: String,
    department: String,
    expectedExit: Date,
    vehicleNumber: String,
    entryTime: Date,
    exitTime: Date,
    requestedBy: ref("User"),
    status: {
      type: String,
      enum: ["REQUESTED", "CHECKED_IN", "CHECKED_OUT"],
      default: "REQUESTED",
    },
    qr: { tokenHash: String, generatedAt: Date },
  },
  [
    [{ createdAt: -1 }, {}],
    [{ "qr.tokenHash": 1 }, { unique: true, sparse: true }],
  ],
);
export const StaffPass = make(
  "StaffPass",
  {
    passNumber: { type: String, unique: true },
    staff: ref("User"),
    department: String,
    reason: String,
    expectedReturn: Date,
    exitTime: Date,
    returnTime: Date,
    approvedBy: ref("User"),
    requestedBy: ref("User"),
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "EXITED", "RETURNED"],
      default: "REQUESTED",
    },
  },
  [[{ createdAt: -1 }, {}]],
);
export const GateEvent = make(
  "GateEvent",
  {
    gatePassId: ref("GatePass"),
    studentId: ref("Student"),
    entityId: Schema.Types.ObjectId,
    entityType: String,
    eventType: String,
    performedBy: ref("User"),
    timestamp: { type: Date, default: Date.now },
    ip: String,
    gate: String,
    device: String,
  },
  [
    [{ timestamp: -1 }, {}],
    [{ gatePassId: 1, timestamp: -1 }, {}],
  ],
);
export const AuditLog = make(
  "AuditLog",
  {
    action: String,
    entityId: Schema.Types.ObjectId,
    performedBy: ref("User"),
    ip: String,
    details: Schema.Types.Mixed,
  },
  [[{ createdAt: -1 }, {}]],
);
export const Notification = make(
  "Notification",
  {
    gatePass: ref("GatePass"),
    recipient: String,
    event: String,
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "UNCONFIGURED", "DEVELOPMENT_ONLY"],
    },
    provider: String,
    providerMessageId: String,
    error: String,
  },
  [[{ createdAt: -1 }, {}]],
);
export const SystemSetting = make("SystemSetting", {
  key: { type: String, unique: true },
  schoolName: String,
  address: String,
  logo: String,
  gates: [String],
  validityHours: { type: Number, default: 8 },
  otpExpiryMinutes: { type: Number, default: 5 },
  emergencyEnabled: { type: Boolean, default: true },
  requireParent: { type: Boolean, default: true },
  notificationTemplates: {
    requested: String,
    approved: String,
    exited: String,
    returned: String,
  },
});
export const Counter = make("Counter", {
  key: { type: String, unique: true },
  value: { type: Number, default: 0 },
});

export const RateBucket = make(
  "RateBucket",
  { key: { type: String, unique: true }, count: Number, expiresAt: Date },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
