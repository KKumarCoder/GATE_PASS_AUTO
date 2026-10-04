import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {qrImage} from '../qr/qr.service.js';
const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
async function readPhoto(url) {
  if (!url || !/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png)$/.test(url)) return null;
  try { return await fs.readFile(path.join(uploadDir, path.basename(url))); } catch { return null; }
}
const navy = '#082b50', gold = '#c7983e', muted = '#546b80', line = '#bac7d1';
const date = value => value ? new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not recorded';
const pretty = value => String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export async function passPDF(pass, res, settings) {
  const image = await qrImage(pass);
  const student = pass.student || {};
  const [photo, logo] = await Promise.all([readPhoto(student.photo), readPhoto(settings?.logo)]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pass.gatePassNumber}.pdf"`);
  const doc = new PDFDocument({size:'A4',layout:'landscape',margin:0,info:{Title:`Gate pass ${pass.gatePassNumber}`,Author:settings?.schoolName || 'Shree Ram Public School'}});
  doc.pipe(res);
  const width = doc.page.width, height = doc.page.height;
  const extra = [];
  // Bound text to its allotted area; retain exceptionally long content on a details page.
  function text(value, x, y, w, h, size = 10, bold = false, color = navy, align = 'left', label = '') {
    const content = String(value || '—');
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    while (size > 8 && doc.heightOfString(content, {width:w}) > h) doc.fontSize(size -= .5);
    const overflow = doc.heightOfString(content, {width:w}) > h;
    if (overflow) extra.push([label || 'Additional details', content]);
    doc.fillColor(color).text(content, x, y, {width:w,height:h,ellipsis:overflow,align,lineGap:1});
  }
  function rule(x, y, w, color = line) { doc.moveTo(x,y).lineTo(x+w,y).lineWidth(.6).strokeColor(color).stroke(); }
  function frame() {
    doc.rect(0,0,width,height).fill(navy);
    doc.roundedRect(11,11,width-22,height-22,15).fill('#ffffff');
    doc.roundedRect(15,15,width-30,height-30,12).lineWidth(1.8).strokeColor(gold).stroke();
    doc.moveTo(width-85,15).lineTo(width-51,15).lineTo(width-26,40).lineTo(width-60,40).closePath().fill(gold);
  }
  frame();
  if (logo) doc.image(logo,36,31,{fit:[72,83],align:'center',valign:'center'});
  else {
    doc.moveTo(37,34).lineTo(103,34).lineTo(103,81).bezierCurveTo(103,101,80,111,70,117).bezierCurveTo(59,111,37,101,37,81).closePath().fillAndStroke(navy,gold);
    doc.moveTo(45,66).lineTo(70,55).lineTo(95,66).lineTo(70,77).closePath().lineWidth(2).strokeColor(gold).stroke();
    doc.moveTo(53,73).lineTo(53,84).quadraticCurveTo(70,93,87,84).lineTo(87,73).stroke();
    text('SRPS',48,95,44,13,10,true,'#efcc81','center');
  }
  text(settings?.schoolName || 'Shree Ram Public School',125,34,465,48,30,true,navy,'left','School name');
  text('A HOME AWAY FROM HOME',127,87,450,14,10,true,navy);
  doc.rect(125,108,455,18).fill(navy);
  text('STUDENT SERVICES   |   CAMPUS SECURITY   |   VERIFIED MOVEMENT',132,113,441,10,8,false,'#ffffff','center');
  doc.moveTo(605,38).lineTo(605,125).dash(2,{space:3}).lineWidth(.6).strokeColor(muted).stroke().undash();
  text('GATE PASS NO.',623,41,170,12,9,true);
  doc.roundedRect(620,58,183,27,4).lineWidth(.8).strokeColor(line).stroke();
  text(pass.gatePassNumber,628,66,168,14,10,true);
  text('ISSUED ON · IST',623,95,170,12,8,true);
  text(date(pass.createdAt),623,111,170,16,10);
  rule(35,138,width-70,gold);
  doc.moveTo(233,146).lineTo(610,146).lineTo(601,163).lineTo(610,181).lineTo(233,181).lineTo(242,163).closePath().fill(navy);
  rule(180,163,43,gold);rule(620,163,43,gold);
  doc.font('Times-Bold').fontSize(27).fillColor('#ffffff').text('G A T E   P A S S',243,150,{width:357,height:29,align:'center'});
  text(pretty(pass.requestType),38,193,255,14,9,true);
  text(pretty(pass.status),552,193,250,14,9,true,pass.status==='READY_FOR_EXIT'?'#16704f':navy,'right');

  function field(label, value, x, y, w, h = 28) {
    text(label.toUpperCase(), x, y, 114,14,8,true);
    text(value,x+120,y-2,w-120,h-4,11,false,navy,'left',label);
    rule(x+120,y+h-3,w-120);
  }
  field('Student name',student.name||'Student record deleted',38,220,483,29);
  field('Class & section',student.className?`${student.className} – ${student.section}`:'Unavailable',38,254,245,26);
  text('ADMISSION NO.',310,254,90,11,8,true);
  text(student.admissionNumber||'Unavailable',403,252,118,22,11);rule(403,277,118);
  field('Requested exit',date(pass.timing.requestedExit),38,287,483,26);
  field('Expected return',pass.timing.expectedReturn?date(pass.timing.expectedReturn):'No return required',38,319,483,26);
  field('Reason / purpose',pass.reason,38,351,483,51);
  field('Going with',`${pass.guardian.name} (${pass.guardian.type})`,38,408,483,26);
  field('Contact no.',pass.guardian.mobile || 'Not recorded',38,440,483,24);

  doc.roundedRect(546,216,258,248,7).lineWidth(1).strokeColor(navy).stroke();
  doc.roundedRect(552,222,246,24,3).fill(navy);
  text('SECURITY VERIFICATION',558,230,234,12,10,true,'#ffffff','center');
  const verification = pass.parentVerification.method === 'DEVELOPMENT_OTP' ? 'DEVELOPMENT TEST ONLY' : pass.parentVerification.verified ? 'PARENT VERIFIED' : pass.isEmergency ? 'EMERGENCY OVERRIDE RECORDED' : 'PARENT VERIFICATION PENDING';
  if(photo) doc.image(photo,559,257,{fit:[42,45],align:'center',valign:'center'});
  text(verification,photo?611:559,259,photo?179:231,26,10,true);
  text(pass.approval.approvedBy?.name ? `Approved by ${pass.approval.approvedBy.name}` : 'Awaiting administrator approval',photo?611:559,287,photo?179:231,25,9);
  doc.image(Buffer.from(image.split(',')[1],'base64'),558,315,{width:108,height:108});
  text('SCAN TO VERIFY',674,326,114,15,9,true);
  text('Check live status, student identity and accompanying person. Record exit before departure.',674,347,114,66,9,false,muted);
  text('SECURITY REMARKS',560,428,231,12,8,true);rule(560,453,230);

  doc.rect(38,475,766,32).fill('#f0f4f7');
  const facts = [['Actual exit',date(pass.timing.actualExit)],['Actual return',date(pass.timing.actualReturn)],['Valid until',date(pass.expiresAt)],['Requested by',pass.requestedBy?.name || 'Not recorded']];
  facts.forEach(([label,value],i)=>{text(label.toUpperCase(),48+i*190,481,174,10,7,true,muted);text(value,48+i*190,493,174,11,8,false,navy,'left',label);});
  ['PARENT / GUARDIAN','CLASS TEACHER','ADMIN / OFFICE','SECURITY'].forEach((label,i)=>{const x=48+i*194;rule(x,530,164,navy);text(`${label} SIGNATURE`,x,535,164,10,7,true,navy,'center');});
  doc.rect(16,551,width-32,27).fill(navy);rule(16,551,width-32,gold);
  text(settings?.address || 'Kanhra-Badhra Road, Charkhi Dadri, Haryana',30,560,width-60,12,9,false,'#ffffff','center','School address');
  text('All times IST. A printed pass alone does not authorize departure. Verify live status and record exit.',30,580,width-60,9,6.5,false,navy,'center');
  if(pass.isEmergency) extra.push(['Emergency authority',pass.emergency.authority],['Parent contact attempt',pass.emergency.contactAttempt]);
  if(pass.approval.rejectionReason) extra.push(['Decision note',pass.approval.rejectionReason]);
  if(extra.length) {
    // Longer reasons or school names remain available in full instead of being silently cut off.
    doc.addPage({size:'A4',layout:'landscape',margin:36});
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(18).text('Gate pass · Additional details');
    doc.font('Helvetica').fontSize(10).text(pass.gatePassNumber).moveDown();
    for(const [label,value] of extra) doc.font('Helvetica-Bold').fontSize(10).text(label).font('Helvetica').text(String(value || 'Not recorded')).moveDown();
  }
  doc.end();
}
