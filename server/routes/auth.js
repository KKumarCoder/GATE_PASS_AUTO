import { permissionsFor, assignedGateFor } from '../../shared/access.mjs';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User, Session, RateBucket } from '../models/index.js';
import { authenticate, permit } from '../middleware/auth.js';
import { validate, objectId } from '../validators/index.js';
import { wrap, assert, hash, token, ok, audit, transaction } from '../utils/core.js';
const router = Router();
const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again in 15 minutes.', data: {} } });
const refreshLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many session refreshes. Please wait.', data: {} } });
const cookieOptions = { httpOnly: true, secure: env.node === 'production', sameSite: 'strict', path: '/api/auth', maxAge: 7 * 86400000 };
const accessFor = (user, sid) => jwt.sign({ version: user.sessionVersion, sid }, env.access, { subject: String(user._id), expiresIn: '15m', algorithm: 'HS256', issuer: 'srps', audience: 'srps-staff' });
async function issue(user, res, session) {
  const refresh = jwt.sign({ jti: token(), version: user.sessionVersion }, env.refresh, { subject: String(user._id), expiresIn: '7d', issuer: 'srps', audience: 'srps-refresh', algorithm: 'HS256' });
  const [loginSession] = await Session.create([{ user: user._id, tokenHash: hash(refresh), expiresAt: new Date(Date.now() + 7 * 86400000) }], { session });
  res.cookie('srps_refresh', refresh, cookieOptions);
  return { accessToken: accessFor(user, String(loginSession._id)), user: { _id: user._id, name: user.name, role: user.role, email: user.email, employeeId: user.employeeId, permissions: permissionsFor(user), assignedGate: assignedGateFor(user) } };
}
router.post('/login', limit, validate(z.object({ identifier: z.string().trim().min(1).max(200), password: z.string().min(1).max(128) }).strict()), wrap(async (req, res) => {
  const window=Math.floor(Date.now()/900000);
  try{await RateBucket.findOneAndUpdate({key:`login:${hash(req.body.identifier.toLowerCase())}:${window}`,count:{$lt:10}},{$inc:{count:1},$set:{expiresAt:new Date((window+2)*900000)}},{upsert:true});}catch(e){if(e.code===11000)assert(false,429,'Too many login attempts for this account. Try later.');throw e;}
  const user = await User.findOne({ $or: [{ email: req.body.identifier.toLowerCase() }, { employeeId: req.body.identifier }], active: true }).select('+passwordHash');
  const valid = await bcrypt.compare(req.body.password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  await audit(req, valid && user ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED', user?._id);
  assert(valid && user, 401, 'Invalid credentials.');
  ok(res, await issue(user, res));
}));
router.post('/refresh', refreshLimit, wrap(async (req, res) => {
  const raw = req.cookies.srps_refresh; assert(raw, 401, 'Please sign in.');
  let payload; try { payload = jwt.verify(raw, env.refresh, { algorithms: ['HS256'], issuer: 'srps', audience: 'srps-refresh' }); } catch { assert(false, 401, 'Session expired.'); }
  const data = await transaction(async session => {
    const existing = await Session.findOneAndDelete({ tokenHash: hash(raw), expiresAt: { $gt: new Date() } }, { session });
    assert(existing, 401, 'Session expired or already refreshed.');
    const user = await User.findOne({ _id: payload.sub, active: true, sessionVersion: payload.version }).session(session);
    assert(user, 401, 'Session revoked.');
    return issue(user, res, session);
  }); ok(res, data);
}));
router.post('/logout', wrap(async (req, res) => {
  if (req.cookies.srps_refresh) await Session.deleteOne({ tokenHash: hash(req.cookies.srps_refresh) });
  res.clearCookie('srps_refresh', cookieOptions); ok(res);
}));
router.get('/me', authenticate, (req, res) => ok(res, { _id: req.user._id, name: req.user.name, role: req.user.role, email: req.user.email, permissions: permissionsFor(req.user), assignedGate: assignedGateFor(req.user) }));
// Recovery is initiated by an authenticated super administrator after offline identity verification.
router.post('/recovery/:id', authenticate, permit('SUPER_ADMIN'), wrap(async (req, res) => {
  objectId.parse(req.params.id); const recovery = token();
  const user = await User.findByIdAndUpdate(req.params.id, { resetHash: hash(recovery), resetExpires: new Date(Date.now() + 15 * 60000) });
  assert(user, 404, 'User not found.'); await audit(req, 'PASSWORD_RECOVERY_ISSUED', user._id);
  ok(res, { recoveryLink: `${env.frontend}/reset-password/${recovery}` }, 'Deliver this one-time link after verifying staff identity.');
}));
router.post('/reset-password', limit, validate(z.object({ token: z.string().length(64), password: z.string().min(12).max(128) }).strict()), wrap(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  await transaction(async session => {
    const user = await User.findOneAndUpdate({ resetHash: hash(req.body.token), resetExpires: { $gt: new Date() } }, { $set: { passwordHash }, $unset: { resetHash: '', resetExpires: '' }, $inc: { sessionVersion: 1 } }, { session });
    assert(user, 400, 'Recovery link is invalid or expired.');
    await Session.deleteMany({ user: user._id }).session(session); await audit(req, 'PASSWORD_RESET', user._id, {}, session);
  }); ok(res, {}, 'Password updated. Sign in again.');
}));
export default router;
