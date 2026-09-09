const DEFAULT_EDITOR_OPTIONS = {
  name: 'content',
  placeholder: '请输入内容',
  ariaLabel: '富文本编辑器',
  minHeight: '200px'
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, '&#96;');

const toolbarTemplate = `
  <select class="editor-select editor-block" data-command="formatBlock" aria-label="段落样式"><option value="p">正文</option><option value="h1">标题 1</option><option value="h2">标题 2</option><option value="h3">标题 3</option></select>
  <button type="button" class="editor-tool editor-quote" data-command="formatBlock" data-value="blockquote" aria-label="引用" title="引用">❝</button>
  <span class="editor-divider"></span>
  <button type="button" class="editor-tool editor-bold" data-command="bold" aria-label="加粗" title="加粗">B</button>
  <button type="button" class="editor-tool editor-underline" data-command="underline" aria-label="下划线" title="下划线">U</button>
  <button type="button" class="editor-tool editor-italic" data-command="italic" aria-label="斜体" title="斜体">I</button>
  <button type="button" class="editor-tool" data-editor-more aria-expanded="false" aria-label="更多文字格式" title="更多文字格式">•••⌄</button>
  <span class="editor-divider"></span>
  <label class="editor-color" title="文字颜色"><span>A</span><input type="color" data-command="foreColor" value="#595959" aria-label="文字颜色"></label>
  <label class="editor-color editor-highlight" title="文字背景色"><span>A</span><input type="color" data-command="hiliteColor" value="#fff1a8" aria-label="文字背景色"></label>
  <select class="editor-select" data-command="fontSize" aria-label="字号"><option value="3">默认字号</option><option value="1">小号</option><option value="4">大号</option><option value="5">特大号</option></select>
  <select class="editor-select" data-command="fontName" aria-label="字体"><option value="-apple-system">默认字体</option><option value="Microsoft YaHei">微软雅黑</option><option value="SimSun">宋体</option><option value="KaiTi">楷体</option></select>
  <select class="editor-select editor-line-height" data-line-height aria-label="行高"><option value="1.5">默认行高</option><option value="1">紧凑行高</option><option value="2">宽松行高</option></select>
  <span class="editor-divider"></span>
  <button type="button" class="editor-tool" data-command="insertUnorderedList" aria-label="项目符号" title="项目符号">☷</button>
  <button type="button" class="editor-tool" data-command="insertOrderedList" aria-label="编号列表" title="编号列表">☷<sup>1</sup></button>
  <button type="button" class="editor-tool" data-command="insertChecklist" aria-label="待办列表" title="待办列表">☑</button>
  <button type="button" class="editor-tool" data-command="justifyLeft" aria-label="左对齐" title="左对齐">≡</button>
  <button type="button" class="editor-tool" data-command="justifyCenter" aria-label="居中" title="居中">≡</button>
  <button type="button" class="editor-tool" data-command="justifyRight" aria-label="右对齐" title="右对齐">≡</button>
  <button type="button" class="editor-tool" data-command="indent" aria-label="增加缩进" title="增加缩进">⇥</button>
  <span class="editor-divider"></span>
  <button type="button" class="editor-tool" data-editor-emoji aria-label="插入表情" title="插入表情">☺⌄</button>
  <button type="button" class="editor-tool" data-editor-link aria-label="插入链接" title="插入链接">↗</button>
  <button type="button" class="editor-tool" data-editor-image aria-label="插入图片" title="插入图片">▧</button>
  <button type="button" class="editor-tool" data-editor-video aria-label="插入视频" title="插入视频">▶</button>
  <button type="button" class="editor-tool" data-editor-table aria-label="插入表格" title="插入表格">▦</button>
  <button type="button" class="editor-tool editor-code" data-editor-code aria-label="查看 HTML 源码" title="查看 HTML 源码">&lt;/&gt;</button>
  <button type="button" class="editor-tool" data-command="insertHorizontalRule" aria-label="分隔线" title="分隔线">☰</button>
  <span class="editor-toolbar-break"></span>
  <button type="button" class="editor-tool" data-command="undo" aria-label="撤销" title="撤销">↶</button>
  <button type="button" class="editor-tool" data-command="redo" aria-label="重做" title="重做">↷</button>
  <button type="button" class="editor-tool" data-editor-fullscreen aria-label="全屏编辑" title="全屏编辑">⛶</button>
  <div class="editor-more-menu" data-editor-more-menu hidden><button type="button" data-command="strikeThrough">删除线</button><button type="button" data-command="removeFormat">清除格式</button><button type="button" data-command="outdent">减少缩进</button></div>`;

