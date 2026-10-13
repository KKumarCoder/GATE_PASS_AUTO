import {BusSwap, BusSwapEmail, Notification, SystemSetting} from '../models/index.js';
import {sendEmailMessage} from './email.service.js';
import {schoolDate} from '../../shared/recurring.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function busSwapEmailContent(swap,recipient,schoolName){
  const cancelled=recipient.event==='CANCELLED';
  const driver=['FROM_DRIVER','TO_DRIVER'].includes(recipient.audience);
  const instruction=cancelled
    ? 'This temporary bus change has been cancelled. Do not act on the earlier swap approval. Please follow the student’s regular transport arrangement unless the school issues a new approved instruction.'
    : recipient.audience==='FROM_DRIVER'
      ? `For ${swap.date} only, please do not board this student on Bus ${swap.fromBus}. The student is authorised to travel on Bus ${swap.toBus}. Please coordinate the handover with the school transport team.`
      : recipient.audience==='TO_DRIVER'
        ? `For ${swap.date} only, please receive this student on Bus ${swap.toBus}, confirm the student’s identity, and follow the school-confirmed drop-off arrangement. The regular bus is Bus ${swap.fromBus}.`
        : `The parent and Principal have authorised this one-day change from Bus ${swap.fromBus} to Bus ${swap.toBus} for ${swap.date}. The student’s regular transport arrangement remains unchanged for all other dates.`;
  const rows=[['Reference',swap.swapNumber],['Student',swap.studentName],['Admission number',swap.admissionNumber],['Class / section',swap.className],['Valid date (IST)',swap.date],['Regular bus',swap.fromBus],['Replacement bus',swap.toBus],['Principal',swap.principalApproval?.name||'School Principal'],['Approval time (IST)',swap.approvedAt?new Date(swap.approvedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'—']];
  if(swap.parentApproval?.verifiedAt)rows.push(['Parent SMS OTP verified (IST)',new Date(swap.parentApproval.verifiedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})]);
  if(!driver)rows.push(['Reason',cancelled?swap.decisionReason:swap.reason]);
  const title=cancelled?'Bus swap cancellation':'One-day bus swap approved';
  const greeting=`Dear ${recipient.recipientName||'Sir / Madam'},`;
  const closing='For any correction, please contact the school office before boarding. This instruction does not authorise an early campus exit.';
  return {
    subject:`${schoolName} | ${title} | ${swap.swapNumber} | ${swap.date}`.replace(/[\r\n]/g,' '),
    text:[schoolName,title,'',greeting,'',instruction,'',...rows.map(([key,value])=>`${key}: ${value}`),'',closing,'','Regards,',`${schoolName} — School Transport Office`].join('\n'),
    html:`<!doctype html><html><body style="margin:0;background:#f3f6fa;font-family:Arial,sans-serif;color:#203049"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #dce3ee;border-radius:12px;overflow:hidden"><div style="padding:24px;background:#18344f;color:white"><div style="font-size:14px">${escape(schoolName)}</div><h1 style="font-size:23px;margin:12px 0 0">${escape(title)}</h1></div><div style="padding:24px;line-height:1.6"><p>${escape(greeting)}</p><p>${escape(instruction)}</p><table width="100%" cellpadding="9" cellspacing="0" style="border-collapse:collapse">${rows.map(([key,value])=>`<tr><th align="left" style="border-bottom:1px solid #e8edf3;font-size:13px;width:42%">${escape(key)}</th><td style="border-bottom:1px solid #e8edf3;font-size:14px">${escape(value)}</td></tr>`).join('')}</table><p>${escape(closing)}</p><p>Regards,<br><strong>${escape(schoolName)}<br>School Transport Office</strong></p></div></div></td></tr></table></body></html>`,
  };
}
export async function queueSwapEmails(swap,recipients,session,event='APPROVED'){
  await BusSwapEmail.create(recipients.map(r=>({...r,busSwap:swap._id,event,status:'PENDING',nextAttemptAt:new Date()})),{session,ordered:true});
}
export async function deliverSwapEmails(busSwap){
  const now=new Date(),filter={...(busSwap?{busSwap}:{}),$or:[{status:{$in:['PENDING','FAILED']},attempts:{$lt:5},nextAttemptAt:{$lte:now}},{status:'SENDING',lockedAt:{$lt:new Date(Date.now()-120000)}}]};
  const records=await BusSwapEmail.find(filter).select('_id').sort({createdAt:1}).limit(40);
  await Promise.all(records.map(async item=>{
    const job=await BusSwapEmail.findOneAndUpdate({_id:item._id,...filter},{$set:{status:'SENDING',lockedAt:now},$inc:{attempts:1}},{new:true});
    if(!job)return;
    const claim={_id:job._id,status:'SENDING',lockedAt:now};
    try{
      const swap=await BusSwap.findById(job.busSwap);
      if(!swap||(job.event==='APPROVED'&&(swap.status!=='APPROVED'||swap.date<schoolDate()))){await BusSwapEmail.updateOne(claim,{$set:{status:'SKIPPED',error:'Approval no longer applies.'}});return;}
      const settings=await SystemSetting.findOne({key:'school'});
      await sendEmailMessage({to:job.recipient,...busSwapEmailContent(swap,job,settings?.schoolName||'Shree Ram Public School')});
      await BusSwapEmail.updateOne(claim,{$set:{status:'SENT',sentAt:new Date(),error:''}});
      await Notification.create({busSwap:job.busSwap,event:`BUS_SWAP_${job.event}_${job.audience}`,recipient:job.recipient,provider:'smtp-email',status:'SENT'});
    }catch{
      await BusSwapEmail.updateOne(claim,{$set:{status:'FAILED',error:'Email could not be sent. Check SMTP and the registered recipient address.',nextAttemptAt:new Date(Date.now()+60000*Math.min(job.attempts,5))}});
      await Notification.create({busSwap:job.busSwap,event:`BUS_SWAP_${job.event}_${job.audience}`,recipient:job.recipient,provider:'smtp-email',status:'FAILED',error:'Email delivery failed.'});
    }
  }));
}
