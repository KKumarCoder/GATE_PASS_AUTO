import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {Student,BirthdayConfig,BirthdayDelivery} from '../models/index.js';
import {schoolClock,deliverBirthdays} from '../services/birthday/service.js';
let repl;
const now=new Date('2026-11-04T01:30:00Z');
const options={now,ready:()=>true,render:async()=>Buffer.from('image'),send:async()=> 'meta-1'};
before(async()=>{repl=await MongoMemoryReplSet.create({replSet:{count:1}});await mongoose.connect(repl.getUri());await BirthdayConfig.init();});
after(async()=>{await mongoose.disconnect();await repl?.stop();});
beforeEach(async()=>{await Promise.all([Student.deleteMany({}),BirthdayConfig.deleteMany({}),BirthdayDelivery.deleteMany({})]);await BirthdayConfig.create({key:'school',enabled:true,sendTime:'07:00',background:'/api/uploads/abc.jpg',templateName:'birthday',wishesFrom:'School',language:'en'});});
async function student(extra={}){return Student.create({name:'Birthday Student',admissionNumber:Math.random().toString(),className:'V',section:'A',primaryMobile:'+919876543210',dateOfBirth:new Date('2015-11-04'),...extra});}
test('school date and time use IST across midnight',()=>{assert.deepEqual(schoolClock(new Date('2026-11-03T18:30:00Z')),{day:'2026-11-04',time:'00:00',month:11,date:4});});
test('only active birthdays send after 7, concurrent/restarted jobs do not duplicate',async()=>{
 await student();await student({status:'INACTIVE'});await student({dateOfBirth:new Date('2015-11-05')});await student({dateOfBirth:null});
 let count=0;const opts={...options,send:async()=>{count++;return 'accepted';}};
 await deliverBirthdays({...opts,now:new Date('2026-11-04T01:29:00Z')});assert.equal(count,0);
 await Promise.all([deliverBirthdays(opts),deliverBirthdays(opts)]);await deliverBirthdays(opts);
 assert.equal(count,1);assert.equal(await BirthdayDelivery.countDocuments({status:'SENT'}),1);
});
test('unconfigured and disabled automation creates no claims',async()=>{await student();await deliverBirthdays({...options,ready:()=>false});await BirthdayConfig.updateOne({},{$set:{enabled:false}});await deliverBirthdays(options);assert.equal(await BirthdayDelivery.countDocuments(),0);});
test('failed preparation retries once on explicit request; unknown submission never retries',async()=>{
 const s=await student();await deliverBirthdays({...options,render:async()=>{throw new Error('missing photo');}});assert.equal((await BirthdayDelivery.findOne()).status,'FAILED');
 await deliverBirthdays(options);assert.equal((await BirthdayDelivery.findOne()).status,'FAILED');
 await deliverBirthdays({...options,retryId:s._id,send:async()=>{throw Object.assign(new Error('timeout'),{ambiguous:true});}});assert.equal((await BirthdayDelivery.findOne()).status,'UNKNOWN');
 let sent=false;await deliverBirthdays({...options,retryId:s._id,send:async()=>{sent=true;}});assert.equal(sent,false);
});
test('February 29 birthdays send only on leap day',async()=>{await student({dateOfBirth:new Date('2016-02-29')});await deliverBirthdays({...options,now:new Date('2027-02-28T02:00:00Z')});assert.equal(await BirthdayDelivery.countDocuments(),0);await deliverBirthdays({...options,now:new Date('2028-02-29T02:00:00Z')});assert.equal(await BirthdayDelivery.countDocuments({status:'SENT'}),1);});
test('successful retry reuses the daily claim',async()=>{const s=await student();await deliverBirthdays({...options,render:async()=>{throw new Error('missing background');}});await deliverBirthdays({...options,retryId:s._id});assert.equal(await BirthdayDelivery.countDocuments(),1);assert.equal((await BirthdayDelivery.findOne()).status,'SENT');});
test('birthday routes reject non-admin roles and invalid schedules',async()=>{
 const {default:request}=await import('supertest');const {default:jwt}=await import('jsonwebtoken');
 const {env}=await import('../config/env.js');env.access='birthday-test-secret-at-least-32-characters';
 const {default:app}=await import('../app.js');const {User,Session}=await import('../models/index.js');
 assert.equal((await request(app).get('/api/birthdays')).status,401);
 for(const role of ['TEACHER','ADMIN']){
 const u=await User.create({name:role,email:`${role}@birthday.test`,employeeId:`BD-${role}`,role,passwordHash:'unused'});
 const session=await Session.create({user:u._id,tokenHash:role,expiresAt:new Date(Date.now()+60000)});
 const token=jwt.sign({version:0,sid:String(session._id)},env.access,{subject:String(u._id),issuer:'srps',audience:'srps-staff'});
 const r=await request(app).get('/api/birthdays').set('Authorization',`Bearer ${token}`);assert.equal(r.status,role==='ADMIN'?200:403);
 if(role==='ADMIN'){const invalid=await request(app).put('/api/birthdays').set('Authorization',`Bearer ${token}`).send({enabled:false,sendTime:'25:00',background:'',wishesFrom:'School',templateName:'birthday',language:'en'});assert.equal(invalid.status,400);}
 }
});
test('card rendering validates local paths and produces a personalised JPEG',async()=>{
 const {birthdayCard,localImage}=await import('../services/birthday/card.js');const {default:sharp}=await import('sharp');const fs=await import('node:fs/promises');
 assert.throws(()=>localImage('https://example.com/photo.jpg'));assert.throws(()=>localImage('/api/uploads/../../.env'));
 const file=localImage('/api/uploads/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg');
 await fs.mkdir(new URL('../uploads/',import.meta.url),{recursive:true});
 try{await sharp({create:{width:1024,height:1536,channels:3,background:'#ffffff'}}).jpeg().toFile(file);
 const output=await birthdayCard({name:'A & B <Student>',className:'V',section:'A',dateOfBirth:new Date('2015-11-04')},{background:'/api/uploads/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg',wishesFrom:'SRPS'});
 const metadata=await sharp(output).metadata();assert.equal(metadata.width,1024);assert.equal(metadata.height,1536);assert.equal(metadata.format,'jpeg');
 }finally{await fs.rm(file,{force:true});}
});
test('Meta submits uploaded image header and ordered variables; timeout is ambiguous',async()=>{
 const {default:axios}=await import('axios');const {sendBirthday}=await import('../services/birthday/meta.js');
 const keys=['WHATSAPP_PROVIDER','WHATSAPP_TOKEN','WHATSAPP_API_URL'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=axios.post;
 process.env.WHATSAPP_PROVIDER='meta';process.env.WHATSAPP_TOKEN='test-token';process.env.WHATSAPP_API_URL='https://graph.facebook.com/v25.0/123/messages';
 const args={mobile:'+919876543210',card:Buffer.from('jpg'),student:{name:'Student'},config:{templateName:'birthday',language:'en',wishesFrom:'School'}};
 try{const calls=[];axios.post=async(url,body)=>{calls.push({url,body});return {data:url.endsWith('/media')?{id:'media-id'}:{messages:[{id:'message-id'}]}};};
 assert.equal(await sendBirthday(args),'message-id');assert.ok(calls[0].body instanceof FormData);assert.equal(calls[1].body.template.components[0].parameters[0].image.id,'media-id');assert.deepEqual(calls[1].body.template.components[1].parameters.map(p=>p.text),['Student','School']);
 axios.post=async(url)=>{if(url.endsWith('/media'))return {data:{id:'media-id'}};throw new Error('timeout');};await assert.rejects(sendBirthday(args),e=>e.ambiguous===true);
 }finally{axios.post=original;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
test('manual wish bypasses paused schedule but keeps birthday and duplicate protection',async()=>{
 const s=await student();const other=await student({dateOfBirth:new Date('2015-11-05')});
 await BirthdayConfig.updateOne({},{$set:{enabled:false,sendTime:'23:00'}});
 let count=0;const opts={...options,manualId:s._id,send:async()=>{count++;return 'manual-accepted';}};
 await Promise.all([deliverBirthdays(opts),deliverBirthdays(opts)]);await deliverBirthdays(opts);
 assert.equal(count,1);assert.equal(await BirthdayDelivery.countDocuments({status:'SENT'}),1);
 await deliverBirthdays({...opts,manualId:other._id});assert.equal(count,1);
 await deliverBirthdays(options);assert.equal(await BirthdayDelivery.countDocuments(),1);
});
test('manual sending still requires provider configuration',async()=>{const s=await student();await deliverBirthdays({...options,manualId:s._id,ready:()=>false});assert.equal(await BirthdayDelivery.countDocuments(),0);});
