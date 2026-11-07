import {Student,BirthdayConfig,BirthdayDelivery} from '../../models/index.js';
import {birthdayCard} from './card.js';
import {sendBirthday,birthdayProviderReady} from './provider.js';
export function schoolClock(now=new Date()) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {day:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`,month:Number(parts.month),date:Number(parts.day)};
}
export function birthdayFilter(clock) {
 return {status:'ACTIVE',dateOfBirth:{$type:'date'},$expr:{$and:[{$eq:[{$month:'$dateOfBirth'},clock.month]},{$eq:[{$dayOfMonth:'$dateOfBirth'},clock.date]}]}};
}
export const defaultBirthdayConfig={enabled:false,sendTime:'07:00',background:'',wishesFrom:'Shree Ram Public School',templateName:'',language:'en'};
export async function deliverBirthdays({now=new Date(),retryId,manualId,render=birthdayCard,send=sendBirthday,ready=birthdayProviderReady}={}) {
 const config=await BirthdayConfig.findOne({key:'school'}).lean();
 const clock=schoolClock(now);
 if(!config || !ready() || !config.background || !config.templateName) return;
 if(!manualId && (!config.enabled || clock.time<config.sendTime)) return;
 const students=await Student.find({...birthdayFilter(clock),...((manualId||retryId)?{_id:manualId||retryId}:{})}).cursor();
 for await(const student of students) {
  const id=`${clock.day}:${student._id}`;
  let record;
  if(manualId) {
   record=await BirthdayDelivery.findOneAndUpdate({_id:id,status:'FAILED'},{$set:{status:'PROCESSING',error:''}},{new:true});
   if(!record){try{record=await BirthdayDelivery.create({_id:id,student:student._id,day:clock.day,recipient:student.primaryMobile,status:'PROCESSING'});}catch(e){if(e.code===11000)continue;throw e;}}
  }
  else if(retryId) record=await BirthdayDelivery.findOneAndUpdate({_id:id,status:'FAILED'},{$set:{status:'PROCESSING',error:''}},{new:true});
  else {try{record=await BirthdayDelivery.create({_id:id,student:student._id,day:clock.day,recipient:student.primaryMobile,status:'PROCESSING'});}catch(e){if(e.code===11000)continue;throw e;}}
  if(!record)continue;
  try {
   if(!/^\+[1-9]\d{7,14}$/.test(student.primaryMobile))throw new Error('Invalid registered mobile.');
   const card=await render(student,config);
   const providerMessageId=await send({mobile:student.primaryMobile,card,config,student});
   // Persist failures after submission must not turn an accepted message into a retryable failure.
   try{await BirthdayDelivery.updateOne({_id:id},{$set:{status:'SENT',providerMessageId,error:''}});}catch{continue;}
  }catch(error){await BirthdayDelivery.updateOne({_id:id},{$set:{status:error.ambiguous?'UNKNOWN':'FAILED',error:error.safeMessage || (error.ambiguous?'Submission outcome unknown. Check the provider dashboard before taking action.':'Could not submit. Check registered mobile, uploaded images and WhatsApp template configuration.')}});}
 }
}
