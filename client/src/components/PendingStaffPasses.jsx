import {useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useData} from '../hooks/useData';
import {get,post} from '../services/api';
import {DataState,Empty,Table,act,time} from './UI';
import VisitorPassPrint from './VisitorPassPrint';
export default function PendingStaffPasses(){
 const {user}=useAuth(),query=useData('/staff-passes?status=REQUESTED'),settings=useData('/settings');
 const [busy,setBusy]=useState(null),[receipt,setReceipt]=useState(null);
 async function approve(pass){setBusy(pass._id);try{await act(()=>post(`/staff-passes/${pass._id}/approve`,{}),'Staff gate pass approved');query.reload();try{setReceipt(await get(`/staff-passes/${pass._id}/print`));}catch{}}catch{}finally{setBusy(null);}}
  return <section className="card table-card" style={{marginBottom:28}}><div className="section-head"><div><h2>Staff gate passes · Pending approval</h2><p>Review staff departures and approve their gate passes.</p></div></div><DataState query={query}>{query.data?.items.length?<Table headers={['STAFF','PASS NUMBER','DEPARTMENT / REASON','EXPECTED RETURN','VERIFICATION','ACTION']}>{query.data.items.map(p=><tr key={p._id}><td><strong>{p.staff?.name||'Staff unavailable'}</strong><small>{p.staff?.employeeId}</small></td><td>{p.passNumber}</td><td>{p.department}<small>{p.reason}</small></td><td>{p.expectedReturn?time(p.expectedReturn):'None'}</td><td>{p.staffVerifiedAt?'OTP verified':'Legacy request'}</td><td>{p.staff?._id===user._id?<span>Another admin must approve</span>:<button className="button primary small" disabled={Boolean(busy)} onClick={()=>approve(p)}>{busy===p._id?'Approving…':'Approve staff pass'}</button>}</td></tr>)}</Table>:<Empty title="No staff passes awaiting approval"/>}</DataState>{receipt&&<VisitorPassPrint kind="staff" pass={receipt} image={receipt?.image||receipt?.qrImage} schoolName={settings.data?.schoolName} onClose={()=>setReceipt(null)}/>}</section>;
}
