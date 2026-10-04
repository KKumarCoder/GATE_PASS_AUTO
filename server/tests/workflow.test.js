import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
process.env.NODE_ENV='test';
process.env.OTP_DELIVERY_MODE='whatsapp';
process.env.JWT_ACCESS_SECRET=crypto.randomBytes(40).toString('hex');
process.env.JWT_REFRESH_SECRET=crypto.randomBytes(40).toString('hex');
process.env.FRONTEND_URL='http://localhost:5173';
process.env.WHATSAPP_PROVIDER='none';
const {default:app}=await import('../app.js');
// Isolate each test's IP budget while retaining real middleware limits within a test.
app.set('trust proxy', 1);
let testClient = 0;
beforeEach(() => { testClient += 1; });
const models=await import('../models/index.js');
const {User,Session,Student,GatePass,OTPVerification,GateEvent,AuditLog,Notification,SystemSetting}=models;
const {hash}=await import('../utils/core.js');
const {qrToken,parentPassToken}=await import('../services/qr/qr.service.js');
let repl,admin,teacher,guard,other,student;
const auth=u=>`Bearer ${jwt.sign({version:u.sessionVersion,sid:u.$locals.sid},process.env.JWT_ACCESS_SECRET,{subject:String(u._id),expiresIn:'15m',issuer:'srps',audience:'srps-staff'})}`;
const api=(method,path,user=admin)=>request(app)[method](`/api${path}`).set('Authorization',auth(user)).set('X-Forwarded-For',`192.0.2.${testClient}`);
const input=()=>({student:String(student._id),requestType:'SHORT_LEAVE',reason:'Medical appointment',requestedExit:new Date(Date.now()+60000).toISOString(),expectedReturn:new Date(Date.now()+3600000).toISOString(),guardian:{type:'Father',name:'Parent Kumar',mobile:'+919876543210'}});
const passDateSequences=new Map();
async function create(user=teacher,body=input()){const studentId=String(body.student),sequence=(passDateSequences.get(studentId)||0)+1;passDateSequences.set(studentId,sequence);const requestedExitTime=Date.now()+sequence*86400000+60000;const requestedExit=new Date(requestedExitTime).toISOString();const expectedReturn=body.expectedReturn?new Date(requestedExitTime+3600000).toISOString():body.expectedReturn;const r=await api('post','/gatepasses',user).send({...body,requestedExit,expectedReturn});assert.equal(r.status,201,JSON.stringify(r.body));return r.body.data;}
async function otpReady(pass){const passStudent=await Student.findById(pass.student);await OTPVerification.findOneAndUpdate({gatePass:pass._id},{studentId:pass.student,mobileNumber:passStudent.primaryMobile,hashedOTP:await bcrypt.hash('123456',4),purpose:'GATE_PASS_APPROVAL',expiresAt:new Date(Date.now()+300000),attemptCount:0,verified:false,sentAt:new Date()},{upsert:true});return api('post',`/gatepasses/${pass._id}/verify-otp`,teacher).send({otp:'123456'});}
async function approved(user=teacher,body=input()){const p=await create(user,body);const verify=await otpReady(p);assert.equal(verify.status,200,JSON.stringify(verify.body));const r=await api('post',`/gatepasses/${p._id}/approve`).send({});assert.equal(r.status,200,JSON.stringify(r.body));await GatePass.updateOne({_id:p._id},{'timing.requestedExit':new Date(Date.now()-60000)});return GatePass.findById(p._id);}
let scannerStudentCount=0;
async function approvedForScanner(body={}){const n=++scannerStudentCount;const localStudent=await Student.create({name:`Scanner Student ${n}`,admissionNumber:`SCANNER-${n}`,className:'IX',section:'A',primaryMobile:`+9198765401${String(n).padStart(2,'0')}`});return approved(teacher,{...input(),...body,student:String(localStudent._id)});}
before(async()=>{
 repl=await MongoMemoryReplSet.create({replSet:{count:1},binary:{version:'7.0.14'},instanceOpts:[{storageEngine:'wiredTiger'}]});await mongoose.connect(repl.getUri());
 await Promise.all(Object.values(mongoose.models).map(m=>m.init()));
 const passwordHash=await bcrypt.hash('CorrectHorse123!',4);
 [admin,teacher,guard,other]=await User.create(['SUPER_ADMIN','TEACHER','SECURITY_GUARD','TEACHER'].map((role,i)=>({name:`Test ${role} ${i}`,email:`staff${i}@school.test`,employeeId:`EMP${i}`,passwordHash,role,...(role==='SECURITY_GUARD'?{permissions:['gate.verify','gate.move','visitors.view','visitors.move','staff.view','staff.move','logs.view']}:{})})));
 for(const u of [admin,teacher,guard,other]){const s=await Session.create({user:u._id,tokenHash:crypto.randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)});u.$locals.sid=String(s._id);}
 student=await Student.create({name:'Student Kumar',admissionNumber:'SRPS001',className:'IX',section:'A',villageName:'Rampur',primaryMobile:'+919876543210',email:'student@school.test',fatherName:'Parent Kumar'});
 await SystemSetting.create({key:'school',schoolName:'SRPS',address:'School address',gates:['Main Gate'],validityHours:8,otpExpiryMinutes:5,emergencyEnabled:true,requireParent:true});
}, {timeout:180000});
after(async()=>{await mongoose.disconnect();if(repl)await repl.stop();});
test('authentication, refresh rotation, origin protection and logout',async()=>{
 const agent=request.agent(app);const login=await agent.post('/api/auth/login').send({identifier:'EMP0',password:'CorrectHorse123!'});assert.equal(login.status,200);assert.ok(login.body.data.accessToken);assert.equal(login.body.data.user.passwordHash,undefined);
 const cookie=login.headers['set-cookie'][0].split(';')[0];assert.match(login.headers['set-cookie'][0],/HttpOnly/);
 const refresh=await agent.post('/api/auth/refresh').send({});assert.equal(refresh.status,200);
 const replay=await request(app).post('/api/auth/refresh').set('Cookie',cookie).send({});assert.equal(replay.status,401);
 const csrf=await agent.post('/api/auth/logout').set('Origin','https://evil.test');assert.equal(csrf.status,403);
 const currentAccess=refresh.body.data.accessToken;assert.equal((await agent.post('/api/auth/logout')).status,200);assert.equal((await request(app).get('/api/auth/me').set('Authorization',`Bearer ${currentAccess}`)).status,401);assert.equal((await agent.post('/api/auth/refresh')).status,401);
 assert.equal((await request(app).get('/api/students')).status,401);
});
test('student RBAC, unique admissions and validation',async()=>{
 assert.equal((await api('post','/students',teacher).send({})).status,403);
 assert.equal((await api('get','/students',guard)).status,403);
 const base={name:'Another Student',admissionNumber:'SRPS001',className:'VIII',section:'B',villageName:'Rampur',primaryMobile:'+919123456789',email:'another@school.test'};
 assert.equal((await api('post','/students').send(base)).status,409);
 assert.equal((await api('post','/students').send({...base,admissionNumber:'2',primaryMobile:'bad'})).status,400);
 assert.equal((await api('post','/students').send({...base,admissionNumber:'3',email:'not-an-email'})).status,400);
 assert.equal((await api('post','/students').send({...base,admissionNumber:'4',email:''})).status,400);
 const added=await api('post','/students').send({...base,admissionNumber:'5',email:'New.Student@School.test'});
 assert.equal(added.status,201,JSON.stringify(added.body));assert.equal(added.body.data.email,'new.student@school.test');
 assert.equal((await api('get','/students/not-an-id')).status,400);
 assert.equal((await api('get','/students?q=%5B')).status,200);
});
test('a student can only have one gate pass for each requested exit date',async()=>{
 const localStudent=await Student.create({name:'One Pass Student',admissionNumber:'ONE-PASS-001',className:'VIII',section:'A',primaryMobile:'+919876540099'});
 const requestedExit=new Date(Date.now()+2*86400000+3600000).toISOString();
 const body={...input(),student:String(localStudent._id),requestedExit,expectedReturn:new Date(new Date(requestedExit).getTime()+3600000).toISOString()};
 const first=await api('post','/gatepasses').send(body);assert.equal(first.status,201,JSON.stringify(first.body));
 await GatePass.updateOne({_id:first.body.data._id},{$set:{status:'EXITED','timing.actualExit':new Date()}});
 const duplicateExit=new Date(new Date(requestedExit).getTime()+3600000);
 const duplicate=await api('post','/gatepasses').send({...body,requestedExit:duplicateExit.toISOString(),expectedReturn:new Date(duplicateExit.getTime()+3600000).toISOString()});
 assert.equal(duplicate.status,409);assert.match(duplicate.body.message,/already has a gate pass for this date/i);
 const nextDayExit=new Date(new Date(requestedExit).getTime()+86400000);
 const nextDay=await api('post','/gatepasses').send({...body,requestedExit:nextDayExit.toISOString(),expectedReturn:new Date(nextDayExit.getTime()+3600000).toISOString()});
 assert.equal(nextDay.status,201,JSON.stringify(nextDay.body));
 const concurrentExit=new Date(new Date(requestedExit).getTime()+2*86400000);
 const concurrentBody={...body,requestedExit:concurrentExit.toISOString(),expectedReturn:new Date(concurrentExit.getTime()+3600000).toISOString()};
 const concurrent=await Promise.all([api('post','/gatepasses').send(concurrentBody),api('post','/gatepasses').send(concurrentBody)]);
 assert.deepEqual(concurrent.map(response=>response.status).sort(),[201,409]);
});
test('permanent student deletion requires inactive passes and retains pass and audit history',async()=>{
 const localStudent=await Student.create({name:'Delete Student',admissionNumber:'DELETE-001',className:'VIII',section:'A',primaryMobile:'+919876540098'});
 const pass=await create(admin,{...input(),student:String(localStudent._id)});
 assert.equal((await api('delete',`/students/${localStudent._id}`)).status,409);
 assert.equal((await api('post',`/gatepasses/${pass._id}/cancel`).send({reason:'Student record removal'})).status,200);
 const updated=await api('put',`/students/${localStudent._id}`).send({name:localStudent.name,admissionNumber:localStudent.admissionNumber,className:localStudent.className,section:localStudent.section,villageName:localStudent.villageName,primaryMobile:'+919876540097',email:'updated.delete@school.test'});
 assert.equal(updated.status,200,JSON.stringify(updated.body));
 const deleted=await api('delete',`/students/${localStudent._id}`);
 assert.equal(deleted.status,200,JSON.stringify(deleted.body));
 assert.equal(await Student.findById(localStudent._id),null);
 assert.ok(await GatePass.findById(pass._id));
 assert.ok(await AuditLog.exists({entityId:localStudent._id,action:'STUDENT_DELETED'}));
 const historicalPass=await api('get',`/gatepasses/${pass._id}`);
 assert.equal(historicalPass.status,200,JSON.stringify(historicalPass.body));
 assert.equal(historicalPass.body.data.student,null);
});
test('completed no-return passes do not block permanent student deletion',async()=>{
 const localStudent=await Student.create({name:'No Return Delete Student',admissionNumber:'DELETE-NORETURN-001',className:'VIII',section:'A',primaryMobile:'+919876540096'});
 const pass=await create(admin,{...input(),student:String(localStudent._id),expectedReturn:null});
 await GatePass.updateOne({_id:pass._id},{$set:{status:'NO_RETURN_REQUIRED','timing.actualExit':new Date()}});
 const deleted=await api('delete',`/students/${localStudent._id}`);
 assert.equal(deleted.status,200,JSON.stringify(deleted.body));
 assert.ok(await GatePass.findById(pass._id));
});
test('gate pass date filters and five-row pagination validate and return requested records',async()=>{
 const pass=await create();
 const date=new Date(pass.timing.requestedExit).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 const response=await api('get',`/gatepasses?from=${date}&to=${date}&page=1&limit=5`);
 assert.equal(response.status,200,JSON.stringify(response.body));
 assert.equal(response.body.data.limit,5);
 assert.ok(response.body.data.items.length<=5);
 assert.ok(response.body.data.items.every(item=>new Date(item.timing.requestedExit).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})===date));
 assert.equal((await api('get','/gatepasses?from=2026-02-30')).status,400);
 assert.equal((await api('get','/gatepasses?limit=4')).status,400);
});
test('admin can reject or cancel a pending pass with an audited reason',async()=>{
 const rejected=await create();
 const reject=await api('post',`/gatepasses/${rejected._id}/reject`).send({reason:'Request details need correction'});
 assert.equal(reject.status,200,JSON.stringify(reject.body));
 assert.equal((await GatePass.findById(rejected._id)).status,'REJECTED');
 assert.ok(await GateEvent.exists({gatePassId:rejected._id,eventType:'PASS_REJECTED'}));
 const cancelled=await create();
 const cancel=await api('post',`/gatepasses/${cancelled._id}/cancel`).send({reason:'Request withdrawn'});
 assert.equal(cancel.status,200,JSON.stringify(cancel.body));
 assert.equal((await GatePass.findById(cancelled._id)).status,'CANCELLED');
 assert.ok(await GateEvent.exists({gatePassId:cancelled._id,eventType:'PASS_CANCELLED'}));
});
test('admin permanently deletes pass and linked OTP/notifications while retaining events and daily limit',async()=>{
 const localStudent=await Student.create({name:'Delete Pass Student',admissionNumber:'DELETE-PASS-001',className:'VIII',section:'A',primaryMobile:'+919876540095'});
 const pass=await create(admin,{...input(),student:String(localStudent._id)});
 await OTPVerification.create({gatePass:pass._id,studentId:localStudent._id,mobileNumber:localStudent.primaryMobile,hashedOTP:await bcrypt.hash('123456',4),purpose:'GATE_PASS_APPROVAL',expiresAt:new Date(Date.now()+60000)});
 await Notification.create({gatePass:pass._id,recipient:localStudent.primaryMobile,event:'GATE_PASS_REQUESTED',provider:'test',status:'PENDING'});
 await GateEvent.create({gatePassId:pass._id,studentId:localStudent._id,entityId:pass._id,entityType:'GatePass',eventType:'PASS_CREATED'});
 assert.equal((await api('delete',`/gatepasses/${pass._id}`,teacher)).status,403);
 const deleted=await api('delete',`/gatepasses/${pass._id}`);
 assert.equal(deleted.status,200,JSON.stringify(deleted.body));
 assert.equal(await GatePass.findById(pass._id),null);
 assert.equal(await OTPVerification.countDocuments({gatePass:pass._id}),0);
 assert.equal(await Notification.countDocuments({gatePass:pass._id}),0);
 assert.ok(await GateEvent.exists({gatePassId:pass._id,eventType:'PASS_CREATED'}));
 assert.ok(await AuditLog.exists({entityId:pass._id,action:'GATE_PASS_DELETED'}));
 assert.equal((await api('post','/gatepasses',admin).send({...input(),student:String(localStudent._id),requestedExit:pass.timing.requestedExit,expectedReturn:pass.timing.expectedReturn})).status,409);
});
test('teacher ownership, mandatory parent verification, and emergency restrictions',async()=>{
 const p=await create();assert.equal(p.status,'PARENT_VERIFICATION_PENDING');
 assert.equal((await api('get',`/gatepasses/${p._id}`,other)).status,404);
 assert.equal((await api('post',`/gatepasses/${p._id}/approve`).send({})).status,409);
 assert.equal((await api('post','/gatepasses',teacher).send({...input(),requestType:'EMERGENCY',emergency:{authority:'Principal',contactAttempt:'Called parent'}})).status,403);
 assert.equal((await api('post','/gatepasses',admin).send({...input(),requestType:'EMERGENCY'})).status,403);
 const emergency=await create(admin,{...input(),requestType:'EMERGENCY',emergency:{authority:'Principal',contactAttempt:'Parent called, no answer'}});
 assert.equal(emergency.status,'ADMIN_APPROVAL_PENDING');assert.equal(emergency.parentVerification.verified,false);assert.ok(await AuditLog.exists({entityId:emergency._id,action:'EMERGENCY_OVERRIDE'}));
});
test('OTP hashes, resend cooldown, registered-mobile binding and maximum attempts',async()=>{
 const p=await create();assert.equal((await api('post',`/gatepasses/${p._id}/send-otp`,teacher).send({mobile:'+919999999999'})).status,400);const sent=await api('post',`/gatepasses/${p._id}/send-otp`,teacher).send({});assert.equal(sent.status,200,JSON.stringify(sent.body));assert.equal(sent.body.data.status,'UNCONFIGURED');
 const stored=await OTPVerification.findOne({gatePass:p._id}).select('+hashedOTP');assert.equal(stored.mobileNumber,student.primaryMobile);assert.match(stored.hashedOTP,/^\$2b\$/);assert.equal(JSON.stringify(sent.body).includes('hashedOTP'),false);
 assert.equal((await api('post',`/gatepasses/${p._id}/send-otp`,teacher).send({})).status,429);
 for(let i=0;i<5;i++)assert.equal((await api('post',`/gatepasses/${p._id}/verify-otp`,teacher).send({otp:'000000'})).status,400);
 assert.equal((await OTPVerification.findById(stored._id)).attemptCount,5);
 assert.equal((await api('post',`/gatepasses/${p._id}/verify-otp`,teacher).send({otp:'000000'})).status,400);
 assert.equal((await OTPVerification.findById(stored._id)).attemptCount,5);
});
test('complete student workflow, QR privacy, duplicate exit race, return replay and audit',async()=>{
 const pass=await approved();const code=qrToken(pass);
 assert.equal(code.length,64);assert.equal(code.includes(student.name),false);
 assert.equal((await api('get',`/gatepasses/verify/${code}`,teacher)).status,403);
 const scan=await api('get',`/gatepasses/verify/${code}`,guard);assert.equal(scan.status,200);assert.equal(scan.body.data.valid,true);
 assert.equal((await GatePass.findById(pass._id)).status,'READY_FOR_EXIT');
 const printableQR=await api('get',`/gatepasses/${pass._id}/qr`,teacher);
 assert.equal(printableQR.status,200);
 assert.match(printableQR.body.data.image,/^data:image\/png;base64,/);
 assert.equal(hash(printableQR.body.data.url.split('/').pop()),pass.qr.tokenHash);
 const [a,b]=await Promise.all([api('post',`/gatepasses/${pass._id}/exit`,guard).send({gate:'Main Gate'}),api('post',`/gatepasses/${pass._id}/exit`,guard).send({gate:'Main Gate'})]);assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal(await GateEvent.countDocuments({gatePassId:pass._id,eventType:'EXIT'}),1);
 const returned=await api('post',`/gatepasses/${pass._id}/return`,guard).send({gate:'Main Gate'});assert.equal(returned.status,200);assert.equal(returned.body.data.status,'RETURNED');
 assert.equal((await api('post',`/gatepasses/${pass._id}/return`,guard).send({gate:'Main Gate'})).status,409);
 const events=await GateEvent.find({gatePassId:pass._id});for(const e of ['PASS_CREATED','OTP_VERIFIED','ADMIN_APPROVAL_PENDING','ADMIN_APPROVED','READY_FOR_EXIT','QR_SCANNED','EXIT','RETURN'])assert.ok(events.some(x=>x.eventType===e),e);
 const pdf=await api('get',`/gatepasses/${pass._id}/pdf`);assert.equal(pdf.status,200);assert.match(pdf.headers['content-type'],/pdf/);
});
test('QR scanner records one authenticated exit and denies reused or invalid tokens',async()=>{
 const pass=await approvedForScanner(),token=qrToken(pass);
 assert.equal((await api('post','/gatepasses/scan',teacher).send({token,gate:'Main Gate'})).status,403);
 const scan=await api('post','/gatepasses/scan',guard).send({token,gate:'Main Gate'});
 assert.equal(scan.status,200,JSON.stringify(scan.body));
 assert.equal(scan.body.data.status,'EXIT_ALLOWED');
 assert.match(scan.body.data.student.name,/^Scanner Student/);
 assert.equal(scan.body.data.gatePass.gate,'Main Gate');
 const saved=await GatePass.findById(pass._id);
 assert.equal(saved.status,'EXITED');
 assert.ok(saved.timing.actualExit);
 assert.equal(saved.timing.exitGate,'Main Gate');
 assert.ok(await GateEvent.exists({gatePassId:pass._id,eventType:'EXIT',gate:'Main Gate',performedBy:guard._id}));
 assert.ok(await AuditLog.exists({entityId:pass._id,action:'EXIT_ALLOWED',performedBy:guard._id}));
 const repeated=await api('post','/gatepasses/scan',guard).send({token,gate:'Main Gate'});
 assert.equal(repeated.status,409);
 assert.equal(repeated.body.status,'EXIT_DENIED');
 assert.match(repeated.body.message,/already been used/i);
 const invalid=await api('post','/gatepasses/scan',guard).send({token:'f'.repeat(64),gate:'Main Gate'});
 assert.equal(invalid.status,404);
 assert.equal(invalid.body.status,'EXIT_DENIED');
});
test('simultaneous QR scanner requests only record one exit',async()=>{
 const pass=await approvedForScanner(),token=qrToken(pass);
 const scans=await Promise.all([
  api('post','/gatepasses/scan',guard).send({token,gate:'Main Gate'}),
  api('post','/gatepasses/scan',guard).send({token,gate:'Main Gate'}),
 ]);
 assert.deepEqual(scans.map(response=>response.status).sort(),[200,409]);
 assert.equal(await GateEvent.countDocuments({gatePassId:pass._id,eventType:'EXIT'}),1);
});
test('QR scanner records no-return exits as final one-use passes',async()=>{
 const pass=await approvedForScanner({expectedReturn:null});
 const response=await api('post','/gatepasses/scan',guard).send({token:qrToken(pass),gate:'Main Gate'});
 assert.equal(response.status,200,JSON.stringify(response.body));
 assert.equal(response.body.data.gatePass.status,'NO_RETURN_REQUIRED');
 assert.equal((await api('post','/gatepasses/scan',guard).send({token:qrToken(pass),gate:'Main Gate'})).status,409);
});
test('QR scanner denies cancelled, expired, too-early and malformed passes without recording exits',async()=>{
 const cancelled=await approvedForScanner();await api('post',`/gatepasses/${cancelled._id}/cancel`).send({reason:'Test cancellation'});
 const expired=await approvedForScanner();await GatePass.updateOne({_id:expired._id},{expiresAt:new Date(Date.now()-1000)});
 const future=await approvedForScanner();await GatePass.updateOne({_id:future._id},{'timing.requestedExit':new Date(Date.now()+60000)});
 for(const [pass,expected] of [[cancelled,'EXIT_DENIED_CANCELLED'],[expired,'EXIT_DENIED_EXPIRED'],[future,'EXIT_DENIED_TOO_EARLY']]){
  const response=await api('post','/gatepasses/scan',guard).send({token:qrToken(pass),gate:'Main Gate'});
  assert.equal(response.status,409,JSON.stringify(response.body));
  assert.equal(response.body.status,'EXIT_DENIED');
  assert.ok(await GateEvent.exists({gatePassId:pass._id,eventType:expected}));
 }
 assert.equal((await api('post','/gatepasses/scan',guard).send({token:'bad',gate:'Main Gate'})).status,400);
 for(const pass of [cancelled,expired,future])assert.equal((await GatePass.findById(pass._id)).timing.actualExit,undefined);
});
test('expired and cancelled passes cannot exit; gates are validated',async()=>{
 const expired=await approved();await GatePass.updateOne({_id:expired._id},{expiresAt:new Date(Date.now()-1)});assert.equal((await api('post',`/gatepasses/${expired._id}/exit`,guard).send({gate:'Main Gate'})).status,409);
 const p=await approved();assert.equal((await api('post',`/gatepasses/${p._id}/exit`,admin).send({gate:'Unregistered Gate'})).status,400);
 assert.equal((await api('post',`/gatepasses/${p._id}/cancel`).send({reason:'Parent changed plans'})).status,200);
 assert.equal((await api('post',`/gatepasses/${p._id}/exit`,guard).send({gate:'Main Gate'})).status,409);
});
test('secure parent approval is single use, expiring and does not expose full student data',async()=>{
 const p=await create();const secret=crypto.randomBytes(32).toString('hex');await GatePass.updateOne({_id:p._id},{approvalLinkHash:hash(secret),approvalLinkExpires:new Date(Date.now()+60000)});
 const view=await request(app).get(`/api/parent/${secret}`);assert.equal(view.status,200);assert.equal(view.body.data.primaryMobile,undefined);
 const r=await request(app).post(`/api/parent/${secret}`).send({decision:'approve'});assert.equal(r.status,200);
 assert.equal((await request(app).post(`/api/parent/${secret}`).send({decision:'approve'})).status,400);
 const p2=await create();await GatePass.updateOne({_id:p2._id},{approvalLinkHash:hash(secret),approvalLinkExpires:new Date(Date.now()-1000)});
 assert.equal((await request(app).get(`/api/parent/${secret}`)).status,404);
});
test('visitor and staff transitions reject replay and unauthorized approval',async()=>{
 const visitor=await api('post','/visitors').send({name:'Visitor One',mobile:'+919876543219',purpose:'Meeting',personToMeet:'Principal',expectedExit:new Date(Date.now()+60000).toISOString(),idLastFour:'1234'});assert.equal(visitor.status,201,JSON.stringify(visitor.body));const id=visitor.body.data.pass._id;
 assert.equal((await api('post',`/visitors/${id}/check-in`,guard).send({gate:'Main Gate'})).status,200);
 assert.equal((await api('post',`/visitors/${id}/check-in`,guard).send({gate:'Main Gate'})).status,409);
 assert.equal((await api('post',`/visitors/${id}/check-out`,guard).send({gate:'Main Gate'})).status,200);
 const staff=await api('post','/staff-passes',teacher).send({staff:String(teacher._id),department:'Academics',reason:'School work',expectedReturn:new Date(Date.now()+60000).toISOString()});assert.equal(staff.status,201);const sid=staff.body.data._id;
 assert.equal((await api('post',`/staff-passes/${sid}/approve`,teacher).send({})).status,403);
 for(const action of ['approve','exit','return'])assert.equal((await api('post',`/staff-passes/${sid}/${action}`,action==='approve'?admin:guard).send({gate:'Main Gate'})).status,200);
});
test('reports, dashboard, CSV/Excel import and exports',async()=>{
 const csv='admissionNumber,name,className,section,villageName,primaryMobile,email\nCSV001,Imported Student,VII,A,Rampur,+919876543222,csv@school.test';
 const imported=await api('post','/students/import').attach('file',Buffer.from(csv),'students.csv');assert.equal(imported.status,201,JSON.stringify(imported.body));
 const excel=await api('get','/reports?format=xlsx');assert.equal(excel.status,200);assert.match(excel.headers['content-type'],/spreadsheet/);
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Students');sheet.addRow(['admissionNumber','name','className','section','villageName','primaryMobile','email']);sheet.addRow(['XLS001','Excel Student','VI','B','Rampur','+919876543223','excel@school.test']);const buffer=await book.xlsx.writeBuffer();const upload=await api('post','/students/import').attach('file',Buffer.from(buffer),'students.xlsx');assert.equal(upload.status,201,JSON.stringify(upload.body));
 assert.equal((await api('get','/reports?format=csv')).status,200);assert.equal((await api('get','/reports?format=pdf')).status,200);
 assert.equal((await api('get','/reports/dashboard')).status,200);assert.equal((await api('get','/reports/outside-campus',teacher)).status,403);
 assert.equal((await api('get','/reports?from=bad')).status,400);
 const settings=await api('get','/settings');assert.equal(settings.status,200);assert.equal(JSON.stringify(settings.body).includes('WHATSAPP_TOKEN'),false);
 const notifications=await Notification.find().lean();assert.ok(notifications.every(n=>!n.message&&!n.otp));
});

