import {useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,Printer} from 'lucide-react';
import {useData} from '../hooks/useData';
import AppLoader from '../components/AppLoader';
import crest from '../assets/logo.jpeg';
import './GatePassPrint.css';

function displayed(value) {
  return value===undefined||value===null||value===''?'Not recorded':value;
}

export default function GatePassPrint() {
  const {id}=useParams();
  const passQuery=useData(`/gatepasses/${id}`);
  const pass=passQuery.data;
  const qrQuery=useData(pass?.qr?.generatedAt?`/gatepasses/${id}/qr`:null);
  const settingsQuery=useData('/settings');
  const qr=qrQuery.data?.image;
  const qrImage=useRef(null);
  const [qrReady,setQrReady]=useState(false);
  const [qrError,setQrError]=useState('');
  const [printError,setPrintError]=useState('');
  const student=pass?.student;
  const date=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded';

  useEffect(()=>{
    setQrReady(false);setQrError('');
    const image=qrImage.current;
    if(image?.complete&&image.naturalWidth>0)setQrReady(true);
  },[qr]);
  useEffect(()=>{
    if(qrReady)return undefined;
    const preventUnreadyPrint=event=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='p'){
        event.preventDefault();
        setPrintError('Wait until the secure QR code is ready before printing.');
      }
    };
    window.addEventListener('keydown',preventUnreadyPrint);
    return()=>window.removeEventListener('keydown',preventUnreadyPrint);
  },[qrReady]);

  async function printPass() {
    setPrintError('');
    try {
      if(!qrImage.current||!qrReady)throw new Error('The QR code is not ready yet.');
      await Promise.all([...document.querySelectorAll('.thermal-receipt img')].map(image=>image.decode()));
      await document.fonts?.ready;
      window.scrollTo(0,0);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const receipt=document.querySelector('.thermal-receipt');
      if(!receipt)throw new Error('The printable Gate Pass is unavailable.');
      const pageHeight=Math.ceil(receipt.getBoundingClientRect().height*25.4/96)+2;
      const pageStyle=document.createElement('style');
      pageStyle.id='thermal-print-page-size';
      pageStyle.textContent=`@page{size:58mm ${pageHeight}mm;margin:0}`;
      document.head.append(pageStyle);
      window.addEventListener('afterprint',()=>pageStyle.remove(),{once:true});
      window.print();
    } catch {
      setPrintError('Unable to prepare this Gate Pass for printing. Reload the page and try again.');
    }
  }

  return <main className={`thermal-print-page${qrReady?' thermal-print-ready':''}`}>
    <nav className="thermal-print-controls" aria-label="Print controls">
      <Link className="button secondary" to={`/gatepasses/${id}`}><ArrowLeft size={16}/> View pass</Link>
      {qr&&<button className="button primary" disabled={!qrReady||Boolean(qrError)} onClick={printPass}><Printer size={16}/> PRINT GATE PASS</button>}
    </nav>
    {qr&&<p className="thermal-print-help">In the print dialog, select the Billing Buddy 58mm printer and turn off “Headers and footers”.</p>}
    {passQuery.loading?<div className="thermal-screen-message"><AppLoader label="Loading Gate Pass…"/></div>:passQuery.error?<div className="thermal-screen-message" role="alert">{passQuery.error}</div>:pass&&<>
      {!qr&&pass.qr?.generatedAt&&qrQuery.loading&&<div className="thermal-print-notice" role="status"><AppLoader inline label="Preparing secure QR code…"/></div>}
      {!qr&&!pass.qr?.generatedAt&&<div className="thermal-print-notice" role="status">The secure QR code becomes available after parent verification and administrator approval. You can print this pass after approval.</div>}
      {qrQuery.error&&<div className="thermal-print-notice error" role="alert">{qrQuery.error}</div>}
      {qrError&&<div className="thermal-print-notice error" role="alert">{qrError}</div>}
      {printError&&<div className="thermal-print-notice error" role="alert">{printError}</div>}
      <article className="thermal-receipt" aria-label="58 millimeter printable Gate Pass">
        <header className="thermal-school">
          <img src={crest} alt="Shree Ram Public School crest"/>
          <strong>{settingsQuery.data?.schoolName||'SHREE RAM PUBLIC SCHOOL'}</strong>
          <span className="thermal-tagline" lang="hi">हमारा सार... श्रेष्ठ शिक्षा और संस्कार</span>
          <span>KANHRA–BADHRA (CHARKHI- DADRI)<br/>HARYANA – 127312</span>
          <span>Affiliated to CBSE, New Delhi</span>
          <b>GATE PASS</b>
        </header>
        <section className="thermal-student">
          <span>STUDENT</span>
          <strong>{displayed(student?.name)}</strong>
          <div><span>Class</span><b>{student?`${displayed(student.className)}-${displayed(student.section)}`:'Not recorded'}</b></div>
          <div><span>Admission No.</span><b>{displayed(student?.admissionNumber)}</b></div>
          <div><span>Bus No.</span><b>{displayed(pass.busNumber||student?.busNumber)}</b></div>
          <div><span>Village</span><b>{displayed(student?.villageName)}</b></div>
          <div><span>Contact</span><b>{displayed(student?.primaryMobile||pass.guardian?.mobile)}</b></div>
        </section>
        <section className="thermal-details">
          <div><span>Reason</span><b>{displayed(pass.reason)}</b></div>
          <div><span>Requested exit</span><b>{date(pass.timing?.requestedExit)}</b></div>
          <div><span>Expected return</span><b>{pass.timing?.expectedReturn?date(pass.timing.expectedReturn):'No return required'}</b></div>
        </section>
        <section className="thermal-qr-section">
          {qr?<img ref={qrImage} src={qr} alt="Secure Gate Pass QR code" onLoad={()=>{setQrReady(true);setQrError('');}} onError={()=>{setQrReady(false);setQrError('Unable to load the Gate Pass QR code. Reload and try again.');}}/>:<div className="thermal-qr-placeholder">{pass.qr?.generatedAt?'PREPARING SECURE QR CODE':'QR CODE AVAILABLE AFTER APPROVAL'}</div>}
          <strong>SCAN AT SCHOOL GATE</strong>
        </section>
        <footer className="thermal-pass-id">
          <span>GATE PASS ID</span>
          <strong>{displayed(pass.gatePassNumber)}</strong>
          <small>Please present this pass at the school gate.</small>
        </footer>
      </article>
    </>}
  </main>;
}
