const profileRoot = document.querySelector('[data-profile-page]');

const profileData = {
  name: '李教务',
  account: 'jw_admin',
  phone: '138****2026',
  email: 'li.jiaowu@example.com',
  department: ['教务部', '教务主管'],
  lastLogin: '2026-09-08 08:42'
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function renderProfile() {
  if (!profileRoot) return;
  profileRoot.innerHTML = `<div class="profile-page"><div class="page-head"><div><h1>个人中心</h1><p>查看和维护当前后台账号信息。</p></div></div><div class="profile-layout"><aside class="profile-summary-card"><div class="profile-avatar-large" aria-hidden="true">李</div><h2>${escapeHtml(profileData.name)}</h2><p>负责教务执行与教学服务。</p><dl class="profile-meta"><div><dt>账号</dt><dd>${escapeHtml(profileData.account)}</dd></div><div><dt>手机号</dt><dd>${escapeHtml(profileData.phone)}</dd></div><div><dt>邮箱</dt><dd>${escapeHtml(profileData.email)}</dd></div><div><dt>部门</dt><dd><span class="profile-tags">${profileData.department.map((item) => `<span class="profile-tag">${escapeHtml(item)}</span>`).join('')}</span></dd></div><div><dt>上次登录</dt><dd>${escapeHtml(profileData.lastLogin)}</dd></div></dl></aside><section class="profile-settings-card"><div class="profile-tabs" role="tablist"><button type="button" class="profile-tab active" role="tab" aria-selected="true" data-profile-tab="basic">基本设置</button><button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="security">安全设置</button></div><div class="profile-panel" data-profile-panel="basic"><form class="profile-form" data-profile-form="basic"><label class="form-field"><span><i class="profile-required">*</i>昵称：</span><input name="name" value="${escapeHtml(profileData.name)}" required maxlength="30" /></label><label class="form-field"><span><i class="profile-required">*</i>邮箱：</span><input name="email" type="email" value="${escapeHtml(profileData.email)}" required /></label><div class="form-field"><span><i class="profile-required">*</i>性别：</span><div class="profile-radio-group"><label class="profile-radio"><input type="radio" name="gender" value="男" checked />男</label><label class="profile-radio"><input type="radio" name="gender" value="女" />女</label><label class="profile-radio"><input type="radio" name="gender" value="未知" />未知</label></div></div><label class="form-field"><span><i class="profile-required">*</i>电话：</span><input name="phone" value="13888888888" inputmode="tel" pattern="1[3-9]\\d{9}" required /></label><div class="profile-form-actions"><button class="button primary" type="submit">更新信息</button></div><p class="profile-form-message" data-profile-message aria-live="polite"></p></form></div><div class="profile-panel" data-profile-panel="security" hidden><form class="profile-form" data-profile-form="security"><label class="form-field"><span><i class="profile-required">*</i>旧密码：</span><span class="profile-password-wrap"><input name="oldPassword" type="password" placeholder="请输入" required /><button type="button" class="profile-password-toggle" data-password-toggle aria-label="显示旧密码">◉</button></span></label><label class="form-field"><span><i class="profile-required">*</i>新密码：</span><span class="profile-password-wrap"><input name="newPassword" type="password" placeholder="请输入" minlength="8" required /><button type="button" class="profile-password-toggle" data-password-toggle aria-label="显示新密码">◉</button></span></label><label class="form-field"><span><i class="profile-required">*</i>确认新密码：</span><span class="profile-password-wrap"><input name="confirmPassword" type="password" placeholder="请输入" minlength="8" required /><button type="button" class="profile-password-toggle" data-password-toggle aria-label="显示确认密码">◉</button></span></label><div class="profile-form-actions"><button class="button primary" type="submit">修改密码</button></div><p class="profile-form-message" data-profile-message aria-live="polite"></p></form></div></section></div></div>`;
  bindProfileEvents();
}

function bindProfileEvents() {
  profileRoot.querySelectorAll('[data-profile-tab]').forEach((tab) => tab.addEventListener('click', () => {
    const activeTab = tab.dataset.profileTab;
    profileRoot.querySelectorAll('[data-profile-tab]').forEach((item) => { const isActive = item === tab; item.classList.toggle('active', isActive); item.setAttribute('aria-selected', String(isActive)); });
    profileRoot.querySelectorAll('[data-profile-panel]').forEach((panel) => { panel.hidden = panel.dataset.profilePanel !== activeTab; });
  }));
  profileRoot.querySelector('[data-profile-form="basic"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = event.currentTarget.querySelector('[data-profile-message]');
    profileData.name = String(form.get('name') || '').trim();
    profileData.email = String(form.get('email') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    if (!profileData.name || !profileData.email || !/^1[3-9]\\d{9}$/.test(phone)) { message.textContent = '请填写完整信息，电话需为11位手机号。'; message.classList.add('error'); return; }
    profileData.phone = `${phone.slice(0, 3)}****${phone.slice(-4)}`;
    message.textContent = '个人信息已更新。';
    message.classList.remove('error');
    profileRoot.querySelector('.profile-summary-card').querySelector('h2').textContent = profileData.name;
    profileRoot.querySelector('.profile-summary-card').querySelector('.profile-meta dd:nth-of-type(2)');
  });
  profileRoot.querySelector('[data-profile-form="security"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = event.currentTarget.querySelector('[data-profile-message]');
    const oldPassword = String(form.get('oldPassword') || '');
    const newPassword = String(form.get('newPassword') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    if (!oldPassword || newPassword.length < 8 || newPassword !== confirmPassword) { message.textContent = newPassword !== confirmPassword ? '两次输入的新密码不一致。' : '请输入旧密码，并设置至少8位的新密码。'; message.classList.add('error'); return; }
    message.textContent = '密码修改成功，原型演示未连接真实账号服务。';
    message.classList.remove('error');
    event.currentTarget.reset();
  });
  profileRoot.querySelectorAll('[data-password-toggle]').forEach((toggle) => toggle.addEventListener('click', () => {
    const input = toggle.previousElementSibling;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.setAttribute('aria-label', visible ? '显示密码' : '隐藏密码');
  }));
}

renderProfile();