test('parent digital pass tokens have separate scope and cancellation revokes sharing',async()=>{
 const p=await approved();const share=parentPassToken(p);assert.notEqual(share,qrToken(p));
 const response=await request(app).get(`/api/parent/pass/${share}`);assert.equal(response.status,200);assert.equal(response.body.data.student,student.name);assert.ok(response.body.data.qr.startsWith('data:image/png'));assert.equal(response.body.data.primaryMobile,undefined);
 assert.equal((await api('get',`/gatepasses/verify/${share}`,guard)).status,404);
 assert.equal((await request(app).get(`/api/parent/pass/${qrToken(p)}`)).status,404);
 await api('post',`/gatepasses/${p._id}/cancel`).send({reason:'Parent withdrew consent'});
 assert.equal((await request(app).get(`/api/parent/pass/${share}`)).status,404);
});
test('no-return passes record one final exit and mobile changes are blocked during active passes',async()=>{
 const p=await create(teacher,{...input(),expectedReturn:null});assert.equal((await otpReady(p)).status,200);assert.equal((await api('post',`/gatepasses/${p._id}/approve`).send({})).status,200);await GatePass.updateOne({_id:p._id},{'timing.requestedExit':new Date(Date.now()-60000)});
 assert.equal((await api('post',`/gatepasses/${p._id}/exit`,guard).send({gate:'Main Gate'})).body.data.status,'NO_RETURN_REQUIRED');
 assert.equal((await api('post',`/gatepasses/${p._id}/return`,guard).send({gate:'Main Gate'})).status,409);
 await create();
 const body={name:student.name,admissionNumber:student.admissionNumber,className:student.className,section:student.section,villageName:student.villageName,primaryMobile:'+919876543299',email:student.email};
 assert.equal((await api('put',`/students/${student._id}`).send(body)).status,409);
 assert.equal((await api('put',`/students/${student._id}`).send({...body,primaryMobile:student.primaryMobile,email:'new.email@school.test'})).status,409);
});
test('images are re-encoded and stored behind authentication',async()=>{
 const {default:sharp}=await import('sharp');const photo=await sharp({create:{width:30,height:30,channels:3,background:'#ffdd00'}}).png().toBuffer();
 const r=await api('post','/uploads').attach('file',photo,'student.png');assert.equal(r.status,201,JSON.stringify(r.body));assert.match(r.body.data.url,/\.jpg$/);
 const fetched=await request(app).get(r.body.data.url).set('Authorization',auth(guard));assert.equal(fetched.status,200);assert.match(fetched.headers['content-type'],/jpeg/);
 assert.equal((await request(app).get(r.body.data.url)).status,401);
 assert.equal((await api('post','/uploads').attach('file',Buffer.from('<script>alert(1)</script>'),'bad.jpg')).status,400);
 const fs=await import('node:fs/promises');const {uploadDir}=await import('../routes/management.js');await fs.unlink(`${uploadDir}/${r.body.data.url.split('/').pop()}`);
});

