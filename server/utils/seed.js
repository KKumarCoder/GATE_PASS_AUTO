import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { env, validateEnvironment } from "../config/env.js";
import { User, SystemSetting } from "../models/index.js";
validateEnvironment();
const {
  SEED_ADMIN_EMAIL: email,
  SEED_ADMIN_PASSWORD: password,
  SEED_ADMIN_NAME: name,
} = process.env;
if (!email || !password || password.length < 12 || !name)
  throw new Error(
    "Set SEED_ADMIN_EMAIL, SEED_ADMIN_NAME and a SEED_ADMIN_PASSWORD of at least 12 characters.",
  );
await mongoose.connect(env.mongo);
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
if (!(await User.exists({ role: "SUPER_ADMIN" }))) {
  await User.create({
    name,
    email,
    employeeId: "SRPS-ADMIN-001",
    role: "SUPER_ADMIN",
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log("Initial super administrator created.");
} else console.log("Super administrator exists; password unchanged.");
await SystemSetting.updateOne(
  { key: "school" },
  {
    $setOnInsert: {
      schoolName: process.env.SCHOOL_NAME || "Shree Ram Public School",
      address:
        process.env.SCHOOL_ADDRESS ||
        "Kanhra-Badhra Road, Charkhi Dadri, Haryana 127306",
      gates: ["Main Gate"],
      validityHours: 8,
      otpExpiryMinutes: 5,
      emergencyEnabled: true,
      requireParent: true,
    },
  },
  { upsert: true },
);
await mongoose.disconnect();
