// 作业链路共享演示存储。
// 作业定义和学员提交记录分离；两端只通过 demo-store 的 localStorage 交换数据，
// 页面级 sessionStorage 仅保留登录和筛选等会话状态，不再承载业务作业记录。
import { classRosterFor } from './class-roster.js';
import { mergeClassSeed } from './class-seed.js';
import { demoId, demoTime, fileSpecSettings, readDemoState, writeDemoState } from './demo-store.js';
import { DEMO_NOW, demoDateTime } from './demo-clock.js';
import { teacherAccounts } from './course-seed.js';

const formatRules = {
  图片: ({ type = '', name = '' }) => type === '图片' || type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name),
  视频: ({ type = '', name = '' }) => type === '视频' || type.startsWith('video/') || /\.(mp4|mov|avi|m4v|webm)$/i.test(name),
  音频: ({ type = '', name = '' }) => type === '音频' || type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(name),
  文档: ({ type = '', name = '' }) => type === '文档' || type === 'PDF' || type === 'application/pdf' || /\.(pdf|doc|docx)$/i.test(name),
  PDF: ({ type = '', name = '' }) => type === 'PDF' || type === 'application/pdf' || /\.pdf$/i.test(name)
};

const seedHomeworks = [
  {
    id: 'HW-DEMO-TEACHING-01-03', classId: 'class-mock-ended-teaching-01', lessonIndex: 3, courseId: 'COURSE-MOCK-1033',
    title: '钢琴基本功练习记录', description: '完成本周音阶与分解和弦练习，上传练习说明或演奏片段。', type: '练习记录', formats: ['视频', '文字'], required: true,
    deadline: '2026-09-27 23:59', resources: ['第3次课示范音频'], status: '已发布', publishedAt: '2026-09-17 12:00', publishedBy: 'teacher-linyue', createdAt: '2026-09-17 12:00', updatedAt: '2026-09-17 12:00'
  },
  {
    id: 'HW-DEMO-TEACHING-02-04', classId: 'class-mock-ended-teaching-02', lessonIndex: 4, courseId: 'COURSE-MOCK-1033',
    title: '节奏练习视频', description: '完成本周节奏练习，提交一段练习视频并补充练习说明。', type: '练习视频', formats: ['视频', '文字'], required: true,
    deadline: '2026-09-28 23:59', resources: [], status: '已发布', publishedAt: '2026-09-18 12:00', publishedBy: 'teacher-linyue', createdAt: '2026-09-18 12:00', updatedAt: '2026-09-18 12:00'
  },
  {
    id: 'HW-DEMO-SCENE-03-05', classId: 'class-mock-scene-03', lessonIndex: 5, courseId: 'COURSE-MOCK-1003',
    title: '身韵组合练习', description: '完成本节课身韵组合练习，记录练习中的一个动作要点。', type: '练习视频', formats: ['视频', '文字'], required: true,
    deadline: '2026-09-29 23:59', resources: ['身韵练习音乐'], status: '已发布', publishedAt: '2026-09-19 12:00', publishedBy: 'teacher-wang', createdAt: '2026-09-19 12:00', updatedAt: '2026-09-19 12:00'
  },
  {
    id: 'HW-DEMO-SCENE-04-06', classId: 'class-mock-scene-04', lessonIndex: 6, courseId: 'COURSE-MOCK-1003',
    title: '组合动作复盘', description: '复盘本节课组合动作，提交练习视频或文字记录。', type: '练习视频', formats: ['视频', '文字'], required: true,
    deadline: '2026-09-30 23:59', resources: [], status: '已发布', publishedAt: '2026-09-20 12:00', publishedBy: 'teacher-wang', createdAt: '2026-09-20 12:00', updatedAt: '2026-09-20 12:00'
  },
  {
    id: 'HW-DEMO-SCENE-05-07', classId: 'class-mock-scene-05', lessonIndex: 7, courseId: 'COURSE-MOCK-1063',
    title: '芭蕾基础训练记录', description: '完成基础训练并记录练习中的动作感受。', type: '文字报告', formats: ['文字'], required: false,
    deadline: '2026-10-01 23:59', resources: [], status: '已发布', publishedAt: '2026-09-21 12:00', publishedBy: 'teacher-wang', createdAt: '2026-09-21 12:00', updatedAt: '2026-09-21 12:00'
  }
];