test('development OTP logs one usable code, keeps secrets out of responses and records, and preserves cooldown and replay protection', async t => {
  const { env } = await import('../config/env.js');
  const saved = { node: env.node, mode: env.otpDeliveryMode };
  t.after(() => { env.node = saved.node; env.otpDeliveryMode = saved.mode; });
  env.node = 'development'; env.otpDeliveryMode = 'console';
  const logger = t.mock.method(console, 'log', () => {});
  const localStudent = await Student.create({ name: 'Development Student', admissionNumber: 'DEV-OTP-001', className: 'VIII', section: 'A', primaryMobile: '+919876540001' });
  const pass = await create(admin, { ...input(), student: String(localStudent._id) });
  const sent = await api('post', `/gatepasses/${pass._id}/send-otp`).send({});
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.data.status, 'DEVELOPMENT_ONLY');
  assert.equal(sent.body.data.deliveryMethod, 'console');
  assert.equal(logger.mock.callCount(), 1);
  const line = logger.mock.calls[0].arguments[0];
  assert.match(line, /\[SRPS DEV OTP\]/);
  assert.ok(line.includes(pass.gatePassNumber));
  const code = line.match(/OTP: (\d{6})/)[1];
  assert.ok(!line.includes(localStudent.primaryMobile), 'Log should not expose the parent mobile');
  assert.ok(!JSON.stringify(sent.body).includes(code), 'API must not return the OTP');
  const stored = await OTPVerification.findOne({ gatePass: pass._id }).select('+hashedOTP');
  assert.equal(stored.deliveryMethod, 'DEVELOPMENT_CONSOLE');
  assert.ok(await bcrypt.compare(code, stored.hashedOTP));
  assert.ok(!JSON.stringify(stored).includes(code));
  const notifications = await Notification.find({ gatePass: pass._id, event: 'OTP_SENT' }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].provider, 'development-console');
  assert.equal(notifications[0].status, 'DEVELOPMENT_ONLY');
  assert.ok(!JSON.stringify(notifications).includes(code));
  assert.ok(!JSON.stringify(await AuditLog.find({ entityId: pass._id })).includes(code));
  assert.equal((await api('post', `/gatepasses/${pass._id}/send-otp`).send({})).status, 429);
  assert.equal(logger.mock.callCount(), 1, 'Rejected resends must not log new OTPs');

  // A console-issued code cannot be redeemed after changing to production delivery.
  env.node = 'production'; env.otpDeliveryMode = 'whatsapp';
  assert.equal((await api('post', `/gatepasses/${pass._id}/verify-otp`).send({ otp: code })).status, 400);
  env.node = 'development'; env.otpDeliveryMode = 'console';
  const verified = await api('post', `/gatepasses/${pass._id}/verify-otp`).send({ otp: code });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.equal(verified.body.data.parentVerification.method, 'DEVELOPMENT_OTP');
  assert.equal(verified.body.data.status, 'ADMIN_APPROVAL_PENDING');
  assert.equal((await api('post', `/gatepasses/${pass._id}/verify-otp`).send({ otp: code })).status, 400);
  assert.ok(await GateEvent.exists({ gatePassId: pass._id, eventType: 'DEVELOPMENT_OTP_VERIFIED' }));

  env.node = 'production'; env.otpDeliveryMode = 'whatsapp';
  assert.equal((await api('post', `/gatepasses/${pass._id}/approve`).send({})).status, 409);
  env.node = 'development'; env.otpDeliveryMode = 'console';
  assert.equal((await api('post', `/gatepasses/${pass._id}/approve`).send({})).status, 200);
  await GatePass.updateOne({ _id: pass._id }, { 'timing.requestedExit': new Date(Date.now() - 60000) });
  env.node = 'production'; env.otpDeliveryMode = 'whatsapp';
  assert.equal((await api('post', `/gatepasses/${pass._id}/exit`, guard).send({ gate: 'Main Gate' })).status, 409);
  env.node = 'development'; env.otpDeliveryMode = 'console';
  assert.equal((await api('post', `/gatepasses/${pass._id}/exit`, guard).send({ gate: 'Main Gate' })).status, 200);
});

