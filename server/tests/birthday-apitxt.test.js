import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import axios from 'axios';
import request from 'supertest';
import {sendApitxtBirthday,apitxtBirthdayReady} from '../services/birthday/apitxt.js';
import {birthdayPublicOrigin,publishBirthdayCard,mediaHash} from '../services/birthday/media.js';
import {BirthdayMedia} from '../models/index.js';
let repl;
before(async()=>{repl=await MongoMemoryReplSet.create({replSet:{count:1}});await mongoose.connect(repl.getUri());});
after(async()=>{await mongoose.disconnect();await repl?.stop();});
test('APITxT JSON image template, strict response handling and sanitized errors',async()=>{
 const keys=['APITXT_WHATSAPP_AUTH_KEY','APITXT_WHATSAPP_PROJECT_REF_ID','BIRTHDAY_PUBLIC_URL'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=axios.post;
 Object.assign(process.env,{APITXT_WHATSAPP_AUTH_KEY:'private-test-key',APITXT_WHATSAPP_PROJECT_REF_ID:'PROJ_test',BIRTHDAY_PUBLIC_URL:'https://school.example.com'});
 const args={mobile:'+919876543210',card:Buffer.from('jpeg'),config:{templateName:'birthday',language:'en',wishesFrom:'School'},student:{name:'Student'}};
 const publish=async()=> 'https://school.example.com/api/birthdays/media/opaque';
 try{
 assert.equal(apitxtBirthdayReady(),true);
 axios.post=async(url,body,opts)=>{
 assert.equal(url,'https://apitxt.com/api/sendWA');assert.equal(opts.maxRedirects,0);
 assert.deepEqual(body,{authkey:'private-test-key',template_name:'birthday',project_ref_id:'PROJ_test',mobiles:'919876543210',language:'en',body_params:['Student','School'],header_image_url:await publish()});
 return {data:{status:200,message:'success',request_id:'WA_123'}};
 };
 assert.equal(await sendApitxtBirthday(args,{publish}),'WA_123');
 for(const [response,ambiguous] of [...[101,102,103,104,202,203,204,205,301,304,403].map(status=>[{status},false]),[{status:311},true],[{status:401},false],[{status:200},true],[{status:500},true],[{},true]]){
 axios.post=async()=>({data:response});await assert.rejects(sendApitxtBirthday(args,{publish}),e=>e.ambiguous===ambiguous&&!e.message.includes('private-test-key'));
 }
 axios.post=async()=>({data:{status:301,message:'private-test-key'}});
 await assert.rejects(sendApitxtBirthday(args,{publish}),e=>e.safeMessage==='APITxT balance is insufficient.' && !e.message.includes('private-test-key'));
 axios.post=async()=>{throw Object.assign(new Error('private-test-key'),{config:{data:'secret'}});};
 await assert.rejects(sendApitxtBirthday(args,{publish}),e=>e.ambiguous===true&&!e.config&&!e.message.includes('private-test-key'));
 for(const url of ['http://school.example.com','https://localhost','https://127.0.0.1','https://school.example.com/private','https://user:pass@school.example.com']){process.env.BIRTHDAY_PUBLIC_URL=url;assert.equal(birthdayPublicOrigin(),'');assert.equal(apitxtBirthdayReady(),false);}
 }finally{axios.post=original;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
test('card capability is opaque, serves only its image and expires without relying on TTL cleanup',async()=>{
 const {default:app}=await import('../app.js');const old=process.env.BIRTHDAY_PUBLIC_URL;process.env.BIRTHDAY_PUBLIC_URL='https://school.example.com';
 try{
 const url=await publishBirthdayCard(Buffer.from([255,216,255,217]));const path=new URL(url).pathname;const token=path.split('/').pop();assert.match(token,/^[a-f0-9]{64}$/);
 const record=await BirthdayMedia.findById(mediaHash(token));assert.equal(record.image,undefined);
 const response=await request(app).get(path);assert.equal(response.status,200);assert.match(response.headers['content-type'],/image\/jpeg/);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.body.length,4);
 assert.equal((await request(app).get('/api/birthdays/media/'+ 'f'.repeat(64))).status,404);
 await BirthdayMedia.updateOne({_id:mediaHash(token)},{$set:{expiresAt:new Date(Date.now()-1000)}});
 assert.equal((await request(app).get(path)).status,404);
 assert.equal((await request(app).get('/api/birthdays')).status,401);
 }finally{if(old===undefined)delete process.env.BIRTHDAY_PUBLIC_URL;else process.env.BIRTHDAY_PUBLIC_URL=old;}
});
