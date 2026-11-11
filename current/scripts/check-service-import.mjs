// CR-2026-177：常见问题库「导入批次」去掉后的收敛校验。
// 确认页签、渲染、字段规格、数据写入、页面说明同步移除，且不影响招生批次（crm/batches）模块。
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = Object.fromEntries(await Promise.all([
  ['admin', 'shared/js/admin-service.js'],
  ['store', 'shared/js/service-store.js'],
  ['fields', 'spec/fields/service.js'],
  ['pageTypes', 'spec/pages/page-types.js'],
  ['crmFields', 'spec/fields/crm.js'],
  ['salesCrm', 'shared/js/sales-crm.js']
].map(async ([key, path]) => [key, await readFile(resolve(root, path), 'utf8')])));

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { checks += 1; console.log(`PASS ${name}${detail ? ` :: ${detail}` : ''}`); return; }
  failures.push(name);
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
}

check('后台客服页只剩两个页签', /const tabs = \[[\s\S]{0,160}\['kb', '常见问题库'\], \['followups', '学员待跟进'\]\s*\]/.test(files.admin));
check('后台客服页不再渲染导入批次', !/renderBatches|data-service-tab="batches"|\['batches', '导入批次'\]/.test(files.admin));
check('导入完成后回到常见问题库并由提示条反馈结果', /tab = 'kb'; render\(\)/.test(files.admin) && /成功导入 ' \+ result\.success/.test(files.admin));
check('数据层不再写入批次留痕', !/next\.batches|batches: \[\]|raw\.batches/.test(files.store) && /CR-2026-177/.test(files.store));
check('字段规格不再声明导入批次号', !/FD-SERVICE-008/.test(files.fields)
  && !/label: '导入批次号'/.test(files.fields) && /FD-SERVICE-007/.test(files.fields));
check('页面说明改为两个页签且写明批次已去掉', /CR-2026-177：两个页签/.test(files.pageTypes)
  && /导入批次页签已去掉/.test(files.pageTypes) && !/三个页签：常见问题库、学员待跟进、导入批次/.test(files.pageTypes));
check('页面说明不再描述自动切到导入批次', !/自动切到「导入批次」/.test(files.pageTypes));
check('招生批次模块不受影响', /'crm\/batches'/.test(files.crmFields) && /dataSets\.batches/.test(files.salesCrm));

if (failures.length) {
  console.error(`\n客服导入批次收敛回归失败 ${failures.length} 项：${failures.join('、')}`);
  process.exit(1);
}
console.log(`\n客服导入批次收敛回归通过：${checks} 项。`);
