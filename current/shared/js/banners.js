// D-03（ZK-D-17 9.1）：后台轮播图管理列表读取 banner-seed 与 demo-store，与学员端首页轮播同源。
import { mergeBanners } from './banner-seed.js';
import { readDemoState, upsertDemoRecord } from './demo-store.js';
import { courseArchiveSeed } from './course-display.js';
import { allProducts } from './product-seed.js';
import { TEACHER_FACTS } from './teacher-facts.js';

const root = document.querySelector('[data-banner-page]');
let activeBanner = null;
let toastTimer;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const statusTone = (value) => (value === '已启用' ? 'green' : value === '草稿' ? 'gray' : 'amber');
const detailJumpTypes = new Set(['课程详情', '商品详情', '教师详情']);

function targetChoices(type) {
  const shared = readDemoState();
  if (type === '课程详情') {
    const productCourseIds = new Set(allProducts(shared).map((item) => item.courseId));
    return courseArchiveSeed().filter((item) => productCourseIds.has(item.sourceCourseId)).map((item) => ({ id: item.sourceCourseId, name: item.name, target: `/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.sourceCourseId)}` }));
  }
  if (type === '商品详情') {
    return allProducts(shared).map((item) => ({ id: item.id, name: item.name || item.course, target: `/learner/pages/course-detail.html?courseId=${encodeURIComponent(item.courseId)}` }));
  }
  if (type === '教师详情') {
    const featuredIds = new Set(shared.featuredTeacherIds || []);
    return TEACHER_FACTS.filter((item) => featuredIds.has(item.id) && !item.departedAt).map((item) => ({ id: item.id, name: item.name, target: `/learner/pages/teacher-detail.html?teacherId=${encodeURIComponent(item.id)}` }));
  }
  return [];
}

function fixedJumpTarget(type) {
  if (type === '课程列表' || type === '课程库') return '/learner/pages/courses.html';
  if (type === '名师列表') return '/learner/pages/teachers.html';
  return '';
}

function refreshTargetField(type, selectedId = '') {
  const field = document.querySelector('#banner-target-field');
  const label = document.querySelector('#banner-target-label');
  const select = document.querySelector('#banner-target');
  if (!field || !label || !select) return;
  const required = detailJumpTypes.has(type);
  field.hidden = !required;
  select.required = required;
  if (!required) {
    select.innerHTML = '';
    return;
  }
  const noun = type === '教师详情' ? '名师' : type === '商品详情' ? '商品' : '课程';
  label.textContent = `具体${noun} *`;
  select.innerHTML = `<option value="">请选择${noun}</option>${targetChoices(type).map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}`;
}

function showToast(message, kind = 'success') {
  const element = document.querySelector('[data-banner-toast]');
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { element.hidden = true; }, 2600);
}

function currentBanners() {
  return mergeBanners(readDemoState()).sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0));
}

function persist(record) {
  upsertDemoRecord('banners', record);
}

function rowMarkup(item) {
  const nextStatus = item.status === '已启用' ? '草稿' : '已启用';
  const toggleLabel = item.status === '已启用' ? '下架' : '启用';
  const targetName = item.targetName ? `<small class="sub-cell">${escapeHtml(item.targetName)}</small>` : '';
  return `<tr data-banner-id="${escapeHtml(item.id)}" data-status="${escapeHtml(item.status)}"><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.position)}</td><td>${escapeHtml(item.jumpType)}${targetName}</td><td>${escapeHtml(item.sort)}</td><td data-cell="status"><span class="tag ${statusTone(item.status)}">${escapeHtml(item.status)}</span></td><td class="action-cell" data-cell="actions"><button type="button" class="text-button" data-banner-action="edit">编辑</button><button type="button" class="text-button" data-banner-action="toggle">${toggleLabel}</button><button type="button" class="text-button" data-banner-action="delete">删除</button><span hidden data-banner-next="${escapeHtml(nextStatus)}"></span></td></tr>`;
}

function render() {
  if (!root) return;
  const items = currentBanners();
  const enabled = items.filter((item) => item.status === '已启用').length;
  const draft = items.length - enabled;
  root.innerHTML = `<div class="page-head"><div><h1>轮播图管理</h1></div><button type="button" class="button primary" data-banner-action="create">新增轮播图</button></div><div class="toolbar"><span data-banner-summary>已启用 ${enabled} 张 · 草稿 ${draft} 张</span><div class="toolbar-actions"><button type="button" class="button" data-banner-filter="all">全部</button><button type="button" class="button" data-banner-filter="已启用">已启用</button><button type="button" class="button" data-banner-filter="草稿">草稿</button></div></div><div class="table-wrap"><table><thead><tr><th>轮播图名称</th><th>展示位置</th><th>跳转类型</th><th>排序</th><th>状态</th><th>操作</th></tr></thead><tbody>${items.map(rowMarkup).join('') || '<tr><td colspan="6"><div class="empty">暂无轮播图，请新增。</div></td></tr>'}</tbody></table></div><dialog id="banner-form-dialog" class="modal-dialog small-dialog"><form class="modal-card" id="banner-form"><div class="modal-header"><div><h2 id="banner-form-title">新增轮播图</h2><p>轮播图状态与排序直接决定学员端首页展示顺序。</p></div><button type="button" class="icon-button modal-close" data-banner-close title="关闭" aria-label="关闭">×</button></div><label class="form-field"><span>轮播图名称 *</span><input id="banner-name" required placeholder="请输入轮播图名称"></label><label class="form-field"><span>跳转类型 *</span><select id="banner-jump"><option>无跳转</option><option>课程详情</option><option>商品详情</option><option>课程列表</option><option>名师列表</option><option>教师详情</option></select></label><label class="form-field" id="banner-target-field" hidden><span id="banner-target-label">具体对象 *</span><select id="banner-target"></select><small>目标地址由系统生成，无需手工填写 ID。</small></label><label class="form-field"><span>排序 *</span><input id="banner-sort" type="number" min="1" required value="1"></label><label class="form-field"><span>状态 *</span><select id="banner-status"><option>已启用</option><option>草稿</option></select></label><p class="form-error" id="banner-form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="button" data-banner-close>取消</button><button type="submit" class="button primary" id="banner-form-submit" data-confirm-action="banner-save">保存</button></div></form></dialog><div class="toast" data-banner-toast role="status" aria-live="polite" hidden></div>`;
}

