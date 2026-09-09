const appDirectories = new Set(['admin', 'teacher', 'learner', 'visualization']);

function splitSuffix(target) {
  const match = String(target).match(/^([^?#]*)([?#].*)?$/);
  return { pathname: match?.[1] || '', suffix: match?.[2] || '' };
}

// Resolve a route relative to the prototype root, including GitHub Pages project paths.
export function relativePath(target) {
  if (!target || !String(target).startsWith('/')) return target;

  const { pathname, suffix } = splitSuffix(target);
  const currentPath = window.location.pathname;
  const currentSegments = currentPath.split('/').filter(Boolean);
  const currentIsDirectory = currentPath.endsWith('/');
  const appIndex = currentSegments.findIndex((segment) => appDirectories.has(segment));
  const rootSegments = appIndex >= 0 ? currentSegments.slice(0, appIndex) : currentSegments.slice(0, currentIsDirectory ? currentSegments.length : -1);
  const currentDirectory = currentIsDirectory ? currentSegments : currentSegments.slice(0, -1);
  const targetSegments = [...rootSegments, ...pathname.replace(/^\//, '').split('/').filter(Boolean)];

  let commonLength = 0;
  while (commonLength < currentDirectory.length && currentDirectory[commonLength] === targetSegments[commonLength]) commonLength += 1;

  const segments = [
    ...Array.from({ length: currentDirectory.length - commonLength }, () => '..'),
    ...targetSegments.slice(commonLength)
  ];

  return `${segments.join('/') || '.'}${suffix}`;
}

export function normalizePrototypeLinks(root = document) {
  root.querySelectorAll?.('a[href], area[href], form[action]').forEach((element) => {
    const attribute = element.hasAttribute('href') ? 'href' : 'action';
    const value = element.getAttribute(attribute);
    if (value?.startsWith('/') && !value.startsWith('//')) element.setAttribute(attribute, relativePath(value));
  });
}

if (typeof window !== 'undefined' && window.MutationObserver) {
  const observer = new MutationObserver(() => normalizePrototypeLinks(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  normalizePrototypeLinks();
}
