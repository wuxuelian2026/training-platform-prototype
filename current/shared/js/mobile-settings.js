function maskPhone(value) {
  const phone = String(value || '138****2026');
  return /^1[3-9]\d{9}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
}

function settingsDialog(type, options) {
  const { phone, wechatAuthorized, onPhoneChange, onWechatChange, onLogout, toast, rerender } = options;
  const copy = {
    about: ['关于我们', '<p>湖北艺校培训平台</p><p>面向用户提供课程、教学与相关培训服务。</p><small class="mp-muted">当前版本：1.0.0</small>'],
    agreement: ['用户协议', '<p>您可以通过本平台使用课程、教学和培训相关服务。课程价格、班级名额和服务规则以页面实际展示为准。</p><p>请妥善保管账号信息，使用平台服务即表示您同意遵守相关协议。</p>'],
    privacy: ['隐私政策', '<p>平台仅在提供登录、课程、教学和相关培训服务所必需的范围内使用您的信息。</p><p>手机号等敏感信息会按最小必要原则脱敏展示，不会向无关用户公开。</p>']
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-dialog';
  if (copy[type]) dialog.innerHTML = `<div class="mp-dialog-card"><h2>${copy[type][0]}</h2><article class="mp-settings-legal">${copy[type][1]}</article><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>关闭</button></div></div>`;
  else if (type === 'wechat') dialog.innerHTML = `<div class="mp-dialog-card"><h2>微信授权</h2><p>授权后可使用微信快捷登录。当前状态：${wechatAuthorized ? '已授权' : '未授权'}。</p><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="button" id="toggle-wechat">${wechatAuthorized ? '解除授权' : '授权微信'}</button></div></div>`;
  else if (type === 'phone') dialog.innerHTML = `<div class="mp-dialog-card"><h2>换绑手机号</h2><p>请输入新的手机号和验证码，完成后原手机号将不再作为登录手机号。</p><form class="mp-form" id="change-phone-form"><div class="mp-field"><label for="new-phone">新手机号</label><input id="new-phone" required pattern="1[3-9]\\d{9}" placeholder="请输入11位手机号"></div><div class="mp-field"><label for="phone-code">验证码</label><div class="mini-code-row"><input id="phone-code" required minlength="4" maxlength="6" inputmode="numeric" placeholder="请输入验证码"><button class="mp-button secondary" id="settings-send-code" type="button">获取验证码</button></div></div><small id="settings-form-error" class="mp-form-error" hidden></small><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">确认换绑</button></div></form></div>`;
  else if (type === 'logout') dialog.innerHTML = `<div class="mp-dialog-card"><h2>退出登录</h2><p>退出后仍可浏览公开内容，账号相关功能需要重新登录后使用。</p><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="button" id="confirm-logout">确认退出</button></div></div>`;
  else dialog.innerHTML = `<div class="mp-dialog-card"><h2>修改密码</h2><p>密码长度为6-20位，修改成功后需要重新登录。</p><form class="mp-form" id="change-password-form"><div class="mp-field"><label for="new-password">新密码</label><input id="new-password" type="password" required minlength="6" maxlength="20" placeholder="请输入新密码"></div><div class="mp-field"><label for="confirm-password">确认新密码</label><input id="confirm-password" type="password" required minlength="6" maxlength="20" placeholder="请再次输入新密码"></div><small id="settings-form-error" class="mp-form-error" hidden></small><div class="mp-actions"><button class="mp-button secondary" type="button" data-dialog-close>取消</button><button class="mp-button" type="submit">确认修改</button></div></form></div>`;

  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#toggle-wechat')?.addEventListener('click', () => {
    const nextValue = !wechatAuthorized;
    onWechatChange(nextValue);
    dialog.close();
    rerender();
    toast(nextValue ? '微信授权已开启' : '微信授权已解除');
  });
  dialog.querySelector('#settings-send-code')?.addEventListener('click', event => {
    const phoneInput = dialog.querySelector('#new-phone');
    if (!/^1[3-9]\d{9}$/.test(phoneInput.value)) { phoneInput.reportValidity(); return; }
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = '60秒后重试';
    toast('验证码已发送');
  });
  dialog.querySelector('#confirm-logout')?.addEventListener('click', onLogout);
  dialog.querySelector('#change-phone-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const phoneInput = dialog.querySelector('#new-phone');
    const error = dialog.querySelector('#settings-form-error');
    if (maskPhone(phone) === maskPhone(phoneInput.value)) { error.hidden = false; error.textContent = '新手机号不能与当前手机号相同。'; return; }
    onPhoneChange(phoneInput.value);
    dialog.close();
    rerender();
    toast('手机号已更新');
  });
  dialog.querySelector('#change-password-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const error = dialog.querySelector('#settings-form-error');
    if (dialog.querySelector('#new-password').value !== dialog.querySelector('#confirm-password').value) { error.hidden = false; error.textContent = '两次输入的密码不一致。'; return; }
    dialog.close();
    onLogout();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
}

export function mountMobileSettings(options) {
  const { container, loggedIn, navigate, loginUrl, onLogout, toast } = options;
  const phone = options.phone || '138****2026';
  const wechatAuthorized = options.wechatAuthorized !== false;
  const accountValue = value => loggedIn ? value : '登录后设置';
  const settingsRows = [
    ['换绑手机', accountValue(maskPhone(phone)), 'phone'],
    ['修改密码', accountValue('已设置'), 'password'],
    ['微信授权', accountValue(wechatAuthorized ? '已授权' : '未授权'), 'wechat'],
    ['关于我们', '版本 1.0.0', 'about'],
    ['用户协议', '', 'agreement'],
    ['隐私政策', '', 'privacy']
  ];
  const rerender = () => mountMobileSettings({ ...options, phone: options.getPhone(), wechatAuthorized: options.getWechatAuthorized() });
  container.innerHTML = `<div class="mp-stack"><section class="mp-settings-list">${settingsRows.map(([label, value, action]) => `<button class="mp-settings-row" type="button" data-settings-action="${action}"><span>${label}</span><span>${value}${['password', 'agreement', 'privacy'].includes(action) ? ' ›' : ''}</span></button>`).join('')}</section>${loggedIn ? '<button class="mp-button secondary full mp-settings-logout" id="settings-logout" type="button">退出登录</button>' : ''}</div>`;
  container.querySelectorAll('[data-settings-action]').forEach(row => row.addEventListener('click', () => {
    const action = row.dataset.settingsAction;
    if (!loggedIn && ['phone', 'password', 'wechat'].includes(action)) { navigate(loginUrl); return; }
    settingsDialog(action, { ...options, phone, wechatAuthorized, onLogout, toast, rerender });
  }));
  container.querySelector('#settings-logout')?.addEventListener('click', () => settingsDialog('logout', { ...options, phone, wechatAuthorized, onLogout, toast, rerender }));
}
