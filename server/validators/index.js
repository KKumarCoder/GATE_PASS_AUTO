import { permissionKeys, dependencies } from '../../shared/access.mjs';
import { z } from "zod";
export const text = z.string().trim().min(1).max(500);
const opt = z.string().trim().max(500).optional().default("");
export const phone = z
  .string()
  .regex(
    /^\+?[1-9]\d{9,14}$/,
    "Use a valid phone number including country code.",
  );
export const pageNumber = z.coerce.number().int().min(1).max(100000).default(1);
export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid record ID.");
const date = z.string().datetime({ offset: true });
const image = z
  .union([
    z.literal(""),
    z.string().regex(/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/),
  ])
  .optional()
  .default("");
export const studentSchema = z
  .object({
    admissionNumber: text.max(40),
    name: text.max(100),
    className: text.max(15),
    section: text.max(10),
    villageName: text.max(100),
    rollNumber: opt,
    gender: z.enum(["Male", "Female", "Other", ""]).optional().default(""),
    dateOfBirth: z
      .union([date, z.literal("")])
      .optional()
      .transform((v) => v || undefined),
    photo: image,
    fatherName: opt,
    motherName: opt,
    guardianName: opt,
    primaryMobile: phone,
    email: z.string().trim().email().max(254).toLowerCase(),
    alternativeMobile: z
      .union([phone, z.literal("")])
      .optional()
      .default(""),
    address: opt,
    transportType: opt,
    busRoute: opt,
    status: z.enum(["ACTIVE", "INACTIVE", "ALUMNI"]).default("ACTIVE"),
  })
  .strict();
export const passSchema = z
  .object({
    student: objectId,
    busNumber: z.string().trim().max(40).optional().default(""),
    requestType: z.enum([
      "EARLY_LEAVE",
      "SHORT_LEAVE",
      "MEDICAL",
      "EMERGENCY",
      "PARENT_REQUEST",
      "SCHOOL_WORK",
      "OTHER",
    ]),
    reason: text,
    requestedExit: date,
    expectedReturn: date.optional().nullable(),
    guardian: z
      .object({
        type: z.enum([
          "Father",
          "Mother",
          "Guardian",
          "Self",
          "Teacher",
          "Other",
        ]),
        name: text.max(100),
        mobile: z
          .union([phone, z.literal("")])
          .optional()
          .default(""),
        relationship: opt,
      })
      .strict(),
    emergency: z
      .object({ authority: text, contactAttempt: text })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      !v.expectedReturn ||
      new Date(v.expectedReturn) > new Date(v.requestedExit),
    "Return must be after exit.",
  );
export const visitorSchema = z
  .object({
    name: text,
    mobile: phone,
    photo: image,
    idType: opt,
    idLastFour: z
      .string()
      .regex(/^\d{4}$|^$/)
      .optional()
      .default(""),
    purpose: text,
    personToMeet: text,
    department: opt,
    expectedExit: date,
    vehicleNumber: opt,
  })
  .strict();
export const staffSchema = z
  .object({
    staff: objectId,
    department: text,
    reason: text,
    expectedReturn: date,
  })
  .strict();
export const busStaffSchema = z.object({
  staffId: text.max(40).transform((value) => value.toUpperCase()),
  driverName: text.max(100),
  busNumber: text.max(40).transform((value) => value.toUpperCase()),
  mobile: phone,
  email: z.string().trim().email().max(254).toLowerCase(),
  photo: image,
}).strict();
export const permissionsSchema = z.array(z.enum(permissionKeys)).max(permissionKeys.length).refine(values => values.every(key => (dependencies[key] || []).every(dep => values.includes(dep))), 'Select the required view / verification permissions too.');
export const userSchema = z
  .object({
    name: text.max(100),
    email: z.string().email().toLowerCase(),
    employeeId: text.max(40),
    password: z.string().min(12).max(128),
    role: z.enum([
      "SUPER_ADMIN",
      "ADMIN",
      "PRINCIPAL",
      "TEACHER",
      "RECEPTION",
      "SECURITY_GUARD",
    ]),
    department: opt,
    permissions: permissionsSchema.optional(),
    assignedGate: z.string().trim().max(60).optional(),
  })
  .strict();
export const accessSchema = userSchema.pick({role:true, permissions:true, assignedGate:true}).partial().extend({active:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0, "Choose an access change.");
export const settingsSchema = z
  .object({
    schoolName: text,
    address: text,
    logo: image,
    gates: z.array(text.max(60)).min(1).max(20),
    validityHours: z.number().min(1).max(24),
    otpExpiryMinutes: z.number().int().min(1).max(5),
    emergencyEnabled: z.boolean(),
    requireParent: z.literal(true),
    notificationTemplates: z
      .object({ requested: opt, approved: opt, exited: opt, returned: opt })
      .strict()
      .optional(),
  })
  .strict();
export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) {
    next(e);
  }
};
