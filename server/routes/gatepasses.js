import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { BusDriver, GateEvent, GatePass, GatePassDailyLock, OTPVerification, Notification, Student, SystemSetting, VisitorPass } from '../models/index.js';
import { authenticate, requirePermission, enforceGate, can } from '../middleware/auth.js';
import { validate, passSchema, objectId, text, pageNumber } from '../validators/index.js';
import { wrap, ok, assert, transaction, number, event, audit, token, hash, escapeRegex } from '../utils/core.js';
import { assignQR, qrImage, qrUrl, parentPassUrl } from '../services/qr/qr.service.js';
import { sendOTP, verifyOTP, parentVerified } from '../services/otp/otp.service.js';
import { notifyPass } from '../services/whatsapp/whatsapp.service.js';
import { passPDF } from '../services/pdf/pdf.service.js';
import { sendBusDriverExitNotice } from '../services/bus-driver-notification.service.js';
import { env, isConsoleOTPEnabled } from '../config/env.js';
export const parentRouter = Router();
const parentLimit = rateLimit({ windowMs: 15 * 60000, limit: 20, message: { success: false, message: 'Too many verification attempts.', data: {} } });
parentRouter.use(parentLimit);
parentRouter.get('/pass/:token', wrap(async(req,res)=>{
  z.string().length(64).parse(req.params.token);const pass=await GatePass.findOne({'qr.shareTokenHash':hash(req.params.token),status:{$in:['READY_FOR_EXIT','EXITED','RETURNED','NO_RETURN_REQUIRED']},expiresAt:{$gt:new Date()}}).populate('student').populate('approval.approvedBy','name');
  assert(pass,404,'This digital pass is expired, cancelled, or unavailable.');const settings=await SystemSetting.findOne({key:'school'});
  ok(res,{schoolName:settings?.schoolName||'Shree Ram Public School',address:settings?.address,passNumber:pass.gatePassNumber,student:pass.student?.name||'Student record deleted',className:pass.student?`${pass.student.className}-${pass.student.section}`:'Unavailable',admissionNumber:pass.student?.admissionNumber||'Unavailable',reason:pass.reason,guardian:pass.guardian.name,status:pass.status,requestedExit:pass.timing.requestedExit,expectedReturn:pass.timing.expectedReturn,approvedBy:pass.approval.approvedBy?.name,parentVerified:pass.parentVerification.verified,qr:await qrImage(pass)});
}));
parentRouter.get('/:token', wrap(async (req,res) => {
  z.string().length(64).parse(req.params.token);
  const pass = await GatePass.findOne({ approvalLinkHash: hash(req.params.token), approvalLinkExpires: { $gt: new Date() }, expiresAt: { $gt: new Date() }, status: 'PARENT_VERIFICATION_PENDING' }).populate('student');
  assert(pass,404,'Approval link is invalid, expired, or already used.');
  ok(res,{ student: pass.student.name, className: `${pass.student.className}-${pass.student.section}`, reason: pass.reason, requestedExit: pass.timing.requestedExit, passNumber: pass.gatePassNumber, guardian: pass.guardian.name });
}));
parentRouter.post('/:token', validate(z.object({ decision: z.enum(['approve','reject']) }).strict()), wrap(async(req,res) => {
  z.string().length(64).parse(req.params.token);
  const pass = await transaction(async session => {
    const pass = await GatePass.findOne({ approvalLinkHash: hash(req.params.token), approvalLinkExpires: { $gt: new Date() }, expiresAt: { $gt: new Date() }, status: 'PARENT_VERIFICATION_PENDING' }).select('+approvalLinkHash').session(session);
    assert(pass,400,'Approval link is invalid, expired, or already used.');
    if(req.body.decision === 'approve') await parentVerified(req,pass,'SECURE_LINK',session);
    else { pass.status='REJECTED'; pass.approval={status:'REJECTED',rejectionReason:'Declined by parent'}; pass.approvalLinkHash=undefined; await pass.save({session}); await event(req,pass,'PASS_REJECTED',session); }
    return pass;
  }); await notifyPass(pass,req.body.decision === 'approve' ? 'PARENT_VERIFIED' : 'GATE_PASS_REJECTED'); ok(res,{},'Your decision has been recorded.');
}));
const router=Router(); router.use(authenticate);
const populate = [{path:'student'}, {path:'requestedBy',select:'name role'}, {path:'approval.approvedBy',select:'name'}];
const scoped = req => req.user.role === 'TEACHER' && !can(req.user,'passes.approve') ? { requestedBy:req.user._id } : {};
function schoolDate(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`;
}
async function findPass(req) {
  objectId.parse(req.params.id); const pass = await GatePass.findOne({_id:req.params.id,...scoped(req)}).populate(populate); assert(pass,404,'Gate pass not found.'); return pass;
}
async function logScannerDenial(req,session,{pass,eventType,message}){
  await GateEvent.create([{
    gatePassId:pass?._id,studentId:pass?.student?._id||pass?.student,entityId:pass?._id,
    entityType:'GatePass',eventType,performedBy:req.user._id,ip:req.ip,gate:req.body.gate,
    device:(req.get('user-agent')||'').slice(0,300),
  }],{session});
  await audit(req,eventType,pass?._id,{gate:req.body.gate,reason:message,source:'QR_SCANNER'},session);
}
function scannerDenial(res,status,message,eventType){
  return res.status(status).json({success:false,status:'EXIT_DENIED',reason:eventType,message,data:{}});
}
router.get('/',requirePermission('passes.view'),wrap(async(req,res)=>{
  const query={...scoped(req)};
  if(req.query.status) query.status=String(req.query.status);
  if(req.query.q) query.gatePassNumber={$regex:escapeRegex(String(req.query.q).slice(0,100)),$options:'i'};
  if(req.query.from||req.query.to){
    query['timing.requestedExit']={};
    for(const key of ['from','to'])if(req.query[key]){
      const value=req.query[key];
      assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),400,'Use YYYY-MM-DD dates.');
      const calendar=new Date(`${value}T00:00:00.000Z`);
      assert(!Number.isNaN(+calendar)&&calendar.toISOString().slice(0,10)===value,400,'Invalid calendar date.');
      const startOfDay=new Date(`${value}T00:00:00.000+05:30`);
      query['timing.requestedExit'][key==='from'?'$gte':'$lt']=key==='from'?startOfDay:new Date(startOfDay.getTime()+86400000);
    }
    assert(!query['timing.requestedExit'].$gte||!query['timing.requestedExit'].$lt||query['timing.requestedExit'].$gte<query['timing.requestedExit'].$lt,400,'From date must not be after to date.');
  }
  const page=pageNumber.parse(req.query.page), limit=z.coerce.number().int().min(5).max(100).default(30).parse(req.query.limit);
  const [items,total]=await Promise.all([GatePass.find(query).populate(populate).sort({createdAt:-1}).skip((page-1)*limit).limit(limit),GatePass.countDocuments(query)]);
  ok(res,{items,total,page,limit});
}));
router.post('/scan',requirePermission('gate.move'),validate(z.object({token:z.string().regex(/^[a-fA-F0-9]{64}$/),gate:text.max(60)}).strict()),enforceGate,wrap(async(req,res)=>{
  const settings=await SystemSetting.findOne({key:'school'});
  assert((settings?.gates||['Main Gate']).includes(req.body.gate),400,'Select a configured school gate.');
  const tokenHash=hash(req.body.token),now=new Date();
  const outcome=await transaction(async session=>{
    const pass=await GatePass.findOne({'qr.tokenHash':tokenHash}).session(session);
    let denial;
    if(!pass)denial={status:404,eventType:'EXIT_DENIED_INVALID',message:'Invalid Gate Pass.'};
    else if(['EXITED','RETURNED','NO_RETURN_REQUIRED'].includes(pass.status))denial={status:409,eventType:'EXIT_DENIED_ALREADY_USED',message:'Gate Pass has already been used.'};
    else if(pass.status==='CANCELLED')denial={status:409,eventType:'EXIT_DENIED_CANCELLED',message:'Gate Pass has been cancelled.'};
    else if(pass.status==='REJECTED')denial={status:409,eventType:'EXIT_DENIED_REJECTED',message:'Gate Pass was rejected.'};
    else if(pass.status==='EXPIRED'||pass.expiresAt<=now)denial={status:409,eventType:'EXIT_DENIED_EXPIRED',message:'Gate Pass has expired.'};
    else if(pass.status!=='READY_FOR_EXIT')denial={status:409,eventType:'EXIT_DENIED_NOT_APPROVED',message:'Gate Pass is not approved for exit.'};
    else if(pass.timing.requestedExit>now)denial={status:409,eventType:'EXIT_DENIED_TOO_EARLY',message:'The approved exit time has not arrived.'};
    else if(pass.parentVerification.method==='DEVELOPMENT_OTP'&&!isConsoleOTPEnabled())denial={status:409,eventType:'EXIT_DENIED_DEVELOPMENT_PASS',message:'A development-verified pass cannot authorize exit in production.'};
    else if(!await Student.exists({_id:pass.student,status:'ACTIVE'}).session(session))denial={status:409,eventType:'EXIT_DENIED_STUDENT_INACTIVE',message:'Student is no longer active. Contact administration.'};
    if(denial){
      await logScannerDenial(req,session,{pass,eventType:denial.eventType,message:denial.message});
      return {denial};
    }
    const updated=await GatePass.findOneAndUpdate(
      {_id:pass._id,status:'READY_FOR_EXIT',expiresAt:{$gt:now},'timing.requestedExit':{$lte:now}},
      {$set:{status:pass.timing.expectedReturn?'EXITED':'NO_RETURN_REQUIRED','timing.actualExit':now,'timing.exitGate':req.body.gate}},
      {new:true,session},
    );
    if(!updated){
      const latest=await GatePass.findById(pass._id).session(session);
      const repeated=latest&&['EXITED','RETURNED','NO_RETURN_REQUIRED'].includes(latest.status);
      const failed={status:409,eventType:repeated?'EXIT_DENIED_ALREADY_USED':'EXIT_DENIED_NOT_APPROVED',message:repeated?'Gate Pass has already been used.':'Gate Pass is no longer valid for exit.'};
      await logScannerDenial(req,session,{pass:latest||pass,eventType:failed.eventType,message:failed.message});
      return {denial:failed};
    }
    await event(req,updated,'EXIT',session);
    await audit(req,'EXIT_ALLOWED',updated._id,{gate:req.body.gate,source:'QR_SCANNER',device:(req.get('user-agent')||'').slice(0,300)},session);
    return {passId:updated._id};
  });
  if(outcome.denial)return scannerDenial(res,outcome.denial.status,outcome.denial.message,outcome.denial.eventType);
  const pass=await GatePass.findById(outcome.passId).populate('student').populate('approval.approvedBy','name');
  await notifyPass(pass,'STUDENT_EXITED');
  const busDriverNotice=pass.busNumber?await sendBusDriverExitNotice(pass._id,req.body.gate):undefined;
  ok(res,{status:'EXIT_ALLOWED',student:{name:pass.student?.name||'Student record deleted',admissionNo:pass.student?.admissionNumber||'Unavailable',className:pass.student?.className||'Unavailable',section:pass.student?.section||'Unavailable'},gatePass:{passId:pass._id,passNumber:pass.gatePassNumber,reason:pass.reason,exitTime:pass.timing.actualExit,gate:pass.timing.exitGate,status:pass.status,busDriverNoticeStatus:busDriverNotice?.status||pass.busDriverNoticeStatus}});
}));
router.post('/',requirePermission('passes.create'),validate(passSchema),wrap(async(req,res)=>{
  const input=req.body; const emergency=input.requestType==='EMERGENCY';
  const passDate=schoolDate(new Date(input.requestedExit));
  const settings=await SystemSetting.findOne({key:'school'});
  assert(!emergency || (can(req.user,'passes.emergency') && settings?.emergencyEnabled !== false && input.emergency),403,'Emergency passes require an administrator, authority and parent contact record.');
  assert(new Date(input.requestedExit).getTime() > Date.now()-5*60000,400,'Requested exit must be in the future.');
  assert(new Date(input.requestedExit).getTime() < Date.now()+30*86400000,400,'Requested exit must be within 30 days.');
  const pass=await transaction(async session=>{
    const student=await Student.findOne({_id:input.student,status:'ACTIVE'}).session(session); assert(student,404,'Active student not found.');
    const sameDayPass=await GatePass.exists({student:student._id,$or:[
      {passDate},
      {passDate:{$exists:false},$expr:{$eq:[{$dateToString:{format:'%Y-%m-%d',date:'$timing.requestedExit',timezone:'Asia/Kolkata'}},passDate]}},
    ]}).session(session);
    assert(!sameDayPass,409,'This student already has a gate pass for this date.');
    await GatePassDailyLock.create([{student:student._id,passDate}],{session});
    if(input.busNumber)assert(await BusDriver.exists({busNumber:input.busNumber}).session(session),400,'Select a bus number from the configured driver list.');
    const [pass]=await GatePass.create([{gatePassNumber:await number('GP',session),student:student._id,passDate,busNumber:input.busNumber||undefined,busDriverNoticeStatus:input.busNumber?'PENDING':undefined,requestedBy:req.user._id,requestType:input.requestType,reason:input.reason,guardian:input.guardian,
      timing:{requestedExit:input.requestedExit,expectedReturn:input.expectedReturn || undefined},isEmergency:emergency,
      emergency:emergency?{...input.emergency,overrideBy:req.user._id}:undefined,status:'DRAFT',parentVerification:{required:true,verified:false},approval:{status:'PENDING'},expiresAt:new Date(new Date(input.requestedExit).getTime()+(settings?.validityHours || 8)*3600000)}],{session});
    await event(req,pass,'PASS_CREATED',session);
    pass.status=emergency?'ADMIN_APPROVAL_PENDING':'PARENT_VERIFICATION_PENDING';
    if(emergency){pass.parentVerification.method='EMERGENCY_OVERRIDE'; await event(req,pass,'EMERGENCY_OVERRIDE',session);}
    await pass.save({session}); await event(req,pass,pass.status,session); return pass;
  }).catch(error=>{
    if(error.code===11000&&error.keyPattern?.student&&error.keyPattern?.passDate)
      assert(false,409,'This student already has a gate pass for this date.');
    throw error;
  }); await notifyPass(pass,'GATE_PASS_REQUESTED'); ok(res,pass,'Gate pass requested.',201);
}));
router.delete('/:id',requirePermission('passes.approve'),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  const pass=await transaction(async session=>{
    const record=await GatePass.findById(req.params.id).session(session);
    assert(record,404,'Gate pass not found.');
    if(record.student&&record.timing?.requestedExit){
      const passDate=record.passDate||schoolDate(record.timing.requestedExit);
      await GatePassDailyLock.updateOne({student:record.student,passDate},{$setOnInsert:{student:record.student,passDate}},{upsert:true,session});
    }
    await OTPVerification.deleteOne({gatePass:record._id},{session});
    await Notification.deleteMany({gatePass:record._id},{session});
    await record.deleteOne({session});
    await audit(req,'GATE_PASS_DELETED',record._id,{gatePassNumber:record.gatePassNumber,status:record.status},session);
    return record.gatePassNumber;
  });
  ok(res,{},`Gate pass ${pass} deleted permanently. Audit and gate-event history retained.`);
}));
router.get('/verify/:token',requirePermission('gate.verify'),wrap(async(req,res)=>{
  z.string().length(64).parse(req.params.token);
  let pass=await GatePass.findOne({'qr.tokenHash':hash(req.params.token)}).populate(populate);
  let entityType='GatePass';
  if(!pass){pass=await VisitorPass.findOne({'qr.tokenHash':hash(req.params.token)});entityType='VisitorPass';}
  assert(pass,404,'Invalid QR code.'); await event(req,pass,'QR_SCANNED',undefined,entityType);
  ok(res,{pass,entityType,valid:entityType==='GatePass'?pass.status==='READY_FOR_EXIT'&&pass.expiresAt>new Date()&&pass.timing.requestedExit<=new Date():pass.status==='REQUESTED'&&pass.expectedExit>new Date()});
}));
router.get('/manual/:number',requirePermission('gate.verify'),wrap(async(req,res)=>{
  let pass=await GatePass.findOne({gatePassNumber:req.params.number}).populate(populate);let entityType='GatePass';
  if(!pass){pass=await VisitorPass.findOne({passNumber:req.params.number});entityType='VisitorPass';}
  assert(pass,404,'Pass number not found.'); await event(req,pass,'MANUAL_VERIFICATION',undefined,entityType); ok(res,{pass,entityType});
}));
router.get('/:id',requirePermission('passes.view'),wrap(async(req,res)=>ok(res,await findPass(req))));
const otpLimit=rateLimit({windowMs:15*60000,limit:15,message:{success:false,message:'Too many OTP requests. Try later.',data:{}}});
router.post('/:id/send-otp',requirePermission('passes.create'),otpLimit,validate(z.object({channel:z.enum(['sms','email']).optional()}).strict()),wrap(async(req,res)=>ok(res,await sendOTP(req,await findPass(req),req.body.channel),'OTP delivery request processed.')));
router.post('/:id/verify-otp',requirePermission('passes.create'),otpLimit,validate(z.object({otp:z.string().regex(/^\d{6}$/)}).strict()),wrap(async(req,res)=>{await findPass(req);ok(res,await verifyOTP(req,req.params.id,req.body.otp),'Parent verified.');}));
router.post('/:id/approval-link',requirePermission('passes.create'),otpLimit,wrap(async(req,res)=>{
  const pass=await findPass(req); const secret=token();
  const updated=await GatePass.findOneAndUpdate({_id:pass._id,status:'PARENT_VERIFICATION_PENDING', $or:[{approvalLinkExpires:{$exists:false}},{approvalLinkExpires:{$lt:new Date(Date.now()+14*60000)}}]},{$set:{approvalLinkHash:hash(secret),approvalLinkExpires:new Date(Date.now()+15*60000)}},{new:true});
  assert(updated,409,'Wait 60 seconds or check the pass status.');
  await event(req,pass,'PARENT_APPROVAL_LINK_SENT');
  const delivery=await notifyPass(pass,'GATE_PASS_REQUESTED',`Admission No: ${pass.student.admissionNumber}\nReason: ${pass.reason}\nRequested Exit: ${pass.timing.requestedExit.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}\nSecure approval link: ${env.frontend}/parent/approve/${secret}`);
  ok(res,delivery,'Approval link delivery processed.');
}));
router.post('/:id/approve',requirePermission('passes.approve'),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  const pass=await transaction(async session=>{
    const pass=await GatePass.findOne({_id:req.params.id,status:'ADMIN_APPROVAL_PENDING'}).session(session);
    assert(pass,409,'Pass is not awaiting administrator approval.'); assert(pass.parentVerification.method!=='DEVELOPMENT_OTP'||isConsoleOTPEnabled(),409,'This pass was verified using a development OTP and is valid only in development OTP mode.'); assert(pass.parentVerification.verified || (pass.isEmergency&&pass.emergency.overrideBy),409,'Parent verification is required.');
    assert(pass.expiresAt>new Date(),409,'Pass validity has expired.');
    pass.approval={status:'APPROVED',approvedBy:req.user._id,approvedAt:new Date()}; pass.status='APPROVED'; await event(req,pass,'ADMIN_APPROVED',session);
    assignQR(pass); pass.status='READY_FOR_EXIT'; await pass.save({session}); await event(req,pass,'READY_FOR_EXIT',session);return pass;
  }); const delivery=await notifyPass(pass,'GATE_PASS_APPROVED',`Your digital gate pass: ${parentPassUrl(pass)}`);ok(res,{pass,delivery});
}));
for(const action of ['reject','cancel']) router.post(`/:id/${action}`,requirePermission(...(action==='reject'?['passes.approve']:['passes.create','passes.approve'])),validate(z.object({reason:text}).strict()),wrap(async(req,res)=>{
  await findPass(req); assert(action!=='reject'||can(req.user,'passes.approve'),403,'Only administrators can reject requests.');
  const pass=await transaction(async session=>{
    const pass=await GatePass.findOne({_id:req.params.id,...scoped(req),status:{$in:['DRAFT','PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT']}}).session(session);
    assert(pass,409,'This pass cannot be changed in its current state.');pass.status=action==='reject'?'REJECTED':'CANCELLED';pass.approval.rejectionReason=req.body.reason;pass.approvalLinkHash=undefined;await pass.save({session});await event(req,pass,action==='reject'?'PASS_REJECTED':'PASS_CANCELLED',session);return pass;
  });await notifyPass(pass,`GATE_PASS_${pass.status}`);ok(res,pass);
}));
for(const action of ['exit','return']) router.post(`/:id/${action}`,requirePermission('gate.move'),validate(z.object({gate:text.max(60)}).strict()),enforceGate,wrap(async(req,res)=>{
  objectId.parse(req.params.id);const settings=await SystemSetting.findOne({key:'school'});assert((settings?.gates||['Main Gate']).includes(req.body.gate),400,'Select a configured school gate.');
  const pass=await transaction(async session=>{
    const query={_id:req.params.id,status:action==='exit'?'READY_FOR_EXIT':'EXITED'};
    if(action==='exit'){query.expiresAt={$gt:new Date()};query['timing.requestedExit']={$lte:new Date()};}else query['timing.expectedReturn']={$ne:null};
    const pass=await GatePass.findOne(query).session(session);assert(pass,409,'Pass is not valid for this operation, is too early, expired, or was already used.');
    if(action==='exit'){assert(pass.parentVerification.method!=='DEVELOPMENT_OTP'||isConsoleOTPEnabled(),409,'Development-verified passes cannot authorize exit outside development OTP mode.');assert(await Student.exists({_id:pass.student,status:'ACTIVE'}).session(session),409,'Student is no longer active. Contact administration.');pass.timing.actualExit=new Date();pass.timing.exitGate=req.body.gate;pass.status=pass.timing.expectedReturn?'EXITED':'NO_RETURN_REQUIRED';}else{pass.timing.actualReturn=new Date();pass.status='RETURNED';}
    await pass.save({session});await event(req,pass,action==='exit'?'EXIT':'RETURN',session);return pass;
  });
  await notifyPass(pass,action==='exit'?'STUDENT_EXITED':'STUDENT_RETURNED');
  if(action==='exit'){
    const busDriverNotice=pass.busNumber?await sendBusDriverExitNotice(pass._id,req.body.gate):undefined;
    return ok(res,{...pass.toObject(),busDriverNoticeStatus:busDriverNotice?.status||pass.busDriverNoticeStatus,busDriverNotice});
  }
  ok(res,pass);
}));
router.post('/:id/retry-driver-notice',requirePermission('gate.move'),validate(z.object({gate:text.max(60)}).strict()),enforceGate,wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  const settings=await SystemSetting.findOne({key:'school'});
  assert((settings?.gates||['Main Gate']).includes(req.body.gate),400,'Select a configured school gate.');
  const pass=await GatePass.findById(req.params.id);
  assert(pass,404,'Gate pass not found.');
  assert(pass.busNumber&&['EXITED','NO_RETURN_REQUIRED'].includes(pass.status),409,'A driver notification is available only for a bus-assigned pass after a recorded exit.');
  const busDriverNotice=await sendBusDriverExitNotice(pass._id,req.body.gate,true);
  return ok(res,{...pass.toObject(),busDriverNoticeStatus:busDriverNotice.status,busDriverNotice});
}));
router.get('/:id/qr',requirePermission('passes.view'),wrap(async(req,res)=>{const pass=await findPass(req);assert(pass.qr?.generatedAt,409,'Pass has not been approved.');ok(res,{image:await qrImage(pass),url:qrUrl(pass)});}));
router.get('/:id/pdf',requirePermission('passes.view'),wrap(async(req,res)=>{const pass=await findPass(req);assert(pass.qr?.generatedAt,409,'Pass has not been approved.');await passPDF(pass,res,await SystemSetting.findOne({key:'school'}));}));
router.post('/:id/share',requirePermission('passes.create'),wrap(async(req,res)=>{const pass=await findPass(req);assert(pass.status==='READY_FOR_EXIT'&&pass.expiresAt>new Date(),409,'Only a valid approved pass can be shared.');ok(res,await notifyPass(pass,'GATE_PASS_APPROVED',`Your digital gate pass: ${parentPassUrl(pass)}`));}));
export default router;
