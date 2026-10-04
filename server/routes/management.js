import { permissionsFor, assignedGateFor, isAdmin } from '../../shared/access.mjs';
import { Router } from 'express';
import { env, isEmailOTPConfigured, isSmsOTPConfigured } from '../config/env.js';
import bcrypt from 'bcrypt';
import multer from 'multer';
import sharp from 'sharp';
import yauzl from 'yauzl';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Student, BusDriver, GatePass, User, Session, SystemSetting, GateEvent, AuditLog, Notification, VisitorPass, StaffPass } from '../models/index.js';
import { authenticate, permit, admins, requirePermission, enforceGate, can } from '../middleware/auth.js';
import { validate, studentSchema, visitorSchema, staffSchema, busStaffSchema, userSchema, accessSchema, settingsSchema, objectId, text, pageNumber } from '../validators/index.js';
import { wrap, ok, assert, audit, transaction, escapeRegex, number, event } from '../utils/core.js';
import { assignQR, qrImage } from '../services/qr/qr.service.js';
const router=Router();router.use(authenticate);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
async function validateWorkbookArchive(buffer){await new Promise((resolve,reject)=>yauzl.fromBuffer(buffer,{lazyEntries:true},(err,zip)=>{if(err)return reject(err);let total=0,count=0;zip.on('error',reject);zip.on('entry',entry=>{total+=entry.uncompressedSize;count++;if(total>25*1024*1024||count>1000){zip.close();return reject(new Error('Workbook archive is too large.'));}zip.readEntry();});zip.on('end',resolve);zip.readEntry();}));}
export const uploadDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads');
router.post('/uploads',requirePermission('students.manage','visitors.create','settings.manage'),upload.single('file'),wrap(async(req,res)=>{
  assert(req.file,400,'Select an image.');const b=req.file.buffer;let ext;
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)ext='jpg';
  else if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';
  else if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')ext='webp';
  assert(ext,400,'Only JPEG, PNG and WebP images are allowed.');await fs.mkdir(uploadDir,{recursive:true});const filename=`${crypto.randomUUID()}.jpg`;let cleaned;try{cleaned=await sharp(b,{limitInputPixels:16000000}).rotate().resize(1000,1000,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}catch{assert(false,400,'Image cannot be decoded or exceeds the pixel limit.');}await fs.writeFile(path.join(uploadDir,filename),cleaned,{flag:'wx'});await audit(req,'PHOTO_UPLOADED');ok(res,{url:`/api/uploads/${filename}`},'Image uploaded.',201);
}));
router.get('/uploads/:file',wrap(async(req,res)=>{assert(/^[a-f0-9-]+\.(jpg|png|webp)$/.test(req.params.file),400,'Invalid file.');res.set('Cache-Control','private, max-age=300');res.sendFile(path.join(uploadDir,req.params.file));}));
router.get('/students',requirePermission('students.view'),wrap(async(req,res)=>{
  const query={};if(req.query.q){const re={$regex:escapeRegex(String(req.query.q).slice(0,100)),$options:'i'};query.$or=[{name:re},{admissionNumber:re},{primaryMobile:re},{email:re}];}
  if(req.query.className)query.className=String(req.query.className);if(req.query.section)query.section=String(req.query.section);if(req.query.status)query.status=String(req.query.status);
  const page=pageNumber.parse(req.query.page);const [items,total]=await Promise.all([Student.find(query).sort({name:1}).skip((page-1)*30).limit(30),Student.countDocuments(query)]);ok(res,{items,total,page});
}));
router.get('/students/:id',requirePermission('students.view'),wrap(async(req,res)=>{objectId.parse(req.params.id);const record=await Student.findById(req.params.id);assert(record,404,'Student not found.');ok(res,record);}));
router.get('/bus-drivers',requirePermission('passes.create'),wrap(async(req,res)=>ok(res,{items:await BusDriver.find().select('busNumber driverName email').sort({busNumber:1}).lean().then(items=>items.map(({busNumber,driverName,email})=>({busNumber,driverName,emailConfigured:Boolean(email)})))})));
router.get('/bus-staff',requirePermission('settings.manage'),wrap(async(req,res)=>ok(res,{items:await BusDriver.find().sort({busNumber:1}).lean().then(items=>items.map(({_id,staffId,busNumber,driverName,mobile,phone,email,photo})=>({_id,staffId:staffId||'',busNumber,driverName,mobile:mobile||phone||'',email,photo:photo||''})))})));
router.post('/bus-staff',requirePermission('settings.manage'),validate(busStaffSchema),wrap(async(req,res)=>{
  const {staffId,busNumber}=req.body;
  assert(!await BusDriver.exists({$or:[{staffId},{busNumber}]}),409,'A staff ID or bus number is already registered.');
  const staff=await transaction(async session=>{const [record]=await BusDriver.create([{...req.body,phone:req.body.mobile}],{session});await audit(req,'BUS_STAFF_CREATED',record._id,{staffId,busNumber},session);return record;});
  ok(res,{...staff.toObject(),mobile:staff.mobile||staff.phone},'Bus staff added.',201);
}));
router.put('/bus-staff/:id',requirePermission('settings.manage'),validate(busStaffSchema),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  const staff=await transaction(async session=>{
    const record=await BusDriver.findById(req.params.id).session(session);assert(record,404,'Bus staff not found.');
    assert(!await BusDriver.exists({_id:{$ne:record._id},$or:[{staffId:req.body.staffId},{busNumber:req.body.busNumber}]}).session(session),409,'A staff ID or bus number is already registered.');
    if(record.busNumber!==req.body.busNumber)assert(!await GatePass.exists({busNumber:record.busNumber,status:{$in:['PARENT_VERIFICATION_PENDING','PARENT_VERIFIED','ADMIN_APPROVAL_PENDING','APPROVED','READY_FOR_EXIT','EXITED']}}).session(session),409,'This bus has active gate passes. Complete them before changing its bus number.');
    record.set({...req.body,phone:req.body.mobile});await record.save({session});await audit(req,'BUS_STAFF_UPDATED',record._id,{staffId:record.staffId,busNumber:record.busNumber},session);return record;
  });
  ok(res,{...staff.toObject(),mobile:staff.mobile||staff.phone},'Bus staff updated.');
}));
router.delete('/bus-staff/:id',requirePermission('settings.manage'),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  await transaction(async session=>{
    const record=await BusDriver.findById(req.params.id).session(session);assert(record,404,'Bus staff not found.');
    assert(!await GatePass.exists({busNumber:record.busNumber,status:{$in:['PARENT_VERIFICATION_PENDING','PARENT_VERIFIED','ADMIN_APPROVAL_PENDING','APPROVED','READY_FOR_EXIT','EXITED']}}).session(session),409,'This bus has active gate passes. Complete them before removing its bus staff.');
    await record.deleteOne({session});await audit(req,'BUS_STAFF_REMOVED',record._id,{staffId:record.staffId,busNumber:record.busNumber},session);
  });
  ok(res,{},'Bus staff removed.');
}));
router.post('/students',requirePermission('students.manage'),validate(studentSchema),wrap(async(req,res)=>{
  const record=await transaction(async session=>{const [s]=await Student.create([req.body],{session});await audit(req,'STUDENT_CREATED',s._id,{},session);return s;});ok(res,record,'Student added.',201);
}));
router.put('/students/:id',requirePermission('students.manage'),validate(studentSchema),wrap(async(req,res)=>{
  objectId.parse(req.params.id);const record=await transaction(async session=>{const old=await Student.findById(req.params.id).session(session);assert(old,404,'Student not found.');const mobileChanged=old.primaryMobile!==req.body.primaryMobile,emailChanged=old.email!==req.body.email;if(mobileChanged||emailChanged)assert(!await GatePass.exists({student:old._id,status:{$in:['PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT','EXITED']}}).session(session),409,'Cancel or complete active gate passes before changing the registered contact.');old.set(req.body);await old.save({session});await audit(req,'STUDENT_UPDATED',old._id,{registeredMobileChanged:mobileChanged,registeredEmailChanged:emailChanged},session);return old;});ok(res,record);
}));
router.delete('/students/:id',requirePermission('students.manage'),wrap(async(req,res)=>{
  objectId.parse(req.params.id);
  await transaction(async session=>{
    const student=await Student.findById(req.params.id).session(session);
    assert(student,404,'Student not found.');
    assert(!await GatePass.exists({student:student._id,status:{$in:['DRAFT','PARENT_VERIFICATION_PENDING','PARENT_VERIFIED','ADMIN_APPROVAL_PENDING','APPROVED','READY_FOR_EXIT','EXITED']}}).session(session),409,'Cancel or complete this student’s active gate passes before deleting the student.');
    await student.deleteOne({session});
    await audit(req,'STUDENT_DELETED',student._id,{},session);
  });
  ok(res,{},'Student deleted permanently; gate-pass and audit history retained.');
}));
router.post('/students/import',requirePermission('students.manage'),upload.single('file'),wrap(async(req,res)=>{
  assert(req.file,400,'Select a CSV or Excel file.');let rows;
  if(req.file.originalname.toLowerCase().endsWith('.xlsx')){try{await validateWorkbookArchive(req.file.buffer);}catch{assert(false,400,'Invalid Excel archive or expanded size exceeds 25 MB.');}const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(req.file.buffer);}catch{assert(false,400,'Invalid Excel workbook.');}const sheet=workbook.worksheets[0];assert(sheet,400,'Workbook is empty.');assert(sheet.rowCount<=1001,400,'Import at most 1,000 rows.');const headers=sheet.getRow(1).values.slice(1).map(String);rows=[];sheet.eachRow((row,index)=>{if(index>1)rows.push(Object.fromEntries(headers.map((h,i)=>[h,String(row.getCell(i+1).text||'')])));});}
  else {assert(req.file.originalname.toLowerCase().endsWith('.csv'),400,'Select a CSV or Excel file.');try{rows=parse(req.file.buffer,{columns:true,skip_empty_lines:true,bom:true,trim:true,max_record_size:10000});}catch{assert(false,400,'Invalid CSV file. Check column counts and quoting.');}}
  assert(rows.length>0&&rows.length<=1000,400,'Import between 1 and 1,000 students.');const parsed=rows.map((row,i)=>{const value=studentSchema.safeParse(row);assert(value.success,400,`Invalid row ${i+2}: ${value.error?.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')}`);return value.data;});
  await transaction(async session=>{await Student.insertMany(parsed,{session});await audit(req,'STUDENTS_IMPORTED',undefined,{count:parsed.length},session);});ok(res,{count:parsed.length},'Students imported.',201);
}));
router.get('/users',permit(...admins),wrap(async(req,res)=>ok(res,{items:await User.find().select('name email employeeId role department active permissions assignedGate').sort({name:1}).limit(500)})));
router.post('/users',permit(...admins),validate(userSchema),wrap(async(req,res)=>{
  assert(req.user.role==='SUPER_ADMIN'||!['SUPER_ADMIN','ADMIN'].includes(req.body.role),403,'Only a super administrator can appoint administrators.');const {password,...data}=req.body;await validateGate(data);if(isAdmin(data))data.permissions=undefined;const passwordHash=await bcrypt.hash(password,12);
  const user=await transaction(async session=>{const [u]=await User.create([{...data,passwordHash}],{session});await audit(req,'USER_CREATED',u._id,{role:u.role,permissions:permissionsFor(u),assignedGate:assignedGateFor(u)},session);return u;});ok(res,{_id:user._id,name:user.name,role:user.role},'Staff account created.',201);
}));
async function validateGate(data) {
  const gate=assignedGateFor(data);
  if(gate){const settings=await SystemSetting.findOne({key:'school'});assert((settings?.gates||['Main Gate']).includes(gate),400,'Choose a configured gate.');data.assignedGate=gate;}
}
router.patch('/users/:id',permit(...admins),validate(accessSchema),wrap(async(req,res)=>{
  objectId.parse(req.params.id);assert(req.params.id!==String(req.user._id),400,'You cannot change your own access.');
  await transaction(async session=>{
    const user=await User.findById(req.params.id).session(session);assert(user,404,'User not found.');
    assert(user.role!=='SUPER_ADMIN'&&(req.user.role==='SUPER_ADMIN'||user.role!=='ADMIN'),403,'This administrator account is protected.');
    assert(req.body.role!=='SUPER_ADMIN'&&(req.user.role==='SUPER_ADMIN'||req.body.role!=='ADMIN'),403,'Only a super administrator can appoint administrators.');
    const before={role:user.role,permissions:permissionsFor(user),assignedGate:assignedGateFor(user),active:user.active};
    if(req.body.role && req.body.role!==user.role){user.permissions=undefined;user.assignedGate=undefined;}
    user.set(req.body);if(isAdmin(user))user.permissions=undefined;
    await validateGate(user);user.sessionVersion+=1;
    await user.save({session});await Session.deleteMany({user:user._id}).session(session);
    await audit(req,'USER_ACCESS_CHANGED',user._id,{before,after:{role:user.role,permissions:permissionsFor(user),assignedGate:assignedGateFor(user),active:user.active}},session);
  });ok(res,{},'Access updated. The staff member must sign in again.');
}));
router.patch('/users/:id/password',permit(...admins),validate(z.object({password:z.string().min(12).max(128)}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);assert(req.params.id!==String(req.user._id),400,'You cannot change your own password here.');
  const passwordHash=await bcrypt.hash(req.body.password,12);
  await transaction(async session=>{
    const user=await User.findById(req.params.id).session(session);assert(user,404,'User not found.');
    assert(user.role!=='SUPER_ADMIN'&&(req.user.role==='SUPER_ADMIN'||user.role!=='ADMIN'),403,'This administrator account is protected.');
    user.passwordHash=passwordHash;user.resetHash=undefined;user.resetExpires=undefined;user.sessionVersion+=1;
    await user.save({session});await Session.deleteMany({user:user._id}).session(session);
    await audit(req,'STAFF_PASSWORD_SET',user._id,{role:user.role},session);
  });
  ok(res,{},'Password updated. The staff member must sign in again.');
}));
router.get('/settings',wrap(async(req,res)=>{const settings=await SystemSetting.findOne({key:'school'}).lean();const otpChannels={sms:isSmsOTPConfigured(),email:isEmailOTPConfigured()};if(!can(req.user,'settings.manage'))return ok(res,{schoolName:settings?.schoolName,address:settings?.address,logo:settings?.logo,gates:assignedGateFor(req.user)?[assignedGateFor(req.user)]:(settings?.gates||['Main Gate']),otpDeliveryMode:env.otpDeliveryMode,otpChannels});ok(res,{...settings,whatsappProvider:process.env.WHATSAPP_PROVIDER||'none',whatsappConfigured:Boolean(process.env.WHATSAPP_TOKEN),otpDeliveryMode:env.otpDeliveryMode,otpChannels});}));
router.put('/settings',requirePermission('settings.manage'),validate(settingsSchema),wrap(async(req,res)=>{const settings=await transaction(async session=>{const assigned=await User.find({active:true}).select('role assignedGate').session(session);assert(assigned.every(user=>!assignedGateFor(user)||req.body.gates.includes(assignedGateFor(user))),409,'Reassign staff before removing their assigned gate.');const s=await SystemSetting.findOneAndUpdate({key:'school'},req.body,{upsert:true,new:true,session});await audit(req,'SETTINGS_UPDATED',s._id,{},session);return s;});ok(res,settings);}));
for(const [route,Model,sort] of [['gate-logs',GateEvent,'timestamp'],['audit-logs',AuditLog,'createdAt'],['notifications',Notification,'createdAt']])router.get(`/${route}`,requirePermission(route==='gate-logs'?'logs.view':route==='audit-logs'?'audit.view':'notifications.view'),wrap(async(req,res)=>{const page=pageNumber.parse(req.query.page);const query={};if(req.query.gatePassId){objectId.parse(req.query.gatePassId);query.gatePassId=req.query.gatePassId;}const items=await Model.find(query).sort({[sort]:-1}).skip((page-1)*50).limit(50).populate(route==='notifications'?[]:[{path:'performedBy',select:'name role'}]);ok(res,{items,total:await Model.countDocuments(query),page});}));
router.get('/visitors',requirePermission('visitors.view'),wrap(async(req,res)=>{const query={};if(req.query.q){const re={$regex:escapeRegex(String(req.query.q).slice(0,100)),$options:'i'};query.$or=[{name:re},{mobile:re},{passNumber:re}];}const page=pageNumber.parse(req.query.page);ok(res,{items:await VisitorPass.find(query).sort({createdAt:-1}).skip((page-1)*30).limit(30),total:await VisitorPass.countDocuments(query),page});}));
router.post('/visitors',requirePermission('visitors.create'),validate(visitorSchema),wrap(async(req,res)=>{
  assert(new Date(req.body.expectedExit)>new Date(),400,'Expected exit must be in the future.');const pass=await transaction(async session=>{const [p]=await VisitorPass.create([{...req.body,requestedBy:req.user._id,passNumber:await number('VP',session)}],{session});assignQR(p);await p.save({session});await event(req,p,'VISITOR_PASS_CREATED',session,'VisitorPass');return p;});ok(res,{pass,qr:await qrImage(pass)},'Visitor pass created.',201);
}));
router.get('/visitors/:id/qr',requirePermission('visitors.view'),wrap(async(req,res)=>{objectId.parse(req.params.id);const pass=await VisitorPass.findById(req.params.id);assert(pass,404,'Visitor pass not found.');ok(res,{pass,image:await qrImage(pass)});}));
for(const action of ['check-in','check-out'])router.post(`/visitors/:id/${action}`,requirePermission('visitors.move'),validate(z.object({gate:text}).strict()),enforceGate,wrap(async(req,res)=>{
  objectId.parse(req.params.id);const settings=await SystemSetting.findOne({key:'school'});assert((settings?.gates||['Main Gate']).includes(req.body.gate),400,'Invalid gate.');
  const pass=await transaction(async session=>{const q={_id:req.params.id,status:action==='check-in'?'REQUESTED':'CHECKED_IN'};if(action==='check-in')q.expectedExit={$gt:new Date()};const p=await VisitorPass.findOneAndUpdate(q,{$set:{status:action==='check-in'?'CHECKED_IN':'CHECKED_OUT',[action==='check-in'?'entryTime':'exitTime']:new Date()}},{new:true,session});assert(p,409,'Visitor cannot perform this operation.');await event(req,p,action==='check-in'?'VISITOR_ENTRY':'VISITOR_EXIT',session,'VisitorPass');return p;});ok(res,pass);
}));
router.get('/staff-passes',requirePermission('staff.view'),wrap(async(req,res)=>{const query=can(req.user,'staff.approve')||can(req.user,'staff.move')?{}:{staff:req.user._id};ok(res,{items:await StaffPass.find(query).populate('staff','name employeeId').populate('approvedBy','name').sort({createdAt:-1}).limit(100)});}));
router.post('/staff-passes',requirePermission('staff.request'),validate(staffSchema),wrap(async(req,res)=>{
  assert(admins.includes(req.user.role)||req.body.staff===String(req.user._id),403,'You can request movement only for yourself.');assert(new Date(req.body.expectedReturn)>new Date(),400,'Expected return must be in the future.');assert(await User.exists({_id:req.body.staff,active:true}),404,'Active staff member not found.');
  const pass=await transaction(async session=>{const [p]=await StaffPass.create([{...req.body,requestedBy:req.user._id,passNumber:await number('SP',session)}],{session});await event(req,p,'STAFF_PASS_REQUESTED',session,'StaffPass');return p;});ok(res,pass,'Staff movement requested.',201);
}));
for(const [action,from,to] of [['approve','REQUESTED','APPROVED'],['exit','APPROVED','EXITED'],['return','EXITED','RETURNED']])router.post(`/staff-passes/:id/${action}`,requirePermission(action==='approve'?'staff.approve':'staff.move'),validate(z.object({gate:text.optional()}).strict()),wrap(async(req,res)=>{
  objectId.parse(req.params.id);if(action!=='approve'){assert(!assignedGateFor(req.user)||req.body.gate===assignedGateFor(req.user),403,'Use your assigned gate.');const settings=await SystemSetting.findOne({key:'school'});assert((settings?.gates||['Main Gate']).includes(req.body.gate),400,'Select a valid gate.');}
  const pass=await transaction(async session=>{const update={status:to};if(action==='approve')update.approvedBy=req.user._id;else update[action==='exit'?'exitTime':'returnTime']=new Date();const q={_id:req.params.id,status:from};if(action==='exit')q.expectedReturn={$gt:new Date()};const p=await StaffPass.findOneAndUpdate(q,update,{new:true,session});assert(p,409,'Invalid staff movement transition.');assert(action!=='approve'||String(p.staff)!==String(req.user._id),403,'Another administrator must approve your movement.');await event(req,p,`STAFF_${to}`,session,'StaffPass');return p;});ok(res,pass);
}));
export default router;
