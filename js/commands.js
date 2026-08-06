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

function writeFile(term, node) {
  const rendered = renderMarkdownToTerminal(node.content, term.cols);
  rendered.split('\n').forEach(line => term.writeln(line));
}

async function executeCommand(term, command, currentPath) {
  const [cmd, ...args] = command.trim().split(' ').filter(p => p !== '');
  let newPath = currentPath;

  switch (cmd) {
    case undefined:
      break;
    case 'help':
      term.writeln('Available commands:');
      term.writeln('  ls [dir]   - List files and directories');
      term.writeln('  cat [file] - Display file content');
      term.writeln('  cd [dir]   - Change directory');
      term.writeln('  pwd        - Print working directory');
      term.writeln('  tree       - Display the file system tree');
      term.writeln('  whoami     - Short introduction');
      term.writeln('  contact    - How to reach me');
      term.writeln('  clear      - Clear the terminal');
      term.writeln('  help       - Show this message');
      term.writeln('');
      term.writeln('Shortcuts: Tab completes, ↑/↓ browse history,');
      term.writeln('           ←/→ move the caret, Ctrl+C cancels the line.');
      break;
    case 'ls': {
      const targetPath = args.length > 0 ? resolvePath(args[0], currentPath) :
                                           currentPath;
      const targetNode = getNodeFromPath(targetPath, currentPath);

      if (!targetNode) {
        term.writeln(
            `ls: cannot access '${args[0]}': No such file or directory`);
      } else if (targetNode.type === 'file') {
        // Match coreutils: `ls path/to/file.md` prints the name, not the path.
        term.writeln(targetPath.split('/').filter(p => p).pop());
      } else {
        const content = targetNode.children;
        const names = Object.keys(content);
        if (names.length === 0) {
          term.writeln('(empty directory)');
        } else {
          // Wrap between entries rather than letting a long name be split in
          // half by the terminal's own wrapping.
          let width = 0;
          names.forEach(item => {
            if (width > 0 && width + item.length + 2 > term.cols) {
              term.writeln('');
              width = 0;
            }
            const color = content[item].type === 'directory' ? '\x1b[1;34m' :
                                                               '\x1b[0m';
            term.write(`${color}${item}\x1b[0m  `);
            width += item.length + 2;
          });
          term.writeln('');
        }
      }
      break;
    }
    case 'cat': {
      const filePath = args[0];
      if (!filePath) {
        term.writeln('cat: missing operand');
        break;
      }
      const fileNode = getNodeFromPath(filePath, currentPath);
      if (!fileNode) {
        term.writeln(`cat: ${filePath}: No such file or directory`);
      } else if (fileNode.type === 'directory') {
        term.writeln(`cat: ${filePath}: Is a directory`);
      } else if (!fileNode.content) {
        term.writeln(`cat: ${filePath}: No content`);
      } else {
        writeFile(term, fileNode);
      }
      break;
    }
    case 'cd': {
      const resolvedPath = resolvePath(args[0] || '/', currentPath);
      const dirNode = getNodeFromPath(resolvedPath, currentPath);
      if (dirNode && dirNode.type === 'directory') {
        newPath = resolvedPath;
      } else if (dirNode) {
        term.writeln(`cd: ${args[0]}: Not a directory`);
      } else {
        term.writeln(`cd: ${args[0]}: No such file or directory`);
      }
      break;
    }
    case 'pwd':
      term.writeln(currentPath);
      break;
    case 'tree': {
      const treeNode = getNodeFromPath(currentPath, currentPath);
      if (treeNode && treeNode.type === 'directory') {
        printTree(term, treeNode.children, '', true);
      } else {
        term.writeln('tree: Cannot display tree from this location.');
      }
      break;
    }
    case 'whoami':
      term.writeln('\x1b[1;93mMatthieu Bidault\x1b[0m');
      term.writeln(
          'M2 Computer Science student at Sorbonne Université (Cryptography,');
      term.writeln('High-Performance Computing and Algorithms).');
      term.writeln('');
      term.writeln('Run \x1b[1mcat /about.md\x1b[0m for the long version.');
      break;
    case 'contact': {
      const node = getNodeFromPath('/contact.md', currentPath);
      if (node && node.content) {
        writeFile(term, node);
      } else {
        term.writeln('contact: contact.md not found');
      }
      break;
    }
    case 'clear':
      term.clear();
      break;
    default:
      term.writeln(`${cmd}: command not found`);
      term.writeln('Type \x1b[1mhelp\x1b[0m to see the available commands.');
      break;
  }
  return newPath;
}
