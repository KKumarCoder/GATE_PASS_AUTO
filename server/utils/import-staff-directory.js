import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import {env} from '../config/env.js';
import {StaffMember,AuditLog} from '../models/index.js';
const file=process.argv[2];
if(!file)throw new Error('Provide the staff directory workbook path. Add --apply to import.');
const book=new ExcelJS.Workbook();await book.xlsx.readFile(file);
const sheet=book.worksheets[0],records=[];
const value=(row,col)=>row.getCell(col).text.trim();
function date(text){
 if(!text||text==='-'||text==='N/A')return undefined;
 const match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!match)throw new Error(`Invalid date format: ${text}`);
 const [,d,m,y]=match;const result=new Date(Date.UTC(+y,+m-1,+d));
 if(result.getUTCDate()!==+d||result.getUTCMonth()!==+m-1)throw new Error('Invalid calendar date');return result;
}
for(let i=3;i<=sheet.rowCount;i++){
 const row=sheet.getRow(i),employeeId=value(row,1),name=value(row,2);if(!employeeId&&!name)continue;
 if(!employeeId||!name)throw new Error(`Missing ID/name on row ${i}`);
 const contact=value(row,5),email=contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase()||'';
 const phone=contact.replace(email,'').match(/(?:\+?91[ -]?)?[6-9]\d{9}/)?.[0].replace(/[ -]/g,'')||'';
 records.push({employeeId,name,staffRole:value(row,3),designation:value(row,4),mobile:phone?`+91${phone.slice(-10)}`:'',email,dateOfBirth:date(value(row,6)),dateOfJoining:date(value(row,7)),address:value(row,8),source:'Staff Directory (1).xlsx'});
}
if(new Set(records.map(r=>r.employeeId)).size!==records.length)throw new Error('Duplicate Staff IDs in workbook');
console.log(JSON.stringify({rows:records.length,missingMobile:records.filter(r=>!r.mobile).map(r=>r.employeeId),missingEmail:records.filter(r=>!r.email).map(r=>r.employeeId)}));
if(process.argv.includes('--apply')){
 await mongoose.connect(env.mongo,{serverSelectionTimeoutMS:10000});
 try{
  await StaffMember.init();let inserted=0,unchanged=0;
  await mongoose.connection.transaction(async session=>{
   inserted=0;unchanged=0;
   for(const record of records){
    const existing=await StaffMember.findOne({employeeId:record.employeeId}).session(session);
    if(existing){if(existing.name!==record.name)throw new Error(`Staff ID conflict: ${record.employeeId}`);unchanged++;continue;}
    await StaffMember.create([record],{session});inserted++;
   }
   await AuditLog.create([{action:'STAFF_DIRECTORY_IMPORTED',details:{source:'Staff Directory (1).xlsx',inserted,unchanged}}],{session});
  });
  console.log(JSON.stringify({inserted,unchanged,verified:await StaffMember.countDocuments({employeeId:{$in:records.map(r=>r.employeeId)}})}));
 }finally{await mongoose.disconnect();}
}
