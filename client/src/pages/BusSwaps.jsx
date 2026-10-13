import {useState} from 'react';
import {Plus, ArrowRight, Bus} from 'lucide-react';
import {can} from '../../../shared/access.mjs';
import {schoolDate} from '../../../shared/recurring.mjs';
import {useAuth} from '../context/AuthContext';
import {useData, useDebounce} from '../hooks/useData';
import {post} from '../services/api';
import {PageTitle, Field, DataState, Empty, Badge, Pager, Modal, act, time} from '../components/UI';

export default function BusSwaps(){
  const {user}=useAuth(),creator=can(user,'bus-swaps.create'),approver=can(user,'bus-swaps.approve');
  const [date,setDate]=useState(schoolDate()),[bus,setBus]=useState(''),[page,setPage]=useState(1);
  const query=useData(`/bus-swaps?date=${date}&bus=${encodeURIComponent(bus)}&page=${page}`);
  const [parentDelivery,setParentDelivery]=useState(null),[creating,setCreating]=useState(false),[selected,setSelected]=useState(null),[decision,setDecision]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
  async function decide(action,otp){
    setBusy(true);
    try{
      const updated=await act(()=>post(`/bus-swaps/${selected._id}/${action}`,action==='approve'?{otp}:{reason}),`Bus swap ${action==='approve'?'approved':action==='reject'?'rejected':'cancelled'}`);
      setSelected(updated);setDecision('');setReason('');query.reload();
    }catch{}finally{setBusy(false);}
  }
  const actionable=selected&&selected.date>=schoolDate()&&['PENDING','APPROVED'].includes(selected.status);
  return <>
    <PageTitle title="Bus swaps" description="A temporary bus change for one date. The student’s regular transport record stays unchanged.">
      {creator&&<button className="button primary" onClick={()=>setCreating(true)}><Plus size={17}/> New bus swap</button>}
    </PageTitle>
    <div className="note">Choose the bus change → Verify Parents OTP → Verify Principal OTP. The swap is valid for the selected date only.</div>
    <section className="card table-card">
      <div className="filter-bar">
        <Field label="Swap date"><input type="date" value={date} onChange={e=>{setDate(e.target.value);setPage(1);}}/></Field>
        <Field label="Bus number (from or to)"><input maxLength={40} placeholder="All buses" value={bus} onChange={e=>{setBus(e.target.value);setPage(1);}}/></Field>
        <button className="button secondary" onClick={()=>{setDate(schoolDate());setPage(1);}}>Today</button>
        <button className="button secondary" onClick={()=>{setDate('');setPage(1);}}>All dates / history</button>
      </div>
      <DataState query={query}>
        {query.data?.items.length?<div className="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Bus change</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{query.data.items.map(item=><tr key={item._id}>
          <td><strong>{item.student?.name||item.studentName}</strong><small className="muted"> {item.admissionNumber} · {item.className}</small></td>
          <td>{item.date}</td><td><strong>Bus {item.fromBus} → Bus {item.toBus}</strong></td>
          <td><Badge value={item.effectiveStatus}/>{item.activeToday&&<small> Applies today</small>}{item.status==='APPROVED'&&item.date>=schoolDate()&&item.student?.status!=='ACTIVE'&&<small> Student inactive / unavailable — do not apply</small>}</td>
          <td>{item.reason}</td><td><button className="button secondary small" onClick={()=>{setParentDelivery(null);setSelected(item);setDecision('');setReason('');}}>View</button></td>
        </tr>)}</tbody></table></div>:<Empty title="No bus swaps for this selection" description="Create a request when a parent asks for a different bus for one day."/>}
        <Pager page={page} total={query.data?.total} limit={20} onChange={setPage}/>
      </DataState>
    </section>
    {creating&&<NewSwap onClose={()=>setCreating(false)} onCreated={(record,delivery)=>{setParentDelivery(delivery);setCreating(false);setDate(record.date);setBus('');setPage(1);setSelected(record);query.reload();}}/>}
    {selected&&<Modal title={selected.swapNumber} onClose={()=>{if(!busy){setSelected(null);setDecision('');}}}>
      <h2>{selected.student?.name||selected.studentName}</h2><p>{selected.admissionNumber} · {selected.className}</p>
      <div className="note"><Bus size={20}/> <strong>Bus {selected.fromBus} <ArrowRight size={16}/> Bus {selected.toBus}</strong><p>Valid only on {selected.date} (IST). <Badge value={selected.effectiveStatus}/></p></div>
      <details><summary>Swap details</summary><dl><dt>Original bus driver</dt><dd>{selected.fromDriver}</dd><dt>Replacement bus driver</dt><dd>{selected.toDriver}</dd><dt>Reason</dt><dd>{selected.reason}</dd><dt>Parent / guardian</dt><dd>{selected.parentName}</dd><dt>Requested by</dt><dd>{selected.requestedBy?.name||'Staff'} · {time(selected.createdAt)}</dd>{selected.approvedAt&&<><dt>Approved by</dt><dd>{selected.approvedBy?.name||'Administrator'} · {time(selected.approvedAt)}</dd></>}{selected.decisionReason&&<><dt>Decision reason</dt><dd>{selected.decisionReason}</dd></>}</dl></details>
      
      {selected.status==='PENDING'&&actionable&&(approver||(creator&&selected.requestedBy?._id===user._id))&&<ParentApproval key={selected._id} swapId={selected._id} initialSent={parentDelivery} verifiedAt={selected.parentApproval?.verifiedAt} busy={busy} onReset={()=>{setSelected(value=>({...value,parentApproval:null}));query.reload();}} onVerified={record=>{setSelected(record);query.reload();}}/>}
      {selected.principalApproval?.verifiedAt&&<div className="note">Principal SMS OTP verified: <strong>{selected.principalApproval.name}</strong> · {time(selected.principalApproval.verifiedAt)}</div>}
      <p className="muted">After approval, confirmation emails go to the parents, Principal and both bus drivers.</p>
      {approver&&selected.status==='PENDING'&&actionable&&!selected.parentApproval?.verifiedAt&&<div className="note"><h3>2. Principal approval</h3><p>Verify Parents OTP first.</p><button className="button secondary" disabled>Send OTP Principal</button></div>}
      {approver&&selected.status==='PENDING'&&actionable&&selected.parentApproval?.verifiedAt&&<PrincipalApproval swapId={selected._id} busy={busy} onVerify={otp=>decide('approve',otp)}/>}
      {approver&&selected.status!=='PENDING'&&<EmailDelivery swapId={selected._id} status={selected.status}/>}
      {actionable&&!decision&&<div className="actions">
        {approver&&selected.status==='PENDING'&&<><button disabled={busy} className="button danger" onClick={()=>setDecision('reject')}>Reject</button></>}
        {(approver||(creator&&selected.requestedBy?._id===user._id))&&<button disabled={busy} className="button secondary" onClick={()=>setDecision('cancel')}>Cancel swap</button>}
      </div>}
      {decision&&<form onSubmit={e=>{e.preventDefault();decide(decision);}}><Field label="Decision reason (required)"><textarea required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></Field><div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setDecision('')}>Back</button><button className="button danger" disabled={busy||!reason.trim()}>Confirm {decision}</button></div></form>}
    </Modal>}
  </>;
}

