// CR-2026-043: one shared projection for class visibility, enrollment and status.
const DEMO_NOW = new Date('2026-09-17T12:00:00+08:00');

function asDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSchedulePublished(record) {
  return record?.scheduleStatus === '已发布' || (Number(record?.scheduleVersion) > 0 && Array.isArray(record?.sessions) && record.sessions.length > 0);
}

export function classIsVisible(record) {
  return Boolean(record && record.status !== '已取消' && isSchedulePublished(record));
}

function unavailable(code, message) {
  return { code, message };
}

// CR-2026-044: one learner-facing projection is shared by course selection,
// the fast-registration channel and the registration detail. Channel exposure
// is deliberately independent from bookability.
export function classSalesProjection(record, now = DEMO_NOW) {
  const published = isSchedulePublished(record);
  const cancelled = record?.status === '已取消';
  const visible = Boolean(record && published && !cancelled);
  const visibleInFastChannel = visible && (record.visibleInFastChannel === true || record.fast === '是');
  const capacity = Number(record?.capacity || 0);
  const enrolled = Number(record?.enrolled || 0);
  const remainingSeats = Math.max(0, capacity - enrolled);
  const enrollStart = asDate(record?.enrollStart);
  const deadline = asDate(record?.deadline);
  const firstLesson = asDate(record?.sessions?.[0]?.date || record?.firstLessonDate);
  const manuallyClosed = record?.enrollmentClosed === true || record?.enrollmentStatus === '已关闭';

  let learnerStatus = '报名结束';
  let unavailableReason = unavailable('NOT_PUBLISHED', '班级尚未发布排班');
  if (cancelled) unavailableReason = unavailable('CLASS_CANCELLED', '班级已取消');
  else if (visible && enrollStart && now < enrollStart) {
    learnerStatus = '即将开放';
    unavailableReason = unavailable('NOT_OPEN', `报名将于${String(record.enrollStart).slice(0, 16)}开放`);
  } else if (visible && remainingSeats <= 0) {
    learnerStatus = '已满员';
    unavailableReason = unavailable('FULL', '班级名额已满');
  } else if (visible && manuallyClosed) {
    unavailableReason = unavailable('ENROLLMENT_CLOSED', '报名已关闭');
  } else if (visible && deadline && now > deadline) {
    unavailableReason = unavailable('DEADLINE_PASSED', '报名已截止');
  } else if (visible && firstLesson && now >= firstLesson) {
    unavailableReason = unavailable('CLASS_STARTED', '班级已开课');
  } else if (visible) {
    learnerStatus = '可报名';
    unavailableReason = null;
  }

  return {
    visible,
    bookable: visible && learnerStatus === '可报名',
    visibleInFastChannel,
    learnerStatus,
    unavailableReason,
    remainingSeats
  };
}

// CR-2026-047 §5.2：班级主状态收窄为 6 值单向链——待排课／待发布／招生中／进行中／已结束／已取消。
// 容量与报名窗口不再参与主链（原先容量短路了教学周期，导致满员班的「进行中／已结束」不可达）；
// 首次发布后主状态进入「招生中」且不回退，发布后的排班变更由「排班版本」列表达。
export function classMainStatus(record, now = DEMO_NOW) {
  if (!record) return '待排课';
  if (record.status === '已取消' || record.canceledAt) return '已取消';
  if (!isSchedulePublished(record)) return record.scheduleStatus === '草稿' ? '待发布' : '待排课';
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  const first = asDate(sessions[0]?.date || record.firstLessonDate);
  const last = asDate(sessions.at(-1)?.date);
  if (last && now > new Date(last.getTime() + 24 * 60 * 60 * 1000)) return '已结束';
  if (first && now >= first) return '进行中';
  return '招生中';
}

// CR-2026-047 §5.3：报名条件是仅在「招生中」阶段有效的派生标签，不落库、不进入主状态；
// 主状态进入「进行中／已结束」后冻结为「已截止」。后台与学员端「已满员」必须来自同一次派生。
export function classEnrollmentCondition(record, now = DEMO_NOW) {
  const main = classMainStatus(record, now);
  if (main === '待排课' || main === '待发布') return '未开始';
  if (main === '已取消' || main === '已结束' || main === '进行中') return '已截止';
  const capacity = Number(record?.capacity || 0);
  const enrolled = Number(record?.enrolled || 0);
  if (capacity > 0 && enrolled >= capacity) return '已满员';
  if (record?.enrollmentClosed === true || record?.enrollmentStatus === '已关闭') return '已关闭';
  const enrollStart = asDate(record?.enrollStart);
  if (enrollStart && now < enrollStart) return '未开始';
  const deadline = asDate(record?.deadline);
  if (deadline && now > deadline) return '已截止';
  return '报名中';
}

// 旧调用名兼容：取值随本单更名为「待排课／待发布」，行为规则不变。
export const deriveClassStatus = classMainStatus;

export function classEnrollment(record, now = DEMO_NOW) {
  const projection = classSalesProjection(record, now);
  return {
    ...projection,
    enrollable: projection.bookable,
    status: projection.learnerStatus,
    reason: projection.unavailableReason?.message || ''
  };
}
