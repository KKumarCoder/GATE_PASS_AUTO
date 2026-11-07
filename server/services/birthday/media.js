import crypto from 'node:crypto';
import {BirthdayMedia} from '../../models/index.js';
export const mediaHash = token => crypto.createHash('sha256').update(token).digest('hex');
export function birthdayPublicOrigin() {
  try {
    const url = new URL(process.env.BIRTHDAY_PUBLIC_URL || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return '';
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||!host.includes('.'))return '';
    return url.origin;
  } catch { return ''; }
}
export async function publishBirthdayCard(card) {
  const origin=birthdayPublicOrigin();
  if(!origin)throw new Error('Configure the public HTTPS school app origin.');
  if(!Buffer.isBuffer(card)||card.length>5*1024*1024)throw new Error('Invalid birthday card.');
  const token=crypto.randomBytes(32).toString('hex');
  await BirthdayMedia.create({_id:mediaHash(token),image:card,expiresAt:new Date(Date.now()+24*60*60*1000)});
  return `${origin}/api/birthdays/media/${token}`;
}
