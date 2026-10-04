import {useState} from 'react';
import {KeyRound,Plus} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useData} from '../hooks/useData';
import {api,post} from '../services/api';
import {PageTitle,DataState,Table,Empty,Badge,Modal,Field,Avatar,act,pretty} from '../components/UI';
import {isAdmin,permissionsFor,roleDefaults,permissionLabels,togglePermission,assignedGateFor} from '../../../shared/access.mjs';

function PasswordForm({account,onSaved}) {
  const [busy,setBusy]=useState(false);
  const submit=async event=>{
    event.preventDefault();
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
    if(values.password!==values.confirmPassword){form.elements.confirmPassword.setCustomValidity('Passwords do not match.');form.reportValidity();return;}
    form.elements.confirmPassword.setCustomValidity('');
    setBusy(true);
    try{await act(()=>api.patch(`/users/${account._id}/password`,{password:values.password}),'Staff password updated. They must sign in again.');onSaved();}catch{}finally{setBusy(false);}
  };
  return <form onSubmit={submit}>
    <p>Set a new password directly for <strong>{account.name}</strong>. This signs them out of all active sessions.</p>
    <div className="form-grid">
      <Field label="New password · at least 12 characters"><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></Field>
      <Field label="Confirm new password"><input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required onInput={event=>event.currentTarget.setCustomValidity('')}/></Field>
    </div>
    <div className="form-footer"><button className="button primary" disabled={busy}><KeyRound size={16}/>{busy?'Updating…':'Set new password'}</button></div>
  </form>;
}

function AccessForm({account,actor,onSaved}) {
  const creating=!account._id;
  const [role,setRole]=useState(account.role||'SECURITY_GUARD');
  const [permissions,setPermissions]=useState(permissionsFor(account.role?account:{role:'SECURITY_GUARD'}));
  const [gate,setGate]=useState(assignedGateFor(account.role?account:{role:'SECURITY_GUARD'}));
  const [active,setActive]=useState(account.active??true),[busy,setBusy]=useState(false);
  const settings=useData('/settings');
  const roles=[...(actor.role==='SUPER_ADMIN'?['ADMIN']:[]),'PRINCIPAL','SECURITY_GUARD','TEACHER','RECEPTION'];
  const changeRole=value=>{setRole(value);setPermissions(roleDefaults[value]);setGate(value==='SECURITY_GUARD'?'Main Gate':'');};
  const submit=async e=>{
    e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);
    const access={role,assignedGate:gate,...(!isAdmin({role})?{permissions}:{})};
    try{await act(()=>creating?post('/users',{...values,...access}):api.patch(`/users/${account._id}`,{...access,active}),creating?'Staff account created':'Access saved; staff must sign in again');onSaved();}catch{}finally{setBusy(false);}
  };
  return <form onSubmit={submit}>
    {creating&&<div className="form-grid">
      <Field label="Full name"><input name="name" required maxLength={100}/></Field>
      <Field label="Email"><input name="email" type="email" required/></Field>
      <Field label="Employee ID (used to sign in)"><input name="employeeId" required maxLength={40}/></Field>
      <Field label="Department"><input name="department" maxLength={500}/></Field>
      <Field label="Initial password (12+ characters)"><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></Field>
    </div>}
    <div className="form-grid"><Field label="Role"><select aria-label="Role" value={role} onChange={e=>changeRole(e.target.value)}>{roles.map(r=><option key={r} value={r}>{pretty(r)}</option>)}</select></Field>
    <Field label="Assigned gate"><select aria-label="Assigned gate" value={gate} onChange={e=>setGate(e.target.value)} required={role==='SECURITY_GUARD'}>{role!=='SECURITY_GUARD'&&<option value="">All configured gates</option>}{[...new Set([...(settings.data?.gates||['Main Gate']),...(gate?[gate]:[])])].map(g=><option key={g}>{g}</option>)}</select></Field></div>
    {!creating&&<label className="checkbox"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Account active</label>}
    <h3>Module permissions</h3>
    {isAdmin({role})?<p className="note">Administrators have full control, including staff roles and permissions.</p>:<>
      <p className="muted">Select allowed actions. Required view permissions are selected automatically. Teachers see their own passes unless approval access is granted.</p>
      <div className="actions"><button className="button secondary small" type="button" onClick={()=>setPermissions([...roleDefaults[role]])}>Reset to role defaults</button><button className="button secondary small" type="button" onClick={()=>setPermissions([])}>Clear permissions</button></div>
      <div className="permission-grid">{Object.entries(permissionLabels).map(([key,label])=><label className="checkbox" key={key}><input type="checkbox" checked={permissions.includes(key)} onChange={e=>setPermissions(togglePermission(permissions,key,e.target.checked))}/>{label}</label>)}</div>
      <p className="note">Only Admin and Super Admin can manage staff access.</p>
    </>}
    <div className="form-footer"><button className="button primary" disabled={busy}>{busy?'Saving…':creating?'Create staff account':'Save access'}</button></div>
  </form>;
}
export default function Users(){
  const query=useData('/users'),{user}=useAuth(),[editing,setEditing]=useState(null),[passwordTarget,setPasswordTarget]=useState(null);
  const editable=u=>u._id!==user._id&&u.role!=='SUPER_ADMIN'&&(user.role==='SUPER_ADMIN'||u.role!=='ADMIN');
  return <><PageTitle title="Users & access" description="Assign staff roles, gates and module permissions."><button className="button primary" onClick={()=>setEditing({})}><Plus size={17}/> Add staff account</button></PageTitle>
    <section className="card table-card"><DataState query={query}>{query.data?.items.length?<Table headers={['STAFF MEMBER','EMPLOYEE ID','ROLE / GATE','PERMISSIONS','STATUS','ACTIONS']}>{query.data.items.map(u=><tr key={u._id}><td><div className="person"><Avatar name={u.name}/><div><strong>{u.name}</strong><small>{u.email}</small></div></div></td><td>{u.employeeId}</td><td><Badge value={u.role}/><small>{assignedGateFor(u)||'All gates'}</small></td><td>{isAdmin(u)?'Full control':`${permissionsFor(u).length} allowed actions`}</td><td><Badge value={u.active?'ACTIVE':'INACTIVE'}/></td><td><div className="actions">{editable(u)&&<><button className="text-link" onClick={()=>setEditing(u)}>Edit access</button><button className="text-link" onClick={async()=>{try{await act(()=>api.patch(`/users/${u._id}`,{active:!u.active}));query.reload();}catch{}}}>{u.active?'Disable':'Enable'}</button><button className="text-link" onClick={()=>setPasswordTarget(u)}>Set password</button></>}</div></td></tr>)}</Table>:<Empty/>}</DataState></section>
    {editing&&<Modal title={editing._id?`Edit access · ${editing.name}`:'Add staff account'} onClose={()=>setEditing(null)}><AccessForm account={editing} actor={user} onSaved={()=>{setEditing(null);query.reload();}}/></Modal>}
    {passwordTarget&&<Modal title={`Set password · ${passwordTarget.name}`} onClose={()=>setPasswordTarget(null)}><PasswordForm account={passwordTarget} onSaved={()=>setPasswordTarget(null)}/></Modal>}
  </>;
}
