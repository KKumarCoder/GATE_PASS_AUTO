import {can} from '../../../shared/access.mjs';
import {useAuth} from '../context/AuthContext';
import AppLoader from '../components/AppLoader';
import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import {Html5Qrcode} from 'html5-qrcode';
import {ScanLine,ShieldCheck,Search,DoorOpen,LogIn,X,Camera} from 'lucide-react';
import {get,post,message} from '../services/api';
import {useData} from '../hooks/useData';
import {PageTitle,Avatar,Badge,Field,ErrorState,act,time} from '../components/UI';
export default function Guard(){
  const {user}=useAuth(),{token}=useParams();
  const [manual,setManual]=useState(''),[record,setRecord]=useState(null),[error,setError]=useState(''),[scanning,setScanning]=useState(false),[busy,setBusy]=useState(false),[gate,setGate]=useState('Main Gate');
  const settings=useData('/settings');
  async function lookup(value,isToken=false){setError('');setBusy(true);setRecord(null);try{let code=value;if(value.includes('://')){const url=new URL(value);if(url.origin!==window.location.origin||!url.pathname.startsWith('/gate/verify/'))throw new Error('Scan a QR issued by this school.');code=url.pathname.split('/').pop();isToken=true;}setRecord(await get(`/gatepasses/${isToken?'verify':'manual'}/${encodeURIComponent(code.trim())}`));}catch(e){setError(e.response?message(e):e.message);}finally{setBusy(false);}}
  useEffect(()=>{if(token)lookup(token,true);},[token]);
  useEffect(()=>{if(settings.data?.gates?.length)setGate(settings.data.gates[0]);},[settings.data]);
  useEffect(()=>{if(!scanning)return;let cancelled=false,started=false;const camera=new Html5Qrcode('qr-reader');camera.start({facingMode:'environment'},{fps:10,qrbox:{width:230,height:230}},decoded=>{if(cancelled)return;cancelled=true;camera.stop().then(()=>{started=false;setScanning(false);lookup(decoded,/^[a-f0-9]{64}$/.test(decoded));}).catch(()=>setScanning(false));},()=>{}).then(()=>{started=true;if(cancelled)camera.stop().catch(()=>{});}).catch(()=>{if(!cancelled){setError('Camera unavailable. Allow camera access on HTTPS, or enter the pass number below.');setScanning(false);}});return()=>{cancelled=true;if(started)camera.stop().catch(()=>{});};},[scanning]);
  const p=record?.pass,visitor=record?.entityType==='VisitorPass',expired=p&&(visitor?new Date(p.expectedExit)<new Date()&&p.status==='REQUESTED':new Date(p.expiresAt)<new Date()&&p.status==='READY_FOR_EXIT');
  const linkedStudent=p?.student;
  const tooEarly=p&&!visitor&&p.status==='READY_FOR_EXIT'&&new Date(p.timing.requestedExit)>new Date();
  const action=visitor?(p?.status==='REQUESTED'&&!expired?'check-in':p?.status==='CHECKED_IN'?'check-out':null):(p?.status==='READY_FOR_EXIT'&&!expired&&!tooEarly?'exit':p?.status==='EXITED'?'return':null);
  async function mark(){setBusy(true);try{const updated=await act(()=>post(`/${visitor?'visitors':'gatepasses'}/${p._id}/${action}`,{gate}),visitor?'Visitor movement recorded':'Student movement recorded');setRecord({...record,pass:{...p,...updated,student:p.student}});}catch{}finally{setBusy(false);}}
  async function retryDriverNotice(){setBusy(true);try{const updated=await act(()=>post(`/gatepasses/${p._id}/retry-driver-notice`,{gate}),'Bus driver notification retried');setRecord({...record,pass:{...p,...updated,student:p.student}});}catch{}finally{setBusy(false);}}
  const noticeStatus=p?.busDriverNoticeStatus;
  const noticeText={PENDING:'Email will be sent after the student exits.',SENDING:'Sending email to the bus driver…',SENT:'Bus driver has been notified by email.',FAILED:'Exit recorded, but the driver email failed.',UNCONFIGURED:'Exit recorded, but driver email or SMTP settings are missing.'}[noticeStatus];
  return <>
    <PageTitle eyebrow="SECURITY DESK" title="Guard station" description="Verify the pass. Confirm identity. Record movement."/>
    <div className="guard-layout">
      <section className="card scanner-panel"><div className="scanner-emblem"><ScanLine size={50}/></div><h2>Ready to verify</h2><p>Scan a student or visitor QR code to see its live status.</p>
        <Field label="Your gate"><select aria-label="Your gate" value={gate} onChange={e=>setGate(e.target.value)}>{(settings.data?.gates||['Main Gate']).map(g=><option key={g}>{g}</option>)}</select></Field>
        {scanning?<><div id="qr-reader"/><button className="button secondary full" onClick={()=>setScanning(false)}><X size={18}/> Stop camera</button></>:<button className="button primary scan-button" onClick={()=>{setError('');setScanning(true);}}><Camera size={22}/> SCAN QR CODE</button>}
        <div className="or">OR VERIFY MANUALLY</div><form onSubmit={e=>{e.preventDefault();lookup(manual);}}><Field label="Gate pass number"><input autoCapitalize="characters" required placeholder="SRPS-GP-2026-000001" value={manual} onChange={e=>setManual(e.target.value.toUpperCase())}/></Field><button className="button secondary full" disabled={busy}>{busy&&<AppLoader inline label="Processing…"/>}<Search size={17}/> Verify pass</button></form>
      </section>
      <section className="card guard-result">{error&&<ErrorState error={error}/>} {busy&&!p&&<AppLoader label="Verifying pass…"/>}
        {!busy&&!p&&!error&&<div className="empty"><ShieldCheck size={54}/><h2>{busy?'Verifying pass…':'A safer gate starts here'}</h2><p>Pass details and movement controls appear after verification.</p></div>}
        {p&&<><div className={`verification-banner ${action&&!expired?'valid':'invalid'}`}><ShieldCheck size={28}/><div><strong>{expired?'PASS EXPIRED':tooEarly?'EXIT TIME NOT REACHED':action?(action==='return'?'AWAITING STUDENT RETURN':action==='check-out'?'VISITOR ON CAMPUS':`VALID ${visitor?'VISITOR':'GATE'} PASS`):'PASS CANNOT BE USED FOR EXIT'}</strong><small>{p.gatePassNumber||p.passNumber}</small></div></div>
          {p.parentVerification?.method==='DEVELOPMENT_OTP'&&<div className="warning-box">Development test pass — parent contact was simulated.</div>}
          <div className="guard-person"><Avatar large name={visitor?p.name:linkedStudent?.name||'Student record deleted'} photo={visitor?p.photo:linkedStudent?.photo}/><h2>{visitor?p.name:linkedStudent?.name||'Student record deleted'}</h2><p>{visitor?'Visitor':linkedStudent?`Class ${linkedStudent.className}-${linkedStudent.section} · ${linkedStudent.admissionNumber}`:'Historical pass'}</p><Badge value={expired?'EXPIRED':p.status}/></div>
          <dl><dt>{visitor?'Person to meet':'Authorized guardian'}</dt><dd>{visitor?p.personToMeet:`${p.guardian.name} (${p.guardian.type})`}</dd><dt>Reason</dt><dd>{visitor?p.purpose:p.reason}</dd><dt>{visitor?'Expected exit':'Expected return'}</dt><dd>{time(visitor?p.expectedExit:p.timing.expectedReturn)}</dd>{!visitor&&<><dt>Approved by</dt><dd>{p.approval.approvedBy?.name||'School authority'}</dd><dt>Allowed exit from</dt><dd>{time(p.timing.requestedExit)}</dd><dt>Exit time</dt><dd>{time(p.timing.actualExit)}</dd>{p.busNumber&&<><dt>Bus number</dt><dd>{p.busNumber}</dd></>}</>}</dl>
          {!visitor&&p.busNumber&&noticeText&&<div className={['FAILED','UNCONFIGURED'].includes(noticeStatus)?'warning-box':'note'}><strong>Bus driver email: {noticeStatus}</strong><p>{noticeText}</p>{['FAILED','UNCONFIGURED'].includes(noticeStatus)&&can(user,'gate.move')&&<button disabled={busy} className="button secondary small" onClick={retryDriverNotice}>{busy&&<AppLoader inline label="Retrying…"/>}Retry email</button>}</div>}
          {action&&can(user,visitor?'visitors.move':'gate.move')&&<><div className="note">Match the student or visitor identity and accompanying person before continuing.</div><button disabled={busy} className="button primary full scan-button" onClick={mark}>{busy&&<AppLoader inline label="Processing…"/>}{['exit','check-out'].includes(action)?<DoorOpen/>:<LogIn/>}{prettyAction(action)}</button></>}
        </>}
      </section>
    </div>
  </>;
}
function prettyAction(action){return{exit:'MARK STUDENT EXIT',return:'MARK STUDENT RETURN','check-in':'CHECK VISITOR IN','check-out':'CHECK VISITOR OUT'}[action];}
