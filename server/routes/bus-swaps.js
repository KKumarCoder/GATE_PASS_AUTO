import {Router} from 'express';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {BusSwap, BusSwapParentOTP, BusSwapOTP, BusSwapEmail, BusDriver, Student, User} from '../models/index.js';
import {authenticate, requirePermission, can} from '../middleware/auth.js';
import {validate, objectId, text, pageNumber} from '../validators/index.js';
import {wrap, ok, assert, transaction, audit, number} from '../utils/core.js';
import {sendPrincipalOTP,approveWithPrincipalOTP,maskMobile} from '../services/bus-swap-approval.service.js';
import {sendParentSwapOTP,verifyParentSwapOTP} from '../services/bus-swap-parent.service.js';
import {deliverSwapEmails,queueSwapEmails} from '../services/bus-swap-email.service.js';
import {isSmsOTPConfigured,isEmailOTPConfigured} from '../config/env.js';
import {schoolDate} from '../../shared/recurring.mjs';

const router=Router();
router.use(authenticate);
export const swapDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const date=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(+date)&&date.toISOString().slice(0,10)===value;
},'Choose a valid calendar date.');
const bus=z.string().trim().min(1).max(40).transform(v=>v.toUpperCase());
const createSchema=z.object({student:objectId,date:swapDate,fromBus:bus,toBus:bus,reason:text,parentName:text.max(100),parentRequest:z.string().trim().max(500).optional().default('')}).strict().refine(v=>v.fromBus!==v.toBus,'Choose a different destination bus.');
const populate=[{path:'student',select:'name admissionNumber className section villageName status'},{path:'requestedBy',select:'name'},{path:'approvedBy',select:'name'}];
const scope=req=>can(req.user,'bus-swaps.approve')||can(req.user,'gate.verify')?{}:{requestedBy:req.user._id};
function display(record){
  const item=record.toObject();
  item.effectiveStatus=['PENDING','APPROVED'].includes(item.status)&&item.date<schoolDate()?'EXPIRED':item.status;
  if(item.principalApproval){delete item.principalApproval.mobile;delete item.principalApproval.email;}
  if(item.parentApproval){delete item.parentApproval.mobile;delete item.parentApproval.contextHash;}
  item.activeToday=item.status==='APPROVED'&&item.date===schoolDate()&&item.student?.status==='ACTIVE';
  return item;
}
const otpLimit=rateLimit({windowMs:15*60000,limit:20,message:{success:false,message:'Too many OTP requests or attempts. Try later.',data:{}}});
router.post('/:id/send-parent-otp',requirePermission('bus-swaps.create','bus-swaps.approve'),otpLimit,validate(z.object({}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);ok(res,await sendParentSwapOTP(req,req.params.id),'Parent SMS OTP sent.');
}));
router.post('/:id/verify-parent-otp',requirePermission('bus-swaps.create','bus-swaps.approve'),otpLimit,validate(z.object({otp:z.string().regex(/^\d{6}$/)}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);const record=await verifyParentSwapOTP(req,req.params.id,req.body.otp);
  ok(res,display(await record.populate(populate)),'Parent verified. Principal SMS OTP approval is still required.');
}));
router.get('/principals',requirePermission('bus-swaps.approve'),wrap(async(req,res)=>{
  const principals=await User.find({role:'PRINCIPAL',active:true}).select('name mobile permissions role').sort({name:1});
  ok(res,{items:principals.filter(p=>can(p,'bus-swaps.approve')).map(p=>({_id:p._id,name:p.name,mobile:maskMobile(p.mobile),mobileConfigured:/^(?:\+?91)?[6-9]\d{9}$/.test(p.mobile||'')})),smsConfigured:isSmsOTPConfigured(),emailConfigured:isEmailOTPConfigured()});
}));
router.post('/:id/send-principal-otp',requirePermission('bus-swaps.approve'),otpLimit,validate(z.object({principalId:objectId}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);ok(res,await sendPrincipalOTP(req,req.params.id,req.body.principalId),'Principal SMS OTP sent.');
}));
router.post('/:id/approve',requirePermission('bus-swaps.approve'),otpLimit,validate(z.object({otp:z.string().regex(/^\d{6}$/)}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);const record=await approveWithPrincipalOTP(req,req.params.id,req.body.otp);
  await deliverSwapEmails(record._id);
  ok(res,display(await record.populate(populate)),'Principal OTP verified. Bus swap approved; check email delivery status.');
}));
router.get('/:id/emails',requirePermission('bus-swaps.approve'),wrap(async(req,res)=>{
  objectId.parse(req.params.id);assert(await BusSwap.exists({_id:req.params.id}),404,'Bus swap not found.');
  ok(res,{items:await BusSwapEmail.find({busSwap:req.params.id}).select('event audience recipient status attempts sentAt error').sort({createdAt:1})});
}));
router.post('/:id/retry-emails',requirePermission('bus-swaps.approve'),validate(z.object({}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);assert(await BusSwap.exists({_id:req.params.id}),404,'Bus swap not found.');
  await BusSwapEmail.updateMany({busSwap:req.params.id,status:'FAILED'},{$set:{attempts:0,nextAttemptAt:new Date()}});
  await audit(req,'BUS_SWAP_EMAIL_RETRY',req.params.id);await deliverSwapEmails(req.params.id);ok(res,{},'Email retry processed.');
}));
router.get('/',requirePermission('bus-swaps.view'),wrap(async(req,res)=>{
  const query={...scope(req)};
  if(req.query.date)query.date=swapDate.parse(req.query.date);
  if(req.query.bus){const value=bus.parse(req.query.bus);query.$or=[{fromBus:value},{toBus:value}];}
  if(req.query.status)query.status=z.enum(['PENDING','APPROVED','REJECTED','CANCELLED']).parse(req.query.status);
  const page=pageNumber.parse(req.query.page),limit=20;
  const [items,total]=await Promise.all([BusSwap.find(query).populate(populate).sort({date:-1,createdAt:-1}).skip((page-1)*limit).limit(limit),BusSwap.countDocuments(query)]);
  ok(res,{items:items.map(display),total,page,limit});
}));
router.post('/',requirePermission('bus-swaps.create'),validate(createSchema),wrap(async(req,res)=>{
  const input=req.body,today=schoolDate();
  assert(input.date>=today&&input.date<=schoolDate(new Date(Date.now()+30*86400000)),400,'Choose today or a date within the next 30 days.');
  const record=await transaction(async session=>{
    const student=await Student.findOne({_id:input.student,status:'ACTIVE'}).session(session);
    assert(student,404,'Active student not found.');
    const drivers=await BusDriver.find({busNumber:{$in:[input.fromBus,input.toBus]}}).session(session);
    assert(drivers.length===2,400,'Select both buses from the configured bus staff list.');
    const [record]=await BusSwap.create([{...input,swapNumber:await number('BS',session),requestedBy:req.user._id,status:'PENDING',studentName:student.name,admissionNumber:student.admissionNumber,className:`${student.className}-${student.section}`,fromDriver:drivers.find(d=>d.busNumber===input.fromBus).driverName,toDriver:drivers.find(d=>d.busNumber===input.toBus).driverName}],{session});
    await audit(req,'BUS_SWAP_REQUESTED',record._id,{student:student._id,date:input.date,fromBus:input.fromBus,toBus:input.toBus,reason:input.reason,parentName:input.parentName,parentRequest:input.parentRequest},session);
    return record;
  });
  ok(res,display(await record.populate(populate)),'Bus swap requested. Parent and Principal SMS OTP approvals are required.',201);
}));
for(const action of ['reject','cancel'])router.post(`/:id/${action}`,requirePermission(...(action==='cancel'?['bus-swaps.create','bus-swaps.approve']:['bus-swaps.approve'])),validate(z.object({reason:text}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  const record=await transaction(async session=>{
    const record=await BusSwap.findOne({_id:req.params.id,...(can(req.user,'bus-swaps.approve')?{}:{requestedBy:req.user._id})}).session(session);
    assert(record,404,'Bus swap not found.');
    assert(record.date>=schoolDate(),409,'This bus swap has expired.');
    assert(action==='cancel'?['PENDING','APPROVED'].includes(record.status):record.status==='PENDING',409,'This bus swap cannot be changed in its current state.');
    const previouslyApproved=record.status==='APPROVED';
    record.status=action==='reject'?'REJECTED':'CANCELLED';record.decisionReason=req.body.reason;record.decidedBy=req.user._id;record.decidedAt=new Date();
    await BusSwapParentOTP.updateOne({busSwap:record._id},{$set:{consumedAt:new Date(),expiresAt:new Date(0)}},{session});
    await BusSwapOTP.updateOne({busSwap:record._id},{$set:{consumedAt:new Date(),expiresAt:new Date(0)}},{session});
    if(previouslyApproved){
      const recipients=await BusSwapEmail.find({busSwap:record._id,event:'APPROVED'}).session(session);
      if(recipients.length)await queueSwapEmails(record,recipients.map(r=>({audience:r.audience,recipient:r.recipient,recipientName:r.recipientName})),session,'CANCELLED');
    }
    await record.save({session});
    await audit(req,`BUS_SWAP_${record.status}`,record._id,{date:record.date,fromBus:record.fromBus,toBus:record.toBus,reason:req.body.reason},session);
    return record;
  });
  await deliverSwapEmails(record._id);
  ok(res,display(await record.populate(populate)),`Bus swap ${record.status.toLowerCase()}.`);
}));
export default router;
