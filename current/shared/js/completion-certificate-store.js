import { demoTime, readDemoState, writeDemoState } from './demo-store.js';

export const CERTIFICATE_STATUS = { PENDING: '待生成', GENERATING: '生成中', ISSUED: '已生成', VOID: '已作废', FAILED: '生成失败' };
export const COMPLETION_CERTIFICATE_TEMPLATE = { code: 'completion-default', name: '系统默认结业证书', version: 1 };
const LEGACY_STATUS_MAP = { 待发放: CERTIFICATE_STATUS.PENDING, 已发放: CERTIFICATE_STATUS.ISSUED };
const seeded = [
  { id: 'cert-completion-001', number: 'CERT-2026-0908-001', studentId: 'learner-zhao', studentName: '赵明月', classId: 'class-mock-ended-pending-01', className: '暑期中国舞基础1班', course: '中国舞进阶训练', completionDate: '2026-09-09', status: CERTIFICATE_STATUS.ISSUED, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, issuedAt: '2026-09-09 10:22', generatedAt: '2026-09-09 10:21', fileName: 'CERT-2026-0908-001.pdf', pdfSnapshot: true },
  { id: 'cert-completion-002', number: 'CERT-2026-0907-001', studentId: 'learner-liu', studentName: '刘女士', classId: 'class-mock-ended-pending-02', className: '成人声乐班', course: '声乐基础', completionDate: '2026-09-08', status: CERTIFICATE_STATUS.PENDING, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, issuedAt: '', generatedAt: '', fileName: '', pdfSnapshot: false },
  { id: 'cert-completion-003', number: 'CERT-2026-0906-004', studentId: 'learner-wang', studentName: '王晨', classId: 'class-mock-ended-pending-03', className: '中国画基础班', course: '中国画基础', completionDate: '2026-09-06', status: CERTIFICATE_STATUS.FAILED, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, issuedAt: '', generatedAt: '2026-09-06 19:10', fileName: '', pdfSnapshot: false, failureReason: 'PDF 快照存储失败' }
  ,{ id: 'cert-completion-004', number: 'CERT-2026-0905-002', studentId: 'learner-chen', studentName: '陈思远', classId: 'class-mock-ended-pending-04', className: '成人钢琴基础班', course: '钢琴入门', completionDate: '2026-09-05', status: CERTIFICATE_STATUS.GENERATING, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, issuedAt: '', generatedAt: '2026-09-05 16:30', fileName: '', pdfSnapshot: false }
  ,{ id: 'cert-completion-005', number: 'CERT-2026-0901-003', studentId: 'learner-sun', studentName: '孙文', classId: 'class-mock-ended-pending-05', className: '现代舞基础班', course: '现代舞基础', completionDate: '2026-09-01', status: CERTIFICATE_STATUS.VOID, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, issuedAt: '2026-09-01 11:05', generatedAt: '2026-09-01 11:04', fileName: 'CERT-2026-0901-003.pdf', pdfSnapshot: true, voidReason: '学员信息校验后需重新生成', voidedAt: '2026-09-02 09:15' }
];
function normalizeCertificate(row) {
  const status = LEGACY_STATUS_MAP[row?.status] || row?.status || CERTIFICATE_STATUS.PENDING;
  return status === row?.status ? row : { ...row, status };
}
function ensureSeeds() {
  const state = readDemoState();
  if ((state.completionCertificates || []).length) {
    const normalized = state.completionCertificates.map(normalizeCertificate);
    const existingIds = new Set(normalized.map((row) => row.id));
    const additions = seeded.filter((row) => !existingIds.has(row.id));
    const merged = [...normalized, ...additions];
    if (additions.length || normalized.some((row, index) => row !== state.completionCertificates[index])) writeDemoState((next) => ({ ...next, completionCertificates: merged }));
    return merged;
  }
  writeDemoState((next) => ({ ...next, completionCertificates: seeded }));
  return seeded;
}
export function listCompletionCertificates() { return ensureSeeds().slice().sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt))); }
export function ensureCompletionCertificate(input = {}) {
  if (input.courseType === '视频课程' || !input.studentId || !input.classId || !input.studentName || !input.course) throw new Error('面授结业证书信息不完整或课程类型不支持');
  ensureSeeds();
  const current = listCompletionCertificates().find(row => row.studentId === input.studentId && row.classId === input.classId && row.status === CERTIFICATE_STATUS.ISSUED && row.pdfSnapshot);
  if (current) return current;
  const now = demoTime();
  const number = `CERT-${input.classId}-${input.studentId}`;
  const record = { ...input, id: number, number, status: CERTIFICATE_STATUS.ISSUED, version: 1, template: COMPLETION_CERTIFICATE_TEMPLATE, generatedAt: now, issuedAt: now, fileName: `${number}.pdf`, pdfSnapshot: true };
  writeDemoState(next => ({ ...next, completionCertificates: [record, ...(next.completionCertificates || [])] }));
  return record;
}
export function retryCompletionCertificate(id) { let result = null; writeDemoState((next) => { next.completionCertificates = (next.completionCertificates || []).map((row) => { if (row.id !== id || row.status !== CERTIFICATE_STATUS.FAILED) return row; const now = demoTime(); result = { ...row, status: CERTIFICATE_STATUS.ISSUED, template: COMPLETION_CERTIFICATE_TEMPLATE, generatedAt: now, issuedAt: now, fileName: `${row.number}.pdf`, pdfSnapshot: true, version: (row.version || 0) + 1, failureReason: '' }; return result; }); return next; }); return result; }
export function voidCompletionCertificate(id, reason) { let result = null; writeDemoState((next) => { next.completionCertificates = (next.completionCertificates || []).map((row) => { if (row.id !== id || row.status === CERTIFICATE_STATUS.VOID) return row; result = { ...row, status: CERTIFICATE_STATUS.VOID, voidReason: reason, voidedAt: demoTime() }; return result; }); return next; }); return result; }
