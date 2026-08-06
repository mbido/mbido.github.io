// The tree is generated from the fs/ directory by build_content.py, so adding
// a markdown file there is enough for it to appear in `ls` and `tree`.
const filesystem = window.filesystemTree || {};

function resolvePath(path, currentPath) {
  if (!path) return currentPath;

  const parts = path.startsWith('/') ?
      [] :
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

function getNodeFromPath(path, currentPath) {
  const resolvedPath = resolvePath(path, currentPath);
  const parts = resolvedPath.split('/').filter(p => p);
  let currentNode = filesystem;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const entry = currentNode[part];
    if (!entry) return null;

    if (entry.type === 'directory') {
      currentNode = entry.children;
    } else {
      // A file cannot have children, so any remaining segment is a bad path.
      if (i !== parts.length - 1) return null;
      const relativePath = parts.join('/');
      return {...entry, content: window.markdownContent[relativePath]};
    }
  }
  return {type: 'directory', children: currentNode};
}

function getDirContent(path, currentPath) {
  const node = getNodeFromPath(path, currentPath);
  return node && node.children ? node.children : {};
}