function openForm(item) {
  activeBanner = item || null;
  const dialog = document.querySelector('#banner-form-dialog');
  const title = document.querySelector('#banner-form-title');
  if (title) title.textContent = item ? '编辑轮播图' : '新增轮播图';
  const set = (id, value) => { const element = document.querySelector(id); if (element) element.value = value ?? ''; };
  set('#banner-name', item?.name || '');
  const jumpType = item?.jumpType === '课程库' ? '课程列表' : item?.jumpType || '无跳转';
  set('#banner-jump', jumpType);
  set('#banner-sort', item?.sort || currentBanners().length + 1);
  set('#banner-status', item?.status || '草稿');
  refreshTargetField(jumpType, item?.targetId || '');
  const error = document.querySelector('#banner-form-error');
  if (error) error.hidden = true;
  if (dialog && !dialog.open) dialog.showModal();
}

function saveForm(event) {
  event.preventDefault();
  const name = document.querySelector('#banner-name')?.value.trim();
  const error = document.querySelector('#banner-form-error');
  if (!name) {
    if (error) { error.textContent = '轮播图名称不能为空。'; error.hidden = false; }
    return;
  }
  const jumpType = document.querySelector('#banner-jump')?.value || '无跳转';
  const selectedTarget = targetChoices(jumpType).find((item) => item.id === document.querySelector('#banner-target')?.value);
  if (detailJumpTypes.has(jumpType) && !selectedTarget) {
    if (error) { error.textContent = `请选择具体${jumpType === '教师详情' ? '名师' : jumpType === '商品详情' ? '商品' : '课程'}。`; error.hidden = false; }
    return;
  }
  const record = {
    ...(activeBanner || {}),
    id: activeBanner?.id || `banner-${Date.now()}`,
    name,
    position: activeBanner?.position || '学员端首页',
    jumpType,
    targetId: selectedTarget?.id || '',
    targetName: selectedTarget?.name || '',
    jumpTarget: selectedTarget?.target || fixedJumpTarget(jumpType),
    sort: Number(document.querySelector('#banner-sort')?.value || 1),
    status: document.querySelector('#banner-status')?.value || '草稿',
    copy: activeBanner?.copy || { kicker: '运营配置', title: name, text: '由后台轮播图管理配置的展示位。', mark: '荐' },
    deleted: false
  };
  persist(record);
  document.querySelector('#banner-form-dialog')?.close();
  render();
  showToast(activeBanner ? '轮播图已更新，学员端首页同步生效。' : '轮播图已新增，状态为草稿时不在学员端展示。');
}

function handleAction(event) {
  const trigger = event.target.closest('[data-banner-action]');
  if (!trigger) return;
  const action = trigger.dataset.bannerAction;
  if (action === 'create') { openForm(null); return; }
  const row = trigger.closest('tr[data-banner-id]');
  if (action === 'toggle' && row) {
    const status = trigger.closest('td')?.querySelector('[data-banner-next]')?.dataset.bannerNext || (row.dataset.status === '已启用' ? '草稿' : '已启用');
    const item = currentBanners().find((entry) => entry.id === row.dataset.bannerId);
    if (item) {
      persist({ ...item, status, deleted: false });
      render();
      showToast(status === '已启用' ? '轮播图已启用，学员端首页同步生效。' : '轮播图已下架，学员端首页不再展示。');
    }
    return;
  }
  if (!row) return;
  const item = currentBanners().find((entry) => entry.id === row.dataset.bannerId);
  if (!item) return;
  if (action === 'edit') { openForm(item); return; }
  if (action === 'delete') {
    persist({ ...item, deleted: true });
    render();
    showToast('轮播图已删除（演示数据可重置恢复）。');
  }
}

root?.addEventListener('click', (event) => {
  if (event.target.closest('[data-banner-close]')) { const dialog = event.target.closest('dialog'); dialog?.close(); return; }
  const filter = event.target.closest('[data-banner-filter]');
  if (filter) {
    const status = filter.dataset.bannerFilter;
    root.querySelectorAll('tr[data-banner-id]').forEach((row) => { row.hidden = status !== 'all' && row.dataset.status !== status; });
    return;
  }
  handleAction(event);
});
root?.addEventListener('submit', (event) => { if (event.target.id === 'banner-form') saveForm(event); });
root?.addEventListener('change', (event) => {
  if (event.target.id !== 'banner-jump') return;
  refreshTargetField(event.target.value);
  const error = document.querySelector('#banner-form-error');
  if (error) error.hidden = true;
});
render();
