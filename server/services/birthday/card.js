import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const uploads = fileURLToPath(new URL('../../uploads/', import.meta.url));
const escape = value => String(value || '').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function localImage(url) {
  if (!/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url || '')) throw new Error('Select an uploaded image.');
  return path.join(uploads, path.basename(url));
}
export async function birthdayCard(student, config) {
  const width=1024,height=1536;
  const layers=[];
  if(student.photo) layers.push({input:await sharp(localImage(student.photo)).rotate().resize(366,326,{fit:'cover'}).png().toBuffer(),left:329,top:648});
  const label=(text,x,y,size,color='#062c50')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${color}">${escape(text)}</text>`;
  const name=student.name || 'STUDENT NAME';
  const dob=student.dateOfBirth?new Date(student.dateOfBirth).toLocaleDateString('en-GB',{timeZone:'UTC'}):'—';
  layers.push({input:Buffer.from(`<svg width="1024" height="1536"><rect x="302" y="983" width="420" height="51" fill="#062c50"/>${label(name,512,1018,Math.min(30,650/name.length),'white')}<rect x="526" y="1060" width="190" height="38" fill="white"/><rect x="526" y="1103" width="190" height="38" fill="white"/><rect x="526" y="1146" width="190" height="38" fill="white"/>${label(dob,620,1086,20)}${label(`${student.className} - ${student.section}`,620,1129,18)}${label(config.wishesFrom,620,1172,Math.min(18,275/(config.wishesFrom?.length||1)))}</svg>`),left:0,top:0});
  return sharp(localImage(config.background)).resize(width,height,{fit:'fill'}).composite(layers).jpeg({quality:90}).toBuffer();
}
