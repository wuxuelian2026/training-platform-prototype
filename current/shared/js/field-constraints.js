// 由字段规格派生的输入约束。
//
// 页面说明里的“长度”只是文案，这里把同一份规格落成实际的输入限制，
// 避免出现“说明写了 ≤ 50 字，但输入框不拦”的口径与实现不一致。
// 匹配方式：按字段容器（.form-field / .course-field / .sales-field）的标签文本对齐规格，
// 因此静态 HTML 和运行时渲染的弹窗表单都能覆盖。
import { fieldsOfPage } from '../../spec/fields/index.js';

const CONTROL_SELECTOR = 'input, select, textarea';
// 后台用 form-field / course-field / sales-field，小程序两端统一用 mp-field。
const FIELD_WRAPPERS = '.form-field, .course-field, .sales-field, .mp-field';
// maxLength / minLength / pattern 只对文本类控件有意义；富文本编辑器内部的
// color、hidden 等输入不属于业务字段，必须排除，否则会给编辑器工具控件加错约束。
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'password', 'email']);

const normalizeLabel = (value) => String(value || '')
  .replace(/^[\s*＊]+/, '')
  .replace(/\s*\*\s*$/, '')
  .replace(/[：:]\s*$/, '')
  .replace(/[（(][^（()）]*[)）]\s*$/, '')
  .replace(/\s+/g, '')
  .trim();

const labelTextOf = (wrapper) => {
  const label = wrapper.querySelector('span, label');
  return label ? label.textContent : '';
};

export const applyFieldConstraints = (root, pageKey) => {
  const fields = fieldsOfPage(pageKey);
  if (!fields.length || !root) return { total: 0, matched: 0, applied: 0, unmatched: [] };

  const byLabel = new Map(fields.map((field) => [normalizeLabel(field.label), field]));
  const matchedLabels = new Set();
  let applied = 0;

  root.querySelectorAll(FIELD_WRAPPERS).forEach((wrapper) => {
    const field = byLabel.get(normalizeLabel(labelTextOf(wrapper)));
    if (!field) return;
    const constraints = field.constraints || {};
    // 只读与系统字段由程序赋值，不需要在界面上限制输入。
    if (constraints.readOnly || constraints.system) return;

    wrapper.querySelectorAll(CONTROL_SELECTOR).forEach((control) => {
      const isTextArea = control.tagName === 'TEXTAREA';
      const isNumber = control.type === 'number';
      if (!isTextArea && !isNumber && !TEXT_INPUT_TYPES.has(control.type)) return;

      if (isNumber) {
        if (constraints.min !== undefined) control.min = constraints.min;
        if (constraints.max !== undefined) control.max = constraints.max;
        if (constraints.integer) control.step = 1;
        applied += 1;
        return;
      }

      if (constraints.maxLength) control.maxLength = constraints.maxLength;
      if (constraints.minLength) control.minLength = constraints.minLength;
      // 规格是唯一事实源：即使页面已有 pattern，也以规格为准覆盖。
      if (constraints.pattern) control.pattern = constraints.pattern;
      if (constraints.format === 'email') control.type = 'email';
      applied += 1;
    });
    matchedLabels.add(normalizeLabel(field.label));
  });

  return {
    total: fields.length,
    matched: matchedLabels.size,
    applied,
    unmatched: fields.filter((field) => !matchedLabels.has(normalizeLabel(field.label))).map((field) => field.label)
  };
};

// 三端统一的挂载入口：页面渲染后先应用一次，随后按 DOM 变化做防抖重跑，
// 覆盖运行时生成的弹窗与列表重绘。与后台壳层的做法保持一致。
export const mountFieldConstraints = (pageKey, root = document.body) => {
  let timer;
  const run = () => applyFieldConstraints(root, pageKey);
  run();
  const observer = new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 0);
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
};
