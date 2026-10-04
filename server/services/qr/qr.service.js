import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { hash } from '../../utils/core.js';
export function qrToken(pass) { return crypto.createHmac('sha256', env.access).update(`srps-qr:${pass._id}:${pass.qr.generatedAt.toISOString()}`).digest('hex'); }
export function parentPassToken(pass){return crypto.createHmac('sha256',env.access).update(`srps-parent-pass:${pass._id}:${pass.qr.generatedAt.toISOString()}`).digest('hex');}
export const parentPassUrl=pass=>`${env.frontend}/parent/pass/${parentPassToken(pass)}`;
export function assignQR(pass) { pass.qr = { generatedAt: new Date() }; pass.qr.tokenHash = hash(qrToken(pass)); if(pass.constructor.modelName==='GatePass')pass.qr.shareTokenHash=hash(parentPassToken(pass)); }
export const qrUrl = pass => `${env.frontend}/gate/verify/${qrToken(pass)}`;
export const qrImage = pass => QRCode.toDataURL(qrUrl(pass), { width: 300, margin: 2, errorCorrectionLevel: 'M' });