function NewSwap({onClose,onCreated}){
  const [search,setSearch]=useState(''),[student,setStudent]=useState(null),[busy,setBusy]=useState(false);
  const q=useDebounce(search),students=useData(q?`/students?q=${encodeURIComponent(q)}&status=ACTIVE`:null),drivers=useData('/bus-drivers');
  const [form,setForm]=useState({date:schoolDate(),fromBus:'',toBus:'',reason:'',parentName:''});
  const change=key=>e=>setForm(prev=>({...prev,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();if(!student)return;setBusy(true);
    try{
      const record=await act(()=>post('/bus-swaps',{...form,student:student._id}),'Bus swap request saved');
      let delivery=null;
      try{delivery=await act(()=>post(`/bus-swaps/${record._id}/send-parent-otp`,{}),'Parents SMS OTP sent');}catch{}
      onCreated(record,delivery);
    }catch{}finally{setBusy(false);}
  }
  return <Modal title="New one-day bus swap" onClose={()=>!busy&&onClose()}><form onSubmit={submit}>
    <Field label="Find student"><input placeholder="Name or admission number" value={search} onChange={e=>setSearch(e.target.value)}/></Field>
    {q&&<DataState query={students}><div className="student-results">{students.data?.items.map(s=><button type="button" key={s._id} className={student?._id===s._id?'selected':''} onClick={()=>{setStudent(s);setForm(prev=>({...prev,parentName:s.fatherName||s.motherName||s.guardianName||''}));setSearch('');}}><div><strong>{s.name}</strong><small>{s.admissionNumber} · {s.className}-{s.section}</small></div><span>Select</span></button>)}{!students.data?.items.length&&<p>No active students found.</p>}</div></DataState>}
    {student&&<p><strong>Selected: {student.name}</strong> · {student.admissionNumber}<br/>Parent confirmation email: {student.email||'Missing — update the student profile before approval'}</p>}
    <div className="form-grid">
      <Field label="Valid for date only"><input type="date" required min={schoolDate()} max={schoolDate(new Date(Date.now()+30*86400000))} value={form.date} onChange={change('date')}/></Field>
      <Field label="Parent / guardian requesting change"><input required maxLength={100} value={form.parentName} onChange={change('parentName')}/></Field>
    </div>
    <DataState query={drivers}><div className="form-grid">{[['fromBus','From bus (usual bus)'],['toBus','To bus (for this date)']].map(([key,label])=><Field key={key} label={label}><select required value={form[key]} onChange={change(key)}><option value="">Select bus</option>{drivers.data?.items.map(driver=><option key={driver.busNumber} value={driver.busNumber} disabled={key==='toBus'&&driver.busNumber===form.fromBus}>Bus {driver.busNumber} · {driver.driverName}</option>)}</select></Field>)}</div>{drivers.data?.items.length<2&&<p className="warning-box">Add at least two buses under Bus staff directory before creating a swap.</p>}</DataState>
    <Field label="Reason for bus swap"><textarea required maxLength={500} placeholder="For example: Parent requested drop-off at a relative’s home today." value={form.reason} onChange={change('reason')}/></Field>
    <p className="muted">Next: verify Parents OTP, then Principal OTP to approve this swap.</p>
    <div className="form-footer"><button type="button" disabled={busy} className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!student||drivers.loading||!form.fromBus||!form.toBus||form.fromBus===form.toBus}>{busy?'Sending…':'Send OTP Parents'}</button></div>
  </form></Modal>;
}

function PrincipalApproval({swapId,busy,onVerify}){
  const query=useData('/bus-swaps/principals');
  const [principalId,setPrincipalId]=useState(''),[otp,setOtp]=useState(''),[sending,setSending]=useState(false),[sent,setSent]=useState(null);
  const effectiveId=principalId||(query.data?.items.length===1?query.data.items[0]._id:'');
  const principal=query.data?.items.find(p=>p._id===effectiveId);
  async function send(){setSending(true);try{const result=await act(()=>post(`/bus-swaps/${swapId}/send-principal-otp`,{principalId:effectiveId}),'Principal SMS OTP sent');setSent(result);setOtp('');}catch{}finally{setSending(false);}}
  return <div className="note"><h3>2. Principal approval</h3><DataState query={query}>
    {!query.data?.items.length?<p>Create or activate a Principal account with bus swap approval permission under Users & access.</p>:<>
      {query.data?.items.length===1?<p>{principal?.name} · {principal?.mobile}</p>:<Field label="School Principal"><select value={effectiveId} onChange={e=>{setPrincipalId(e.target.value);setOtp('');setSent(null);}}><option value="">Select Principal</option>{query.data?.items.map(p=><option value={p._id} key={p._id}>{p.name} · {p.mobile}</option>)}</select></Field>}
      {principal&&!principal.mobileConfigured&&<p>Add the Principal’s Indian mobile number under Users & access → Edit access.</p>}
      {!query.data?.smsConfigured&&<p>APITxT SMS is not configured. Add APITXT_AUTH_KEY on the server.</p>}
      {!query.data?.emailConfigured&&<p>SMTP email settings must be configured for approval confirmations.</p>}
      <button type="button" disabled={busy||sending||!principal?.mobileConfigured||!query.data?.smsConfigured||!query.data?.emailConfigured} className="button secondary" onClick={send}>{sending?'Sending…':sent?'Resend OTP Principal':'Send OTP Principal'}</button>
      {sent&&<p role="status">OTP sent to {sent.principalName} ({sent.mobile}). Expires {time(sent.expiresAt)}. Wait 60 seconds before resending.</p>}
      <form onSubmit={e=>{e.preventDefault();onVerify(otp);}}><Field label="Principal OTP"><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></Field><button className="button primary" disabled={busy||sending||!/^\d{6}$/.test(otp)}>{busy?'Verifying…':'Verify OTP & approve swap'}</button></form>
    </>}
  </DataState></div>;
}
function EmailDelivery({swapId,status}){
  const query=useData(`/bus-swaps/${swapId}/emails`),[busy,setBusy]=useState(false);
  async function retry(){setBusy(true);try{await act(()=>post(`/bus-swaps/${swapId}/retry-emails`,{}),'Email retry processed');query.reload();}catch{}finally{setBusy(false);}}
  return <div className="note"><h3>Email delivery</h3><DataState query={query}>
    {query.data?.items.length?<ul>{query.data.items.map(item=><li key={item._id}><strong>{item.audience.replaceAll('_',' ')}</strong> · {item.recipient}<br/>{item.event} · <Badge value={item.status}/>{item.error&&<small> {item.error}</small>}</li>)}</ul>:<p>No confirmation emails queued{status==='REJECTED'?' for a rejected request':''}.</p>}
    <p className="small muted">Sent means accepted by the email provider. Failed emails retry automatically, up to five attempts.</p>
    <div className="actions"><button className="button secondary small" type="button" onClick={query.reload}>Refresh status</button>{query.data?.items.some(i=>i.status==='FAILED')&&<button className="button secondary small" disabled={busy} type="button" onClick={retry}>{busy?'Retrying…':'Retry failed emails'}</button>}</div>
  </DataState></div>;
}

function ParentApproval({swapId,initialSent,verifiedAt,busy,onVerified,onReset}){
  const [otp,setOtp]=useState(''),[working,setWorking]=useState(false),[sent,setSent]=useState(initialSent||null);
  async function send(){
    setWorking(true);onReset();
    try{const result=await act(()=>post(`/bus-swaps/${swapId}/send-parent-otp`,{}),'Parent SMS OTP sent');setSent(result);setOtp('');}catch{}finally{setWorking(false);}
  }
  async function verify(e){
    e.preventDefault();setWorking(true);
    try{const result=await act(()=>post(`/bus-swaps/${swapId}/verify-parent-otp`,{otp}),'Parent verified; Principal approval is still required');setOtp('');onVerified(result);}catch{}finally{setWorking(false);}
  }
  if(verifiedAt)return <div className="note" role="status"><strong>✓ Parents OTP verified</strong><p>{time(verifiedAt)}</p><details><summary>Verify again</summary><p>This resets parent approval and any Principal OTP.</p><button type="button" className="button secondary" disabled={busy||working} onClick={send}>Send OTP Parents</button></details></div>;
  return <div className="note"><h3>1. Parents approval</h3>
    <p>SMS OTP goes to the parent’s registered mobile number.</p>
    <button type="button" className="button secondary" disabled={busy||working} onClick={send}>{working?'Processing…':sent?'Resend OTP Parents':'Send OTP Parents'}</button>
    {!verifiedAt&&<>
      {sent&&<p role="status">OTP sent to {sent.mobile}. Expires {time(sent.expiresAt)}. Wait 60 seconds before resending.</p>}
      <form onSubmit={verify}><Field label="Parents OTP"><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}/></Field><button className="button primary" disabled={busy||working||!/^\d{6}$/.test(otp)}>{working?'Verifying…':'Verify Parents OTP'}</button></form>
    </>}
  </div>;
}
