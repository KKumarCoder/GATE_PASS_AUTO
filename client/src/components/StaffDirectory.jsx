import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Pencil, Trash2, Users, Plus, Bus, TicketPlus, TicketCheck, UserX, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { Table, Avatar, Badge, DataState, Empty, Modal, Field, PhotoUpload, Pager, act } from './UI';

export default function StaffDirectory({ query, onRequest, createOpen, setCreateOpen }) {
    const [search, setSearch] = useState(''), [role, setRole] = useState(''), [status, setStatus] = useState(''), [edit, setEdit] = useState(null), [remove, setRemove] = useState(null), [internalCreate, setInternalCreate] = useState(false), [busy, setBusy] = useState(false);
    const [page, setPage] = useState(1), [limit, setLimit] = useState(10);
    const isCreate = createOpen !== undefined ? createOpen : internalCreate;
    const setIsCreate = setCreateOpen || setInternalCreate;

    const items = query.data?.items || [], roles = [...new Set(items.map(s => s.staffRole).filter(Boolean))].sort();
    const filtered = items.filter(s => (!role || s.staffRole === role) && (!status || s.active === (status === 'active')) && [s.name, s.employeeId, s.mobile, s.email, s.designation].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())));

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    async function toggleActive(staff) { setBusy(true); try { await act(() => api.patch(`/staff-directory/${staff._id}/status`, { active: !staff.active }), staff.active ? 'Staff moved to Inactive staff' : 'Staff activated'); query.reload(); } catch { } finally { setBusy(false); } }
    async function deleteStaff() { setBusy(true); try { await act(() => api.delete(`/staff-directory/${remove._id}`), 'Staff member removed'); setRemove(null); query.reload(); } catch { } finally { setBusy(false); } }
    async function syncBusStaff() { setBusy(true); try { await act(() => api.post('/staff-directory/sync-bus-staff'), 'Bus staff synced successfully'); query.reload(); } catch { } finally { setBusy(false); } }

    return <section className="card table-card staff-directory-card" style={{ marginBottom: 28 }}>
        <div className="section-head">
            <div>
                <h2><Users size={20} /> School staff directory</h2>
                <p>{filtered.length} of {items.length} staff members · Profiles and contact details</p>
            </div>
        </div>
        <div className="filter-bar">
            <div className="search-input"><Search size={18} /><input aria-label="Search staff" placeholder="Search name, staff ID, phone, email or designation" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
            <select aria-label="Filter staff role" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option>{roles.map(r => <option key={r}>{r}</option>)}</select>
            <select aria-label="Filter staff status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <select aria-label="Rows per page" className="compact-input" style={{ width: '110px' }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
            </select>
            <button className="button secondary" onClick={() => { setSearch(''); setRole(''); setStatus(''); setPage(1); }}>Reset</button>
        </div>
        <DataState query={query}>
            {filtered.length ? (
                <>
                    <Table headers={['STAFF', 'ROLE / DESIGNATION', 'CONTACT', 'STATUS', 'ACTIONS']}>
                        {paginated.map(s => <tr key={s._id}>
                            <td><div className="person"><Avatar name={s.name} photo={s.photo} /><div><strong>{s.name}</strong><small>Staff ID: {s.employeeId}</small></div></div></td>
                            <td>{s.staffRole || '—'}<small>{s.designation || '—'}</small></td>
                            <td>{s.mobile || '—'}<small>{s.email || '—'}</small></td>
                            <td><Badge value={s.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                            <td style={{ whiteSpace: 'nowrap', width: '1%' }}><div className="actions staff-row-actions" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                {s.active && onRequest && (s.hasPassToday ? (
                                    <button
                                        type="button"
                                        className="icon-button action-btn-icon action-btn-create"
                                        disabled
                                        title="Only one gate pass per day is permitted (Pass generated today)"
                                        aria-label={`Pass already generated today for ${s.name}`}
                                    >
                                        <TicketCheck size={17} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="icon-button action-btn-icon action-btn-create"
                                        onClick={() => onRequest(s)}
                                        title="Create gate pass"
                                        aria-label={`Create gate pass for ${s.name}`}
                                    >
                                        <TicketPlus size={17} />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="icon-button action-btn-icon action-btn-edit"
                                    onClick={() => setEdit(s)}
                                    title="Edit / Photo"
                                    aria-label={`Edit ${s.name}`}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    type="button"
                                    className={`icon-button action-btn-icon ${s.active ? 'action-btn-deactivate' : 'action-btn-activate'}`}
                                    disabled={busy}
                                    onClick={() => toggleActive(s)}
                                    title={s.active ? 'Deactivate' : 'Activate'}
                                    aria-label={s.active ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                                >
                                    {s.active ? <UserX size={17} /> : <UserCheck size={17} />}
                                </button>
                                <button
                                    type="button"
                                    className="icon-button action-btn-icon action-btn-delete danger-text"
                                    aria-label={`Delete ${s.name}`}
                                    title="Delete"
                                    onClick={() => setRemove(s)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div></td>
                        </tr>)}
                    </Table>
                    <Pager page={page} total={total} limit={limit} onChange={setPage} />
                </>
            ) : <Empty title="No matching staff" description="Try another search or reset the filters." />}
        </DataState>
        {isCreate && <Modal title="Add new staff member" onClose={() => !busy && setIsCreate(false)}><StaffForm busy={busy} onSave={async values => { setBusy(true); try { await act(() => api.post('/staff-directory', values), 'Staff member added'); setIsCreate(false); query.reload(); } catch { } finally { setBusy(false); } }} /></Modal>}
        {edit && <Modal title={`Edit staff · ${edit.name}`} onClose={() => !busy && setEdit(null)}><StaffForm staff={edit} busy={busy} onSave={async values => { setBusy(true); try { await act(() => api.put(`/staff-directory/${edit._id}`, values), 'Staff profile updated'); setEdit(null); query.reload(); } catch { } finally { setBusy(false); } }} /></Modal>}
        {remove && <Modal title="Delete staff member?" onClose={() => !busy && setRemove(null)}><p>Remove <strong>{remove.name} · {remove.employeeId}</strong> from the staff directory? Movement history will be retained. Active movements must be completed first.</p><div className="form-footer"><button className="button secondary" disabled={busy} onClick={() => setRemove(null)}>Cancel</button><button className="button danger" disabled={busy} onClick={deleteStaff}>{busy ? 'Deleting…' : 'Delete staff member'}</button></div></Modal>}
    </section>;
}
function StaffForm({ staff = {}, busy, onSave }) {
    const isEdit = Boolean(staff?._id);
    const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { ...Object.fromEntries(['employeeId', 'name', 'staffRole', 'designation', 'mobile', 'email', 'address', 'photo'].map(k => [k, staff?.[k] || ''])), active: staff?.active !== undefined ? staff.active : true, dateOfBirth: staff?.dateOfBirth?.slice(0, 10) || '', dateOfJoining: staff?.dateOfJoining?.slice(0, 10) || '' } });
    return <form onSubmit={handleSubmit(v => onSave({ ...v, dateOfBirth: v.dateOfBirth ? new Date(v.dateOfBirth).toISOString() : null, dateOfJoining: v.dateOfJoining ? new Date(v.dateOfJoining).toISOString() : null }))}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        <PhotoUpload value={watch('photo')} onChange={v => setValue('photo', v)} />
        <div className="form-grid">
            <Field label="Staff ID *">
                <input type="text" required placeholder="e.g. 1041, 014" {...register('employeeId')} />
            </Field>
            <Field label="Full name *">
                <input type="text" required placeholder="Staff member's full name" {...register('name')} />
            </Field>
            <Field label="Role">
                <input type="text" list="staff-roles-list" placeholder="e.g. teacher, bus staff, coordinator" {...register('staffRole')} />
                <datalist id="staff-roles-list">
                    {['teacher', 'bus staff', 'floor coordinator', 'principal', 'vice principal', 'accountant', 'administrative officer', 'security', 'housekeeping'].map(r => <option key={r} value={r} />)}
                </datalist>
            </Field>
            <Field label="Designation">
                <input type="text" list="staff-desig-list" placeholder="e.g. Bus Driver, PGT-Maths, DPE" {...register('designation')} />
                <datalist id="staff-desig-list">
                    {['Bus Driver', 'PRT', 'TGT', 'PGT', 'Floor Coordinator', 'Administrative Officer', 'Accountant', 'Security Guard'].map(d => <option key={d} value={d} />)}
                </datalist>
            </Field>
            <Field label="Mobile (with country code)">
                <input type="text" placeholder="+919876543210" {...register('mobile')} />
            </Field>
            <Field label="Email">
                <input type="email" placeholder="staff@school.test" {...register('email')} />
            </Field>
            <Field label="Date of birth">
                <input type="date" {...register('dateOfBirth')} />
            </Field>
            <Field label="Date of joining">
                <input type="date" {...register('dateOfJoining')} />
            </Field>
        </div>
        <Field label="Address"><textarea maxLength={500} placeholder="Residential address" {...register('address')} /></Field>
        <label className="checkbox"><input type="checkbox" {...register('active')} /> Active staff member</label>
        <div className="form-footer">
            <button className="button primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff member'}</button>
        </div>
    </fieldset></form>;
}
