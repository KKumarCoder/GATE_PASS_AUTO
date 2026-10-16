import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {StaffMember,User,StaffOTP} from '../models/index.js';
import {admins,can} from '../middleware/auth.js';
import {assert,hash} from '../utils/core.js';
import {sendApitxtOTP} from './otp/apitxt.service.js';
import {sendEmailMessage} from './email.service.js';
export async function staffContext(req,body){
 assert(admins.includes(req.user.role)||can(req.user,'staff.manage')||body.staff===String(req.user._id),403,'You can request movement only for yourself.');
 const person=await User.findOne({_id:body.staff,active:true})||await StaffMember.findOne({_id:body.staff,active:true,deletedAt:null});
 assert(person,404,'Active staff member not found.');
 return {person,fingerprint:hash(JSON.stringify([body.staff,body.department,body.reason,body.expectedReturn||null,person.mobile||'',person.email||'']))};
}
export async function sendStaffOTP(req,body,channel){
 const {person,fingerprint}=await staffContext(req,body),recipient=channel==='sms'?person.mobile:person.email;
 assert(recipient,409,`Add a registered ${channel==='sms'?'mobile number':'email'} to the staff profile first.`);
 const code=crypto.randomInt(100000,1000000).toString(),digest=await bcrypt.hash(code,12);
 // One challenge per staff member also enforces resend cooldown across requesters.
 const existing=await StaffOTP.findOne({staff:person._id});
 assert(!existing||Date.now()-existing.sentAt.getTime()>=60000,429,'Wait 60 seconds before requesting another OTP.');
 let challenge;
 try{challenge=await StaffOTP.findOneAndUpdate({staff:person._id,$or:[{sentAt:{$lte:new Date(Date.now()-60000)}},{sentAt:{$exists:false}}]},{$set:{requestedBy:req.user._id,fingerprint,digest,channel,sentAt:new Date(),expiresAt:new Date(Date.now()+300000),attempts:0,delivered:false,consumed:false}},{upsert:true,new:true});}catch(e){if(e.code===11000)assert(false,429,'Wait before requesting another OTP.');throw e;}
 try{if(channel==='sms')await sendApitxtOTP(recipient,code);else await sendEmailMessage({to:recipient,subject:'SRPS staff gate pass verification',text:`Your staff gate pass OTP is ${code}. It expires in 5 minutes. Share it with school reception only if you requested this departure.`});}
 catch{await StaffOTP.updateOne({_id:challenge._id,digest},{$set:{consumed:true}});assert(false,503,'OTP delivery failed. Check the registered contact and delivery settings.');}
 await StaffOTP.updateOne({_id:challenge._id,digest},{$set:{delivered:true}});
 return {challengeId:challenge._id,channel,expiresAt:challenge.expiresAt};
}
export async function validateStaffOTP(req,body,challengeId,otp){
 const {fingerprint}=await staffContext(req,body);
 const challenge=await StaffOTP.findOneAndUpdate({_id:challengeId,staff:body.staff,requestedBy:req.user._id,fingerprint,delivered:true,consumed:false,expiresAt:{$gt:new Date()},attempts:{$lt:5}},{$inc:{attempts:1}},{new:true});
 assert(challenge,409,'OTP expired or request changed. Send a new OTP.');
 assert(await bcrypt.compare(otp,challenge.digest),400,'Incorrect OTP.');return challenge;
}
