const agreementRoot = document.querySelector('[data-agreements-page]');

if (agreementRoot) {
  const agreements = {
    about: {
      label: '关于我们',
      title: '关于我们',
      version: 'v1.0',
      updated: '2026-09-08 10:12',
      content: '<h2>湖北艺术职业学院继续教育</h2><p>湖北艺术职业学院继续教育面向有艺术学习需求的学员，提供视频课程、面授课程和持续学习服务。</p><p>我们邀请专业教师沉淀教学经验，帮助学员循序渐进地提升艺术素养与实践能力。</p><h3>联系我们</h3><p>服务时间：周一至周日 09:00-18:00</p><p>联系电话：027-8888 6666</p>'
    },
    user: {
      label: '用户协议',
      title: '用户协议',
      version: 'v2.1',
      updated: '2026-08-01 15:30',
      content: '<h2>继续教育平台用户协议</h2><p>欢迎使用湖北艺术职业学院继续教育平台。使用平台服务前，请仔细阅读并理解本协议。</p><h3>一、服务内容</h3><p>平台为学员提供课程浏览、课程购买、面授报名、学习记录和结业服务。</p><h3>二、用户责任</h3><p>用户应提供真实、准确的信息，并妥善保管账号。不得以任何方式干扰平台正常运行或侵害他人权益。</p><h3>三、协议变更</h3><p>平台会在协议更新后及时提示，更新后的协议自公布之日起生效。</p>'
    },
    privacy: {
      label: '隐私政策',
      title: '隐私政策',
      version: 'v1.3',
      updated: '2026-07-15 09:20',
      content: '<h2>继续教育平台隐私政策</h2><p>我们重视并保护用户的个人信息。本政策说明我们如何收集、使用、保存和保护相关信息。</p><h3>一、信息收集</h3><p>为完成注册、报名、支付和教学服务，我们可能收集姓名、联系方式、订单信息和学习记录。</p><h3>二、信息使用</h3><p>我们仅在提供课程服务、处理订单、发送必要通知和改进服务的范围内使用个人信息。</p><h3>三、信息保护</h3><p>我们采取访问控制、权限管理和安全审计等措施保护个人信息，并按照法律法规要求保存相关记录。</p>'
    }
  };
  let activeKey = 'about';
  let toastTimer;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function render() {
    const item = agreements[activeKey];
    agreementRoot.innerHTML = `<div class="agreement-page">
      <div class="page-head"><div><h1>协议管理</h1><p>维护学员端展示的关于我们、用户协议和隐私政策内容。</p></div></div>
      <div class="agreement-workspace">
        <aside class="agreement-tabs" aria-label="协议类型" role="tablist">
          ${Object.entries(agreements).map(([key, value]) => `<button type="button" class="agreement-tab${key === activeKey ? ' active' : ''}" data-agreement-tab="${key}" role="tab" aria-selected="${key === activeKey}"><span>${value.label}</span><small>${key === 'about' ? '平台介绍' : key === 'user' ? '使用规则' : '信息保护'}</small></button>`).join('')}
        </aside>
        <section class="agreement-editor-card" aria-labelledby="agreement-editor-title">
          <div class="agreement-editor-header"><div><div class="agreement-kicker">当前编辑</div><h2 id="agreement-editor-title">${item.title}</h2></div><div class="agreement-meta"><span>版本 ${escapeHtml(item.version)}</span><span>最近保存 ${escapeHtml(item.updated)}</span><span class="agreement-save-state" data-agreement-save-state>已保存</span></div></div>
          <div class="agreement-editor-toolbar" role="toolbar" aria-label="富文本工具栏">
            <button type="button" class="editor-tool editor-tool-bold" data-editor-command="bold" aria-label="加粗">B</button>
            <button type="button" class="editor-tool editor-tool-italic" data-editor-command="italic" aria-label="斜体">I</button>
            <button type="button" class="editor-tool" data-editor-command="insertUnorderedList" aria-label="项目符号">&#8226; 列表</button>
            <button type="button" class="editor-tool" data-editor-command="removeFormat">清除格式</button>
          </div>
          <div class="agreement-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${item.title}内容" data-agreement-editor>${item.content}</div>
          <div class="agreement-editor-footer"><span>内容保存后将同步到学员端对应入口。</span><button type="button" class="button primary" data-agreement-save>保存</button></div>
        </section>
      </div>
      <div class="toast" data-agreement-toast role="status" aria-live="polite" hidden></div>
    </div>`;
    bindEditor();
  }

  function bindEditor() {
    const editor = agreementRoot.querySelector('[data-agreement-editor]');
    editor?.addEventListener('input', () => {
      agreements[activeKey].content = editor.innerHTML;
      agreementRoot.querySelector('[data-agreement-save-state]').textContent = '有未保存修改';
      agreementRoot.querySelector('[data-agreement-save-state]').classList.add('is-dirty');
    });
  }

  function showToast(message) {
    const toast = agreementRoot.querySelector('[data-agreement-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
  }

  agreementRoot.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-agreement-tab]');
    if (tab) {
      const editor = agreementRoot.querySelector('[data-agreement-editor]');
      if (editor) agreements[activeKey].content = editor.innerHTML;
      activeKey = tab.dataset.agreementTab;
      render();
      return;
    }
    const commandButton = event.target.closest('[data-editor-command]');
    if (commandButton) {
      document.execCommand(commandButton.dataset.editorCommand, false);
      agreementRoot.querySelector('[data-agreement-editor]')?.focus();
      return;
    }
    if (event.target.closest('[data-agreement-save]')) {
      const editor = agreementRoot.querySelector('[data-agreement-editor]');
      if (editor) agreements[activeKey].content = editor.innerHTML;
      agreements[activeKey].updated = '刚刚';
      const state = agreementRoot.querySelector('[data-agreement-save-state]');
      state.textContent = '已保存';
      state.classList.remove('is-dirty');
      agreementRoot.querySelector('.agreement-meta').querySelectorAll('span')[1].textContent = '最近保存 刚刚';
      showToast(`${agreements[activeKey].title}已保存，学员端内容已更新。`);
    }
  });

  render();
}
