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
          { id: 'FD-ADMIN-001', label: '后台角色', type: '下拉', length: '超级管理员 / 教研主管 / 教务主管 / 课程顾问 / 财务', required: '是', note: '登录后进入的后台角色，顶部身份与所选角色一致', constraints: { options: ['超级管理员', '教研主管', '教务主管', '课程顾问', '财务'] } },
          { id: 'FD-ADMIN-002', label: '演示账号', type: '下拉', length: '预置演示账号', required: '否', note: '选择后自动带入登录账号、演示密码与角色；含一个停用账号用于演示登录拒绝' },
          { id: 'FD-ADMIN-003', label: '登录账号', type: '文本', length: '≤ 32 字符', required: '是', note: '后台登录账号，与预置演示账号一致时方可登录', constraints: { maxLength: 32 } },
          { id: 'FD-ADMIN-004', label: '登录密码', type: '密码', length: '8–20 位', required: '是', note: '演示口令见登录页说明；错误时不进入后台', constraints: { minLength: 8, maxLength: 20 } },
          { id: 'FD-ADMIN-005', label: '图形验证码', type: '文本', length: '4 位数字', required: '是', note: '按页面显示的验证码填写，可点击“换一张”重新生成', constraints: { maxLength: 4, pattern: '^\\d{4}$' } },
          { id: 'FD-ADMIN-006', label: '用户协议与隐私政策', type: '勾选', length: '已阅读 / 未阅读', required: '是', note: '未勾选不允许登录', constraints: { boolean: true } },
          { id: 'FD-ADMIN-007', label: '登录按钮', type: '按钮', length: '—', required: '是', note: '校验通过后写入登录态并进入工作台', constraints: { action: true } },
          { id: 'FD-ADMIN-008', label: '错误提示', type: '提示', length: '—', required: '否', note: '账号停用、账号不存在、密码错误、验证码错误分别给出明确提示', constraints: { system: true } }
        ] }
      ],
      notes: [
        '登录主体是后台账号，不区分学员端与教师端账号；三端登录入口相互独立。',
        '账号停用时拒绝登录并提示“账号已停用”，不写入登录态、不进入任何后台页面。',
        '密码或验证码错误时不进入后台，提示后保留已填写的登录账号。',
        '登录成功后进入工作台（admin/index.html）；工作台本身属迭代2，本次仅作为登录落地页。',
        '退出登录清除登录态并回到本页；登录态失效后直接访问后台页面由后台壳层拦截到本页。',
        '演示阶段不连接真实账号服务，口令与验证码均为原型 Mock。'
      ]
    }
  }
};
