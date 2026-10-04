export const cardSize = { widthMm: 53.98, heightMm: 85.60 };
export const cardStudent = student => ({
  name: student?.name || 'Student',
  admissionNumber: student?.admissionNumber || 'N/A',
  busNumber: student?.busNumber?.trim() || 'N/A',
  photo: student?.photo || '',
});
export const cardFilename = admission => `SRPS_GatePass_${String(admission || 'student').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
