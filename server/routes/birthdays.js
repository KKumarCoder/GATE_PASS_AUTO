import {Router} from 'express';
import {z} from 'zod';
import {authenticate,permit,admins} from '../middleware/auth.js';
import {validate,objectId} from '../validators/index.js';
import {wrap,ok,assert,audit} from '../utils/core.js';
import {Student,BirthdayConfig,BirthdayDelivery,BirthdayMedia} from '../models/index.js';
import {birthdayCard,localImage} from '../services/birthday/card.js';
import {birthdayProviderReady,birthdayProvider} from '../services/birthday/provider.js';
import {mediaHash} from '../services/birthday/media.js';
import {schoolClock,birthdayFilter,defaultBirthdayConfig,deliverBirthdays} from '../services/birthday/service.js';
import fs from 'node:fs/promises';
const router=Router();
// The provider must fetch a card without a staff session. The 256-bit bearer token
// grants access to one immutable JPEG for 24 hours, with explicit expiry checks.
router.get('/media/:token',wrap(async(req,res)=>{
 assert(/^[a-f0-9]{64}$/.test(req.params.token),404,'Card not found or expired.');
 const media=await BirthdayMedia.findOne({_id:mediaHash(req.params.token),expiresAt:{$gt:new Date()}}).select('+image');
 assert(media,404,'Card not found or expired.');
 res.set('Cache-Control','no-store').type('jpg').send(Buffer.from(media.image));
}));
router.use(authenticate,permit(...admins));
const schema=z.object({enabled:z.boolean(),sendTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),background:z.union([z.literal(''),z.string().regex(/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/)]),wishesFrom:z.string().trim().min(1).max(60),templateName:z.string().regex(/^[a-z0-9_]*$/).max(100),language:z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/)}).strict();
router.get('/',wrap(async(req,res)=>{
 const clock=schoolClock();
 const [config,students,deliveries,missingDOB]=await Promise.all([BirthdayConfig.findOne({key:'school'}).lean(),Student.find(birthdayFilter(clock)).select('name className section primaryMobile photo dateOfBirth').sort({name:1}).lean(),BirthdayDelivery.find({day:clock.day}).lean(),Student.countDocuments({status:'ACTIVE',dateOfBirth:null})]);
 ok(res,{config:{...defaultBirthdayConfig,...config},providerReady:birthdayProviderReady(),provider:birthdayProvider(),day:clock.day,missingDOB,students:students.map(s=>({...s,delivery:deliveries.find(d=>String(d.student)===String(s._id))}))});
}));
router.put('/',validate(schema),wrap(async(req,res)=>{
 if(req.body.background)await fs.access(localImage(req.body.background)).catch(()=>assert(false,400,'Upload the birthday background first.'));
 if(req.body.enabled)assert(birthdayProviderReady()&&req.body.background&&req.body.templateName,400,'Configure WhatsApp provider credentials, upload the background and enter an approved template name before enabling.');
 const data=await BirthdayConfig.findOneAndUpdate({key:'school'},{$set:req.body},{upsert:true,new:true});
 await audit(req,'BIRTHDAY_SETTINGS_UPDATED',data._id,{enabled:data.enabled,sendTime:data.sendTime});ok(res,data);
}));
router.get('/preview/:id',wrap(async(req,res)=>{
 objectId.parse(req.params.id);const student=await Student.findById(req.params.id);assert(student,404,'Student not found.');
 const config=await BirthdayConfig.findOne({key:'school'}).lean();assert(config?.background,400,'Save a birthday background first.');
 res.type('jpg').send(await birthdayCard(student,config));
}));
router.post('/retry/:id',wrap(async(req,res)=>{
 objectId.parse(req.params.id);const clock=schoolClock();
 const config=await BirthdayConfig.findOne({key:'school'});assert(config?.enabled&&birthdayProviderReady()&&clock.time>=config.sendTime,400,'Enable configured automation and wait until the scheduled time.');
 assert(await BirthdayDelivery.exists({_id:`${clock.day}:${req.params.id}`,status:'FAILED'}),409,'Only failed submissions from today can be retried.');
 await audit(req,'BIRTHDAY_RETRY_REQUESTED',req.params.id);
 await deliverBirthdays({retryId:req.params.id});ok(res,{},'Retry processed.');
}));
router.post('/send/:id',wrap(async(req,res)=>{
 objectId.parse(req.params.id);const now=new Date(),clock=schoolClock(now);
 const config=await BirthdayConfig.findOne({key:'school'}).lean();
 assert(config?.background&&config.templateName&&birthdayProviderReady(),400,'Complete WhatsApp setup and save your birthday card and approved template first.');
 assert(await Student.exists({...birthdayFilter(clock),_id:req.params.id}),400,'You can send birthday wishes only to active students whose birthday is today.');
 const id=`${clock.day}:${req.params.id}`;
 const existing=await BirthdayDelivery.findById(id);
 assert(!existing||existing.status==='FAILED',409,'This wish is already submitted or its delivery is being checked. Refresh its status.');
 await audit(req,'BIRTHDAY_MANUAL_SEND_REQUESTED',req.params.id);
 await deliverBirthdays({now,manualId:req.params.id});
 const delivery=await BirthdayDelivery.findById(id).lean();
 assert(delivery?.status==='SENT',delivery?.status==='FAILED'?502:409,delivery?.error||'Submission is being checked. Refresh status before trying again.');
 ok(res,delivery,'Birthday wish submitted to WhatsApp.');
}));
export default router;