test('console delivery cannot log in production and an expired console OTP cannot verify', async t => {
  const { env, validateEnvironment } = await import('../config/env.js');
  const { sendOTP } = await import('../services/otp/otp.service.js');
  const saved = { node: env.node, mode: env.otpDeliveryMode };
  t.after(() => { env.node = saved.node; env.otpDeliveryMode = saved.mode; });
  const logger = t.mock.method(console, 'log', () => {});
  env.node = 'production'; env.otpDeliveryMode = 'console';
  assert.throws(() => validateEnvironment(), /only with NODE_ENV=development/);
  await assert.rejects(() => sendOTP({}, {}), /only with NODE_ENV=development/);
  assert.equal(logger.mock.callCount(), 0);
  env.node = 'development'; env.otpDeliveryMode = 'console';
  const localStudent = await Student.create({ name: 'Expiry Student', admissionNumber: 'DEV-OTP-002', className: 'VIII', section: 'A', primaryMobile: '+919876540002' });
  const pass = await create(admin, { ...input(), student: String(localStudent._id) });
  const sent = await api('post', `/gatepasses/${pass._id}/send-otp`).send({});
  assert.equal(sent.status, 200);
  const code = logger.mock.calls[0].arguments[0].match(/OTP: (\d{6})/)[1];
  await OTPVerification.updateOne({ gatePass: pass._id }, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await api('post', `/gatepasses/${pass._id}/verify-otp`).send({ otp: code })).status, 400);
  assert.equal((await GatePass.findById(pass._id)).parentVerification.verified, false);
});