export class RichEditor {
  constructor(element, options = {}) {
    this.host = element;
    this.initialMarkup = element.innerHTML;
    this.initialClassName = element.className;
    this.options = { ...DEFAULT_EDITOR_OPTIONS, ...element.dataset, ...options };
    this.options.name = this.options.name || 'content';
    this.options.placeholder = this.options.placeholder || DEFAULT_EDITOR_OPTIONS.placeholder;
    this.options.ariaLabel = this.options.ariaLabel || DEFAULT_EDITOR_OPTIONS.ariaLabel;
    this.savedRange = null;
    this.sourceMode = false;
    this.listeners = [];
    this.render();
    this.bindEvents();
    this.syncValue();
  }

  render() {
    const initialValue = this.host.dataset.value || this.host.innerHTML.trim();
    this.host.classList.add('rich-editor-shell');
    this.host.innerHTML = `<div class="editor-toolbar" role="toolbar" aria-label="${escapeAttribute(this.options.ariaLabel)}编辑工具栏">${toolbarTemplate}</div><div class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${escapeAttribute(this.options.ariaLabel)}" data-placeholder="${escapeAttribute(this.options.placeholder)}"></div><input type="hidden" name="${escapeAttribute(this.options.name)}" data-editor-value />`;
    this.editor = this.host.querySelector('.rich-editor');
    this.toolbar = this.host.querySelector('.editor-toolbar');
    this.valueField = this.host.querySelector('[data-editor-value]');
    this.editor.style.minHeight = this.options.minHeight;
    if (initialValue) this.editor.innerHTML = initialValue;
  }

