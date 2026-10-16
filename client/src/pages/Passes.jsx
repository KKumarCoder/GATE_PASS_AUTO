import PendingStaffPasses from '../components/PendingStaffPasses';
import VisitorPassPrint from '../components/VisitorPassPrint';
import {can} from '../../../shared/access.mjs';
import AppLoader from '../components/AppLoader';
import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {Plus,Search,ArrowLeft,ShieldCheck,Download,Printer,Send,Check,Clock,Trash2,CheckCircle2,BriefcaseBusiness} from 'lucide-react';
import {useData,useDebounce} from '../hooks/useData';
import {useAuth} from '../context/AuthContext';
import {post,get,download,api} from '../services/api';
import {PageTitle,DataState,Empty,Field,Avatar,Badge,Pager,Modal,act,time,pretty} from '../components/UI';
import {PassTable} from '../components/PassTable';
import {GatePassDocument} from '../components/GatePassDocument';
export const passStatuses=['PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT','EXITED','RETURNED','NO_RETURN_REQUIRED','REJECTED','CANCELLED','EXPIRED'];
export const staffStatuses=['REQUESTED','APPROVED','EXITED','RETURNED'];
export function Passes({pending=false,outside=false}){
  const {user}=useAuth(),admin=can(user,'passes.approve');
  const [passType,setPassType]=useState('ALL');
  const [search,setSearch]=useState(''),[status,setStatus]=useState(pending?'ADMIN_APPROVAL_PENDING':''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1),[limit,setLimit]=useState(5),[statusTarget,setStatusTarget]=useState(null),[newStatus,setNewStatus]=useState(''),[reason,setReason]=useState(''),[deleteTarget,setDeleteTarget]=useState(null),[busy,setBusy]=useState(false);
  const [deleted,setDeleted]=useState(false),[restoreTarget,setRestoreTarget]=useState(null);
  const [staffPrint,setStaffPrint]=useState(null),[staffView,setStaffView]=useState(null);
  const settings=useData('/settings');
  const q=useDebounce(search);
  const typeParam=outside||pending?'':`&type=${passType.toLowerCase()}`;
  const queryString=`/gatepasses?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&from=${from}&to=${to}&page=${page}&limit=${limit}&deleted=${deleted&&!pending&&!outside&&passType!=='STAFF'}${typeParam}`;
  const query=useData(outside?'/reports/outside-campus':queryString);
  async function updateStatus(){
    setBusy(true);
    try{await act(()=>post(`/gatepasses/${statusTarget._id}/${newStatus.toLowerCase()}`,{reason}),'Gate pass status updated');setStatusTarget(null);setNewStatus('');setReason('');query.reload();}
    catch{}finally{setBusy(false);}
  }
  async function deletePass(){
    setBusy(true);
    try{await act(()=>api.delete(`/gatepasses/${deleteTarget._id}`),'Gate pass moved to Deleted passes');setDeleteTarget(null);query.reload();}
    catch{}finally{setBusy(false);}
  }
  async function restorePass(){
    setBusy(true);
    try{await act(()=>post(`/gatepasses/${restoreTarget._id}/restore`,{}),'Gate pass restored');setRestoreTarget(null);query.reload();}
    catch{}finally{setBusy(false);}
  }
  async function handlePrintStaff(pass){
    try{
      const data=await act(()=>get(`/staff-passes/${pass._id}/print`));
      setStaffPrint(data);
    }catch{
      setStaffView(pass);
    }
  }
  function resetPage(action){setPage(1);action();}
  const statusOptions=passType==='STAFF'?staffStatuses:passType==='STUDENT'?passStatuses:[...new Set([...passStatuses,...staffStatuses])];
  return <>
    {pending&&can(user,'staff.approve')&&<PendingStaffPasses/>}
    <PageTitle title={outside?'Students outside campus':pending?'Pending requests':'Gate passes'} description={outside?'Track departures and expected returns. Overdue students need your attention.':'Every request, approval and movement in one place.'}>
      <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
        {can(user,'staff.request')&&<Link className="button secondary" to="/staff"><BriefcaseBusiness size={17}/> Staff movement</Link>}
        {can(user,'passes.create')&&<Link className="button primary" to="/gatepasses/new"><Plus size={17}/> New student pass</Link>}
      </div>
    </PageTitle>
    <section className="card table-card">
      {!outside&&!pending&&<div className="filter-bar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',borderBottom:'1px solid var(--line)',paddingBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <button type="button" className={`button ${passType==='ALL'?'primary':'secondary'}`} onClick={()=>resetPage(()=>setPassType('ALL'))}>All gate passes</button>
          <button type="button" className={`button ${passType==='STUDENT'?'primary':'secondary'}`} onClick={()=>resetPage(()=>setPassType('STUDENT'))}>Student passes</button>
          <button type="button" className={`button ${passType==='STAFF'?'primary':'secondary'}`} onClick={()=>resetPage(()=>setPassType('STAFF'))}>Staff passes</button>
        </div>
        {admin&&passType!=='STAFF'&&<div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button type="button" className={`button small ${deleted?'secondary':'primary'}`} onClick={()=>resetPage(()=>setDeleted(false))}>Active passes</button>
          <button type="button" className={`button small ${deleted?'primary':'secondary'}`} onClick={()=>resetPage(()=>setDeleted(true))}>Deleted passes</button>
        </div>}
      </div>}
      {!outside&&<div className="filter-bar">
        <div className="search-input"><Search size={17}/><input placeholder={passType==='STAFF'?'Search staff name or pass number':passType==='STUDENT'?'Search student name or pass number':'Search name or pass number'} value={search} onChange={e=>resetPage(()=>setSearch(e.target.value))}/></div>
        <select aria-label="Status" value={status} onChange={e=>resetPage(()=>setStatus(e.target.value))}><option value="">All statuses</option>{statusOptions.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select>
        <Field label="From date"><input type="date" aria-label="From date" value={from} onChange={e=>resetPage(()=>setFrom(e.target.value))}/></Field>
        <Field label="To date"><input type="date" aria-label="To date" value={to} onChange={e=>resetPage(()=>setTo(e.target.value))}/></Field>
        <Field label="Rows per page"><select aria-label="Rows per page" value={limit} onChange={e=>resetPage(()=>setLimit(Number(e.target.value)))}>{[5,10,20,50].map(size=><option key={size} value={size}>{size}</option>)}</select></Field>
      </div>}
      <DataState query={query}>{outside?<div className="outside-grid">{query.data?.items.length?query.data.items.map(p=><Link to={`/gatepasses/${p._id}`} className={`outside-card ${new Date(p.timing.expectedReturn)<new Date()?'overdue':''}`} key={p._id}><div className="person"><Avatar name={p.student?.name||'Student record deleted'} photo={p.student?.photo}/><div><strong>{p.student?.name||'Student record deleted'}</strong><small>{p.student?`${p.student.className}-${p.student.section}`:'Historical pass'}</small></div><Badge value={new Date(p.timing.expectedReturn)<new Date()?'OVERDUE':'EXITED'}/></div><p className="mono">{p.gatePassNumber}</p><dl><dt>Exited</dt><dd>{time(p.timing.actualExit)}</dd><dt>Expected return</dt><dd>{time(p.timing.expectedReturn)}</dd><dt>Reason</dt><dd>{p.reason}</dd><dt>Guardian</dt><dd>{p.guardian.name}</dd></dl></Link>):<Empty title="No students awaiting return" description="Students with an active return requirement will appear here after exit."/>}</div>:<><PassTable items={query.data?.items} admin={admin} deleted={deleted&&!pending} onRestore={setRestoreTarget} onStatus={pass=>{setStatusTarget(pass);setNewStatus('CANCELLED');}} onDelete={setDeleteTarget} onPrintStaff={handlePrintStaff} onViewStaff={setStaffView}/><Pager page={page} total={query.data?.total} limit={limit} onChange={setPage}/></>}</DataState>
    </section>
    {statusTarget&&<Modal title={`Update ${statusTarget.gatePassNumber} status`} onClose={()=>!busy&&setStatusTarget(null)}><form onSubmit={e=>{e.preventDefault();updateStatus();}}><Field label="New status"><select required value={newStatus} onChange={e=>setNewStatus(e.target.value)}><option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option></select></Field><Field label="Reason (required for audit history)"><textarea required value={reason} onChange={e=>setReason(e.target.value)}/></Field><div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setStatusTarget(null)}>No, keep current status</button><button className="button primary" disabled={busy}>{busy&&<AppLoader inline label="Updating"/>}Update status</button></div></form></Modal>}
    {restoreTarget&&<Modal title="Restore gate pass?" onClose={()=>!busy&&setRestoreTarget(null)}><p>Restore <strong>{restoreTarget.gatePassNumber}</strong> for <strong>{restoreTarget.student?.name}</strong>?</p><p className="muted">Original approvals, expiry and exit history are retained. Expired or already-used passes do not gain a new exit. Pending parent verification needs a fresh OTP or approval link.</p><div className="form-footer"><button className="button secondary" disabled={busy} onClick={()=>setRestoreTarget(null)}>Cancel</button><button className="button primary" disabled={busy} onClick={restorePass}>{busy&&<AppLoader inline label="Restoring"/>}Restore pass</button></div></Modal>}
    {deleteTarget&&<Modal title="Move gate pass to Deleted passes?" onClose={()=>!busy&&setDeleteTarget(null)}><p>Are you sure you want to delete gate pass <strong>{deleteTarget.gatePassNumber}</strong>?</p><p className="muted">The pass will be disabled and saved under Deleted passes. An administrator can restore it. Pending parent verification will need a fresh OTP or approval link.</p><div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setDeleteTarget(null)}>No, keep pass</button><button type="button" className="button danger" disabled={busy} onClick={deletePass}>{busy&&<AppLoader inline label="Deleting"/>}<Trash2 size={16}/>Yes, delete</button></div></Modal>}
    {staffPrint&&<VisitorPassPrint kind="staff" pass={staffPrint} image={staffPrint?.image||staffPrint?.qrImage} schoolName={settings.data?.schoolName} onClose={()=>setStaffPrint(null)}/>}
    {staffView&&<Modal title="Staff Gate Pass Details" onClose={()=>setStaffView(null)}>
      <div className="student-summary">
        <Avatar name={staffView.staff?.name||'Staff'} photo={staffView.staff?.photo} large/>
        <div>
          <h2>{staffView.staff?.name||'Staff member'}</h2>
          <p>{staffView.gatePassNumber||staffView.passNumber} · {staffView.staff?.employeeId?`ID: ${staffView.staff.employeeId}`:''} {staffView.department?`· ${staffView.department}`:''}</p>
          <Badge value={staffView.status}/>
        </div>
      </div>
      <dl>
        <div><dt>Reason</dt><dd>{staffView.reason||'Staff movement'}</dd></div>
        <div><dt>Requested On</dt><dd>{time(staffView.createdAt)}</dd></div>
        {staffView.expectedReturn&&<div><dt>Expected Return</dt><dd>{time(staffView.expectedReturn)}</dd></div>}
        {staffView.exitTime&&<div><dt>Actual Exit</dt><dd>{time(staffView.exitTime)}</dd></div>}
        {staffView.returnTime&&<div><dt>Actual Return</dt><dd>{time(staffView.returnTime)}</dd></div>}
        {staffView.approvedBy?.name&&<div><dt>Approved By</dt><dd>{staffView.approvedBy.name}</dd></div>}
      </dl>
      <div className="form-footer">
        <button type="button" className="button secondary" onClick={()=>setStaffView(null)}>Close</button>
        {staffView.status==='APPROVED'&&<button type="button" className="button primary" onClick={()=>handlePrintStaff(staffView)}><Printer size={16}/> Print Gate Pass</button>}
      </div>
    </Modal>}
  </>;
}
const localDate=offset=>{const d=new Date(Date.now()+offset);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function NewPass(){
  const [params]=useSearchParams(),[search,setSearch]=useState(''),[student,setStudent]=useState(null),[step,setStep]=useState(1),[activePass,setActivePass]=useState(null),navigate=useNavigate(),{user}=useAuth();
  const [otp,setOtp]=useState(''),[otpBusy,setOtpBusy]=useState(false),[otpCooldown,setOtpCooldown]=useState(0),[approveBusy,setApproveBusy]=useState(false),[qrData,setQrData]=useState(null);
  const q=useDebounce(search),query=useData(search?`/students?q=${encodeURIComponent(q)}&status=ACTIVE`:null),drivers=useData('/bus-drivers'),settings=useData('/settings');
  const consoleOTP=settings.data?.otpDeliveryMode==='console';
  const admin=can(user,'passes.approve');
  const {register,handleSubmit,setValue,watch,reset,formState:{isSubmitting,errors}}=useForm({defaultValues:{recurrence:'SINGLE',requestType:'PARENT_REQUEST',requestedExit:localDate(60000),expectedReturn:'',returnRequired:false,guardianType:'Father',busNumber:''}});
  const guardianType=watch('guardianType'),type=watch('requestType'),skipVerification=type!=='EMERGENCY'&&watch('skipParentVerification');
  const recurrence=watch('recurrence'),requestedExit=watch('requestedExit'),isRecurring=recurrence!=='SINGLE';

  useEffect(()=>{
    if(otpCooldown>0){
      const timer=setTimeout(()=>setOtpCooldown(c=>c-1),1000);
      return()=>clearTimeout(timer);
    }
  },[otpCooldown]);

  useEffect(()=>{
    if(activePass?.status==='READY_FOR_EXIT'&&activePass?._id&&!qrData){
      get(`/gatepasses/${activePass._id}/qr`).then(setQrData).catch(()=>{});
    }
  },[activePass,qrData]);

  useEffect(()=>{
    if(!isRecurring||!requestedExit)return;
    const start=new Date(`${requestedExit.slice(0,10)}T12:00:00Z`),end=new Date(start);
    if(recurrence==='WEEKLY')end.setUTCDate(end.getUTCDate()+6);
    else {const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));end.setUTCDate(end.getUTCDate()-1);}
    setValue('validUntil',end.toISOString().slice(0,10));setValue('returnRequired',false);if(watch('requestType')==='EMERGENCY')setValue('requestType','PARENT_REQUEST');
  },[recurrence,requestedExit,isRecurring,setValue]);

  useEffect(()=>{if(params.get('student'))get(`/students/${params.get('student')}`).then(setStudent).catch(()=>{});},[params]);

  useEffect(()=>{if(student){setValue('guardianName',guardianType==='Father'?student.fatherName:guardianType==='Mother'?student.motherName:guardianType==='Guardian'?student.guardianName:guardianType==='Self'?student.name:'');setValue('guardianMobile',['Father','Mother','Guardian'].includes(guardianType)?student.primaryMobile:'');}},[student,guardianType,setValue]);

  const onDepartureSubmit=async values=>{
    const body={
      student:student._id,
      busNumber:values.busNumber||'',
      requestType:values.requestType,
      reason:values.reason,
      requestedExit:new Date(values.requestedExit).toISOString(),
      expectedReturn:values.returnRequired?new Date(values.expectedReturn).toISOString():null,
      guardian:{type:values.guardianType,name:values.guardianName,mobile:values.guardianMobile||'',relationship:values.guardianType}
    };
    body.recurrence=values.recurrence;
    if(isRecurring){body.validUntil=values.validUntil;body.expectedReturn=null;}
    if(skipVerification){body.skipParentVerification=true;body.verificationSkipReason=values.verificationSkipReason.trim();}
    if(type==='EMERGENCY')body.emergency={authority:values.authority,contactAttempt:values.contactAttempt};
    try{
      const result=await act(()=>post('/gatepasses',body),'Gate pass request created');
      const passWithStudent={...result,student};
      setActivePass(passWithStudent);
      if(result.status==='PARENT_VERIFICATION_PENDING'){
        setStep(3);
        try{
          await post(`/gatepasses/${result._id}/send-otp`,consoleOTP?{}:{channel:'sms'});
          setOtpCooldown(60);
        }catch{}
      }else{
        setStep(4);
      }
    }catch{}
  };

  const handleSendOtp=async(channel='sms')=>{
    if(!activePass?._id||otpCooldown>0||otpBusy)return;
    setOtpBusy(true);
    try{
      await act(()=>post(`/gatepasses/${activePass._id}/send-otp`,consoleOTP?{}:{channel}),'OTP sent to parent');
      setOtpCooldown(60);
    }catch{}finally{setOtpBusy(false);}
  };

  const handleApprovalLink=async()=>{
    if(!activePass?._id||otpBusy)return;
    setOtpBusy(true);
    try{
      await act(()=>post(`/gatepasses/${activePass._id}/approval-link`),'Approval link sent');
    }catch{}finally{setOtpBusy(false);}
  };

  const handleVerifyOtp=async e=>{
    e?.preventDefault();
    if(!otp||otp.length!==6||otpBusy)return;
    setOtpBusy(true);
    try{
      await act(()=>post(`/gatepasses/${activePass._id}/verify-otp`,{otp}),'Parent OTP verified successfully');
      const updated=await get(`/gatepasses/${activePass._id}`);
      setActivePass(updated);
      setStep(4);
    }catch{}finally{setOtpBusy(false);}
  };

  const handleApprove=async()=>{
    if(!activePass?._id||approveBusy)return;
    setApproveBusy(true);
    try{
      const res=await act(()=>post(`/gatepasses/${activePass._id}/approve`),'Gate pass approved successfully');
      const updated=res?.pass||await get(`/gatepasses/${activePass._id}`);
      setActivePass(updated);
      try{
        const qrRes=await get(`/gatepasses/${activePass._id}/qr`);
        setQrData(qrRes);
      }catch{}
    }catch{}finally{setApproveBusy(false);}
  };

  const handleReset=()=>{
    setStep(1);
    setStudent(null);
    setActivePass(null);
    setOtp('');
    setQrData(null);
    reset({recurrence:'SINGLE',requestType:'PARENT_REQUEST',requestedExit:localDate(60000),expectedReturn:'',returnRequired:false,guardianType:'Father',busNumber:''});
  };

  const stepsList=['Select student','Departure details','Parent verification','Approve & Print'];

  return <>
    <PageTitle title="Create a gate pass" description="A verified departure begins with the right details."><Link className="button secondary" to="/gatepasses"><ArrowLeft size={16}/> All passes</Link></PageTitle>
    <div className="steps">{stepsList.map((label,i)=><div className={step>=i+1?'active':''} key={label}><span>{step>i+1?<Check size={15}/>:i+1}</span>{label}</div>)}</div>
    <div className="form-layout">
      <section className="card">
        {step===1&&<>
          <div className="section-head"><div><h2>Find your student</h2><p>Search the school’s registered student directory.</p></div></div>
          <div className="search-input large-input"><Search size={19}/><input placeholder="Name, admission number or registered mobile" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {search&&<DataState query={query}><div className="student-results">{query.data?.items.length?query.data.items.map(s=><button className={student?._id===s._id?'selected':''} key={s._id} onClick={()=>setStudent(s)}><Avatar name={s.name} photo={s.photo}/><div><strong>{s.name}</strong><small>{s.admissionNumber} · Class {s.className}-{s.section}</small></div><span>Select</span></button>):<Empty title="No active students match"/>}</div></DataState>}
          {student&&<div className="student-summary"><Avatar name={student.name} photo={student.photo} large/><div><h2>{student.name}</h2><p>{student.admissionNumber} · {student.className}-{student.section}</p><small>Father: {student.fatherName||'—'} · Mother: {student.motherName||'—'}</small><p>{student.primaryMobile}</p></div></div>}
          <div className="form-footer"><button className="button primary" disabled={!student} onClick={()=>setStep(2)}>Continue to departure details →</button></div>
        </>}

        {step===2&&<form onSubmit={handleSubmit(onDepartureSubmit)}>
          <div className="section-head"><h2>Departure details</h2><button type="button" className="text-link" onClick={()=>setStep(1)}>Change student</button></div>
          <div className="person selected-student"><Avatar name={student.name} photo={student.photo}/><div><strong>{student.name}</strong><small>{student.className}-{student.section} · {student.admissionNumber}</small></div></div>
          <div className="form-grid">
            <Field label="Pass validity"><select {...register('recurrence')}><option value="SINGLE">Single day / one exit</option><option value="WEEKLY">Weekly reusable pass</option><option value="MONTHLY">Monthly reusable pass</option></select></Field>
            {isRecurring&&<Field label="Last valid date (inclusive)"><input type="date" required min={requestedExit?.slice(0,10)} {...register('validUntil')}/></Field>}
            <Field label="Gate pass type"><select {...register('requestType')}>{['EARLY_LEAVE','SHORT_LEAVE','MEDICAL',...(can(user,'passes.emergency')&&!isRecurring?['EMERGENCY']:[]),'PARENT_REQUEST','SCHOOL_WORK','OTHER'].map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></Field>
            <Field label={isRecurring?"Start date and daily exit time (IST)":"Requested exit"}><input type="datetime-local" required {...register('requestedExit')}/></Field>
            <Field label="Bus number (driver notification)"><select {...register('busNumber')}><option value="">No bus / do not notify a driver</option>{drivers.data?.items.map(driver=><option key={driver.busNumber} value={driver.busNumber} disabled={!driver.emailConfigured}>Bus {driver.busNumber} · {driver.driverName}{driver.emailConfigured?'':' · email unavailable'}</option>)}</select></Field>
            <Field label="Accompanying person"><select {...register('guardianType')}>{['Father','Mother','Guardian','Self','Teacher','Other'].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Authorized person’s name"><input required {...register('guardianName')}/></Field>
            <Field label="Accompanying person’s mobile"><input required={guardianType==='Other'} placeholder="+91XXXXXXXXXX" {...register('guardianMobile')}/></Field>
            <Field label="Expected return">{!isRecurring&&watch('returnRequired')?<input type="datetime-local" required {...register('expectedReturn')}/>:<input type="text" value="None" disabled readOnly/>}</Field>
          </div>
          <label className="checkbox"><input type="checkbox" disabled={isRecurring} {...register('returnRequired')}/> Student will return to campus</label>
          {isRecurring&&<div className="note">The same QR allows one exit per day, at or after the selected time, until the last valid date (IST). Each exit is recorded separately. Parent verification and administrator approval are completed once for the whole period. This pass does not track same-day returns.</div>}
          <Field label="Reason for departure"><textarea rows={3} maxLength={500} required {...register('reason')}/></Field>
          {type!=='EMERGENCY'&&<>
            <label className="checkbox"><input type="checkbox" {...register('skipParentVerification')}/> Without email / OTP verification</label>
            {skipVerification&&<div className="warning-box"><p>Use this option when the parent cannot complete email or OTP verification. Administrator approval is still required.</p><Field label="Reason for skipping verification (required)" error={errors.verificationSkipReason?.message}><textarea rows={3} required maxLength={500} {...register('verificationSkipReason',{validate:value=>!skipVerification||Boolean(value?.trim())||'Please enter a reason for skipping verification.'})}/></Field></div>}
          </>}
          {type==='EMERGENCY'&&<div className="warning-box"><strong>Recorded emergency override</strong><p>Parent verification is bypassed only with a recorded contact attempt. Administrator approval is still required.</p><Field label="Approving authority"><input required {...register('authority')}/></Field><Field label="Parent contact attempt and outcome"><textarea required {...register('contactAttempt')}/></Field></div>}
          <div className="form-footer">
            <button type="button" className="button secondary" onClick={()=>setStep(1)}>Back</button>
            <button className="button primary" disabled={isSubmitting}>
              {isSubmitting&&<AppLoader inline label="Processing…"/>}
              {skipVerification||type==='EMERGENCY'?'Create request for admin approval →':'Proceed to OTP verification →'}
            </button>
          </div>
        </form>}

        {step===3&&activePass&&<div className="pass-flow-step">
          <div className="section-head">
            <div>
              <h2>Parent OTP Verification</h2>
              <p>Confirm departure authorization by entering the code sent to the parent.</p>
            </div>
            <Badge status={activePass.status}/>
          </div>

          <div className="person selected-student" style={{marginBottom:'18px'}}>
            <Avatar name={activePass.student?.name} photo={activePass.student?.photo} large/>
            <div>
              <strong style={{fontSize:'15px'}}>{activePass.student?.name}</strong>
              <small>{activePass.student?.className}-{activePass.student?.section} · Admission No: {activePass.student?.admissionNumber}</small>
              <div style={{display:'flex',gap:'15px',flexWrap:'wrap',marginTop:'6px',fontSize:'11px',color:'#68778d'}}>
                <span><strong>Gate Pass:</strong> {activePass.gatePassNumber}</span>
                <span><strong>Accompanying:</strong> {activePass.guardian?.name} ({activePass.guardian?.type})</span>
                <span><strong>Exit Time:</strong> {time(activePass.timing?.requestedExit)}</span>
              </div>
            </div>
          </div>

          {consoleOTP?(
            <div className="note" role="status" style={{background:'#eef4ff',border:'1px solid #c9dcfe',color:'#1a4480',borderRadius:'8px'}}>
              <strong>Development OTP Mode Active</strong>
              <p style={{margin:'4px 0 0'}}>The 6-digit verification code has been printed in the server terminal for local testing.</p>
            </div>
          ):(
            <div className="note" role="status" style={{borderRadius:'8px'}}>
              <Send size={15}/>
              <span>Verification OTP sent to parent’s registered mobile: <strong>{activePass.student?.primaryMobile||'on record'}</strong></span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} style={{padding:'24px 16px',margin:'18px 0',border:'1px solid #dce4f0',borderRadius:'10px',textAlign:'center',background:'#fafcff'}}>
            <div style={{maxWidth:'380px',margin:'0 auto'}}>
              <h3 style={{fontSize:'15px',marginBottom:'8px',color:'#172b4d'}}>Enter 6-Digit Parent Verification Code</h3>
              <p className="muted" style={{fontSize:'12px',marginBottom:'18px'}}>Ask the parent for the OTP to confirm their permission for departure.</p>

              <div style={{marginBottom:'18px'}}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  placeholder="• • • • • •"
                  onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  style={{
                    fontSize:'28px',
                    fontWeight:'700',
                    textAlign:'center',
                    letterSpacing:'12px',
                    padding:'10px 14px',
                    fontFamily:'monospace',
                    borderRadius:'10px',
                    border:'2px solid #3d68a2',
                    boxShadow:'0 2px 8px rgba(35,78,140,0.08)',
                    background:'#ffffff',
                    color:'#152945'
                  }}
                />
              </div>

              <button
                type="submit"
                className="button primary full"
                disabled={otp.length!==6||otpBusy}
                style={{minHeight:'46px',fontSize:'13px',fontWeight:'600'}}
              >
                {otpBusy&&<AppLoader inline label="Verifying OTP…"/>}
                <Check size={18}/> Verify OTP & Proceed to Approval →
              </button>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px',gap:'10px'}}>
                <button
                  type="button"
                  className="text-link"
                  disabled={otpCooldown>0||otpBusy}
                  onClick={()=>handleSendOtp('sms')}
                  style={{cursor:otpCooldown>0?'not-allowed':'pointer'}}
                >
                  {otpCooldown>0?`Resend OTP (${otpCooldown}s)`:'Resend OTP'}
                </button>
                <button
                  type="button"
                  className="text-link"
                  disabled={otpBusy}
                  onClick={handleApprovalLink}
                >
                  Send Approval Link
                </button>
              </div>
            </div>
          </form>

          <div className="form-footer" style={{justifyContent:'space-between'}}>
            <button type="button" className="button secondary" onClick={()=>navigate('/gatepasses')}>
              Back to passes
            </button>
            <button type="button" className="button secondary" onClick={()=>navigate(`/gatepasses/${activePass._id}`)}>
              View pass details
            </button>
          </div>
        </div>}

        {step===4&&activePass&&<div className="pass-flow-step">
          {activePass.status==='ADMIN_APPROVAL_PENDING'&&<div className="approval-stage-card" style={{padding:'24px',border:'1px solid #dce5f2',borderRadius:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'18px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'#eaf5ef',color:'#2b825e',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <CheckCircle2 size={24}/>
              </div>
              <div>
                <h2 style={{fontSize:'18px',color:'#183153'}}>Parent Consent Verified</h2>
                <p className="muted" style={{fontSize:'12px'}}>Gate Pass ID: {activePass.gatePassNumber} · Ready for Administrator Approval</p>
              </div>
              <div style={{marginLeft:'auto'}}>
                <Badge status={activePass.status}/>
              </div>
            </div>

            <div className="person selected-student" style={{marginBottom:'20px'}}>
              <Avatar name={activePass.student?.name} photo={activePass.student?.photo} large/>
              <div>
                <strong style={{fontSize:'15px'}}>{activePass.student?.name}</strong>
                <small>{activePass.student?.className}-{activePass.student?.section} · Admission: {activePass.student?.admissionNumber}</small>
                <p style={{margin:'4px 0 0',fontSize:'12px',color:'#57677d'}}><strong>Reason:</strong> {activePass.reason}</p>
                <p style={{margin:'2px 0 0',fontSize:'11px',color:'#7a889b'}}><strong>Departure:</strong> {time(activePass.timing?.requestedExit)} | <strong>Accompanying:</strong> {activePass.guardian?.name} ({activePass.guardian?.type})</p>
              </div>
            </div>

            {admin?(
              <div style={{background:'#f5f8fd',borderRadius:'10px',padding:'24px',border:'1px solid #d7e4f7',textAlign:'center'}}>
                <ShieldCheck size={36} style={{color:'#2b5ea7',marginBottom:'8px'}}/>
                <h3 style={{fontSize:'16px',color:'#162d4e',marginBottom:'6px'}}>Approve Departure & Generate Secure QR</h3>
                <p className="muted" style={{fontSize:'12px',maxWidth:'480px',margin:'0 auto 18px'}}>
                  Parent authorization is recorded. Authorize this departure to generate the official encrypted QR code for gate exit scanning and enable printing.
                </p>
                <button
                  type="button"
                  className="button primary"
                  disabled={approveBusy}
                  onClick={handleApprove}
                  style={{minHeight:'48px',padding:'12px 30px',fontSize:'14px',fontWeight:'600',boxShadow:'0 4px 14px rgba(23,55,98,0.22)'}}
                >
                  {approveBusy&&<AppLoader inline label="Approving Gate Pass…"/>}
                  <Check size={20}/> Approve Gate Pass & Generate QR
                </button>
              </div>
            ):(
              <div className="warning-box">
                <strong>Awaiting Administrator Approval</strong>
                <p>Parent verification has been completed. An administrator or principal must approve this pass before it can be printed or used at the school gate.</p>
                <button type="button" className="button secondary" onClick={()=>navigate('/gatepasses')}>Back to All Passes</button>
              </div>
            )}
          </div>}

          {activePass.status==='READY_FOR_EXIT'&&<div className="print-ready-stage" style={{padding:'24px',border:'1px solid #d5ebd8',borderRadius:'10px',background:'#ffffff'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px',borderBottom:'1px solid #eef3f0',paddingBottom:'16px'}}>
              <div style={{width:'46px',height:'46px',borderRadius:'50%',background:'#eaf6ef',color:'#238659',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <CheckCircle2 size={26}/>
              </div>
              <div>
                <h2 style={{fontSize:'19px',color:'#183827',margin:0}}>Gate Pass Approved & Ready for Exit</h2>
                <p className="muted" style={{fontSize:'12px',margin:'3px 0 0'}}>Official QR code is generated. You can now print the gate pass.</p>
              </div>
              <div style={{marginLeft:'auto'}}>
                <Badge status="READY_FOR_EXIT"/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:qrData?'170px 1fr':'1fr',gap:'20px',alignItems:'center',background:'#f8fafc',padding:'18px',borderRadius:'10px',border:'1px solid #e4ecf4',marginBottom:'24px'}}>
              {qrData?.image&&(
                <div style={{textAlign:'center',background:'#ffffff',padding:'12px',borderRadius:'8px',border:'1px solid #dce4ee'}}>
                  <img src={qrData.image} alt="Official Gate Pass QR" style={{width:'135px',height:'135px',display:'block',margin:'0 auto'}}/>
                  <small style={{fontSize:'10px',color:'#6a7d97',display:'block',marginTop:'6px',fontWeight:'600'}}>OFFICIAL QR CODE</small>
                </div>
              )}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                  <Avatar name={activePass.student?.name} photo={activePass.student?.photo}/>
                  <div>
                    <strong style={{fontSize:'15px',color:'#172c47'}}>{activePass.student?.name}</strong>
                    <small style={{display:'block',color:'#738398'}}>{activePass.student?.className}-{activePass.student?.section} · Admission: {activePass.student?.admissionNumber}</small>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:'10px',fontSize:'12px',marginTop:'10px'}}>
                  <div style={{background:'#ffffff',padding:'8px 12px',borderRadius:'6px',border:'1px solid #eef2f6'}}>
                    <span style={{color:'#8898aa',display:'block',fontSize:'10px'}}>GATE PASS ID</span>
                    <strong style={{fontFamily:'monospace',fontSize:'13px',color:'#1c365b'}}>{activePass.gatePassNumber}</strong>
                  </div>
                  <div style={{background:'#ffffff',padding:'8px 12px',borderRadius:'6px',border:'1px solid #eef2f6'}}>
                    <span style={{color:'#8898aa',display:'block',fontSize:'10px'}}>EXIT TIME</span>
                    <strong style={{fontSize:'12px',color:'#1c365b'}}>{time(activePass.timing?.requestedExit)}</strong>
                  </div>
                  <div style={{background:'#ffffff',padding:'8px 12px',borderRadius:'6px',border:'1px solid #eef2f6'}}>
                    <span style={{color:'#8898aa',display:'block',fontSize:'10px'}}>ACCOMPANYING</span>
                    <strong style={{fontSize:'12px',color:'#1c365b'}}>{activePass.guardian?.name} ({activePass.guardian?.type})</strong>
                  </div>
                  <div style={{background:'#ffffff',padding:'8px 12px',borderRadius:'6px',border:'1px solid #eef2f6'}}>
                    <span style={{color:'#8898aa',display:'block',fontSize:'10px'}}>APPROVED BY</span>
                    <strong style={{fontSize:'12px',color:'#1c365b'}}>{activePass.approval?.approvedBy?.name||user?.name||'Administrator'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
              <button
                type="button"
                className="button primary"
                onClick={()=>navigate(`/gatepasses/${activePass._id}/print`)}
                style={{
                  minHeight:'46px',
                  padding:'11px 24px',
                  fontSize:'13px',
                  fontWeight:'650',
                  background:'#143c68',
                  boxShadow:'0 3px 10px rgba(20,60,104,0.22)',
                  display:'inline-flex',
                  alignItems:'center',
                  gap:'8px'
                }}
              >
                <Printer size={18}/> PRINT GATE PASS (58mm / A4)
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={()=>act(()=>download(`/gatepasses/${activePass._id}/pdf`,`${activePass.gatePassNumber}.pdf`),'PDF downloaded').catch(()=>{})}
                style={{minHeight:'46px',padding:'11px 18px',fontSize:'12px',gap:'7px'}}
              >
                <Download size={16}/> Download PDF
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={()=>navigate(`/gatepasses/${activePass._id}`)}
                style={{minHeight:'46px',padding:'11px 18px',fontSize:'12px'}}
              >
                View Pass
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={handleReset}
                style={{minHeight:'46px',padding:'11px 18px',fontSize:'12px',marginLeft:'auto'}}
              >
                <Plus size={16}/> Create Another Pass
              </button>
            </div>
          </div>}
        </div>}
      </section>

      <aside className="card help-card">
        <ShieldCheck size={30}/>
        <h2>Safety at every step</h2>
        <p>Parent verification is sent only to the mobile number registered in the student profile.</p>
        <ol>
          <li>Select an active student.</li>
          <li>Record departure and guardian details.</li>
          <li>Complete parent OTP verification.</li>
          <li>Get administrator approval.</li>
          <li>Print verified pass with official QR.</li>
        </ol>
        <div className="note">Only an approved, valid pass can be printed and used at the school gate.</div>
      </aside>
    </div>
  </>;
}
export function PassDetail(){
  const {id}=useParams(),settings=useData('/settings'),query=useData(`/gatepasses/${id}`),qr=useData(query.data?.qr?.generatedAt?`/gatepasses/${id}/qr`:null),{user}=useAuth(),[otp,setOtp]=useState(''),[otpChannel,setOtpChannel]=useState('sms'),[decision,setDecision]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
  const consoleOTP=settings.data?.otpDeliveryMode==='console',p=query.data,admin=can(user,'passes.approve'),creator=can(user,'passes.create'),channels=settings.data?.otpChannels;
  useEffect(()=>{if(channels?.sms===false&&channels.email)setOtpChannel('email');},[channels]);
  const channelAvailable=consoleOTP||Boolean(otpChannel==='sms'?channels?.sms:channels?.email&&p?.student?.email);
  const run=async(action,data)=>{setBusy(true);try{await act(()=>post(`/gatepasses/${id}/${action}`,data));query.reload();setDecision('');}catch{}finally{setBusy(false);}};
  return <>
    <PageTitle title="Gate pass details" description={p?.gatePassNumber}><Link className="button secondary" to="/gatepasses"><ArrowLeft size={16}/> Back to passes</Link></PageTitle>
    <DataState query={query}>{p&&<div className="form-layout gate-pass-detail-layout">
      <GatePassDocument pass={p} settings={settings.data} qr={qr.data?.image}/>
      <aside className="card no-print">
        {p.recurring?.enabled&&<div className="note"><strong>{pretty(p.recurring.period)} reusable pass</strong><p>{p.passDate} to {p.recurring.endDate} (inclusive), daily exit from {p.recurring.exitTime} IST.</p><strong>Daily exit history</strong>{p.recurring.exits?.length?<ul>{p.recurring.exits.map(exit=><li key={exit._id||exit.date}>{time(exit.exitedAt)} · {exit.gate}</li>)}</ul>:<p>No exits recorded yet.</p>}</div>}
        <h2>Pass actions</h2><p className="muted">Actions follow the current approval stage.</p>
        {consoleOTP&&<div className="note" role="status"><strong>Development OTP mode</strong><p>Generate an OTP, then copy it from the backend terminal into the field below. No parent OTP is sent through WhatsApp.</p></div>}
        {creator&&p.status==='PARENT_VERIFICATION_PENDING'&&<div className="action-stack">
          {!consoleOTP&&<Field label="Verification method"><select value={otpChannel} onChange={e=>setOtpChannel(e.target.value)}><option value="sms" disabled={!channels?.sms}>SMS OTP{channels?.sms?'': ' (not configured)'}</option><option value="email" disabled={!channels?.email||!p.student.email}>Email OTP{!p.student.email?' (student email missing)':!channels?.email?' (not configured)':''}</option></select></Field>}
          <button disabled={busy||!channelAvailable} className="button primary" onClick={()=>run('send-otp',consoleOTP?{}:{channel:otpChannel})}>{busy&&<AppLoader inline label="Processing…"/>}<Send size={16}/>{consoleOTP?'Generate development OTP':`Send ${otpChannel==='email'?'email':'SMS'} OTP`}</button>
          {!consoleOTP&&!channelAvailable&&<p className="small muted">Configure the selected delivery service and add a student email address to enable email OTP.</p>}
          <form onSubmit={e=>{e.preventDefault();run('verify-otp',{otp});}}><Field label="6-digit parent OTP"><input inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></Field><button disabled={busy} className="button secondary full">{busy&&<AppLoader inline label="Processing…"/>}Verify OTP</button></form>
          <span className="or">OR</span><button disabled={busy} className="button secondary" onClick={()=>run('approval-link')}>{busy&&<AppLoader inline label="Processing…"/>}Send secure approval link</button>
          <p className="small muted">{consoleOTP?'The OTP appears in the backend terminal.':otpChannel==='email'?`Delivery goes to ${p.student.email||'the student email on record'}.`:`Delivery goes to ${p.student.primaryMobile}.`} Codes expire after 5 minutes or the shorter configured duration.</p>
        </div>}
        {admin&&p.status==='ADMIN_APPROVAL_PENDING'&&<button disabled={busy} className="button primary full" onClick={()=>run('approve')}>{busy&&<AppLoader inline label="Processing…"/>}<Check size={18}/> Approve gate pass</button>}
        {qr.data&&<div className="action-stack"><button className="button secondary" onClick={()=>act(()=>download(`/gatepasses/${id}/pdf`,`${p.gatePassNumber}.pdf`),'PDF downloaded').catch(()=>{})}><Download size={16}/> Download PDF</button><Link className="button secondary" to={`/gatepasses/${id}/print`}><Printer size={16}/> Print Again · 58mm</Link>{creator&&p.status==='READY_FOR_EXIT'&&<button disabled={busy} className="button secondary" onClick={()=>run('share')}>{busy&&<AppLoader inline label="Processing…"/>}<Send size={16}/> Share via WhatsApp</button>}</div>}
        {(creator||admin)&&['PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT'].includes(p.status)&&<div className="action-stack">{admin&&<button className="button danger" onClick={()=>setDecision('reject')}>Reject request</button>}{creator&&<button className="button secondary" onClick={()=>setDecision('cancel')}>Cancel pass</button>}</div>}
        <div className="note"><Clock size={17}/> All decisions and gate movements are recorded in the audit history.</div>
      </aside>
    </div>}</DataState>
    {decision&&<Modal title={`${pretty(decision)} gate pass`} onClose={()=>setDecision('')}><form onSubmit={e=>{e.preventDefault();run(decision,{reason});}}><Field label="Reason (required for audit history)"><textarea required value={reason} onChange={e=>setReason(e.target.value)}/></Field><button className="button danger" disabled={busy}>{busy&&<AppLoader inline label="Processing…"/>}Confirm {decision}</button></form></Modal>}
  </>;
}
