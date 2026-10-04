import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AuditLog, GateEvent, Counter } from '../models/index.js';
export class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const assert = (condition, status, message) => { if (!condition) throw new AppError(status, message); };
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export const token = () => crypto.randomBytes(32).toString('hex');
export const ok = (res, data = {}, message = 'Success', status = 200) => res.status(status).json({ success: true, message, data });
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export async function transaction(fn) { return mongoose.connection.transaction(fn); }
export async function number(prefix, session) {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `${prefix}-${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, session });
  return `SRPS-${prefix}-${year}-${String(counter.value).padStart(6, '0')}`;
}
export async function audit(req, action, entityId, details = {}, session) {
  await AuditLog.create([{ action, entityId, performedBy: req.user?._id, ip: req.ip, details }], { session });
}
export async function event(req, pass, eventType, session, entityType = 'GatePass') {
  await GateEvent.create([{ gatePassId: entityType === 'GatePass' ? pass._id : undefined,
    studentId: pass.student?._id || pass.student, entityId: pass._id, entityType, eventType,
    performedBy: req.user?._id, ip: req.ip, gate: req.body?.gate, device: (req.get('user-agent') || '').slice(0, 300) }], { session });
  await audit(req, eventType, pass._id, { entityType }, session);
}
