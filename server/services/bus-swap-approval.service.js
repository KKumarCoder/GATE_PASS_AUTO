import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {z} from 'zod';
import {BusSwap,BusSwapOTP,BusDriver,Student,User,Notification,RateBucket} from '../models/index.js';
import {assert,transaction,audit,hash} from '../utils/core.js';
import {can} from '../middleware/auth.js';
import {isEmailOTPConfigured,isSmsOTPConfigured} from '../config/env.js';
import {sendApitxtOTP} from './otp/apitxt.service.js';
import {queueSwapEmails} from './bus-swap-email.service.js';
import {requireParentApproval} from './bus-swap-parent.service.js';
import {schoolDate} from '../../shared/recurring.mjs';
const email=z.string().email();
export const maskMobile=value=>value?`******${value.slice(-4)}`:'Not configured';
export async function approvalContext(swap,principalId,session){
  await requireParentApproval(swap,session);
  const principal=await User.findOne({_id:principalId,role:'PRINCIPAL',active:true}).session(session||null);
  assert(principal&&can(principal,'bus-swaps.approve'),409,'Choose an active Principal account with bus swap approval permission.');
  assert(/^(?:\+?91)?[6-9]\d{9}$/.test(principal.mobile||''),409,'Add the Principal’s Indian mobile number in Users & access.');
  const student=await Student.findOne({_id:swap.student,status:'ACTIVE'}).session(session||null);
  assert(student,409,'Student is no longer active.');
  const drivers=await BusDriver.find({busNumber:{$in:[swap.fromBus,swap.toBus]}}).session(session||null);
  assert(drivers.length===2,409,'Both buses must be configured.');
  const from=drivers.find(d=>d.busNumber===swap.fromBus),to=drivers.find(d=>d.busNumber===swap.toBus);
  const recipients=[
    {audience:'PRINCIPAL',recipient:principal.email,recipientName:principal.name},
    {audience:'PARENT',recipient:student.email,recipientName:swap.parentName},
    {audience:'FROM_DRIVER',recipient:from.email,recipientName:from.driverName},
    {audience:'TO_DRIVER',recipient:to.email,recipientName:to.driverName},
  ];
  for(const r of recipients)assert(email.safeParse(r.recipient).success,409,`Registered email is missing or invalid for ${r.audience.replaceAll('_',' ').toLowerCase()}. Update the student, principal or bus staff record first.`);
  const contextHash=hash(JSON.stringify({swap:String(swap._id),student:String(swap.student),date:swap.date,fromBus:swap.fromBus,toBus:swap.toBus,reason:swap.reason,parentName:swap.parentName,parentRequest:swap.parentRequest,principal:String(principal._id),mobile:principal.mobile,parentVerifiedAt:swap.parentApproval.verifiedAt,recipients}));
  return {principal,recipients,contextHash};
}
export async function sendPrincipalOTP(req,id,principalId){
  assert(isSmsOTPConfigured(),503,'Principal SMS OTP is not configured. Set APITXT_AUTH_KEY.');
  assert(isEmailOTPConfigured(),503,'Configure SMTP email before approving bus swaps.');
  const code=crypto.randomInt(100000,1000000).toString(),hashedOTP=await bcrypt.hash(code,12),challenge=crypto.randomUUID(),sentAt=new Date(),expiresAt=new Date(Date.now()+5*60000);
  const principal=await transaction(async session=>{
    const swap=await BusSwap.findById(id).session(session);
    assert(swap,404,'Bus swap not found.');assert(swap.status==='PENDING'&&swap.date>=schoolDate(),409,'This swap is not waiting for approval or has expired.');
    const context=await approvalContext(swap,principalId,session);
    const previous=await BusSwapOTP.findOne({busSwap:id}).session(session);
    assert(!previous||previous.sentAt<=new Date(Date.now()-60000),429,'Wait 60 seconds before resending the Principal OTP.');
    const window=Math.floor(Date.now()/900000);
    try{await RateBucket.findOneAndUpdate({key:`bus-swap-otp:${hash(context.principal.mobile)}:${window}`,count:{$lt:5}},{$inc:{count:1},$set:{expiresAt:new Date((window+2)*900000)}},{upsert:true,session});}
    catch(error){if(error.code===11000)assert(false,429,'Principal SMS OTP limit reached. Try again after 15 minutes.');throw error;}
    // Touch the request to serialize issuance against verification and cancellation.
    swap.updatedAt=new Date();swap.markModified('updatedAt');await swap.save({session});
    await BusSwapOTP.findOneAndUpdate({busSwap:id},{$set:{principal:context.principal._id,mobile:context.principal.mobile,contextHash:context.contextHash,hashedOTP,challenge,sentAt,expiresAt,attempts:0},$unset:{deliveredAt:1,consumedAt:1}},{upsert:true,session});
    await audit(req,'BUS_SWAP_PRINCIPAL_OTP_REQUESTED',id,{principal:context.principal._id},session);
    return context.principal;
  });
  try{await sendApitxtOTP(principal.mobile,code);}
  catch{
    await BusSwapOTP.updateOne({busSwap:id,challenge},{$set:{expiresAt:new Date(0),consumedAt:new Date()}});
    await Notification.create({busSwap:id,event:'BUS_SWAP_PRINCIPAL_OTP',recipient:principal.mobile,provider:'apitxt-sms',status:'FAILED',error:'Principal SMS OTP delivery failed.'});
    assert(false,502,'Principal SMS OTP could not be sent. Please retry after 60 seconds.');
  }
  await BusSwapOTP.updateOne({busSwap:id,challenge},{$set:{deliveredAt:new Date()}});
  await Notification.create({busSwap:id,event:'BUS_SWAP_PRINCIPAL_OTP',recipient:principal.mobile,provider:'apitxt-sms',status:'SENT'});
  return {principalName:principal.name,mobile:maskMobile(principal.mobile),expiresAt,message:'SMS OTP sent to the Principal. It expires in 5 minutes.'};
}
export async function approveWithPrincipalOTP(req,id,code){
  const outcome=await transaction(async session=>{
    const swap=await BusSwap.findById(id).session(session);
    assert(swap,404,'Bus swap not found.');assert(swap.status==='PENDING'&&swap.date>=schoolDate(),409,'This swap is not waiting for approval or has expired.');
    const otp=await BusSwapOTP.findOne({busSwap:id}).select('+hashedOTP').session(session);
    assert(otp&&otp.deliveredAt&&!otp.consumedAt&&otp.expiresAt>new Date(),400,'Request a fresh Principal SMS OTP.');
    assert(otp.attempts<5,429,'Too many incorrect attempts. Request a fresh Principal OTP.');
    const context=await approvalContext(swap,otp.principal,session);
    assert(context.contextHash===otp.contextHash,409,'Request or contact details changed. Send a fresh Principal OTP.');
    if(!await bcrypt.compare(code,otp.hashedOTP)){
      otp.attempts+=1;await otp.save({session});await audit(req,'BUS_SWAP_PRINCIPAL_OTP_FAILED',id,{},session);
      return {incorrect:true,locked:otp.attempts>=5};
    }
    otp.consumedAt=new Date();otp.hashedOTP=undefined;await otp.save({session});
    swap.status='APPROVED';swap.approvedBy=req.user._id;swap.approvedAt=new Date();
    swap.principalApproval={principal:context.principal._id,name:context.principal.name,email:context.principal.email,mobile:context.principal.mobile,verifiedAt:swap.approvedAt};
    await swap.save({session});
    await queueSwapEmails(swap,context.recipients,session);
    await audit(req,'BUS_SWAP_APPROVED',id,{principal:context.principal._id,verification:'PARENT_AND_PRINCIPAL_SMS_OTP',date:swap.date,fromBus:swap.fromBus,toBus:swap.toBus},session);
    return {swap};
  });
  assert(!outcome.incorrect,outcome.locked?429:400,outcome.locked?'Too many incorrect attempts. Request a fresh Principal OTP.':'Incorrect Principal OTP.');
  return outcome.swap;
}