async function accessUser(role, extra={}) {
 const key=crypto.randomBytes(6).toString('hex');
 const user=await User.create({name:`Access ${role}`,email:`${key}@school.test`,employeeId:key,passwordHash:await bcrypt.hash('CorrectHorse123!',4),role,...extra});
 const session=await Session.create({user:user._id,tokenHash:crypto.randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)});user.$locals.sid=String(session._id);return user;
}
test('Principal creates and approves passes without user, settings or gate access',async()=>{
 const principal=await accessUser('PRINCIPAL');
 const p=await create(principal);
 assert.equal((await api('post',`/gatepasses/${p._id}/approve`,principal).send({})).status,409,'parent verification still required');
 const pending=await create();assert.equal((await otpReady(pending)).status,200);
 assert.equal((await api('post',`/gatepasses/${pending._id}/approve`,principal).send({})).status,200);
 for(const path of ['/users','/reports','/gatepasses/manual/unknown'])assert.equal((await api('get',path,principal)).status,403);
 assert.equal((await api('put','/settings',principal).send({})).status,403);
 assert.equal((await api('post','/students',principal).send({})).status,403);
});
test('default guard has verification and movement only, restricted to assigned gate',async()=>{
 const gateUser=await accessUser('SECURITY_GUARD');const p=await approved();
 const me=await api('get','/auth/me',gateUser);assert.deepEqual(me.body.data.permissions,['gate.verify','gate.move']);assert.equal(me.body.data.assignedGate,'Main Gate');
 assert.equal((await api('get',`/gatepasses/verify/${qrToken(p)}`,gateUser)).status,200);
 for(const path of ['/students','/users','/reports','/gatepasses','/staff-passes','/visitors'])assert.equal((await api('get',path,gateUser)).status,403,path);
 for(const path of ['/gatepasses',`/gatepasses/${p._id}/approve`])assert.equal((await api('post',path,gateUser).send({})).status,403);
 await SystemSetting.updateOne({key:'school'},{$addToSet:{gates:'Side Gate'}});
 assert.equal((await api('post',`/gatepasses/${p._id}/exit`,gateUser).send({gate:'Side Gate'})).status,403);
 assert.equal((await api('post',`/gatepasses/${p._id}/exit`,gateUser).send({gate:'Main Gate'})).status,200);
 assert.equal((await api('post',`/gatepasses/${p._id}/return`,gateUser).send({gate:'Main Gate'})).status,200);
});
test('Admin assigns role and granular permissions, revokes sessions and cannot escalate administrators',async()=>{
 const manager=await accessUser('ADMIN'),target=await accessUser('TEACHER');
 const result=await api('patch',`/users/${target._id}`,manager).send({role:'PRINCIPAL',permissions:['passes.view','passes.approve'],assignedGate:''});assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal((await api('get','/auth/me',target)).status,401);
 assert.equal(await Session.countDocuments({user:target._id}),0);
 const changed=await User.findById(target._id);assert.equal(changed.role,'PRINCIPAL');assert.deepEqual([...changed.permissions],['passes.view','passes.approve']);
 assert.ok(await AuditLog.exists({entityId:target._id,action:'USER_ACCESS_CHANGED','details.after.role':'PRINCIPAL'}));
 assert.equal((await api('patch',`/users/${target._id}`,manager).send({role:'ADMIN'})).status,403);
 assert.equal((await api('patch',`/users/${admin._id}`,manager).send({active:false})).status,403);
 assert.equal((await api('patch',`/users/${manager._id}`,manager).send({active:false})).status,400);
 assert.equal((await api('patch',`/users/${target._id}`,manager).send({permissions:['users.manage']})).status,400);
 assert.equal((await api('patch',`/users/${target._id}`,manager).send({permissions:['passes.create']})).status,400);
 assert.equal((await api('patch',`/users/${target._id}`,manager).send({assignedGate:'Unknown gate'})).status,400);
 const denied=await accessUser('PRINCIPAL',{permissions:[]});
 assert.equal((await api('get','/gatepasses',denied)).status,403);
 assert.equal((await api('post','/gatepasses',denied).send(input())).status,403);
 const approver=await accessUser('TEACHER',{permissions:['passes.view','passes.approve']});
 const pass=await create();await otpReady(pass);
 assert.equal((await api('post',`/gatepasses/${pass._id}/approve`,approver).send({})).status,200);
 assert.equal((await api('post','/gatepasses',approver).send(input())).status,403);
 assert.equal((await api('patch',`/users/${target._id}`,approver).send({role:'ADMIN'})).status,403);
 const scanner=await accessUser('SECURITY_GUARD',{permissions:['gate.verify']}),scanPass=await approved();
 const scannerMe=await api('get','/auth/me',scanner);
 assert.deepEqual(scannerMe.body.data.permissions,['gate.verify','gate.move']);
 assert.equal((await api('post',`/gatepasses/${scanPass._id}/exit`,scanner).send({gate:'Main Gate'})).status,200);
});
test('admins directly set staff passwords, revoke sessions and invalidate recovery tokens',async()=>{
 const target=await accessUser('TEACHER'),recoveryToken=crypto.randomBytes(32).toString('hex');
 await User.updateOne({_id:target._id},{resetHash:hash(recoveryToken),resetExpires:new Date(Date.now()+60000)});
 const setPassword=()=>api('patch',`/users/${target._id}/password`).send({password:'StaffNewPassword123!'});
 assert.equal((await setPassword()).status,200);
 assert.equal((await api('get','/auth/me',target)).status,401);
 assert.equal(await Session.countDocuments({user:target._id}),0);
 const saved=await User.findById(target._id).select('+passwordHash +resetHash');
 assert.ok(await bcrypt.compare('StaffNewPassword123!',saved.passwordHash));
 assert.equal(saved.resetHash,undefined);
 assert.ok(await AuditLog.exists({entityId:target._id,action:'STAFF_PASSWORD_SET'}));
 const recoveryReset=await request(app).post('/api/auth/reset-password').set('X-Forwarded-For',`192.0.2.${testClient}`).send({token:recoveryToken,password:'AnotherNewPassword123!'});
 assert.equal(recoveryReset.status,400);
 assert.equal((await api('patch',`/users/${target._id}/password`,teacher).send({password:'StaffNewPassword123!'})).status,403);
 const manager=await accessUser('ADMIN');
 assert.equal((await api('patch',`/users/${admin._id}/password`,manager).send({password:'StaffNewPassword123!'})).status,403);
 assert.equal((await api('patch',`/users/${target._id}/password`).send({password:'short'})).status,400);
 assert.equal((await api('patch',`/users/${admin._id}/password`).send({password:'StaffNewPassword123!'})).status,400);
});

