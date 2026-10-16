import {Link} from 'react-router-dom';
import {ArrowUpRight,Trash2,RefreshCw,Printer,Eye} from 'lucide-react';
import {Empty,Table,Avatar,Badge,time} from './UI';

export function PassTable({items=[],admin=false,onStatus,onDelete,deleted=false,onRestore,onPrintStaff,onViewStaff}){
  return !items.length ? (
    <Empty title="No gate passes to show"/>
  ) : (
    <Table headers={['PERSON / TYPE','PASS NUMBER','REASON','STATUS','EXIT / REQUESTED','ACTIONS']}>
      {items.map(p => {
        const isStaff = p.passType === 'STAFF' || Boolean(p.staff && !p.student);
        if (isStaff) {
          const staffPerson = p.staff || {};
          return (
            <tr key={p._id}>
              <td>
                <div className="person">
                  <Avatar name={staffPerson.name || 'Staff member'} photo={staffPerson.photo}/>
                  <div>
                    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                      <strong>{staffPerson.name || 'Staff member'}</strong>
                      <span className="badge" style={{background:'#eaf5f0',color:'#2d6a4f',fontSize:'9px',padding:'2px 6px',borderRadius:'4px',fontWeight:'600'}}>STAFF</span>
                    </div>
                    <small>{staffPerson.employeeId ? `ID: ${staffPerson.employeeId}` : 'Staff'} · {p.department || staffPerson.designation || staffPerson.staffRole || 'School Staff'}</small>
                  </div>
                </div>
              </td>
              <td className="mono">{p.gatePassNumber || p.passNumber}</td>
              <td>{p.reason || 'Staff movement'}</td>
              <td><Badge value={p.status}/></td>
              <td>
                {time(p.timing?.actualExit || p.exitTime || p.timing?.requestedExit || p.createdAt)}
                {p.expectedReturn && <small>Return: {time(p.expectedReturn)}</small>}
              </td>
              <td>
                <div className="actions">
                  {onViewStaff && (
                    <button className="icon-button" aria-label={`View ${p.gatePassNumber || p.passNumber}`} title="View staff pass details" onClick={()=>onViewStaff(p)}>
                      <Eye size={17}/>
                    </button>
                  )}
                  {onPrintStaff && (
                    <button className="icon-button" aria-label={`Print ${p.gatePassNumber || p.passNumber}`} title="Print thermal pass" onClick={()=>onPrintStaff(p)}>
                      <Printer size={16}/>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        }

        return (
          <tr key={p._id}>
            <td>
              <div className="person">
                <Avatar name={p.student?.name || 'Student record deleted'} photo={p.student?.photo}/>
                <div>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    <strong>{p.student?.name || 'Student record deleted'}</strong>
                    <span className="badge" style={{background:'#eaf0fc',color:'#274c77',fontSize:'9px',padding:'2px 6px',borderRadius:'4px',fontWeight:'600'}}>STUDENT</span>
                  </div>
                  <small>{p.student ? `Class ${p.student.className}-${p.student.section}` : 'Historical pass'}</small>
                </div>
              </div>
            </td>
            <td className="mono">{p.gatePassNumber}</td>
            <td>{p.requestType?.replaceAll('_',' ') || p.reason}</td>
            <td><Badge value={p.expiresAt && new Date(p.expiresAt) < new Date() && p.status === 'READY_FOR_EXIT' ? 'EXPIRED' : p.status}/></td>
            <td>
              {time(p.timing?.actualExit || p.timing?.requestedExit)}
              {p.timing?.actualExit && p.timing?.exitGate && <small>Gate: {p.timing.exitGate}</small>}
            </td>
            <td style={{ whiteSpace: 'nowrap', width: '1%' }}>
              <div className="actions" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                {deleted ? (
                  <button className="button secondary" onClick={()=>onRestore(p)}>Restore pass</button>
                ) : (
                  <>
                    <Link to={`/gatepasses/${p._id}`} className="icon-button" aria-label={`Open ${p.gatePassNumber}`} title="View pass">
                      <ArrowUpRight size={17}/>
                    </Link>
                    {p.qr?.generatedAt && (
                      <Link to={`/gatepasses/${p._id}/print`} className="icon-button" aria-label={`Print Again ${p.gatePassNumber}`} title="Print pass">
                        <Printer size={16}/>
                      </Link>
                    )}
                    {admin && ['DRAFT','PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT'].includes(p.status) && (
                      <button className="icon-button" aria-label={`Update status for ${p.gatePassNumber}`} title="Update status" onClick={()=>onStatus(p)}>
                        <RefreshCw size={16}/>
                      </button>
                    )}
                    {admin && (
                      <button className="icon-button danger-text" aria-label={`Delete ${p.gatePassNumber}`} title="Delete pass" onClick={()=>onDelete(p)}>
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

