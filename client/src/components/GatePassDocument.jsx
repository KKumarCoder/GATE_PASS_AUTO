import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {UserRound} from 'lucide-react';
import {api} from '../services/api';
import crest from '../assets/logo.jpeg';
import {cardStudent} from '../../../shared/card.mjs';
import './GatePassDocument.css';

// Staff images require authentication. Shared parent cards receive a scoped data image.
function StudentPhoto({photo,name}) {
  const [src,setSrc]=useState('');
  useEffect(()=>{
    let alive=true,objectUrl;
    setSrc('');
    if(photo?.startsWith('data:image/'))setSrc(photo);
    else if(/^\/api\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(photo||'')){
      api.get(photo.slice(4),{responseType:'blob'}).then(({data})=>{
        if(!alive)return;
        objectUrl=URL.createObjectURL(data);setSrc(objectUrl);
      }).catch(()=>{});
    }
    return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[photo]);
  return src?<img src={src} alt={`${name} photograph`} onError={()=>setSrc('')}/>:<div className="smart-photo-placeholder" aria-label="Student photograph unavailable"><UserRound/><span>STUDENT PHOTO</span></div>;
}
function FittedName({name}) {
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const node=ref.current;
    const fit=()=>{
      node.style.fontSize='';
      let size=parseFloat(getComputedStyle(node).fontSize);
      while((node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)&&size>5){size-=.25;node.style.fontSize=`${size}px`;}
    };
    const observer=new ResizeObserver(fit);observer.observe(node);fit();
    return()=>observer.disconnect();
  },[name]);
  return <strong className="smart-student-name" ref={ref}>{name}</strong>;
}
export function GatePassDocument({pass,qr}) {
  const student=cardStudent(pass.student);
  const formatDate=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded';
  const status=String(pass.status||'').replaceAll('_',' ');
  return <>
  <section className="gate-document smart-gate-card" id="print-pass" aria-label="Student gate pass">
    <svg className="smart-card-waves" viewBox="0 0 540 856" preserveAspectRatio="none" aria-hidden="true"><path fill="#F4C576" d="M0 0H540V196Q270 284 0 196Z"/><path fill="#10465B" d="M0 0H540V184Q270 272 0 184Z"/><path fill="#F4F7FA" d="M0 218Q270 310 540 218V315Q270 400 0 315Z"/></svg>
    <header className="smart-card-header"><img className="smart-school-logo" src={crest} alt="Shree Ram Public School logo"/><div><h2>SHREE RAM<span>PUBLIC SCHOOL</span></h2><p>KANHRA–BADHRA (CHARKHI- DADRI)<br/>HARYANA – 127312<br/>Affiliated to CBSE, New Delhi</p></div></header>
    <span className="smart-pass-title">GATE<br/>PASS</span>
    <div className="smart-student-photo"><StudentPhoto photo={student.photo} name={student.name}/></div>
    <span className="smart-campus-note">SAFE CAMPUS<br/>BRIGHT FUTURE</span>
    <span className="smart-name-label">STUDENT NAME</span>
    <FittedName name={student.name}/>
    <dl className="smart-student-fields"><div><dt>ADMISSION NO.</dt><dd>{student.admissionNumber}</dd></div><div><dt>BUS NO.</dt><dd>{student.busNumber}</dd></div></dl>
    <div className="smart-qr gate-secure-qr">{qr?<img src={qr} alt="Secure gate pass QR code"/>:<div className="smart-qr-pending">QR AVAILABLE<br/>AFTER APPROVAL</div>}</div>
    <span className="smart-verify-caption">{qr?'SCAN TO VERIFY':'AWAITING APPROVAL'}</span>
    <div className="smart-card-footer"><span/>DISCIPLINE · VALUES · BRIGHTER TOMORROW<span/></div>
  </section>
  <article className="gate-pass-printout" aria-label="Printable gate pass">
    <header className="printout-header">
      <img src={crest} alt="Shree Ram Public School logo"/>
      <div className="printout-school"><h1>SHREE RAM PUBLIC SCHOOL</h1><p>KANHRA–BADHRA (CHARKHI- DADRI)<br/>HARYANA – 127312<br/>Affiliated to CBSE, New Delhi</p><span>STUDENT SERVICES · CAMPUS SECURITY · VERIFIED MOVEMENT</span></div>
      <div className="printout-reference"><span>GATE PASS</span><strong>{pass.gatePassNumber}</strong><small>Issued {formatDate(pass.createdAt)}</small></div>
    </header>
    <div className="printout-title"><h2>STUDENT GATE PASS</h2><span className={`printout-status ${pass.status==='READY_FOR_EXIT'?'ready':''}`}>{status}</span></div>
    <div className="printout-body">
      <section className="printout-student">
        <div className="printout-identity">
          <div className="printout-photo"><StudentPhoto photo={student.photo} name={student.name}/></div>
          <div><span className="printout-label">STUDENT</span><h3>{student.name}</h3><p>Class {student.className} · Section {student.section}</p><p>Admission no. <strong>{student.admissionNumber}</strong></p></div>
        </div>
        <div className="printout-facts">
          <div><span>PASS TYPE</span><strong>{String(pass.requestType||'').replaceAll('_',' ')}</strong></div>
          <div><span>REQUESTED EXIT</span><strong>{formatDate(pass.timing.requestedExit)}</strong></div>
          <div><span>EXPECTED RETURN</span><strong>{pass.timing.expectedReturn?formatDate(pass.timing.expectedReturn):'No return required'}</strong></div>
          <div><span>ACCOMPANIED BY</span><strong>{pass.guardian?.name||'Not recorded'}{pass.guardian?.type?` · ${pass.guardian.type}`:''}</strong></div>
          <div><span>CONTACT NUMBER</span><strong>{pass.guardian?.mobile||'Not recorded'}</strong></div>
          <div className="printout-reason"><span>REASON FOR LEAVE</span><strong>{pass.reason||'Not recorded'}</strong></div>
        </div>
      </section>
      <aside className="printout-verification">
        <div className="printout-verification-title"><strong>SECURITY VERIFICATION</strong><span>{pass.parentVerification?.verified?'PARENT VERIFIED':'PENDING'}</span></div>
        {qr?<img className="printout-qr" src={qr} alt="Secure gate pass QR code"/>:<div className="printout-qr-placeholder">QR AVAILABLE AFTER APPROVAL</div>}
        <p>Scan to verify the pass status and student details before departure.</p>
        <div className="printout-security"><span>PASS STATUS</span><strong>{status}</strong><span>ACTUAL EXIT</span><strong>{formatDate(pass.timing.actualExit)}</strong><span>EXIT GATE</span><strong>{pass.timing.exitGate||'Not recorded'}</strong></div>
      </aside>
    </div>
    <footer className="printout-footer">
      <div className="printout-signatures"><span>Parent / Guardian</span><span>Class Teacher</span><span>Admin / Office</span><span>Security</span></div>
      <div className="printout-notice"><strong>IMPORTANT</strong><span>A printed pass alone does not authorize departure. Verify the live pass status and record the exit at the gate. All times are Indian Standard Time.</span></div>
    </footer>
  </article>
  </>;
}
