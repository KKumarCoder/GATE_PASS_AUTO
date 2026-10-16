import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Printer,X} from 'lucide-react';
import crest from '../assets/logo.jpeg';
import '../pages/GatePassPrint.css';
import './VisitorPassPrint.css';

export default function VisitorPassPrint({pass,image,schoolName,onClose,kind='visitor'}){
  const staff=kind==='staff';
  const qrSrc=image||pass?.image||pass?.qrImage;
  const receipt=useRef(null),qr=useRef(null),pageStyle=useRef(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>pageStyle.current?.remove(),[]);
  useEffect(()=>{
    if(qrSrc){
      setReady(Boolean(qr.current?.complete&&qr.current?.naturalWidth));
    }else{
      setReady(true);
    }
  },[qrSrc]);
  async function print(){
    setError('');
    try{
      if(!ready) return;
      await Promise.all([...receipt.current.querySelectorAll('img')].map(img=>img.decode()));
      await document.fonts.ready;
      pageStyle.current?.remove();
      const style=document.createElement('style');
      const height=Math.ceil(receipt.current.getBoundingClientRect().height*25.4/96)+2;
      style.textContent=`@page visitorreceipt{size:72mm ${height}mm;margin:0}`;
      document.head.append(style);pageStyle.current=style;
      window.addEventListener('afterprint',()=>style.remove(),{once:true});
      window.print();
    }catch{setError('Unable to prepare the pass. Please reload and try again.');}
  }
  const deadline=staff?pass.expectedReturn:pass.expectedExit;
  const exit=deadline?new Date(deadline).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):staff?'None':'Not recorded';
  return createPortal(<div className={`visitor-thermal-overlay${ready?' visitor-thermal-ready':''}`} role="dialog" aria-modal="true" aria-label={staff?'Staff gate pass':'Visitor gate pass'}>
    <div className="visitor-thermal-controls"><button className="button secondary" onClick={onClose}><X size={16}/> Close</button><button className="button primary" disabled={!ready} onClick={print}><Printer size={16}/> Print {staff?'staff gate':'visitor'} pass</button></div>
    <p className="visitor-thermal-help">80mm roll · Select 72mm printable width, 100% scale and no margins. Turn off headers and footers.</p>
    {error&&<p role="alert" className="visitor-thermal-error">{error}</p>}
    <article className="thermal-receipt visitor-thermal-receipt" ref={receipt}>
      <header className="thermal-school">
        <img src={crest} alt="Shree Ram Public School crest"/>
        <strong>{schoolName||'Shree Ram Public School'}</strong>
        <span className="thermal-tagline" lang="hi">हमारा सार... श्रेष्ठ शिक्षा और संस्कार</span>
        <span>KANHRA–BADHRA (CHARKHI- DADRI)<br/>HARYANA – 127312</span>
        <span>Affiliated to CBSE, New Delhi</span><b>{staff?(pass.status==='REQUESTED'?'STAFF PASS REQUEST':'STAFF GATE PASS'):'VISITOR PASS'}</b>
      </header>
      <section className="thermal-student">
        <strong>{staff?pass.staff?.name:pass.name}</strong>
        {staff&&<div className="thermal-staff-id-badge"><span>STAFF ID</span><strong>{pass.staff?.employeeId||'—'}</strong></div>}
      </section>
      {!staff&&<dl className="visitor-thermal-details">
        {[['Purpose',pass.purpose],['Meeting',pass.personToMeet],['Department',pass.department],['Expected exit',exit],['Status',String(pass.status||'').replaceAll('_',' ')]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>}
      {qrSrc&&<section className="thermal-qr-section"><img ref={qr} src={qrSrc} alt={staff?'Staff gate pass QR':'Visitor verification QR'} onLoad={()=>{setReady(true);setError('');}} onError={()=>{setReady(false);setError('QR could not load. Reopen the pass to try again.');}}/></section>}
      <div className="thermal-pass-id"><span>{staff?'STAFF GATE PASS ID':'VISITOR PASS ID'}</span><strong>{pass.passNumber}</strong><small>{staff?(pass.status==='REQUESTED'?'Pending administrator approval. This receipt does not authorize exit.':'Present and scan this QR at the school gate for exit.'):'Please present this pass at the school gate.'}</small></div>
    </article>
  </div>,document.body);
}
