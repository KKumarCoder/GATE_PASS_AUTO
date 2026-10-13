// School-local calendar rules shared by creation, scanners and the guard desk.
export function schoolDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function schoolTime(value) {
  return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
}
export function recurringExitIssue(pass, now = new Date()) {
  if (!pass.recurring?.enabled) return null;
  const day = schoolDate(now);
  if (day < pass.passDate || day > pass.recurring.endDate) return 'This pass is outside its valid date range.';
  if (pass.recurring.lastExitDate === day) return 'Student exit has already been recorded today.';
  if (schoolTime(now) < pass.recurring.exitTime) return 'The daily approved exit time has not arrived.';
  return null;
}
export function validityDates(start, end) {
  const dates = [];
  for (let day = new Date(`${start}T00:00:00Z`); day.toISOString().slice(0,10) <= end; day.setUTCDate(day.getUTCDate()+1)) {
    dates.push(day.toISOString().slice(0,10));
  }
  return dates;
}
