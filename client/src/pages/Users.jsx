import { useState, useMemo } from 'react';
import {
  KeyRound, Plus, ShieldCheck, Shield, Users as UsersIcon, CheckCircle2,
  XCircle, Search, SlidersHorizontal, Smartphone, Eye, EyeOff, Lock,
  GraduationCap, Ticket, Briefcase, ScanLine, UserRoundCheck, Bus,
  Settings, Sparkles, RotateCcw, Info, Check, ShieldAlert, DoorOpen,
  Trash2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../hooks/useData';
import { api, post } from '../services/api';
import { PageTitle, DataState, Table, Empty, Badge, Modal, Field, Avatar, act, pretty } from '../components/UI';
import {
  isAdmin, permissionsFor, roleDefaults, permissionLabels, permissionKeys,
  togglePermission, withDependencies, assignedGateFor
} from '../../../shared/access.mjs';
import './Users.css';

// Grouped module categories for a clean, human-friendly UI
const MODULE_CATEGORIES = [
  {
    id: 'students',
    title: 'Students Directory',
    subtitle: 'Profiles, admission records & management',
    icon: GraduationCap,
    color: '#2563eb',
    keys: ['students.view', 'students.manage']
  },
  {
    id: 'passes',
    title: 'Student Gate Passes',
    subtitle: 'Creation, approvals & emergency passes',
    icon: Ticket,
    color: '#7c3aed',
    keys: ['passes.view', 'passes.create', 'passes.approve', 'passes.emergency', 'passes.pending']
  },
  {
    id: 'staff',
    title: 'Staff Movement & Passes',
    subtitle: 'Staff exit passes & movement approvals',
    icon: Briefcase,
    color: '#059669',
    keys: ['staff.view', 'staff.request', 'staff.manage', 'staff.approve', 'staff.move']
  },
  {
    id: 'gate',
    title: 'Gate & Scanner Operations',
    subtitle: 'Physical gate QR verification & movements',
    icon: ScanLine,
    color: '#d97706',
    keys: ['gate.verify', 'gate.move']
  },
  {
    id: 'visitors',
    title: 'Visitor Management',
    subtitle: 'Guest entry, passes & gate security',
    icon: UserRoundCheck,
    color: '#db2777',
    keys: ['visitors.view', 'visitors.create', 'visitors.move']
  },
  {
    id: 'transport',
    title: 'Bus & Transport',
    subtitle: 'Temporary bus swaps & driver directory',
    icon: Bus,
    color: '#0891b2',
    keys: ['bus-swaps.view', 'bus-swaps.create', 'bus-swaps.approve', 'bus-staff.view']
  },
  {
    id: 'admin',
    title: 'Logs, Reports & Settings',
    subtitle: 'Audit trails, system configuration & reports',
    icon: Settings,
    color: '#475569',
    keys: ['logs.view', 'audit.view', 'reports.view', 'notifications.view', 'settings.manage']
  }
];

const PERMISSION_DESCRIPTIONS = {
  'students.view': 'Search and view all student profiles, class rosters, and parent contacts.',
  'students.manage': 'Add new students, edit profiles, bulk import CSV/Excel and deactivate records.',
  'passes.view': 'View all student gate pass requests, active movements and history.',
  'passes.create': 'Create student gate passes, send OTP to parents and issue passes.',
  'passes.approve': 'Approve or reject parent-verified gate passes before departure.',
  'passes.emergency': 'Issue emergency exit passes bypassing routine parent verification.',
  'passes.pending': 'Access the priority queue of passes waiting for administrator approval.',
  'staff.view': 'View staff movement requests and campus absence logs.',
  'staff.request': 'Request own temporary leave/gate pass from campus.',
  'staff.manage': 'Create, edit and manage gate movement passes for all teachers & staff.',
  'staff.approve': 'Approve or reject movement passes requested by fellow staff.',
  'staff.move': 'Record staff exit and return timestamps at the security gate.',
  'gate.verify': 'Scan student QR codes or enter pass numbers to inspect authorization.',
  'gate.move': 'Log actual physical student exit and return transitions at the gate.',
  'visitors.view': 'View campus visitor logs, expected departure times and visits.',
  'visitors.create': 'Register campus visitors, capture purpose and print QR badges.',
  'visitors.move': 'Record visitor check-in and check-out at school gates.',
  'bus-swaps.view': 'View temporary student bus route change requests.',
  'bus-swaps.create': 'Submit student temporary bus change requests with parent OTP.',
  'bus-swaps.approve': 'Approve or reject bus interchange requests before bus departure.',
  'bus-staff.view': 'View and manage bus numbers, drivers, conductors and mobile contacts.',
  'logs.view': 'Live chronological stream of all gate entrance and exit events.',
  'audit.view': 'Detailed security audit logs tracking who made changes in the system.',
  'reports.view': 'Access analytics, outside student counts and exportable attendance reports.',
  'notifications.view': 'Monitor delivery status of SMS, WhatsApp and email messages.',
  'settings.manage': 'Configure school gates, operational hours, pass validity and system settings.'
};

const COORDINATOR_7_MODULES = [
  'students.view', 'students.manage',
  'passes.view', 'passes.create', 'passes.approve', 'passes.emergency',
  'staff.view', 'staff.request', 'staff.manage', 'staff.approve', 'staff.move',
  'gate.verify', 'gate.move',
  'bus-staff.view'
];

function PinForm({ account, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);

  return (
    <form
      className="user-modal-form"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          await act(() => api.patch(`/users/${account._id}/pin`, { pin }), 'Guard PIN saved');
          onSaved();
        } catch {
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="user-modal-header-card">
        <div className="user-modal-header-profile">
          <Avatar name={account.name} large />
          <div className="user-modal-header-text">
            <strong>{account.name}</strong>
            <small>{account.employeeId} · {assignedGateFor(account) || 'Main Gate'}</small>
          </div>
        </div>
        <span className="emp-id-badge">{account.employeeId}</span>
      </div>

      <div className="modal-info-callout">
        <Info size={18} />
        <div>
          <strong>Guard Scanner PIN</strong>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#166534' }}>
            Setting a 6-digit PIN configures this security guard for quick Gate Scanner tablet login.
            Existing active sessions will be signed out immediately.
          </p>
        </div>
      </div>

      <Field label="New 6-Digit PIN (Numeric only)">
        <div className="password-input-group">
          <input
            className="pin-display-input"
            name="pin"
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            autoComplete="new-password"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            required
            autoFocus
          />
          <button
            type="button"
            className="password-toggle-eye"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide PIN' : 'Show PIN'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>

      <div className="form-footer">
        <button className="button primary" disabled={busy || pin.length !== 6}>
          <Smartphone size={16} />
          {busy ? 'Saving PIN…' : 'Save 6-Digit PIN'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ account, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const lengthValid = password.length >= 12;
  const matchValid = password && password === confirmPassword;

  const submit = async event => {
    event.preventDefault();
    if (!lengthValid) return;
    if (!matchValid) return;

    setBusy(true);
    try {
      await act(
        () => api.patch(`/users/${account._id}/password`, { password }),
        'Staff password updated. They must sign in again with the new password.'
      );
      onSaved();
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="user-modal-form" onSubmit={submit}>
      <div className="user-modal-header-card">
        <div className="user-modal-header-profile">
          <Avatar name={account.name} large />
          <div className="user-modal-header-text">
            <strong>{account.name}</strong>
            <small>{account.email} · {pretty(account.role)}</small>
          </div>
        </div>
        <span className="emp-id-badge">{account.employeeId}</span>
      </div>

      <div className="modal-info-callout warning">
        <Lock size={18} />
        <div>
          <strong>Immediate Session Revocation</strong>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#92400e' }}>
            Setting a new password will instantly terminate all active web and scanner sessions for this staff member.
          </p>
        </div>
      </div>

      <div className="form-grid">
        <Field label="New Password (min 12 characters)">
          <div className="password-input-group">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter secure password…"
              required
              autoFocus
            />
            <button
              type="button"
              className="password-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
            <span style={{ color: lengthValid ? '#10b981' : '#64748b' }}>
              {lengthValid ? '✓ Minimum length satisfied' : `${password.length} / 12 characters min`}
            </span>
          </div>
        </Field>

        <Field label="Confirm New Password">
          <div className="password-input-group">
            <input
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password…"
              required
            />
            <button
              type="button"
              className="password-toggle-eye"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && (
            <span style={{ fontSize: '11px', color: matchValid ? '#10b981' : '#ef4444', marginTop: '4px', display: 'block' }}>
              {matchValid ? '✓ Passwords match' : '✗ Passwords do not match'}
            </span>
          )}
        </Field>
      </div>

      <div className="form-footer">
        <button
          className="button primary"
          disabled={busy || !lengthValid || !matchValid}
        >
          <KeyRound size={16} />
          {busy ? 'Updating Password…' : 'Set New Password'}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirmModal({ account, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await act(
        () => api.delete(`/users/${account._id}`),
        `${account.name} account permanently deleted.`
      );
      onDeleted();
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Permanently Delete Staff Account" onClose={onClose}>
      <form className="user-modal-form" onSubmit={submit}>
        <div className="user-modal-header-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="user-modal-header-profile">
            <Avatar name={account.name} large />
            <div className="user-modal-header-text">
              <strong style={{ color: '#991b1b' }}>{account.name}</strong>
              <small style={{ color: '#b91c1c' }}>{account.email} · Employee ID: {account.employeeId}</small>
            </div>
          </div>
          <Badge value={account.role} />
        </div>

        <div className="modal-info-callout" style={{ background: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' }}>
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px', color: '#e11d48' }} />
          <div>
            <strong style={{ fontSize: '13px' }}>Permanent Deletion Warning</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#9f1239' }}>
              Are you sure you want to permanently delete <strong>{account.name}</strong> (Employee ID: <code>{account.employeeId}</code>)?
              This action <strong>cannot be undone</strong>. All active sessions will be terminated and this user will lose access to the system immediately.
            </p>
          </div>
        </div>

        <div className="form-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button danger"
            disabled={busy}
            style={{ background: 'linear-gradient(115deg, #ef4444, #dc2626)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={16} />
            {busy ? 'Deleting Account…' : 'Yes, Delete Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AccessForm({ account, actor, onSaved }) {
  const creating = !account._id;
  const [role, setRole] = useState(account.role || 'TEACHER');
  const [permissions, setPermissions] = useState(
    permissionsFor(account.role ? account : { role: 'TEACHER' })
  );
  const [customAdmin, setCustomAdmin] = useState(
    Boolean(account.permissions && account.permissions.length > 0)
  );
  const [gate, setGate] = useState(
    assignedGateFor(account.role ? account : { role: 'TEACHER' })
  );
  const [active, setActive] = useState(account.active ?? true);
  const [busy, setBusy] = useState(false);
  const [showInitialPass, setShowInitialPass] = useState(false);

  const settings = useData('/settings');
  const isSuper = actor.role === 'SUPER_ADMIN';
  const roles = [
    ...(isSuper ? ['ADMIN'] : []),
    'PRINCIPAL',
    'SECURITY_GUARD',
    'TEACHER',
    'RECEPTION'
  ];

  const changeRole = value => {
    setRole(value);
    setPermissions(roleDefaults[value] || []);
    setGate(value === 'SECURITY_GUARD' ? 'Main Gate' : '');
    setCustomAdmin(false);
  };

  const handleToggleKey = (key, checked) => {
    setPermissions(prev => togglePermission(prev, key, checked));
  };

  const handleToggleCategory = (catKeys, enable) => {
    setPermissions(prev => {
      if (enable) {
        return withDependencies([...prev, ...catKeys]);
      } else {
        let result = prev.filter(k => !catKeys.includes(k));
        return result;
      }
    });
  };

  const submit = async e => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);

    const access = {
      role,
      assignedGate: gate,
      ...((!isAdmin({ role }) || customAdmin) ? { permissions } : {})
    };

    try {
      await act(
        () => creating
          ? post('/users', { ...values, ...access })
          : api.patch(`/users/${account._id}`, { ...access, active, mobile: values.mobile }),
        creating ? 'Staff account created successfully' : 'Access updated; staff must sign in again'
      );
      onSaved();
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="user-modal-form" onSubmit={submit}>
      {!creating && (
        <div className="user-modal-header-card">
          <div className="user-modal-header-profile">
            <Avatar name={account.name} large />
            <div className="user-modal-header-text">
              <strong>{account.name}</strong>
              <small>{account.email} · {account.employeeId}</small>
            </div>
          </div>
          <Badge value={account.role} />
        </div>
      )}

      {creating && (
        <div className="form-grid">
          <Field label="Full Name">
            <input name="name" placeholder="e.g. Harish Sheoran" required maxLength={100} />
          </Field>
          <Field label="Email Address">
            <input name="email" type="email" placeholder="e.g. staff@srps.edu.in" required />
          </Field>
          <Field label="Employee ID (Login Username)">
            <input name="employeeId" placeholder="e.g. 0007 or SRPS-EMP-005" required maxLength={40} />
          </Field>
          <Field label="Department">
            <input name="department" placeholder="e.g. Science / Gate Security" maxLength={500} />
          </Field>
          <Field label="Initial Password (min 12 chars)">
            <div className="password-input-group">
              <input
                name="password"
                type={showInitialPass ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                placeholder="12+ character password"
                required
              />
              <button
                type="button"
                className="password-toggle-eye"
                onClick={() => setShowInitialPass(!showInitialPass)}
              >
                {showInitialPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
        </div>
      )}

      <div className="form-grid">
        <Field label="Registered Mobile Number (SMS OTP)">
          <input
            name="mobile"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            maxLength={16}
            defaultValue={account.mobile || ''}
          />
        </Field>
        <Field label="Assigned Gate">
          <select
            aria-label="Assigned gate"
            value={gate}
            onChange={e => setGate(e.target.value)}
            required={role === 'SECURITY_GUARD'}
          >
            {role !== 'SECURITY_GUARD' && <option value="">All configured gates</option>}
            {[...new Set([...(settings.data?.gates || ['Main Gate']), ...(gate ? [gate] : [])])].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Staff Role">
          <select aria-label="Role" value={role} onChange={e => changeRole(e.target.value)}>
            {roles.map(r => (
              <option key={r} value={r}>{pretty(r)}</option>
            ))}
          </select>
        </Field>
      </div>

      {!creating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
          <label className="checkbox" style={{ fontWeight: 600, color: '#1e293b' }}>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
            />
            Account Active (Staff can sign in and operate assigned modules)
          </label>
        </div>
      )}

      {/* Module Permissions Control Section */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} color="#4f46e5" />
              Module Permissions Control
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Select which school operations and modules this user can access.
            </p>
          </div>
          <span className="access-summary-badge access-custom-count">
            {permissions.length} allowed actions
          </span>
        </div>

        {isAdmin({ role }) && (
          <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label className="checkbox" style={{ fontWeight: 600, color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={customAdmin}
                onChange={e => {
                  const checked = e.target.checked;
                  setCustomAdmin(checked);
                  if (checked && (!permissions || permissions.length === 0)) {
                    setPermissions([...permissionKeys]);
                  }
                }}
              />
              Customize & restrict module permissions (override full administrator access)
            </label>
            {!customAdmin && (
              <p style={{ margin: '6px 0 0 24px', fontSize: '11px', color: '#64748b' }}>
                Administrators have unrestricted access to all school modules by default. Check above if you want to limit their permissions.
              </p>
            )}
          </div>
        )}

        {(!isAdmin({ role }) || customAdmin) && (
          <>
            {/* Quick Presets Bar */}
            <div className="presets-container" style={{ marginBottom: '16px' }}>
              <div className="presets-label">
                <Sparkles size={14} color="#4f46e5" />
                Quick Permission Presets
              </div>
              <div className="presets-buttons">
                <button
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => setPermissions([...permissionKeys])}
                >
                  ⚡ Full Access (All 26 Actions)
                </button>
                <button
                  type="button"
                  className="preset-chip-btn highlight"
                  onClick={() => setPermissions([...COORDINATOR_7_MODULES])}
                  title="Students + Gate Passes + Staff Movement + Gate Operations + Bus Directory"
                >
                  🎯 7 Modules Preset (Harish Sheoran / Coordinator)
                </button>
                <button
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => setPermissions(roleDefaults[role] ? [...roleDefaults[role]] : [...permissionKeys])}
                >
                  <RotateCcw size={12} />
                  Reset to Role Defaults
                </button>
                <button
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => setPermissions([])}
                >
                  🧹 Clear All
                </button>
              </div>
            </div>

            {/* Categorized Module Cards */}
            <div className="module-categories-stack">
              {MODULE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                const catKeys = cat.keys;
                const enabledCount = catKeys.filter(k => permissions.includes(k)).length;
                const allEnabled = enabledCount === catKeys.length;

                return (
                  <div key={cat.id} className="module-category-card">
                    <div className="module-card-header">
                      <div className="module-card-title-group">
                        <div className="module-card-icon" style={{ background: cat.color }}>
                          <CatIcon size={18} />
                        </div>
                        <div className="module-card-title-text">
                          <h4>{cat.title}</h4>
                          <span>{cat.subtitle} · <strong>{enabledCount}/{catKeys.length} active</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`module-toggle-all-btn ${allEnabled ? 'all-active' : ''}`}
                        onClick={() => handleToggleCategory(catKeys, !allEnabled)}
                      >
                        {allEnabled ? '✓ Enabled' : 'Enable All'}
                      </button>
                    </div>

                    <div className="module-permissions-list">
                      {catKeys.map(key => {
                        const isChecked = permissions.includes(key);
                        return (
                          <label
                            key={key}
                            className={`module-perm-item ${isChecked ? 'checked' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="module-perm-checkbox"
                              checked={isChecked}
                              onChange={e => handleToggleKey(key, e.target.checked)}
                            />
                            <div className="module-perm-text">
                              <span className="module-perm-title">{permissionLabels[key] || key}</span>
                              <span className="module-perm-desc">{PERMISSION_DESCRIPTIONS[key] || ''}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="form-footer" style={{ marginTop: '12px' }}>
        <button className="button primary" disabled={busy}>
          <ShieldCheck size={16} />
          {busy ? 'Saving Access…' : creating ? 'Create Staff Account' : 'Save Access Changes'}
        </button>
      </div>
    </form>
  );
}

export default function Users() {
  const query = useData('/users');
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [pinTarget, setPinTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const items = query.data?.items || [];

  // Filtered & searched items
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter tab
    if (activeTab === 'ADMIN') {
      result = result.filter(u => ['SUPER_ADMIN', 'ADMIN'].includes(u.role));
    } else if (activeTab === 'TEACHER') {
      result = result.filter(u => u.role === 'TEACHER');
    } else if (activeTab === 'GUARD') {
      result = result.filter(u => u.role === 'SECURITY_GUARD');
    } else if (activeTab === 'PRINCIPAL') {
      result = result.filter(u => u.role === 'PRINCIPAL');
    } else if (activeTab === 'RECEPTION') {
      result = result.filter(u => u.role === 'RECEPTION');
    } else if (activeTab === 'INACTIVE') {
      result = result.filter(u => !u.active);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.assignedGate?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeTab, search]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter(u => u.active).length;
    const admins = items.filter(u => ['SUPER_ADMIN', 'ADMIN'].includes(u.role)).length;
    const guards = items.filter(u => u.role === 'SECURITY_GUARD').length;
    return { total, active, admins, guards };
  }, [items]);

  // Check if target user is editable by current actor
  const editable = u => {
    if (u._id === user._id) return false;
    if (u.role === 'SUPER_ADMIN') return false;
    return user.role === 'SUPER_ADMIN' || u.role !== 'ADMIN';
  };

  const handleToggleStatus = async targetUser => {
    try {
      await act(
        () => api.patch(`/users/${targetUser._id}`, { active: !targetUser.active }),
        targetUser.active ? `${targetUser.name} deactivated` : `${targetUser.name} activated`
      );
      query.reload();
    } catch {
    }
  };

  return (
    <div className="users-page">
      <PageTitle
        eyebrow="SUPER ADMIN CONTROL HUB"
        title="Users & Access Management"
        description="Comprehensive management of staff accounts, granular module permissions, passwords and gate assignments."
      >
        <button
          type="button"
          className="button primary add-staff-top-btn"
          onClick={() => setEditing({})}
          title="Add Staff Account"
          aria-label="Add Staff Account"
        >
          <Plus size={20} />
        </button>
      </PageTitle>

      {/* KPI Stats Cards */}
      <section className="users-stats-grid">
        <div className="users-stat-card">
          <div className="users-stat-icon blue">
            <UsersIcon size={22} />
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Total Staff</span>
            <span className="users-stat-value">{stats.total}</span>
            <span className="users-stat-sub">{stats.active} active accounts</span>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Active Users</span>
            <span className="users-stat-value">{stats.active}</span>
            <span className="users-stat-sub">
              {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% active rate` : 'All ready'}
            </span>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon purple">
            <Shield size={22} />
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Administrators</span>
            <span className="users-stat-value">{stats.admins}</span>
            <span className="users-stat-sub">Full system control</span>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon amber">
            <DoorOpen size={22} />
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Security & Gates</span>
            <span className="users-stat-value">{stats.guards}</span>
            <span className="users-stat-sub">Gate scanner stations</span>
          </div>
        </div>
      </section>

      {/* Toolbar: Search and Filter Tabs */}
      <div className="users-controls">
        <div className="users-tabs">
          {[
            { id: 'ALL', label: 'All Staff', count: stats.total },
            { id: 'ADMIN', label: 'Admins', count: stats.admins },
            { id: 'TEACHER', label: 'Teachers', count: items.filter(u => u.role === 'TEACHER').length },
            { id: 'GUARD', label: 'Guards', count: stats.guards },
            { id: 'PRINCIPAL', label: 'Principals', count: items.filter(u => u.role === 'PRINCIPAL').length },
            { id: 'INACTIVE', label: 'Inactive', count: items.filter(u => !u.active).length }
          ].map(tab => (
            <button
              key={tab.id}
              className={`users-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="users-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="users-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, employee ID or gate…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Staff Users Table */}
      <section className="card table-card">
        <DataState query={query}>
          {filteredItems.length ? (
            <Table headers={['STAFF MEMBER', 'EMPLOYEE ID', 'ROLE & GATE', 'MODULE PERMISSIONS', 'STATUS', 'ACTIONS']}>
              {filteredItems.map(u => {
                const isCurrent = u._id === user._id;
                const userPermissions = permissionsFor(u);
                const hasFullControl = isAdmin(u) && (!u.permissions || u.permissions.length === 0 || u.permissions.length === permissionKeys.length);

                return (
                  <tr key={u._id}>
                    <td>
                      <div className="user-info-cell">
                        <div className="user-avatar-wrap">
                          <Avatar name={u.name} />
                          <span className={`user-status-dot ${u.active ? 'active' : 'inactive'}`} />
                        </div>
                        <div className="user-text-details">
                          <span className="user-name-title">
                            {u.name}
                            {isCurrent && <span className="you-pill">You</span>}
                          </span>
                          <span className="user-email-text">{u.email}</span>
                          {u.mobile && <span className="user-phone-text">📱 {u.mobile}</span>}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="emp-id-badge">{u.employeeId}</span>
                    </td>

                    <td>
                      <Badge value={u.role} />
                      <div className="gate-tag">
                        <DoorOpen size={12} />
                        <span>{assignedGateFor(u) || 'All Gates'}</span>
                      </div>
                    </td>

                    <td>
                      {hasFullControl ? (
                        <span className="access-summary-badge access-full-control">
                          <Sparkles size={13} />
                          Full Control (All Modules)
                        </span>
                      ) : (
                        <div>
                          <span className="access-summary-badge access-custom-count">
                            <ShieldCheck size={13} />
                            {userPermissions.length} Active Permissions
                          </span>
                          <div className="access-module-pills">
                            {MODULE_CATEGORIES.filter(cat => cat.keys.some(k => userPermissions.includes(k))).map(cat => (
                              <span key={cat.id} className="access-pill">
                                {cat.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    <td>
                      {editable(u) ? (
                        <button
                          type="button"
                          className={`status-toggle-btn ${u.active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleStatus(u)}
                          title={`Click to ${u.active ? 'deactivate' : 'activate'} account`}
                        >
                          {u.active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {u.active ? 'Active' : 'Disabled'}
                        </button>
                      ) : (
                        <Badge value={u.active ? 'ACTIVE' : 'INACTIVE'} />
                      )}
                    </td>

                    <td>
                      <div className="users-action-btns">
                        {editable(u) ? (
                          <>
                            <button
                              type="button"
                              className="user-action-btn access-btn"
                              onClick={() => setEditing(u)}
                              title="Configure module permissions & gate access"
                              aria-label="Configure access"
                            >
                              <SlidersHorizontal size={16} />
                            </button>

                            <button
                              type="button"
                              className="user-action-btn password-btn"
                              onClick={() => setPasswordTarget(u)}
                              title="Reset staff login password"
                              aria-label="Reset password"
                            >
                              <KeyRound size={16} />
                            </button>

                            {u.role === 'SECURITY_GUARD' && (
                              <button
                                type="button"
                                className="user-action-btn pin-btn"
                                onClick={() => setPinTarget(u)}
                                title="Set 6-digit Gate Scanner PIN"
                                aria-label="Set PIN"
                              >
                                <Smartphone size={16} />
                              </button>
                            )}

                            <button
                              type="button"
                              className="user-action-btn delete-btn"
                              onClick={() => setDeleteTarget(u)}
                              title="Permanently delete staff account"
                              aria-label="Delete account"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            {isCurrent ? 'Your Account' : 'Protected'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty
              title={search ? 'No matching staff found' : 'No staff accounts'}
              description={search ? `No accounts match "${search}". Try adjusting your filters.` : 'Add your first staff account to get started.'}
            />
          )}
        </DataState>
      </section>

      {/* Edit Access / Create Staff Modal */}
      {editing && (
        <Modal
          title={editing._id ? `Manage Access · ${editing.name}` : 'Add New Staff Account'}
          onClose={() => setEditing(null)}
        >
          <AccessForm
            account={editing}
            actor={user}
            onSaved={() => {
              setEditing(null);
              query.reload();
            }}
          />
        </Modal>
      )}

      {/* Set Guard PIN Modal */}
      {pinTarget && (
        <Modal
          title={`Set Guard Scanner PIN · ${pinTarget.name}`}
          onClose={() => setPinTarget(null)}
        >
          <PinForm
            account={pinTarget}
            onSaved={() => {
              setPinTarget(null);
              query.reload();
            }}
          />
        </Modal>
      )}

      {/* Set Password Modal */}
      {passwordTarget && (
        <Modal
          title={`Change Password · ${passwordTarget.name}`}
          onClose={() => setPasswordTarget(null)}
        >
          <PasswordForm
            account={passwordTarget}
            onSaved={() => setPasswordTarget(null)}
          />
        </Modal>
      )}

      {/* Permanently Delete Staff Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            query.reload();
          }}
        />
      )}
    </div>
  );
}
