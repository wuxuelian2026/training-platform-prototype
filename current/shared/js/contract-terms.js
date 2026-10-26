(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
// 合同文件统一取后台归档的已签章最终版 PDF。
// 后台合同列表与教师端我的合同共用这一份命名规则。
function finalContractFileName(contract) {
  if (!contract) return '';
  return contract.contractFile || contract.file || `${contract.number || '合同'}-已签章合同.pdf`;
}


__classicExports["finalContractFileName"] = finalContractFileName;
  __classicModules["shared/js/contract-terms.js"] = __classicExports;
})(globalThis);
