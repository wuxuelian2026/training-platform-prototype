(function (global) {
  const __classicModules = global.__hbyxClassicModules || (global.__hbyxClassicModules = Object.create(null));
  const __classicExports = {};
  const __classicRequire = (id) => __classicModules[id];
const { relativePath } = __classicRequire("shared/js/paths.js");
function go(path) {
  window.location.assign(relativePath(path));
}


__classicExports["go"] = go;
  __classicModules["shared/js/navigation.js"] = __classicExports;
})(globalThis);
