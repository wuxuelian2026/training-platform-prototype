// 后台登录字段规格 · 唯一事实源
//
// 后台登录页（admin/login.html）与后台壳层共用本文件：
// 页面说明弹窗的字段表、输入约束都由 spec/fields/ 派生，不在页面里再写一份口径。
// 登录态见 shared/js/admin-auth.js；本规格只描述页面字段与校验口径。

export const ADMIN_FIELD_SPEC = {
  module: '后台登录',
  pages: {
    'admin/login': {
      groups: [
        { heading: '登录字段', fields: [
          { id: 'FD-ADMIN-001', label: '登录账号', type: '文本', length: '≤ 32 字符', required: '是', note: '须为已启用的后台账号；账号自身决定登录后的角色与可见菜单', constraints: { maxLength: 32 } },
          { id: 'FD-ADMIN-002', label: '登录密码', type: '密码', length: '8–20 位', required: '是', note: '演示口令见信息区；错误时不进入后台', constraints: { minLength: 8, maxLength: 20 } },
          { id: 'FD-ADMIN-003', label: '记住密码', type: '勾选', length: '已勾选 / 未勾选', required: '否', note: '勾选并登录成功后在本机保留账号与口令，下次进入自动带入；未勾选登录则清除已保留内容', constraints: { boolean: true } },
          { id: 'FD-ADMIN-004', label: '登录按钮', type: '按钮', length: '—', required: '是', note: '校验通过后写入登录态并进入工作台', constraints: { action: true } },
          { id: 'FD-ADMIN-005', label: '错误提示', type: '提示', length: '—', required: '否', note: '账号不存在、账号停用与密码错误分别给出明确提示', constraints: { system: true } }
        ] }
      ],
      notes: [
        '页面默认填充平台管理员账号与演示口令，打开即可直接登录；可手动改为其他演示账号。',
        '登录主体是后台账号，不区分学员端与教师端账号；三端登录入口相互独立。',
        '登录角色由账号自身决定，页面不再单独选择角色；顶部身份与该账号的角色一致。',
        '账号停用时拒绝登录并提示“账号已停用”，不写入登录态、不进入任何后台页面。',
        '密码错误时不进入后台，提示后保留已填写的登录账号。',
        '登录成功后进入工作台（admin/index.html）；工作台本身属迭代2，本次仅作为登录落地页。',
        '退出登录清除登录态并回到本页；登录态失效后直接访问后台页面由后台壳层拦截到本页。',
        '演示阶段不连接真实账号服务，口令为原型 Mock。'
      ]
    }
  }
};