const classInfo = (classId) => mergeClassSeed(readDemoState().classes || []).find((item) => item.id === classId) || {};
const roster = (classId) => {
  const item = classInfo(classId);
  return classRosterFor(classId, Number(item.enrolled || item.students || 0));
};

function teacherNameForId(actorId) {
  return teacherAccounts.find((teacher) => teacher.id === actorId)?.name || '';
}

function assertTeacherOwnsClass(classId, actorId) {
  const classItem = classInfo(classId);
  const actorName = teacherNameForId(actorId);
  if (!classItem.id || !actorName || classItem.teacher !== actorName) throw new Error('HOMEWORK_OPERATOR_FORBIDDEN');
}

function assertHomeworkOperator(homework, actorId) {
  if (!actorId || (homework?.publishedBy && homework.publishedBy !== actorId)) throw new Error('HOMEWORK_OPERATOR_FORBIDDEN');
  assertTeacherOwnsClass(homework?.classId, actorId);
}

function appendHomeworkAudit(next, event) {
  const audits = Array.isArray(next.homeworkAudits) ? next.homeworkAudits : [];
  const id = event.requestId ? `HWA-${event.action}-${event.requestId}` : demoId('HWA');
  if (audits.some((item) => item.id === id)) return;
  audits.push({ id, at: demoTime(), ...event });
  next.homeworkAudits = audits;
}

function seedSubmissions(homework) {
  const students = roster(homework.classId);
  return students.map((student, index) => {
    const isPrimary = student.id === 'student-001' || student.name === '林知夏';
    const submitted = homework.id.includes('TEACHING-01') ? isPrimary : homework.id.includes('TEACHING-02') ? false : index < Math.max(1, Math.ceil(students.length * 0.7));
    const reviewed = submitted && (homework.id.includes('TEACHING-01') || homework.id.includes('SCENE-05'));
    return {
      id: `SUB-${homework.id}-${student.id}`,
      homeworkId: homework.id, classId: homework.classId, lessonIndex: homework.lessonIndex,
      studentId: student.id, studentName: student.name,
      status: reviewed ? '已点评' : submitted ? '已提交' : '未提交',
      content: submitted ? (isPrimary ? '已完成练习，重点复盘了节奏和动作衔接。' : '已提交本次练习记录。') : '',
      attachments: submitted ? (homework.formats.includes('视频') ? [{ name: `${student.name}-练习视频.mp4`, type: '视频' }] : []) : [],
      submittedAt: submitted ? `${homework.deadline.slice(0, 10)} 12:08` : '',
      updatedAt: submitted ? `${homework.deadline.slice(0, 10)} 12:08` : '',
      review: {
        status: reviewed ? '已点评' : '未点评',
        comment: reviewed ? '动作完成度较好，建议继续保持练习频率，注意细节和节奏稳定性。' : '',
        reviewedAt: reviewed ? `${homework.deadline.slice(0, 10)} 18:30` : '',
        reviewerId: reviewed ? homework.publishedBy : '',
        reviewerName: reviewed ? (homework.publishedBy === 'teacher-linyue' ? '林悦' : '王玥') : ''
      }
    };
  });
}

