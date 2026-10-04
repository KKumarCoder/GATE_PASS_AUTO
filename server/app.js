import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import auth from './routes/auth.js';
import gatepasses,{parentRouter} from './routes/gatepasses.js';
import management from './routes/management.js';
import reports from './routes/reports.js';
const app=express();
app.disable('x-powered-by');app.set('trust proxy',Number(process.env.TRUST_PROXY||0));
app.use(helmet({referrerPolicy:{policy:'no-referrer'}}));
app.use(cors({origin(origin,cb){cb(null,!origin||origin===env.frontend);},credentials:true}));
app.use((req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==env.frontend)return res.status(403).json({success:false,message:'Origin is not allowed.',data:{}});next();});
app.use(express.json({limit:'100kb'}));app.use(cookieParser());
app.use('/api',rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-7',legacyHeaders:false,message:{success:false,message:'Too many requests. Please wait.',data:{}}}));
app.get('/api/health',(req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({success:mongoose.connection.readyState===1,message:mongoose.connection.readyState===1?'Healthy':'Database unavailable',data:{}}));
app.use('/api/auth',auth);app.use('/api/parent',parentRouter);app.use('/api/gatepasses',gatepasses);app.use('/api/reports',reports);app.use('/api',management);
app.use((req,res)=>res.status(404).json({success:false,message:'Endpoint not found.',data:{}}));
app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);
  let status=err.status||500,message=status===500?'An internal error occurred.':err.message;
  if(err instanceof ZodError){status=400;message=err.issues.map(i=>`${i.path.join('.')||'Request'}: ${i.message}`).join('; ');}
  else if(err.code===11000){status=409;message='A record with this unique value already exists.';}
  else if(['CastError','ValidationError','StrictModeError','SyntaxError'].includes(err.name)){status=400;message='Invalid request data.';}
  else if(err.code==='LIMIT_FILE_SIZE'){status=413;message='File exceeds the 5 MB limit.';}
  if(status>=500)console.error(JSON.stringify({event:'request_error',method:req.method,path:req.route?.path||'unknown',name:err.name,code:err.code}));
  res.status(status).json({success:false,message,data:{}});
});
export default app;
