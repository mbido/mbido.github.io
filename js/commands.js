function printTree(term, node, prefix, isLast) {
  const entries = Object.keys(node);
  if (entries.length === 0) {
    term.writeln(`${prefix}(empty)`);
    return;
  }
  entries.forEach((entry, index) => {
    const isCurrentLast = index === entries.length - 1;
    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    const marker = isCurrentLast ? '└── ' : '├── ';

    const item = node[entry];
    const color = item.type === 'directory' ? '\x1b[1;34m' : '\x1b[0m';
    term.writeln(`${prefix}${marker}${color}${entry}\x1b[0m`);

    if (item.type === 'directory' && item.children) {
      printTree(term, item.children, newPrefix, isCurrentLast);
    }
  });
}

async function executeCommand(term, command, currentPath) {
  const [cmd, ...args] = command.trim().split(' ');
  let newPath = currentPath;

  switch (cmd) {
    case 'help':
      term.writeln('Available commands:');
      term.writeln('  ls         - List files and directories');
      term.writeln('  cat [file] - Display file content');
      term.writeln('  cd [dir]   - Change directory');
      term.writeln('  pwd        - Print working directory');
      term.writeln('  tree       - Display the file system tree');
      term.writeln('  clear      - Clear the terminal');
      break;
    case 'ls':
      let targetPath = currentPath;
      if (args.length > 0) {
        targetPath = resolvePath(args[0], currentPath);
      }

      const targetNode = getNodeFromPath(targetPath, currentPath);

      if (!targetNode) {
        term.writeln(
            `ls: cannot access '${args[0]}': No such file or directory`);
      } else if (targetNode.type === 'file') {
        term.writeln(args[0]);  // Just print the file name if it's a file
      } else if (targetNode.type === 'directory') {
        const content = targetNode.children;
        if (Object.keys(content).length === 0) {
          term.writeln('(empty directory)');
        } else {
          Object.keys(content).forEach(item => {
            const node = content[item];
            const color = node.type === 'directory' ? '\x1b[1;34m' : '\x1b[0m';
            term.write(`${color}${item}\x1b[0m  `);
          });
          term.writeln('');
        }
      }
      break;
    case 'cat':
      const filePath = args[0];
      const fileNode = getNodeFromPath(filePath, currentPath);
      if (fileNode && fileNode.type === 'file' && fileNode.content) {
        const renderedText = renderMarkdownToTerminal(fileNode.content);
        renderedText.split('\n').forEach(line => term.writeln(line));
      } else {
        term.writeln(`cat: ${
            filePath ||
            ''}: File not found, is a directory, or has no content`);
      }
      break;
    case 'cd':
      const resolvedPath = resolvePath(args[0] || '/', currentPath);
      const dirNode = getNodeFromPath(resolvedPath, currentPath);
      if (dirNode && dirNode.type === 'directory') {
        newPath = resolvedPath;
      } else {
        term.writeln(`cd: ${args[0]}: Not a directory`);
      }
      break;
    case 'pwd':
      term.writeln(currentPath);
      break;
    case 'tree':
      const treeNode = getNodeFromPath(currentPath, currentPath);
      if (treeNode && treeNode.type === 'directory') {
        printTree(term, treeNode.children, '', true);
      } else {
        term.writeln('tree: Cannot display tree from this location.');
      }
      break;
    case 'clear':
      term.clear();
      break;
    default:
      term.writeln(`${cmd}: command not found`);
      break;
  }
  return newPath;
}
