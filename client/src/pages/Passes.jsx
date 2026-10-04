import {can} from '../../../shared/access.mjs';
import AppLoader from '../components/AppLoader';
import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import {Plus,Search,ArrowLeft,ShieldCheck,Download,Printer,Send,Check,Clock,Trash2,CheckCircle2} from 'lucide-react';
import {useData,useDebounce} from '../hooks/useData';
import {useAuth} from '../context/AuthContext';
import {post,get,download,api} from '../services/api';
import {PageTitle,DataState,Empty,Field,Avatar,Badge,Pager,Modal,act,time,pretty} from '../components/UI';
import {PassTable} from '../components/PassTable';
import {GatePassDocument} from '../components/GatePassDocument';
export const passStatuses=['PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT','EXITED','RETURNED','NO_RETURN_REQUIRED','REJECTED','CANCELLED','EXPIRED'];
export function Passes({pending=false,outside=false}){
  const {user}=useAuth(),admin=can(user,'passes.approve');
  const [search,setSearch]=useState(''),[status,setStatus]=useState(pending?'ADMIN_APPROVAL_PENDING':''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1),[limit,setLimit]=useState(5),[statusTarget,setStatusTarget]=useState(null),[newStatus,setNewStatus]=useState(''),[reason,setReason]=useState(''),[deleteTarget,setDeleteTarget]=useState(null),[busy,setBusy]=useState(false);
  const q=useDebounce(search),queryString=`/gatepasses?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&from=${from}&to=${to}&page=${page}&limit=${limit}`,query=useData(outside?'/reports/outside-campus':queryString);
  async function updateStatus(){
    setBusy(true);
    try{await act(()=>post(`/gatepasses/${statusTarget._id}/${newStatus.toLowerCase()}`,{reason}),'Gate pass status updated');setStatusTarget(null);setNewStatus('');setReason('');query.reload();}
    catch{}finally{setBusy(false);}
  }
  async function deletePass(){
    setBusy(true);
    try{await act(()=>api.delete(`/gatepasses/${deleteTarget._id}`),'Gate pass deleted permanently');setDeleteTarget(null);query.reload();}
    catch{}finally{setBusy(false);}
  }
  function resetPage(action){setPage(1);action();}
  return <>
    <PageTitle title={outside?'Students outside campus':pending?'Pending requests':'Gate passes'} description={outside?'Track departures and expected returns. Overdue students need your attention.':'Every request, approval and movement in one place.'}>{can(user,'passes.create')&&<Link className="button primary" to="/gatepasses/new"><Plus size={17}/> New gate pass</Link>}</PageTitle>
    <section className="card table-card">
      {!outside&&<div className="filter-bar">
        <div className="search-input"><Search size={17}/><input placeholder="Search gate pass number" value={search} onChange={e=>resetPage(()=>setSearch(e.target.value))}/></div>
        <select aria-label="Status" value={status} onChange={e=>resetPage(()=>setStatus(e.target.value))}><option value="">All statuses</option>{passStatuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select>
        <Field label="From date"><input type="date" aria-label="From date" value={from} onChange={e=>resetPage(()=>setFrom(e.target.value))}/></Field>
        <Field label="To date"><input type="date" aria-label="To date" value={to} onChange={e=>resetPage(()=>setTo(e.target.value))}/></Field>
        <Field label="Rows per page"><select aria-label="Rows per page" value={limit} onChange={e=>resetPage(()=>setLimit(Number(e.target.value)))}>{[5,10,20,50].map(size=><option key={size} value={size}>{size}</option>)}</select></Field>
      </div>}
      <DataState query={query}>{outside?<div className="outside-grid">{query.data?.items.length?query.data.items.map(p=><Link to={`/gatepasses/${p._id}`} className={`outside-card ${new Date(p.timing.expectedReturn)<new Date()?'overdue':''}`} key={p._id}><div className="person"><Avatar name={p.student?.name||'Student record deleted'} photo={p.student?.photo}/><div><strong>{p.student?.name||'Student record deleted'}</strong><small>{p.student?`${p.student.className}-${p.student.section}`:'Historical pass'}</small></div><Badge value={new Date(p.timing.expectedReturn)<new Date()?'OVERDUE':'EXITED'}/></div><p className="mono">{p.gatePassNumber}</p><dl><dt>Exited</dt><dd>{time(p.timing.actualExit)}</dd><dt>Expected return</dt><dd>{time(p.timing.expectedReturn)}</dd><dt>Reason</dt><dd>{p.reason}</dd><dt>Guardian</dt><dd>{p.guardian.name}</dd></dl></Link>):<Empty title="No students awaiting return" description="Students with an active return requirement will appear here after exit."/>}</div>:<><PassTable items={query.data?.items} admin={admin} onStatus={pass=>{setStatusTarget(pass);setNewStatus('CANCELLED');}} onDelete={setDeleteTarget}/><Pager page={page} total={query.data?.total} limit={limit} onChange={setPage}/></>}</DataState>
    </section>
    {statusTarget&&<Modal title={`Update ${statusTarget.gatePassNumber} status`} onClose={()=>!busy&&setStatusTarget(null)}><form onSubmit={e=>{e.preventDefault();updateStatus();}}><Field label="New status"><select required value={newStatus} onChange={e=>setNewStatus(e.target.value)}><option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option></select></Field><Field label="Reason (required for audit history)"><textarea required value={reason} onChange={e=>setReason(e.target.value)}/></Field><div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setStatusTarget(null)}>No, keep current status</button><button className="button primary" disabled={busy}>{busy&&<AppLoader inline label="Updating"/>}Update status</button></div></form></Modal>}
    {deleteTarget&&<Modal title="Delete gate pass permanently?" onClose={()=>!busy&&setDeleteTarget(null)}><p>Are you sure you want to permanently delete gate pass <strong>{deleteTarget.gatePassNumber}</strong>?</p><p className="muted">The pass, linked OTP and notifications will be deleted. Audit and gate-event history will be retained. This action cannot be undone.</p><div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setDeleteTarget(null)}>No, keep pass</button><button type="button" className="button danger" disabled={busy} onClick={deletePass}>{busy&&<AppLoader inline label="Deleting"/>}<Trash2 size={16}/>Yes, delete permanently</button></div></Modal>}
  </>;
}
const localDate=offset=>{const d=new Date(Date.now()+offset);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function NewPass(){
  const [params]=useSearchParams(),[search,setSearch]=useState(''),[student,setStudent]=useState(null),[step,setStep]=useState(1),[createdPass,setCreatedPass]=useState(null),navigate=useNavigate(),{user}=useAuth();
  const q=useDebounce(search),query=useData(search?`/students?q=${encodeURIComponent(q)}&status=ACTIVE`:null),drivers=useData('/bus-drivers');
  const {register,handleSubmit,setValue,watch,formState:{isSubmitting}}=useForm({defaultValues:{requestType:'SHORT_LEAVE',requestedExit:localDate(60000),expectedReturn:localDate(3600000),returnRequired:true,guardianType:'Father',busNumber:''}});
  const guardianType=watch('guardianType'),type=watch('requestType');
  useEffect(()=>{if(params.get('student'))get(`/students/${params.get('student')}`).then(setStudent).catch(()=>{});},[params]);
  useEffect(()=>{if(student){setValue('guardianName',guardianType==='Father'?student.fatherName:guardianType==='Mother'?student.motherName:guardianType==='Guardian'?student.guardianName:guardianType==='Self'?student.name:'');setValue('guardianMobile',['Father','Mother','Guardian'].includes(guardianType)?student.primaryMobile:'');}},[student,guardianType,setValue]);
  return <>
    <PageTitle title="Create a gate pass" description="A verified departure begins with the right details."><Link className="button secondary" to="/gatepasses"><ArrowLeft size={16}/> All passes</Link></PageTitle>
    <div className="steps">{['Select student','Departure details','Parent verification'].map((label,i)=><div className={step>=i+1?'active':''} key={label}><span>{step>i+1?<Check size={15}/>:i+1}</span>{label}</div>)}</div>
    <div className="form-layout"><section className="card">{step===1?<><div className="section-head"><div><h2>Find your student</h2><p>Search the school’s registered student directory.</p></div></div>
      <div className="search-input large-input"><Search size={19}/><input placeholder="Name, admission number or registered mobile" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {search&&<DataState query={query}><div className="student-results">{query.data?.items.length?query.data.items.map(s=><button className={student?._id===s._id?'selected':''} key={s._id} onClick={()=>setStudent(s)}><Avatar name={s.name} photo={s.photo}/><div><strong>{s.name}</strong><small>{s.admissionNumber} · Class {s.className}-{s.section}</small></div><span>Select</span></button>):<Empty title="No active students match"/>}</div></DataState>}
      {student&&<div className="student-summary"><Avatar name={student.name} photo={student.photo} large/><div><h2>{student.name}</h2><p>{student.admissionNumber} · {student.className}-{student.section}</p><small>Father: {student.fatherName||'—'} · Mother: {student.motherName||'—'}</small><p>{student.primaryMobile}</p></div></div>}
      <div className="form-footer"><button className="button primary" disabled={!student} onClick={()=>setStep(2)}>Continue to departure details →</button></div>
    </>:<form onSubmit={handleSubmit(async values=>{
      const body={student:student._id,busNumber:values.busNumber||'',requestType:values.requestType,reason:values.reason,requestedExit:new Date(values.requestedExit).toISOString(),expectedReturn:values.returnRequired?new Date(values.expectedReturn).toISOString():null,guardian:{type:values.guardianType,name:values.guardianName,mobile:values.guardianMobile||'',relationship:values.guardianType}};
      if(type==='EMERGENCY')body.emergency={authority:values.authority,contactAttempt:values.contactAttempt};
      try{const result=await act(()=>post('/gatepasses',body),'Request created');setCreatedPass({...result,student});}catch{}
    })}>
      <div className="section-head"><h2>Departure details</h2><button type="button" className="text-link" onClick={()=>setStep(1)}>Change student</button></div>
      <div className="person selected-student"><Avatar name={student.name} photo={student.photo}/><div><strong>{student.name}</strong><small>{student.className}-{student.section} · {student.admissionNumber}</small></div></div>
      <div className="form-grid">
        <Field label="Gate pass type"><select {...register('requestType')}>{['EARLY_LEAVE','SHORT_LEAVE','MEDICAL',...(can(user,'passes.emergency')?['EMERGENCY']:[]),'PARENT_REQUEST','SCHOOL_WORK','OTHER'].map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></Field>
        <Field label="Requested exit"><input type="datetime-local" required {...register('requestedExit')}/></Field>
        <Field label="Bus number (driver notification)"><select {...register('busNumber')}><option value="">No bus / do not notify a driver</option>{drivers.data?.items.map(driver=><option key={driver.busNumber} value={driver.busNumber} disabled={!driver.emailConfigured}>Bus {driver.busNumber} · {driver.driverName}{driver.emailConfigured?'':' · email unavailable'}</option>)}</select></Field>
        <Field label="Accompanying person"><select {...register('guardianType')}>{['Father','Mother','Guardian','Self','Teacher','Other'].map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label="Authorized person’s name"><input required {...register('guardianName')}/></Field>
        <Field label="Accompanying person’s mobile"><input required={guardianType==='Other'} placeholder="+91XXXXXXXXXX" {...register('guardianMobile')}/></Field>
        <Field label="Expected return"><input type="datetime-local" disabled={!watch('returnRequired')} required={watch('returnRequired')} {...register('expectedReturn')}/></Field>
      </div>
      <label className="checkbox"><input type="checkbox" {...register('returnRequired')}/> Student will return to campus</label>
      <Field label="Reason for departure"><textarea rows={3} maxLength={500} required {...register('reason')}/></Field>
      {type==='EMERGENCY'&&<div className="warning-box"><strong>Recorded emergency override</strong><p>Parent verification is bypassed only with a recorded contact attempt. Administrator approval is still required.</p><Field label="Approving authority"><input required {...register('authority')}/></Field><Field label="Parent contact attempt and outcome"><textarea required {...register('contactAttempt')}/></Field></div>}
      <div className="form-footer"><button type="button" className="button secondary" onClick={()=>setStep(1)}>Back</button><button className="button primary" disabled={isSubmitting}>{isSubmitting&&<AppLoader inline label="Processing…"/>}Create request & verify parent</button></div>
    </form>}</section>
    <aside className="card help-card"><ShieldCheck size={30}/><h2>Safety at every step</h2><p>Parent verification is sent only to the mobile number registered in the student profile.</p><ol><li>Select an active student.</li><li>Record departure and guardian details.</li><li>Complete parent approval.</li><li>Get administrator approval.</li><li>Security verifies the pass at the gate.</li></ol><div className="note">A request does not authorize departure. Only an approved, valid pass can be used at the gate.</div></aside></div>
    {createdPass&&<Modal title="Gate Pass Created Successfully" onClose={()=>{setCreatedPass(null);navigate('/gatepasses');}}>
      <div className="pass-created-summary">
        <div className="pass-created-icon"><CheckCircle2 size={30}/></div>
        <p><strong>Student:</strong> {createdPass.student.name}</p>
        <p><strong>Class:</strong> {createdPass.student.className}-{createdPass.student.section}</p>
        <p><strong>Gate Pass ID:</strong> {createdPass.gatePassNumber}</p>
        <p className="muted">The secure QR code is available after parent verification and administrator approval.</p>
      </div>
      <div className="form-footer">
        <button className="button secondary" onClick={()=>navigate(`/gatepasses/${createdPass._id}`)}>VIEW PASS</button>
        <button className="button primary" onClick={()=>navigate(`/gatepasses/${createdPass._id}/print`)}><Printer size={16}/> PRINT GATE PASS</button>
        <button className="button secondary" onClick={()=>{setCreatedPass(null);navigate('/gatepasses');}}>CLOSE</button>
      </div>
    </Modal>}
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
