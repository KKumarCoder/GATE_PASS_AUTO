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
  mobile: { type: String, trim: true },
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
export const BusSwap = make("BusSwap", {
  swapNumber: { type: String, unique: true, required: true },
  student: ref("Student"),
  studentName: String,
  admissionNumber: String,
  className: String,
  date: { type: String, required: true },
  fromBus: { type: String, required: true },
  toBus: { type: String, required: true },
  fromDriver: String,
  toDriver: String,
  reason: String,
  parentName: String,
  parentRequest: String,
  requestedBy: ref("User"),
  approvedBy: ref("User"),
  approvedAt: Date,
  parentApproval: { verifiedBy: ref("User"), mobile: String, verifiedAt: Date, contextHash: String },
  principalApproval: { principal: ref("User"), name: String, email: String, mobile: String, verifiedAt: Date },
  decidedBy: ref("User"),
  decidedAt: Date,
  decisionReason: String,
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" },
}, [
  [{student:1,date:1}, {unique:true,partialFilterExpression:{status:{$in:["PENDING","APPROVED"]}}}],
  [{date:1,status:1}, {}],
]);
export const BusSwapOTP = make("BusSwapOTP", {
  busSwap: { ...ref("BusSwap"), unique: true },
  principal: ref("User"),
  mobile: String,
  contextHash: String,
  hashedOTP: { type: String, select: false },
  challenge: String,
  sentAt: Date,
  deliveredAt: Date,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  consumedAt: Date,
});
export const BusSwapParentOTP = make("BusSwapParentOTP", {
  busSwap: { ...ref("BusSwap"), unique: true },
  student: ref("Student"),
  mobile: String,
  contextHash: String,
  hashedOTP: { type: String, select: false },
  challenge: String,
  sentAt: Date,
  deliveredAt: Date,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  consumedAt: Date,
});
export const BusSwapEmail = make("BusSwapEmail", {
  busSwap: ref("BusSwap"),
  event: { type: String, enum: ["APPROVED", "CANCELLED"] },
  audience: { type: String, enum: ["PRINCIPAL", "PARENT", "FROM_DRIVER", "TO_DRIVER"] },
  recipient: String,
  recipientName: String,
  status: { type: String, enum: ["PENDING", "SENDING", "SENT", "FAILED", "SKIPPED"], default: "PENDING" },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: Date,
  lockedAt: Date,
  sentAt: Date,
  error: String,
}, [[{busSwap:1,event:1,audience:1},{unique:true}], [{status:1,nextAttemptAt:1},{}]]);
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
    recurring: {
      enabled: { type: Boolean, default: false },
      period: String,
      endDate: String,
      exitTime: String,
      lastExitDate: String,
      exits: [{ date: String, exitedAt: Date, gate: String, performedBy: ref("User") }],
    },
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
      skipReason: { type: String, trim: true, maxlength: 500 },
      skippedBy: ref("User"),
      skippedAt: Date,
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
      enum: ["WHATSAPP", "APITXT_SMS", "EMAIL", "DEVELOPMENT_CONSOLE"],
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
export const StaffMember = make("StaffMember", {
  employeeId: {type:String,required:true,unique:true},
  name: {type:String,required:true},
  staffRole: String, designation: String, mobile: String, email: String, photo: String, deletedAt: Date,
  dateOfBirth: Date, dateOfJoining: Date, address: String,
  active: {type:Boolean,default:true}, source: String,
});
export const StaffOTP = make('StaffOTP', {staff:{type:Schema.Types.ObjectId,unique:true},requestedBy:ref('User'),fingerprint:String,digest:String,channel:String,sentAt:Date,expiresAt:Date,attempts:Number,delivered:Boolean,consumed:Boolean});
export const StaffPass = make(
  "StaffPass",
  {
    passNumber: { type: String, unique: true },
    staff: {type:Schema.Types.ObjectId,refPath:"staffModel"},
    staffModel: {type:String,enum:["User","StaffMember"],default:"User"},
    employeeId: String,
    passDate: String,
    staffVerifiedAt: Date,
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
    qr: { tokenHash: String, generatedAt: Date },
  },
  [
    [{ createdAt: -1 }, {}],
    [{ "qr.tokenHash": 1 }, { unique: true, sparse: true }],
    [
      { employeeId: 1, passDate: 1 },
      {
        unique: true,
        partialFilterExpression: {
          employeeId: { $type: "string" },
          passDate: { $type: "string" },
        },
      },
    ],
  ],
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
    busSwap: ref("BusSwap"),
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