test('pagination and malformed student imports return validation errors',async()=>{
 for(const route of ['/students','/gatepasses','/visitors','/gate-logs','/audit-logs','/notifications']){
  for(const page of ['bad','-1','1.5','Infinity'])assert.equal((await api('get',`${route}?page=${page}`)).status,400,`${route}: ${page}`);
 }
 assert.equal((await api('post','/students/import').attach('file',Buffer.from('name,admissionNumber\n"unfinished'),'bad.csv')).status,400);
 assert.equal((await api('post','/students/import').attach('file',Buffer.from('not a workbook'),'bad.xlsx')).status,400);
 assert.equal((await api('post','/students/import').attach('file',Buffer.from('name,admissionNumber'),'bad.txt')).status,400);
});
test('report filters intersect student and class, validate calendar dates, and support other movement types',async()=>{
 const studentTwo=await Student.create({name:'Filter Student',admissionNumber:'FILTER-001',className:'IX',section:'A',primaryMobile:'+919876541111'});
 const p1=await create(),p2=await create(teacher,{...input(),student:String(studentTwo._id)});
 const matching=await api('get',`/reports?student=${student._id}&className=IX&section=A`);assert.equal(matching.status,200);assert.ok(matching.body.data.items.some(p=>p._id===p1._id));assert.ok(!matching.body.data.items.some(p=>p._id===p2._id));
 assert.equal((await api('get',`/reports?student=${student._id}&className=UNKNOWN`)).body.data.items.length,0);
 for(const query of ['from=2026-02-30','to=2026-13-01','from=2026-09-22&to=2026-09-21'])assert.equal((await api('get',`/reports?${query}`)).status,400);
 const visitor=await api('post','/visitors').send({name:'Filter Visitor',mobile:'+919876543219',purpose:'Report test',personToMeet:'Principal',expectedExit:new Date(Date.now()+600000).toISOString()});const vid=visitor.body.data.pass._id;
 await api('post',`/visitors/${vid}/check-in`,guard).send({gate:'Main Gate'});
 const vr=await api('get',`/reports?kind=visitors&pendingReturn=true&student=${student._id}&className=IX&emergency=true`);assert.equal(vr.status,200);assert.ok(vr.body.data.items.some(p=>p._id===vid));assert.ok(vr.body.data.items.every(p=>p.status==='CHECKED_IN'));
 const staff=await api('post','/staff-passes',teacher).send({staff:String(teacher._id),department:'Academics',reason:'Report test',expectedReturn:new Date(Date.now()+600000).toISOString()});const sid=staff.body.data._id;
 await api('post',`/staff-passes/${sid}/approve`).send({});await api('post',`/staff-passes/${sid}/exit`,guard).send({gate:'Main Gate'});
 const sr=await api('get','/reports?kind=staff&pendingReturn=true');assert.equal(sr.status,200);assert.ok(sr.body.data.items.some(p=>p._id===sid));assert.ok(sr.body.data.items.every(p=>p.status==='EXITED'));
});
test('future QR is not exit-ready and expired passes cannot receive parent authorization',async()=>{
 const p=await approved();await GatePass.updateOne({_id:p._id},{'timing.requestedExit':new Date(Date.now()+600000)});
 const scan=await api('get',`/gatepasses/verify/${qrToken(p)}`,guard);assert.equal(scan.status,200);assert.equal(scan.body.data.valid,false);
 assert.equal((await api('post',`/gatepasses/${p._id}/exit`,guard).send({gate:'Main Gate'})).status,409);
 const expired=await create(),secret=crypto.randomBytes(32).toString('hex');await GatePass.updateOne({_id:expired._id},{expiresAt:new Date(Date.now()-1000),approvalLinkHash:hash(secret),approvalLinkExpires:new Date(Date.now()+60000)});
 assert.equal((await request(app).get(`/api/parent/${secret}`)).status,404);
 assert.equal((await request(app).post(`/api/parent/${secret}`).send({decision:'approve'})).status,400);
 assert.equal((await api('post',`/gatepasses/${expired._id}/send-otp`,teacher).send({})).status,409);
});
test('password recovery rejects unauthorized, expired and reused tokens and revokes sessions',async()=>{
 const user=await accessUser('TEACHER');
 assert.equal((await api('post',`/auth/recovery/${user._id}`,teacher).send({})).status,403);
 const recovery=await api('post',`/auth/recovery/${user._id}`).send({});assert.equal(recovery.status,200);
 const token=recovery.body.data.recoveryLink.split('/').pop();
 assert.equal((await request(app).post('/api/auth/reset-password').set('X-Forwarded-For',`192.0.2.${testClient}`).send({token,password:'short'})).status,400);
 const reset=()=>request(app).post('/api/auth/reset-password').set('X-Forwarded-For',`192.0.2.${testClient}`).send({token,password:'NewCorrectHorse123!'});
 assert.equal((await reset()).status,200);assert.equal((await api('get','/auth/me',user)).status,401);assert.equal((await reset()).status,400);
 const stored=await User.findById(user._id).select('+passwordHash');assert.ok(await bcrypt.compare('NewCorrectHorse123!',stored.passwordHash));
 const expiredToken=crypto.randomBytes(32).toString('hex');await User.updateOne({_id:user._id},{resetHash:hash(expiredToken),resetExpires:new Date(Date.now()-1000)});
 assert.equal((await request(app).post('/api/auth/reset-password').set('X-Forwarded-For',`192.0.2.${testClient}`).send({token:expiredToken,password:'NewCorrectHorse123!'})).status,400);
});
test('assigned gates cannot be removed and session refreshes do not exhaust login attempts',async()=>{
 const settings=await SystemSetting.findOne({key:'school'}).lean();
 const body={schoolName:settings.schoolName,address:settings.address,logo:'',gates:['Side Gate'],validityHours:8,otpExpiryMinutes:5,emergencyEnabled:true,requireParent:true};
 assert.equal((await api('put','/settings').send(body)).status,409);
 assert.equal((await api('put','/settings').send({...body,gates:['Main Gate','Side Gate']})).status,200);
 const account=await accessUser('TEACHER');const agent=request.agent(app),ip=`192.0.2.${testClient}`;
 assert.equal((await agent.post('/api/auth/login').set('X-Forwarded-For',ip).send({identifier:account.employeeId,password:'CorrectHorse123!'})).status,200);
 for(let i=0;i<12;i++)assert.equal((await agent.post('/api/auth/refresh').set('X-Forwarded-For',ip).send({})).status,200);
 assert.equal((await agent.post('/api/auth/login').set('X-Forwarded-For',ip).send({identifier:account.email,password:'CorrectHorse123!'})).status,200);
});
test('WhatsApp adapters handle success and failure without storing message or OTP secrets',async t=>{
 const {default:axios}=await import('axios');const {sendWhatsAppMessage}=await import('../services/whatsapp/whatsapp.service.js');
 const keys=['WHATSAPP_PROVIDER','WHATSAPP_API_URL','WHATSAPP_TOKEN','WHATSAPP_SENDER','WHATSAPP_TEMPLATE'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));t.after(()=>{for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];});
 Object.assign(process.env,{WHATSAPP_PROVIDER:'custom',WHATSAPP_API_URL:'https://provider.test/messages',WHATSAPP_TOKEN:'test-only-token',WHATSAPP_SENDER:'test-sender',WHATSAPP_TEMPLATE:'test-template'});
 let payload;const transport=t.mock.method(axios,'post',async(url,body)=>{payload=body;return {data:{success:true,messageId:'test-message'}};});
 const delivered=await sendWhatsAppMessage({mobile:'+919876543210',message:'Secret body',otp:'174205',event:'ADAPTER_TEST'});assert.equal(delivered.status,'SENT');assert.equal(payload.copy_code,'174205');assert.equal(payload.phone_number,'919876543210');
 transport.mock.mockImplementation(async()=>{throw new Error('provider secret detail');});assert.equal((await sendWhatsAppMessage({mobile:'+919876543210',message:'Secret body',event:'ADAPTER_TEST'})).status,'FAILED');
 process.env.WHATSAPP_PROVIDER='meta';process.env.WHATSAPP_API_URL='https://graph.facebook.com/v99.0/test/messages';transport.mock.mockImplementation(async(url,body)=>{payload=body;return {data:{messages:[{id:'meta-test'}]}};});
 assert.equal((await sendWhatsAppMessage({mobile:'+919876543210',message:'Secret body',event:'ADAPTER_TEST'})).status,'SENT');assert.equal(payload.type,'template');
 const records=JSON.stringify(await Notification.find({event:'ADAPTER_TEST'}));for(const secret of ['174205','Secret body','test-only-token','provider secret detail'])assert.ok(!records.includes(secret));
});
test('automatic expiry is idempotent and preserves students awaiting return',async()=>{
 const {expirePasses}=await import('../services/expiry.service.js');
 const pending=await create(),outside=await approved();await api('post',`/gatepasses/${outside._id}/exit`,guard).send({gate:'Main Gate'});
 await GatePass.updateMany({_id:{$in:[pending._id,outside._id]}},{expiresAt:new Date(Date.now()-60000)});
 await expirePasses();await expirePasses();
 assert.equal((await GatePass.findById(pending._id)).status,'EXPIRED');assert.equal((await GatePass.findById(outside._id)).status,'EXITED');
 assert.equal(await GateEvent.countDocuments({gatePassId:pending._id,eventType:'PASS_EXPIRED'}),1);
 assert.equal((await api('post',`/gatepasses/${outside._id}/return`,guard).send({gate:'Main Gate'})).status,200);
});
test('SMS OTP uses registered mobile, logs delivery outcomes and rejects incorrect or replayed codes',async t=>{
 const {default:twilio}=await import('twilio');const {env}=await import('../config/env.js');
 const savedMode=env.otpDeliveryMode,keys=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID','TWILIO_VERIFY_TEMPLATE_SID'],saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 t.after(()=>{env.otpDeliveryMode=savedMode;for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];});
 env.otpDeliveryMode='sms';Object.assign(process.env,{TWILIO_ACCOUNT_SID:`AC${'1'.repeat(32)}`,TWILIO_AUTH_TOKEN:'test-only-token',TWILIO_VERIFY_SERVICE_SID:`VA${'2'.repeat(32)}`});delete process.env.TWILIO_VERIFY_TEMPLATE_SID;
 const calls=[];const transport=t.mock.method(twilio.RequestClient.prototype,'request',async options=>{calls.push(options);return {statusCode:200,headers:{},body:JSON.stringify({status:options.uri.endsWith('VerificationCheck')?(options.data.Code==='174205'?'approved':'pending'):'pending'})};});
 const smsStudent=await Student.create({name:'SMS Test Student',admissionNumber:'SMS-001',className:'IX',section:'A',primaryMobile:'+919876540077'});
 const p=await create(admin,{...input(),student:String(smsStudent._id)});
 const sent=await api('post',`/gatepasses/${p._id}/send-otp`).send({channel:'sms'});assert.equal(sent.status,200,JSON.stringify(sent.body));assert.equal(sent.body.data.deliveryMethod,'sms');assert.equal(calls[0].data.To,smsStudent.primaryMobile);
 const record=await OTPVerification.findOne({gatePass:p._id}).select('+hashedOTP');assert.equal(record.deliveryMethod,'TWILIO_SMS');assert.equal(record.hashedOTP,null);
 assert.equal((await api('post',`/gatepasses/${p._id}/verify-otp`).send({otp:'000000'})).status,400);
 assert.equal((await api('post',`/gatepasses/${p._id}/verify-otp`).send({otp:'174205'})).status,200);
 assert.equal((await api('post',`/gatepasses/${p._id}/verify-otp`).send({otp:'174205'})).status,400);
 assert.ok(await Notification.exists({gatePass:p._id,provider:'twilio-sms',status:'SENT'}));
 const failedStudent=await Student.create({name:'SMS Failure Student',admissionNumber:'SMS-002',className:'IX',section:'A',primaryMobile:'+919876540078'});const failed=await create(admin,{...input(),student:String(failedStudent._id)});
 transport.mock.mockImplementation(async()=>{throw new Error('provider secret');});assert.equal((await api('post',`/gatepasses/${failed._id}/send-otp`).send({})).status,502);
 assert.ok(await Notification.exists({gatePass:failed._id,provider:'twilio-sms',status:'FAILED'}));
 const records=JSON.stringify(await Notification.find({provider:'twilio-sms'}));assert.ok(!records.includes('174205')&&!records.includes('provider secret')&&!records.includes('test-only-token'));
});
test('email OTP uses the registered student email, stores only a hash, and invalidates failed deliveries',async t=>{
 const {default:nodemailer}=await import('nodemailer');const {env}=await import('../config/env.js');
 const configKeys=['smtpHost','smtpPort','smtpUser','smtpPass','smtpFrom'],saved=Object.fromEntries(configKeys.map(key=>[key,env[key]]));
 t.after(()=>{for(const key of configKeys)env[key]=saved[key];});
 Object.assign(env,{smtpHost:'smtp.school.test',smtpPort:587,smtpUser:'smtp-user',smtpPass:'test-only-password',smtpFrom:'SRPS <gatepass@school.test>'});
 let failDelivery=false;const outgoing=[];
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async message=>{if(failDelivery)throw new Error('smtp secret');outgoing.push(message);}}));
 const emailStudent=await Student.create({name:'Email Test Student',admissionNumber:'EMAIL-001',className:'IX',section:'A',primaryMobile:'+919876540088',email:'parent.email@school.test'});
 const pass=await create(admin,{...input(),student:String(emailStudent._id)});
 const channels=await api('get','/settings');assert.equal(channels.body.data.otpChannels.email,true);
 const sent=await api('post',`/gatepasses/${pass._id}/send-otp`).send({channel:'email'});
 assert.equal(sent.status,200,JSON.stringify(sent.body));assert.equal(sent.body.data.deliveryMethod,'email');
 assert.equal(outgoing[0].to,emailStudent.email);assert.match(outgoing[0].text,/Email Test Student/);
 const code=outgoing[0].text.match(/code .* is (\d{6})/)[1];
 const record=await OTPVerification.findOne({gatePass:pass._id}).select('+hashedOTP');
 assert.equal(record.deliveryMethod,'EMAIL');assert.equal(record.emailAddress,emailStudent.email);assert.equal(record.mobileNumber,null);
 assert.ok(await bcrypt.compare(code,record.hashedOTP));assert.equal(JSON.stringify(sent.body).includes(code),false);
 await Student.updateOne({_id:emailStudent._id},{email:'changed.email@school.test'});
 assert.equal((await api('post',`/gatepasses/${pass._id}/verify-otp`).send({otp:code})).status,409);
 await Student.updateOne({_id:emailStudent._id},{email:emailStudent.email});
 const verified=await api('post',`/gatepasses/${pass._id}/verify-otp`).send({otp:code});
 assert.equal(verified.status,200,JSON.stringify(verified.body));assert.equal(verified.body.data.parentVerification.method,'EMAIL_OTP');
 assert.equal((await api('post',`/gatepasses/${pass._id}/verify-otp`).send({otp:code})).status,400);
 assert.ok(await Notification.exists({gatePass:pass._id,provider:'smtp-email',status:'SENT'}));
 const failedStudent=await Student.create({name:'Email Failure Student',admissionNumber:'EMAIL-002',className:'IX',section:'A',primaryMobile:'+919876540089',email:'failed.email@school.test'});
 const failed=await create(admin,{...input(),student:String(failedStudent._id)});failDelivery=true;
 const response=await api('post',`/gatepasses/${failed._id}/send-otp`).send({channel:'email'});
 assert.equal(response.status,502);assert.ok(await Notification.exists({gatePass:failed._id,provider:'smtp-email',status:'FAILED'}));
 const failedRecord=await OTPVerification.findOne({gatePass:failed._id});
 assert.equal(failedRecord.verified,true);assert.ok(failedRecord.expiresAt<=new Date());
 const notifications=JSON.stringify(await Notification.find({provider:'smtp-email'}));
 assert.ok(!notifications.includes(code)&&!notifications.includes('smtp secret')&&!notifications.includes('test-only-password'));
});
test('admins manage bus staff and drivers are emailed only after exit, with retry on failure',async t=>{
 const {default:nodemailer}=await import('nodemailer');const {env}=await import('../config/env.js');
 const configKeys=['smtpHost','smtpPort','smtpUser','smtpPass','smtpFrom'],saved=Object.fromEntries(configKeys.map(key=>[key,env[key]]));
 t.after(()=>{for(const key of configKeys)env[key]=saved[key];});
 Object.assign(env,{smtpHost:'smtp.school.test',smtpPort:587,smtpUser:'smtp-user',smtpPass:'test-only-password',smtpFrom:'SRPS <gatepass@school.test>'});
 let failDelivery=false;const outgoing=[];
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async message=>{if(failDelivery)throw new Error('smtp secret');outgoing.push(message);}}));
 assert.equal((await api('get','/bus-staff',teacher)).status,403);
 const created=await api('post','/bus-staff').send({staffId:'drv-12',driverName:'Driver Test',busNumber:'12',mobile:'+919876543210',email:'driver12@school.test',photo:''});
 assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.data.staffId,'DRV-12');
 assert.equal((await api('get','/bus-staff')).body.data.items[0].mobile,'+919876543210');
 const duplicate=await api('post','/bus-staff').send({staffId:'OTHER',driverName:'Another Driver',busNumber:'12',mobile:'+919876543211',email:'another@school.test'});
 assert.equal(duplicate.status,409);
 const edited=await api('put',`/bus-staff/${created.body.data._id}`).send({staffId:'DRV-12',driverName:'Driver Test Updated',busNumber:'12',mobile:'+919876543210',email:'driver12@school.test',photo:''});
 assert.equal(edited.status,200,JSON.stringify(edited.body));
 const list=await api('get','/bus-drivers');assert.equal(list.status,200);assert.deepEqual(list.body.data.items,[{busNumber:'12',driverName:'Driver Test Updated',emailConfigured:true}]);assert.equal(JSON.stringify(list.body).includes('driver12@school.test'),false);
 const pass=await create(teacher,{...input(),busNumber:'12'});assert.equal(pass.busNumber,'12');assert.equal(pass.busDriverNoticeStatus,'PENDING');
 assert.equal(outgoing.length,0);assert.equal(await Notification.countDocuments({event:'BUS_DRIVER_EXIT_NOTICE'}),0);
 assert.equal((await api('put',`/bus-staff/${created.body.data._id}`).send({staffId:'DRV-12',driverName:'Driver Test Updated',busNumber:'13',mobile:'+919876543210',email:'driver12@school.test',photo:''})).status,409);
 const noBus=await api('post','/gatepasses',teacher).send({...input(),busNumber:'missing'});assert.equal(noBus.status,400);
 assert.equal((await api('delete',`/bus-staff/${created.body.data._id}`)).status,409);
 const verified=await otpReady(pass);assert.equal(verified.status,200,JSON.stringify(verified.body));
 const approvedPass=await api('post',`/gatepasses/${pass._id}/approve`).send({});assert.equal(approvedPass.status,200,JSON.stringify(approvedPass.body));
 await GatePass.updateOne({_id:pass._id},{'timing.requestedExit':new Date(Date.now()-60000)});
 failDelivery=true;
 const exited=await api('post',`/gatepasses/${pass._id}/exit`,guard).send({gate:'Main Gate'});
 assert.equal(exited.status,200,JSON.stringify(exited.body));assert.equal(exited.body.data.status,'EXITED');assert.equal(exited.body.data.busDriverNoticeStatus,'FAILED');
 assert.equal(outgoing.length,0);assert.ok(await Notification.exists({gatePass:pass._id,event:'BUS_DRIVER_EXIT_NOTICE',status:'FAILED'}));
 failDelivery=false;
 const retried=await api('post',`/gatepasses/${pass._id}/retry-driver-notice`,guard).send({gate:'Main Gate'});
 assert.equal(retried.status,200,JSON.stringify(retried.body));assert.equal(retried.body.data.busDriverNoticeStatus,'SENT');assert.equal(outgoing.length,1);
 for(const expected of ['Student Kumar','Class: IX-A','Village: Rampur','Bus number: 12','Reason: Medical appointment','do not wait for this student'])assert.ok(outgoing[0].text.includes(expected),expected);
 assert.equal((await api('post',`/gatepasses/${pass._id}/retry-driver-notice`,guard).send({gate:'Main Gate'})).status,200);
 assert.equal(outgoing.length,1);assert.ok(await GatePass.exists({_id:pass._id,status:'EXITED',busDriverNoticeStatus:'SENT'}));
 const history=JSON.stringify(await Notification.find({event:'BUS_DRIVER_EXIT_NOTICE'}));assert.ok(!history.includes('smtp secret')&&!history.includes('test-only-password'));
 assert.equal((await api('post',`/gatepasses/${pass._id}/return`,guard).send({gate:'Main Gate'})).status,200);
 assert.equal((await api('delete',`/bus-staff/${created.body.data._id}`)).status,200);
 assert.equal((await api('get','/bus-drivers')).body.data.items.length,0);
});
