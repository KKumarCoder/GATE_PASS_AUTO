import { useState } from 'react';
import { Field, act } from './UI';
import { post } from '../services/api';
const departments = ['Administration', 'Teaching', 'Pre-primary', 'Primary wing', 'Senior wing', 'Accounts', 'Transport', 'Security', 'Housekeeping', 'IT / Robotics', 'Library', 'Sports'];
const reasons = ['Personal work', 'Medical appointment', 'Family emergency', 'School official work', 'Bank work', 'Training / Meeting', 'Half-day leave'];
export default function StaffPassForm({ defaults = {}, staffOptions = [], chooseStaff, onSubmit, selfId }) {
    const [channel, setChannel] = useState('sms'), [challenge, setChallenge] = useState(null), [otp, setOtp] = useState(''), [staff, setStaff] = useState(defaults.staff || staffOptions[0]?.value || selfId || ''), [department, setDepartment] = useState(departments.includes(defaults.department) ? defaults.department : defaults.department ? 'Other' : ''), [customDepartment, setCustomDepartment] = useState(defaults.department || ''), [reason, setReason] = useState(''), [customReason, setCustomReason] = useState(''), [returnRequired, setReturnRequired] = useState(false), [expectedReturn, setExpectedReturn] = useState(''), [busy, setBusy] = useState(false);
    async function submit(e) {
        e.preventDefault(); const dep = (department === 'Other' ? customDepartment : department).trim(), why = (reason === 'Other' ? customReason : reason).trim(); if (!dep || !why) return; setBusy(true); try {
            const body = { staff: chooseStaff ? staff : selfId, department: dep, reason: why, expectedReturn: returnRequired ? new Date(expectedReturn).toISOString() : null };
            if (!challenge) { const result = await act(() => post('/staff-passes/send-otp', { ...body, channel }), 'OTP sent to registered staff contact'); setChallenge(result); }
            else await onSubmit({ ...body, challengeId: challenge.challengeId, otp });
        } catch { } finally { setBusy(false); }
    }

    const selectedOpt = staffOptions.find(s => s.value === (chooseStaff ? staff : selfId));
    const hasPassToday = !!selectedOpt?.disabled;
    return <form onSubmit={submit} onChange={e => { if (challenge && e.target.name !== 'verificationOtp') { setChallenge(null); setOtp(''); } }}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        {chooseStaff && <Field label="Staff member *"><select required value={staff} onChange={e => setStaff(e.target.value)}><option value="">Select staff</option>{staffOptions.map(s => <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>)}</select></Field>}
        {hasPassToday && <div style={{ color: 'var(--color-danger,#ef4444)', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', margin: '8px 0 16px', fontSize: 13, fontWeight: 500 }}>A gate pass has already been generated for this staff member today. Only one gate pass per day is permitted.</div>}
        <div className="form-grid"><Field label="Department *"><select required value={department} onChange={e => setDepartment(e.target.value)}><option value="">Select department</option>{[...departments, 'Other'].map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Reason *"><select required value={reason} onChange={e => setReason(e.target.value)}><option value="">Select reason</option>{[...reasons, 'Other'].map(v => <option key={v}>{v}</option>)}</select></Field>
            {department === 'Other' && <Field label="Other department *"><input required maxLength={500} placeholder="Enter department" value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} /></Field>}
            {reason === 'Other' && <Field label="Other reason *"><input required maxLength={500} placeholder="Enter reason" value={customReason} onChange={e => setCustomReason(e.target.value)} /></Field>}
        </div><Field label="Expected return"><select value={returnRequired ? 'scheduled' : 'none'} onChange={e => setReturnRequired(e.target.value === 'scheduled')}><option value="none">None</option><option value="scheduled">Set date and time</option></select></Field>{returnRequired && <Field label="Return date and time *"><input type="datetime-local" required value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} /></Field>}
        <Field label="Send staff OTP via"><select value={channel} onChange={e => setChannel(e.target.value)}><option value="sms">Registered phone (SMS)</option><option value="email">Registered email</option></select></Field>
        {challenge && <><p role="status">OTP sent. Valid for 5 minutes.</p><Field label="Staff OTP"><input name="verificationOtp" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value)} /></Field><button type="button" className="button secondary" onClick={() => { setChallenge(null); setOtp(''); }}>Send new OTP</button></>}
        <div className="form-footer"><button className="button primary" disabled={busy || hasPassToday || !(department === 'Other' ? customDepartment : department).trim() || !(reason === 'Other' ? customReason : reason).trim()}>{busy ? 'Processing…' : challenge ? 'Verify OTP & create pass' : 'Send staff OTP'}</button></div>
    </fieldset></form>;
}
