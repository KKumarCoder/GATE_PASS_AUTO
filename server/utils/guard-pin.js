import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';
// Keyed lookup prevents offline enumeration of the small PIN space from a database dump.
export const guardPinLookup = pin => createHmac('sha256', env.access).update('guard-pin:'+pin).digest('hex');