function storedRows(collection) {
  const rows = readDemoState()[collection];
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

function seedRows() {
  return seedHomeworks.reduce((result, item) => {
    result.homeworks.push(item);
    result.homeworkSubmissions.push(...seedSubmissions(item));
    return result;
  }, { homeworks: [], homeworkSubmissions: [] });
}

function mergeRows(collection) {
  const seeded = seedRows()[collection];
  const stored = storedRows(collection);
  const byId = new Map(seeded.map((row) => [row.id, { ...row }]));
  stored.forEach((row) => byId.set(row.id, { ...(byId.get(row.id) || {}), ...row, review: { ...(byId.get(row.id)?.review || {}), ...(row.review || {}) } }));
  return [...byId.values()];
}

export function listHomework(filters = {}) {
  return mergeRows('homeworks')
    .filter((item) => (!filters.classId || item.classId === filters.classId) && (!filters.lessonIndex || String(item.lessonIndex) === String(filters.lessonIndex)) && (!filters.publishedBy || item.publishedBy === filters.publishedBy))
    .sort((a, b) => String(b.updatedAt || b.publishedAt).localeCompare(String(a.updatedAt || a.publishedAt)));
}

// 作业生命周期只保留三种对外状态，截止时间变化后由共享数据源重新派生。
export function homeworkLifecycleStatus(homework, now = DEMO_NOW) {
  if (homework?.status === '已撤回') return '已撤回';
  if (homework?.status === '草稿') return '草稿';
  return homeworkIsOverdue(homework, now) ? '已结束' : '进行中';
}

export function getHomework(homeworkId) {
  return listHomework().find((item) => item.id === homeworkId) || null;
}

export function listSubmissions(homeworkId) {
  return mergeRows('homeworkSubmissions').filter((item) => item.homeworkId === homeworkId);
}

export function getStudentSubmission(homeworkId, studentId, studentName = '') {
  const current = listSubmissions(homeworkId).find((item) => item.studentId === studentId || (!studentId && item.studentName === studentName)) || null;
  if (!current?.draft || !['已提交', '已点评'].includes(current.status)) return current;
  // 正式提交后的草稿只作为下笔内容回填，不改变对外状态：教师仍看到上一次正式提交。
  return { ...current, hasDraft: true, draftContent: current.draft.content || '', draftAttachments: current.draft.attachments || [], draftUpdatedAt: current.draft.updatedAt || '' };
}

function getStoredStudentSubmission(homeworkId, studentId, studentName = '') {
  return listSubmissions(homeworkId).find((item) => item.studentId === studentId || (!studentId && item.studentName === studentName)) || null;
}

export function homeworkIsOverdue(homework, now = DEMO_NOW) {
  const deadline = demoDateTime(homework?.deadline);
  const current = demoDateTime(now);
  return Number.isFinite(deadline.getTime()) && Number.isFinite(current.getTime()) && current.getTime() > deadline.getTime();
}

export function homeworkFormatAllowed(homework, attachment = {}) {
  const candidate = { type: String(attachment.type || ''), name: String(attachment.name || '') };
  return (homework?.formats || []).some((format) => formatRules[format]?.(candidate));
}

export function homeworkFileLimitMb(attachment = {}) {
  const settings = fileSpecSettings();
  const type = String(attachment.type || '').toLowerCase();
  const name = String(attachment.name || '').toLowerCase();
  if (type === '视频' || type.startsWith('video/') || /\.(mp4|mov|avi|m4v|webm)$/i.test(name)) return settings.videoMb;
  if (type === '图片' || type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return settings.imageMb;
  return settings.documentMb;
}

function validateSubmission(homework, input, existing) {
  if (!homework) throw new Error('HOMEWORK_NOT_FOUND');
  if (homeworkLifecycleStatus(homework) === '已撤回') throw new Error('HOMEWORK_WITHDRAWN');
  if (homeworkIsOverdue(homework)) throw new Error('HOMEWORK_DEADLINE_PASSED');
  if (existing?.status === '已点评' && !input.allowResubmit) throw new Error('HOMEWORK_ALREADY_REVIEWED');
  const expected = listSubmissions(homework.id);
  if (expected.length && !expected.some((row) => row.studentId === input.studentId || row.studentName === input.studentName)) {
    throw new Error('HOMEWORK_STUDENT_NOT_ALLOWED');
  }
  const content = String(input.content || '').trim();
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  if (input.status === '已提交' && !content && !attachments.length) throw new Error('HOMEWORK_EMPTY_SUBMISSION');
  if (content && !(homework.formats || []).includes('文字')) throw new Error('HOMEWORK_TEXT_NOT_ALLOWED');
  for (const attachment of attachments) {
    if (!homeworkFormatAllowed(homework, attachment)) throw new Error('HOMEWORK_FILE_FORMAT_INVALID');
    if (Number(attachment.size || 0) > homeworkFileLimitMb(attachment) * 1024 * 1024) throw new Error('HOMEWORK_FILE_TOO_LARGE');
  }
}

export function submissionSummary(homeworkId) {
  const rows = listSubmissions(homeworkId);
  return {
    total: rows.length,
    submitted: rows.filter((row) => ['已提交', '已点评'].includes(row.status)).length,
    pendingReview: rows.filter((row) => row.status === '已提交').length,
    reviewed: rows.filter((row) => row.status === '已点评').length,
    missing: rows.filter((row) => ['未提交', '草稿'].includes(row.status)).length
  };
}

// MVP 口径 1（2026-09-24 冻结）：发布时按班级名册冻结应交名单，为每位学员生成一条「未提交」记录。
// 记录 id 沿用种子规则 SUB-{作业id}-{学员id}，保证重复发布时幂等、不产生第二条应交记录。
function expectedSubmissionRows(homework, now) {
  return roster(homework.classId).map((student) => ({
    id: `SUB-${homework.id}-${student.id}`,
    homeworkId: homework.id, classId: homework.classId, lessonIndex: homework.lessonIndex,
    studentId: student.id, studentName: student.name,
    status: '未提交', content: '', attachments: [], submittedAt: '', updatedAt: now,
    review: { status: '未点评', comment: '', reviewedAt: '', reviewerId: '', reviewerName: '' }
  }));
}

export function publishHomework(input) {
  const now = demoTime();
  const deadline = demoDateTime(input.deadline);
  if (!input.publishedBy) throw new Error('HOMEWORK_OPERATOR_FORBIDDEN');
  assertTeacherOwnsClass(input.classId, input.publishedBy);
  if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= demoDateTime(now).getTime()) throw new Error('HOMEWORK_DEADLINE_INVALID');
  const record = { ...input, id: input.id || demoId('HW'), status: '已发布', publishedAt: input.publishedAt || now, createdAt: input.createdAt || now, updatedAt: now, publishedBy: input.publishedBy || 'teacher-demo' };
  writeDemoState((next) => {
    next.homeworks = [...(next.homeworks || []).filter((item) => item.id !== record.id), record];
    // 只补充缺失的应交记录，不覆盖已存在的提交／点评（种子记录或学员已提交的内容）。
    const existing = new Set((next.homeworkSubmissions || []).filter((row) => row.homeworkId === record.id).map((row) => row.id));
    const pending = expectedSubmissionRows(record, now).filter((row) => !existing.has(row.id));
    next.homeworkSubmissions = [...(next.homeworkSubmissions || []), ...pending];
    const notifications = Array.isArray(next.homeworkNotifications) ? next.homeworkNotifications : [];
    pending.forEach((row) => {
      const id = `HW-PUBLISHED-${record.id}-${row.studentId}`;
      if (notifications.some((item) => item.id === id)) return;
      notifications.push({ id, audience: 'learner', recipientId: row.studentId, type: '作业发布', title: '有新的作业待提交', summary: `${record.title}已发布，请在截止时间前完成提交。`, body: `教师已发布「${record.title}」，截止时间为${record.deadline}，请进入作业页面查看要求并提交。`, createdAt: now, read: false, homeworkId: record.id, classId: record.classId, target: `/learner/pages/homework.html?homeworkId=${encodeURIComponent(record.id)}&classId=${encodeURIComponent(record.classId)}` });
    });
    next.homeworkNotifications = notifications;
    appendHomeworkAudit(next, { action: '发布作业', homeworkId: record.id, classId: record.classId, actorId: record.publishedBy, requestId: input.requestId || '' });
    return next;
  });
  return record;
}

export function updateHomeworkDeadline(homeworkId, deadline, operator = {}) {
  const homework = getHomework(homeworkId);
  const nextDeadline = demoDateTime(deadline);
  const oldDeadline = demoDateTime(homework?.deadline);
  if (!homework) throw new Error('HOMEWORK_NOT_FOUND');
  assertHomeworkOperator(homework, operator.id);
  if (homeworkLifecycleStatus(homework) === '已撤回') throw new Error('HOMEWORK_WITHDRAWN');
  if (!Number.isFinite(nextDeadline.getTime()) || !Number.isFinite(oldDeadline.getTime()) || nextDeadline.getTime() <= oldDeadline.getTime()) throw new Error('HOMEWORK_DEADLINE_MUST_EXTEND');
  const updated = { ...homework, deadline, updatedAt: demoTime(), deadlineExtendedAt: demoTime(), deadlineExtendedBy: operator.id || '', deadlineExtensionReason: operator.reason || '' };
  writeDemoState((next) => {
    next.homeworks = (next.homeworks || []).map((item) => item.id === homeworkId ? updated : item);
    const notifications = Array.isArray(next.homeworkNotifications) ? next.homeworkNotifications : [];
    listSubmissions(homeworkId).filter((row) => ['未提交', '草稿'].includes(row.status)).forEach((row) => {
      const id = `HW-EXTENDED-${homeworkId}-${row.studentId}-${String(deadline).replace(/[^0-9]/g, '')}`;
      if (!notifications.some((item) => item.id === id)) notifications.push({ id, audience: 'learner', recipientId: row.studentId, type: '作业延期', title: '作业截止时间已调整', summary: `${homework.title}截止时间已延长至${deadline}。`, body: `教师已将「${homework.title}」截止时间调整至${deadline}，请按新时间完成提交。`, createdAt: demoTime(), read: false, homeworkId, classId: homework.classId, target: `/learner/pages/homework.html?homeworkId=${encodeURIComponent(homeworkId)}&classId=${encodeURIComponent(homework.classId)}` });
    });
    next.homeworkNotifications = notifications;
    appendHomeworkAudit(next, { action: '延长截止时间', homeworkId, classId: homework.classId, actorId: operator.id || '', requestId: operator.requestId || '', reason: operator.reason || '', before: homework.deadline, after: updated.deadline });
    return next;
  });
  return updated;
}

export function withdrawHomework(homeworkId, reason, operator = {}) {
  const homework = getHomework(homeworkId);
  if (!homework) throw new Error('HOMEWORK_NOT_FOUND');
  assertHomeworkOperator(homework, operator.id);
  if (homeworkLifecycleStatus(homework) === '已撤回') return homework;
  const rows = listSubmissions(homeworkId);
  if (rows.some((row) => ['已提交', '已点评'].includes(row.status))) throw new Error('HOMEWORK_HAS_SUBMISSIONS');
  const updated = { ...homework, status: '已撤回', withdrawnAt: demoTime(), withdrawnBy: operator.id || '', withdrawalReason: String(reason || '').trim(), updatedAt: demoTime() };
  writeDemoState((next) => {
    next.homeworks = (next.homeworks || []).map((item) => item.id === homeworkId ? updated : item);
    const notifications = Array.isArray(next.homeworkNotifications) ? next.homeworkNotifications : [];
    rows.filter((row) => ['未提交', '草稿'].includes(row.status)).forEach((row) => {
      const id = `HW-WITHDRAWN-${homeworkId}-${row.studentId}`;
      if (!notifications.some((item) => item.id === id)) notifications.push({ id, audience: 'learner', recipientId: row.studentId, type: '作业撤回', title: '作业已撤回', summary: `${homework.title}已撤回，当前无需继续提交。`, body: `教师已撤回「${homework.title}」，该作业不再接受提交。${updated.withdrawalReason ? `原因：${updated.withdrawalReason}` : ''}`, createdAt: demoTime(), read: false, homeworkId, classId: homework.classId, target: `/learner/pages/homework.html?homeworkId=${encodeURIComponent(homeworkId)}&classId=${encodeURIComponent(homework.classId)}` });
    });
    next.homeworkNotifications = notifications;
    appendHomeworkAudit(next, { action: '撤回作业', homeworkId, classId: homework.classId, actorId: operator.id || '', requestId: operator.requestId || '', reason: updated.withdrawalReason });
    return next;
  });
  return updated;
}

export function saveDraftSubmission(input) {
  return saveSubmission({ ...input, status: '草稿' });
}

export function submitHomework(input) {
  const record = saveSubmission({ ...input, status: '已提交', submittedAt: input.submittedAt || demoTime(), review: { status: '未点评', comment: '', reviewedAt: '', reviewerId: '', reviewerName: '' } });
  writeDemoState((next) => {
    const homework = (next.homeworks || []).find((item) => item.id === input.homeworkId);
    const notifications = Array.isArray(next.homeworkNotifications) ? next.homeworkNotifications : [];
    const id = `HW-SUBMITTED-${input.homeworkId}-${record.studentId}-${record.version || 1}`;
    if (homework && !notifications.some((item) => item.id === id)) notifications.push({ id, audience: 'teacher', recipientId: homework.publishedBy || '', type: '作业提交提醒', title: '有学员提交了作业', summary: `${record.studentName}已提交「${homework.title}」，请及时批阅。`, body: `${record.studentName}已提交「${homework.title}」第${record.version || 1}次提交，请进入作业详情查看内容并完成点评。`, createdAt: demoTime(), read: false, homeworkId: homework.id, classId: homework.classId, target: `/teacher/pages/homework.html?homeworkId=${encodeURIComponent(homework.id)}` });
    next.homeworkNotifications = notifications;
    appendHomeworkAudit(next, { action: '提交作业', homeworkId: homework?.id || input.homeworkId, classId: homework?.classId || input.classId, actorId: record.studentId, requestId: input.requestId || '', submissionId: record.id, version: record.version || 1 });
    return next;
  });
  return record;
}

function saveSubmission(input) {
  const now = demoTime();
  const homework = getHomework(input.homeworkId);
  const existing = getStoredStudentSubmission(input.homeworkId, input.studentId, input.studentName);
  validateSubmission(homework, input, existing);
  // 正式提交之后保存草稿不能改写教师侧看到的正式版本；草稿挂在正式记录上，提交时再生成新版本。
  if (input.status === '草稿' && existing && ['已提交', '已点评'].includes(existing.status)) {
    const draft = { status: '草稿', content: input.content || '', attachments: input.attachments || [], updatedAt: now };
    const record = { ...existing, draft, updatedAt: now };
    writeDemoState((next) => { next.homeworkSubmissions = [...(next.homeworkSubmissions || []).filter((item) => item.id !== record.id), record]; return next; });
    return { ...record, ...draft, formalStatus: existing.status, draftOfVersion: existing.version };
  }
  const record = {
    ...(existing || {}), ...input,
    id: existing?.id || input.id || demoId('SUB'),
    version: input.status === '已提交' ? Number(existing?.version || 0) + 1 : Number(existing?.version || 1),
    history: input.status === '已提交' && existing && ['草稿', '已提交', '已点评'].includes(existing.status)
      ? [...(existing.history || []), { version: existing.version || 1, status: existing.status, content: existing.content || '', attachments: existing.attachments || [], submittedAt: existing.submittedAt || '', updatedAt: existing.updatedAt || '', review: existing.review || {} }]
      : (existing?.history || []),
    updatedAt: now,
    draft: null,
    review: { ...(existing?.review || { status: '未点评', comment: '', reviewedAt: '', reviewerId: '', reviewerName: '' }), ...(input.review || {}) }
  };
  writeDemoState((next) => { next.homeworkSubmissions = [...(next.homeworkSubmissions || []).filter((item) => item.id !== record.id), record]; return next; });
  return record;
}

export function reviewSubmission(submissionId, comment, reviewer = {}) {
  const current = mergeRows('homeworkSubmissions').find((item) => item.id === submissionId);
  if (!current || !['已提交', '已点评'].includes(current.status)) return null;
  const homework = getHomework(current.homeworkId);
  assertHomeworkOperator(homework, reviewer.id);
  if (homeworkLifecycleStatus(homework) === '已撤回') throw new Error('HOMEWORK_WITHDRAWN');
  if (!String(comment || '').trim()) throw new Error('HOMEWORK_REVIEW_EMPTY');
  const isRevision = current.status === '已点评';
  const reviewVersion = Number(current.reviewVersion || 0) + 1;
  const record = { ...current, status: '已点评', updatedAt: demoTime(), reviewVersion, reviewHistory: isRevision
    ? [...(current.reviewHistory || []), { version: current.reviewVersion || 1, ...current.review }]
    : (current.reviewHistory || []), review: { ...(current.review || {}), status: '已点评', comment: String(comment || '').trim(), attachments: reviewer.attachments || current.review?.attachments || [], reviewedAt: demoTime(), reviewerId: reviewer.id || '', reviewerName: reviewer.name || '' } };
  writeDemoState((next) => {
    next.homeworkSubmissions = [...(next.homeworkSubmissions || []).filter((item) => item.id !== record.id), record];
    const notifications = Array.isArray(next.homeworkNotifications) ? next.homeworkNotifications : [];
    const id = `HW-REVIEWED-${record.homeworkId}-${record.studentId}-${record.version || 1}-${reviewVersion}`;
    if (homework && !notifications.some((item) => item.id === id)) notifications.push({ id, audience: 'learner', recipientId: record.studentId, type: isRevision ? '作业点评修改' : '作业批改', title: isRevision ? '教师已修改作业点评' : '作业已完成点评', summary: `教师已${isRevision ? '修改' : '完成'}「${homework.title}」点评，请查看评语。`, body: `教师已${isRevision ? '修改' : '完成'}「${homework.title}」的文本点评，请进入作业页面查看最新评语和练习建议。`, createdAt: demoTime(), read: false, homeworkId: homework.id, classId: homework.classId, target: `/learner/pages/homework.html?homeworkId=${encodeURIComponent(homework.id)}&classId=${encodeURIComponent(homework.classId)}` });
    next.homeworkNotifications = notifications;
    appendHomeworkAudit(next, { action: isRevision ? '修改点评' : '点评作业', homeworkId: homework.id, classId: homework.classId, actorId: reviewer.id || '', requestId: reviewer.requestId || '', submissionId: record.id, version: record.version || 1, reviewVersion });
    return next;
  });
  return record;
}

export function syncHomeworkNotificationReads(rows = []) {
  const readById = new Map(rows.filter((row) => row?.id).map((row) => [row.id, Boolean(row.read)]));
  if (!readById.size) return;
  writeDemoState((next) => {
    next.homeworkNotifications = (next.homeworkNotifications || []).map((row) => readById.has(row.id) ? { ...row, read: readById.get(row.id) } : row);
    return next;
  });
}

export function homeworkForLesson(classId, lessonIndex) {
  return listHomework({ classId, lessonIndex });
}

export function homeworkSeedData() {
  return { homeworks: seedRows().homeworks, homeworkSubmissions: seedRows().homeworkSubmissions };
}
