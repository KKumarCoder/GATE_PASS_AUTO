import { Router } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { GatePass, Student, VisitorPass, StaffPass } from '../models/index.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { wrap, ok, assert } from '../utils/core.js';
import { objectId } from '../validators/index.js';
const router=Router();router.use(authenticate,requirePermission('reports.view'));
function dayStart(){const date=new Date();return new Date(`${date.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})}T00:00:00+05:30`);}
router.get('/dashboard',wrap(async(req,res)=>{
  const today=dayStart();const week=new Date(today.getTime()-6*86400000);
  const [counts,outside,visitors,byDay,byClass,reasons,frequent,recent,late,lateReturns]=await Promise.all([
    GatePass.aggregate([{$match:{createdAt:{$gte:today}}},{$group:{_id:'$status',count:{$sum:1},emergency:{$sum:{$cond:['$isEmergency',1,0]}}}}]),
    GatePass.countDocuments({status:'EXITED'}),VisitorPass.countDocuments({createdAt:{$gte:today}}),
    GatePass.aggregate([{$match:{createdAt:{$gte:week}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'Asia/Kolkata'}},count:{$sum:1}}},{$sort:{_id:1}}]),
    GatePass.aggregate([{$match:{createdAt:{$gte:week}}},{$lookup:{from:'students',localField:'student',foreignField:'_id',as:'student'}},{$unwind:'$student'},{$group:{_id:'$student.className',count:{$sum:1}}},{$sort:{count:-1}}]),
    GatePass.aggregate([{$match:{createdAt:{$gte:week}}},{$group:{_id:'$requestType',count:{$sum:1}}},{$sort:{count:-1}}]),
    GatePass.aggregate([{$match:{createdAt:{$gte:new Date(today.getTime()-30*86400000)}}},{$group:{_id:'$student',count:{$sum:1}}},{$sort:{count:-1}},{$limit:5},{$lookup:{from:'students',localField:'_id',foreignField:'_id',as:'student'}},{$unwind:'$student'},{$project:{name:'$student.name',count:1}}]),
    GatePass.find().populate('student').sort({createdAt:-1}).limit(8),
    GatePass.countDocuments({status:'EXITED','timing.expectedReturn':{$lt:new Date()}}),
    GatePass.aggregate([{$match:{status:'RETURNED','timing.actualReturn':{$gte:week},$expr:{$gt:['$timing.actualReturn','$timing.expectedReturn']}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$timing.actualReturn',timezone:'Asia/Kolkata'}},count:{$sum:1}}},{$sort:{_id:1}}]),
  ]);
  const status=Object.fromEntries(counts.map(c=>[c._id,c.count]));ok(res,{today:counts.reduce((s,c)=>s+c.count,0),outside,returned:status.RETURNED||0,pending:(status.PARENT_VERIFICATION_PENDING||0)+(status.ADMIN_APPROVAL_PENDING||0),approved:(status.READY_FOR_EXIT||0)+(status.EXITED||0)+(status.RETURNED||0)+(status.NO_RETURN_REQUIRED||0),rejected:status.REJECTED||0,visitors,emergency:counts.reduce((s,c)=>s+c.emergency,0),byDay,byClass,reasons,frequent,recent,late,lateReturns});
}));
router.get('/outside-campus',wrap(async(req,res)=>ok(res,{items:await GatePass.find({status:'EXITED'}).populate('student').sort({'timing.expectedReturn':1})})));
router.get('/',wrap(async(req,res)=>{
  const kind=String(req.query.kind||'gatepasses');assert(['gatepasses','visitors','staff'].includes(kind),400,'Invalid report type.');
  const Model=kind==='visitors'?VisitorPass:kind==='staff'?StaffPass:GatePass;const query={};
  if(req.query.from||req.query.to){
    query.createdAt={};
    for(const key of ['from','to'])if(req.query[key]){
      const value=req.query[key];
      assert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),400,'Use YYYY-MM-DD dates.');
      const calendar=new Date(`${value}T00:00:00.000Z`);
      assert(!Number.isNaN(+calendar)&&calendar.toISOString().slice(0,10)===value,400,'Invalid calendar date.');
      query.createdAt[key==='from'?'$gte':'$lte']=new Date(`${value}T${key==='from'?'00:00:00.000':'23:59:59.999'}+05:30`);
    }
    assert(!query.createdAt.$gte||!query.createdAt.$lte||query.createdAt.$gte<=query.createdAt.$lte,400,'From date must not be after to date.');
  }
  if(req.query.status)query.status=String(req.query.status);
  if(req.query.reason&&kind==='gatepasses')query.requestType=String(req.query.reason);
  if(req.query.createdBy){objectId.parse(req.query.createdBy);query.requestedBy=req.query.createdBy;}
  if(kind==='gatepasses'){
    if(req.query.student){objectId.parse(req.query.student);query.student=req.query.student;}
    if(req.query.className||req.query.section){
      const students={};
      if(req.query.student)students._id=req.query.student;
      if(req.query.className)students.className=String(req.query.className);
      if(req.query.section)students.section=String(req.query.section);
      query.student={$in:(await Student.find(students).select('_id')).map(student=>student._id)};
    }
    if(req.query.emergency==='true')query.isEmergency=true;
  }
  if(req.query.pendingReturn==='true'){
    query.status=kind==='visitors'?'CHECKED_IN':'EXITED';
    if(kind==='gatepasses')query['timing.expectedReturn']={$ne:null};
  }
  const items=await Model.find(query).populate(kind==='gatepasses'?['student',{path:'requestedBy',select:'name'}]:kind==='staff'?[{path:'staff',select:'name employeeId'},{path:'requestedBy',select:'name'}]:[{path:'requestedBy',select:'name'}]).sort({createdAt:-1}).limit(5000);
  const rows=items.map(p=>({Pass:p.gatePassNumber||p.passNumber,Name:p.student?.name||p.staff?.name||p.name,Class:p.student?`${p.student.className}-${p.student.section}`:'',Status:p.status,Reason:p.reason||p.purpose,Created:p.createdAt.toISOString(),Exit:(p.timing?.actualExit||p.exitTime||p.entryTime)?.toISOString()||'',Gate:p.timing?.exitGate||'',Return:(p.timing?.actualReturn||p.returnTime)?.toISOString()||'',RequestedBy:p.requestedBy?.name||''}));
  if(!req.query.format)return ok(res,{items,limit:5000});
  const format=String(req.query.format);assert(['csv','xlsx','pdf'].includes(format),400,'Unsupported format.');
  res.setHeader('Content-Disposition',`attachment; filename="srps-${kind}.${format}"`);
  const headers=['Pass','Name','Class','Status','Reason','Created','Exit','Gate','Return','RequestedBy'];
  // Spreadsheet formula neutralization applies to every text cell.
  const safe=v=>/^[\s]*[=+\-@\t\r]/.test(String(v||''))?`'${v}`:String(v||'');
  if(format==='csv'){res.type('text/csv');res.send('\ufeff'+[headers,...rows.map(r=>headers.map(h=>safe(r[h])))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'));}
  else if(format==='xlsx'){const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Gate report');sheet.columns=headers.map(h=>({header:h,key:h,width:24}));for(const row of rows)sheet.addRow(Object.fromEntries(Object.entries(row).map(([k,v])=>[k,safe(v)])));sheet.getRow(1).font={bold:true};res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');await book.xlsx.write(res);res.end();}
  else{res.type('application/pdf');const doc=new PDFDocument({size:'A4',margin:36});doc.pipe(res);doc.fontSize(18).text('Shree Ram Public School — Gate Report');doc.fontSize(9).text(`Generated ${new Date().toISOString()} | ${rows.length} records`).moveDown();for(const row of rows){doc.fontSize(10).text(`${row.Pass} | ${row.Name} | ${row.Status}`);doc.fontSize(8).text(`${row.Class} | ${row.Reason} | Created: ${row.Created}`).moveDown();}doc.end();}
}));
export default router;
