const filesystem = {
  'about.md': {type: 'file'},
  'skills.md': {type: 'file'},
  'projects': {type: 'directory', children: {'portfolio.md': {type: 'file'}}}
};

export function resolvePath(path, currentPath) {
  if (!path) return currentPath;
  if (path.startsWith('/')) return path;

  const parts =
      (currentPath === '/' ? '' : currentPath).split('/').filter(p => p);
  const newParts = path.split('/').filter(p => p);

  for (const part of newParts) {
    if (part === '..') {
      if (parts.length > 0) {
        parts.pop();
      }
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  return '/' + parts.join('/');
}

export function getNodeFromPath(path, currentPath) {
  const resolvedPath = resolvePath(path, currentPath);
  const parts = resolvedPath.split('/').filter(p => p);
  let currentNode = filesystem;
  for (const part of parts) {
    if (currentNode[part] && currentNode[part].type === 'directory') {
      currentNode = currentNode[part].children;
    } else if (currentNode[part]) {
      return currentNode[part];
    } else {
      return null;
    }
  }
  return {type: 'directory', children: currentNode};
}

export function getDirContent(path, currentPath) {
  const node = getNodeFromPath(path, currentPath);
  return node ? node.children : {};
}
