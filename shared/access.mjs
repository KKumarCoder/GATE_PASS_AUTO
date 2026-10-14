// Shared by the API and UI. Missing overrides preserve role defaults; [] grants nothing.
export const permissionLabels = {
  'bus-swaps.view': 'View temporary bus swaps',
  'bus-swaps.create': 'Request and cancel temporary bus swaps',
  'bus-swaps.approve': 'Approve or reject temporary bus swaps',
  'passes.view': 'View student gate passes',
  'passes.create': 'Create, verify parents, share and cancel passes',
  'passes.approve': 'Approve or reject student passes',
  'passes.emergency': 'Create emergency passes',
  'gate.verify': 'Verify QR / pass number',
  'gate.move': 'Record student exit / return',
  'students.view': 'View student directory',
  'students.manage': 'Add, edit, import and deactivate students',
  'visitors.view': 'View visitor passes',
  'visitors.create': 'Create visitor passes',
  'visitors.move': 'Record visitor entry / exit',
  'staff.view': 'View own staff movement requests',
  'staff.request': 'Request own staff movement',
  'staff.approve': 'View and approve staff movement',
  'staff.move': 'View and record staff exit / return',
  'logs.view': 'View gate logs',
  'audit.view': 'View audit history',
  'reports.view': 'Dashboard, outside students and reports',
  'notifications.view': 'View notification delivery history',
  'settings.manage': 'Manage school settings and bus staff',
};
export const permissionKeys = Object.keys(permissionLabels);
export const roleDefaults = {
  SUPER_ADMIN: permissionKeys,
  ADMIN: permissionKeys,
  PRINCIPAL: ['bus-swaps.view','bus-swaps.create','bus-swaps.approve','passes.view','passes.create','passes.approve','students.view'],
  TEACHER: ['bus-swaps.view','bus-swaps.create','passes.view','passes.create','students.view','staff.view','staff.request'],
  RECEPTION: ['bus-swaps.view','bus-swaps.create','passes.view','passes.create','students.view','visitors.view','visitors.create','staff.view','staff.request'],
  SECURITY_GUARD: ['bus-swaps.view','gate.verify','gate.move'],
};
export const dependencies = {
  'bus-swaps.create':['bus-swaps.view','students.view'], 'bus-swaps.approve':['bus-swaps.view'],
  'passes.create':['passes.view','students.view'], 'passes.approve':['passes.view'],
  'passes.emergency':['passes.create'], 'gate.move':['gate.verify'],
  'students.manage':['students.view'], 'visitors.create':['visitors.view'],
  'visitors.move':['visitors.view','gate.verify'], 'staff.request':['staff.view'],
  'staff.approve':['staff.view'], 'staff.move':['staff.view'], 'audit.view':['logs.view'],
  'reports.view':['passes.view','students.view'],
};
export const isAdmin = user => ['SUPER_ADMIN','ADMIN'].includes(user?.role);
export const permissionsFor = user => {
  if (user?.scannerOnly && user?.role === 'SECURITY_GUARD') return ['gate.verify','gate.move'];
  if (isAdmin(user)) return permissionKeys;
  const permissions = user?.permissions ?? roleDefaults[user?.role] ?? [];
  return user?.role === 'SECURITY_GUARD'
    ? [...new Set([...roleDefaults.SECURITY_GUARD, ...permissions])]
    : permissions;
};
export const can = (user, permission) => permission === 'users.manage' ? isAdmin(user) : permissionsFor(user).includes(permission);
export function withDependencies(values) {
  const result = new Set(values);
  for (const key of result) for (const dependency of dependencies[key] || []) result.add(dependency);
  return [...result];
}
export function togglePermission(values,key,enabled) {
  if (enabled) return withDependencies([...values,key]);
  let result=values.filter(p=>p!==key), changed=true;
  while(changed){const next=result.filter(p=>(dependencies[p]||[]).every(d=>result.includes(d)));changed=next.length!==result.length;result=next;}
  return result;
}
export const assignedGateFor = user => user?.assignedGate || (user?.role === 'SECURITY_GUARD' ? 'Main Gate' : '');
export const homeFor = user => {
  if (user?.scannerOnly) return '/gate/scanner';
  const choices = [['reports.view','/'],['passes.view','/gatepasses'],['gate.verify','/guard'],['bus-swaps.view','/bus-swaps'],['students.view','/students'],['visitors.view','/visitors'],['staff.view','/staff'],['logs.view','/logs'],['notifications.view','/notifications'],['settings.manage','/settings']];
  return choices.find(([key])=>can(user,key))?.[1] || '/no-access';
};
