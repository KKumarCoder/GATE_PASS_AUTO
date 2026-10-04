import { can, assignedGateFor } from '../../shared/access.mjs';
export { can } from '../../shared/access.mjs';
import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';
import { env } from '../config/env.js';
import { assert, wrap } from '../utils/core.js';
export const authenticate = wrap(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  assert(token, 401, 'Please sign in.');
  let payload;
  try { payload = jwt.verify(token, env.access, { algorithms: ['HS256'], issuer: 'srps', audience: 'srps-staff' }); }
  catch { assert(false, 401, 'Session expired. Please sign in.'); }
  const user = await User.findOne({ _id: payload.sub, active: true });
  assert(user && user.sessionVersion === payload.version, 401, 'Session has been revoked.');
  assert(payload.sid && await Session.exists({_id:payload.sid,user:user._id,expiresAt:{$gt:new Date()}}), 401, 'Session has ended. Please sign in.');
  req.user = user; next();
});
export const permit = (...roles) => (req, res, next) => {
  try { assert(req.user && roles.includes(req.user.role), 403, 'Your role cannot perform this action.'); next(); } catch (e) { next(e); }
};
export const admins = ['SUPER_ADMIN','ADMIN'];

export const requirePermission = (...permissions) => (req,res,next) => {
  try { assert(permissions.some(key=>can(req.user,key)),403,'You do not have permission for this module or action.'); next(); } catch(e){next(e);}
};
export const enforceGate = (req,res,next) => {
  try { const gate=assignedGateFor(req.user); assert(!gate || req.body.gate===gate,403,'You can record movement only at your assigned gate.'); next(); } catch(e){next(e);}
};
