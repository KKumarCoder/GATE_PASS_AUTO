import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {BusSwap,BusSwapParentOTP,BusSwapOTP,Student,RateBucket,Notification} from '../models/index.js';
import {assert,transaction,audit,hash} from '../utils/core.js';
import {can} from '../middleware/auth.js';
import {isSmsOTPConfigured} from '../config/env.js';
import {sendApitxtOTP} from './otp/apitxt.service.js';
import {schoolDate} from '../../shared/recurring.mjs';
const scope=req=>can(req.user,'bus-swaps.approve')?{}:{requestedBy:req.user._id};
async function pendingSwap(req,id,session){
  const swap=await BusSwap.findOne({_id:id,...scope(req)}).session(session);
  assert(swap,404,'Bus swap not found.');
  assert(swap.status==='PENDING'&&swap.date>=schoolDate(),409,'This swap is not waiting for approval or has expired.');
  return swap;
}
export async function parentContext(swap,session){
  const student=await Student.findOne({_id:swap.student,status:'ACTIVE'}).session(session||null);
  assert(student,409,'Student is no longer active.');
  assert(/^(?:\+?91)?[6-9]\d{9}$/.test(student.primaryMobile||''),409,'Add a valid Indian parent mobile number to the student profile.');
  const contextHash=hash(JSON.stringify({swap:String(swap._id),student:String(student._id),mobile:student.primaryMobile,email:student.email,date:swap.date,fromBus:swap.fromBus,toBus:swap.toBus,reason:swap.reason,parentName:swap.parentName,parentRequest:swap.parentRequest}));
  return {student,contextHash};
}
export async function requireParentApproval(swap,session){
  assert(swap.parentApproval?.verifiedAt,409,'Verify the parent’s SMS OTP before Principal approval.');
  const context=await parentContext(swap,session);
  assert(swap.parentApproval.contextHash===context.contextHash,409,'Parent contact or swap details changed. Verify a fresh parent SMS OTP.');
  return context;
}
export async function sendParentSwapOTP(req,id){
  assert(isSmsOTPConfigured(),503,'Parent SMS OTP is not configured. Set APITXT_AUTH_KEY.');
  const code=crypto.randomInt(100000,1000000).toString(),hashedOTP=await bcrypt.hash(code,12),challenge=crypto.randomUUID(),sentAt=new Date(),expiresAt=new Date(Date.now()+5*60000);
  const mobile=await transaction(async session=>{
    const swap=await pendingSwap(req,id,session),context=await parentContext(swap,session);
    const previous=await BusSwapParentOTP.findOne({busSwap:id}).session(session);
    assert(!previous||previous.sentAt<=new Date(Date.now()-60000),429,'Wait 60 seconds before resending the parent OTP.');
    const window=Math.floor(Date.now()/900000);
    try{await RateBucket.findOneAndUpdate({key:`bus-swap-parent-otp:${hash(context.student.primaryMobile)}:${window}`,count:{$lt:5}},{$inc:{count:1},$set:{expiresAt:new Date((window+2)*900000)}},{upsert:true,session});}
    catch(error){if(error.code===11000)assert(false,429,'This parent has reached the SMS OTP limit. Try again after 15 minutes.');throw error;}
    // Reverification also invalidates any previously issued Principal code.
    swap.parentApproval=undefined;swap.updatedAt=new Date();swap.markModified('updatedAt');await swap.save({session});
    await BusSwapOTP.updateOne({busSwap:id},{$set:{consumedAt:new Date(),expiresAt:new Date(0)}},{session});
    await BusSwapParentOTP.findOneAndUpdate({busSwap:id},{$set:{student:context.student._id,mobile:context.student.primaryMobile,contextHash:context.contextHash,hashedOTP,challenge,sentAt,expiresAt,attempts:0},$unset:{deliveredAt:1,consumedAt:1}},{upsert:true,session});
    await audit(req,'BUS_SWAP_PARENT_OTP_REQUESTED',id,{},session);
    return context.student.primaryMobile;
  });
  try{await sendApitxtOTP(mobile,code);}
  catch{
    await BusSwapParentOTP.updateOne({busSwap:id,challenge},{$set:{expiresAt:new Date(0),consumedAt:new Date()}});
    await Notification.create({busSwap:id,event:'BUS_SWAP_PARENT_OTP',recipient:mobile,provider:'apitxt-sms',status:'FAILED',error:'Parent SMS OTP delivery failed.'});
    assert(false,502,'Parent SMS OTP could not be sent. Please retry after 60 seconds.');
  }
  await BusSwapParentOTP.updateOne({busSwap:id,challenge},{$set:{deliveredAt:new Date()}});
  await Notification.create({busSwap:id,event:'BUS_SWAP_PARENT_OTP',recipient:mobile,provider:'apitxt-sms',status:'SENT'});
  return {mobile:`******${mobile.slice(-4)}`,expiresAt};
}
export async function verifyParentSwapOTP(req,id,code){
  const outcome=await transaction(async session=>{
    const swap=await pendingSwap(req,id,session);
    const otp=await BusSwapParentOTP.findOne({busSwap:id}).select('+hashedOTP').session(session);
    assert(otp&&otp.deliveredAt&&!otp.consumedAt&&otp.expiresAt>new Date(),400,'Request a fresh parent SMS OTP.');
    assert(otp.attempts<5,429,'Too many incorrect attempts. Request a fresh parent OTP.');
    const context=await parentContext(swap,session);
    assert(context.contextHash===otp.contextHash,409,'Parent contact or swap details changed. Send a fresh parent OTP.');
    if(!await bcrypt.compare(code,otp.hashedOTP)){
      otp.attempts+=1;await otp.save({session});await audit(req,'BUS_SWAP_PARENT_OTP_FAILED',id,{},session);
      return {incorrect:true,locked:otp.attempts>=5};
    }
    otp.consumedAt=new Date();otp.hashedOTP=undefined;await otp.save({session});
    swap.parentApproval={verifiedBy:req.user._id,mobile:context.student.primaryMobile,contextHash:context.contextHash,verifiedAt:new Date()};
    await swap.save({session});await audit(req,'BUS_SWAP_PARENT_VERIFIED',id,{verification:'PARENT_SMS_OTP'},session);
    return {swap};
  });
  assert(!outcome.incorrect,outcome.locked?429:400,outcome.locked?'Too many incorrect attempts. Request a fresh parent OTP.':'Incorrect parent OTP.');
  return outcome.swap;
}