  isInsideEditor(node) { return Boolean(node && (node === this.editor || this.editor.contains(node))); }
  rememberSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !this.isInsideEditor(selection.anchorNode)) return;
    this.savedRange = selection.getRangeAt(0).cloneRange();
  }
  restoreSelection() {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(this.savedRange);
  }
  cleanMarkup(markup) {
    return String(markup ?? '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
  }
  syncValue() {
    if (this.valueField) this.valueField.value = this.sourceMode ? this.cleanMarkup(this.editor.textContent || '') : this.cleanMarkup(this.editor.innerHTML || '');
    this.host.dispatchEvent(new CustomEvent('rich-editor:input', { bubbles: true, detail: { value: this.getValue(), editor: this } }));
  }
  currentBlock() {
    const selection = window.getSelection(); let node = selection?.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    return node?.closest?.('p,div,li,blockquote,h1,h2,h3,h4,h5,h6') || this.editor;
  }
  message(message, kind = 'success') { this.host.dispatchEvent(new CustomEvent('rich-editor:message', { bubbles: true, detail: { message, kind, editor: this } })); }
  execute(command, value = null) {
    if (this.sourceMode) return;
    this.editor.focus(); this.restoreSelection();
    if (command === 'insertChecklist') {
      document.execCommand('insertUnorderedList', false, null);
      const list = this.currentBlock()?.closest?.('ul'); if (list) list.dataset.checklist = 'true';
    } else if (command === 'lineHeight') this.currentBlock().style.lineHeight = value;
    else document.execCommand(command, false, value);
    this.syncValue(); this.rememberSelection();
  }
  insertHtml(markup) {
    if (this.sourceMode) return;
    this.editor.focus(); this.restoreSelection(); document.execCommand('insertHTML', false, this.cleanMarkup(markup)); this.syncValue(); this.rememberSelection();
  }
  insertText(value) {
    if (!value) return;
    this.editor.focus(); this.restoreSelection(); document.execCommand('insertText', false, value); this.syncValue(); this.rememberSelection();
  }
  toggleSource() {
    this.sourceMode = !this.sourceMode;
    if (this.sourceMode) { this.editor.textContent = this.editor.innerHTML; this.editor.classList.add('is-source'); this.editor.setAttribute('aria-label', `${this.options.ariaLabel} HTML 源码`); this.editor.dataset.placeholder = '请输入 HTML 内容'; }
    else { this.editor.innerHTML = this.cleanMarkup(this.editor.textContent || ''); this.editor.classList.remove('is-source'); this.editor.setAttribute('aria-label', this.options.ariaLabel); this.editor.dataset.placeholder = this.options.placeholder; }
    this.syncValue(); this.editor.focus();
  }
  async insertImage() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', () => { const file = input.files?.[0]; if (!file) return; const reader = new FileReader(); reader.addEventListener('load', () => this.insertHtml(`<img src="${reader.result}" alt="${escapeAttribute(file.name)}" style="max-width:100%;height:auto">`)); reader.readAsDataURL(file); }); input.click();
  }
  bindEvents() {
    const on = (target, event, handler) => { if (!target) return; target.addEventListener(event, handler); this.listeners.push(() => target.removeEventListener(event, handler)); };
    on(this.editor, 'input', () => this.syncValue()); on(this.editor, 'keyup', () => this.rememberSelection()); on(this.editor, 'mouseup', () => this.rememberSelection()); on(this.editor, 'focus', () => this.rememberSelection());
    on(document, 'selectionchange', () => { if (this.isInsideEditor(window.getSelection()?.anchorNode)) this.rememberSelection(); });
    on(this.toolbar, 'mousedown', (event) => { if (event.target.closest('button, select')) event.preventDefault(); });
    on(this.toolbar, 'click', (event) => this.handleToolbarClick(event));
    this.toolbar.querySelectorAll('select[data-command]').forEach((control) => on(control, 'change', () => this.execute(control.dataset.command, control.value)));
    on(this.toolbar.querySelector('[data-line-height]'), 'change', (event) => this.execute('lineHeight', event.currentTarget.value));
    this.toolbar.querySelectorAll('input[type="color"]').forEach((control) => on(control, 'input', () => this.execute(control.dataset.command, control.value)));
    on(this.toolbar.querySelector('[data-editor-more-menu]'), 'click', (event) => { if (event.target.closest('button')) this.toolbar.querySelector('[data-editor-more]')?.click(); });
    on(this.host.closest('form'), 'submit', () => { if (this.sourceMode) this.toggleSource(); this.syncValue(); });
  }
  handleToolbarClick(event) {
    const commandButton = event.target.closest('[data-command]');
    if (commandButton && !['SELECT', 'INPUT'].includes(commandButton.tagName)) { this.execute(commandButton.dataset.command, commandButton.dataset.value || null); return; }
    const more = event.target.closest('[data-editor-more]');
    if (more) { const menu = this.toolbar.querySelector('[data-editor-more-menu]'); if (menu) menu.hidden = !menu.hidden; more.setAttribute('aria-expanded', String(!menu?.hidden)); return; }
    if (event.target.closest('[data-editor-code]')) { this.toggleSource(); return; }
    if (event.target.closest('[data-editor-fullscreen]')) { this.host.classList.toggle('is-fullscreen'); this.message(this.host.classList.contains('is-fullscreen') ? '已进入全屏编辑。' : '已退出全屏编辑。'); return; }
    if (event.target.closest('[data-editor-emoji]')) { this.insertText('😊'); return; }
    if (event.target.closest('[data-editor-link]')) { const url = window.prompt('请输入链接地址', 'https://'); if (url && /^https?:\/\//i.test(url)) this.execute('createLink', url); else if (url) this.message('链接地址需以 http:// 或 https:// 开头。', 'error'); return; }
    if (event.target.closest('[data-editor-image]')) { this.insertImage(); return; }
    if (event.target.closest('[data-editor-video]')) { const url = window.prompt('请输入视频地址', 'https://'); if (url && /^https?:\/\//i.test(url)) this.insertHtml(`<p><a href="${escapeAttribute(url)}" target="_blank" rel="noopener">▶ 查看视频</a></p>`); else if (url) this.message('视频地址需以 http:// 或 https:// 开头。', 'error'); return; }
    if (event.target.closest('[data-editor-table]')) { const rows = Math.min(Math.max(Number(window.prompt('请输入表格行数', '2')) || 0, 1), 8); const columns = Math.min(Math.max(Number(window.prompt('请输入表格列数', '3')) || 0, 1), 8); if (!rows || !columns) return; const body = Array.from({ length: rows }, () => `<tr>${Array.from({ length: columns }, () => '<td> </td>').join('')}</tr>`).join(''); this.insertHtml(`<table style="width:100%;border-collapse:collapse"><tbody>${body}</tbody></table><p><br></p>`); }
  }
  getValue() { return this.sourceMode ? this.cleanMarkup(this.editor.textContent || '') : this.cleanMarkup(this.editor.innerHTML || ''); }
  setValue(value) { if (this.sourceMode) this.toggleSource(); this.editor.innerHTML = this.cleanMarkup(value); this.syncValue(); }
  focus() { this.editor.focus(); }
  destroy() { this.listeners.forEach((remove) => remove()); this.host.className = this.initialClassName; this.host.innerHTML = this.initialMarkup; delete this.host.richEditor; }
}

export function mountRichEditor(element, options = {}) { if (!element) return null; if (element.richEditor instanceof RichEditor) return element.richEditor; const editor = new RichEditor(element, options); element.richEditor = editor; return editor; }
export function mountRichEditors(root = document, options = {}) { return [...root.querySelectorAll('[data-rich-editor]')].map((element) => mountRichEditor(element, options)); }
