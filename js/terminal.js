document.addEventListener('DOMContentLoaded', () => {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'monospace',
    theme: {
      background: '#000000',
      foreground: '#ffffff',
    }
  });

  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal'));
  fitAddon.fit();
  term.focus();

  window.addEventListener('resize', () => fitAddon.fit());

  let currentPath = '/';
  let commandHistory = [];
  let historyIndex = -1;
  let currentCommand = '';

  function getPrompt() {
    return `\x1b[1;32muser@portfolio\x1b[0m:\x1b[1;34m${currentPath}\x1b[0m$ `;
  }

  function printPrompt() {
    term.write(getPrompt());
  }

  term.writeln('Welcome to my terminal portfolio!');
  term.writeln('Type `help` to see the list of available commands.');
  printPrompt();

  term.onKey(async ({key, domEvent}) => {
    const printable =
        !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    if (domEvent.key === 'Enter') {
      if (currentCommand.trim() !== '') {
        commandHistory.unshift(currentCommand);
        historyIndex = -1;
        term.writeln('');
        currentPath = await executeCommand(term, currentCommand, currentPath);
      } else {
        term.writeln('');
      }
      currentCommand = '';
      printPrompt();
    } else if (domEvent.key === 'Backspace') {
      if (currentCommand.length > 0) {
        term.write('\b \b');
        currentCommand = currentCommand.slice(0, -1);
      }
    } else if (domEvent.key === 'ArrowUp') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        clearCurrentCommand();
        currentCommand = commandHistory[historyIndex];
        term.write(currentCommand);
      }
    } else if (domEvent.key === 'ArrowDown') {
      if (historyIndex > 0) {
        historyIndex--;
        clearCurrentCommand();
        currentCommand = commandHistory[historyIndex];
        term.write(currentCommand);
      } else {
        historyIndex = -1;
        clearCurrentCommand();
        currentCommand = '';
      }
    } else if (domEvent.key === 'Tab') {
      domEvent.preventDefault();
      const parts = currentCommand.split(' ');
      let toComplete = parts[parts.length - 1];
      let completionPath = currentPath;

      const lastSlashIndex = toComplete.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        completionPath =
            resolvePath(toComplete.substring(0, lastSlashIndex), currentPath);
        toComplete = toComplete.substring(lastSlashIndex + 1);
      }

      const dirContent = getDirContent(completionPath, currentPath);
      const matches =
          Object.keys(dirContent).filter(name => name.startsWith(toComplete));

      if (matches.length === 1) {
        const match = matches[0];
        const completion = match.substring(toComplete.length);
        currentCommand += completion;
        term.write(completion);
        if (dirContent[match].type === 'directory') {
          currentCommand += '/';
          term.write('/');
        }
      } else if (matches.length > 1) {
        term.writeln('');
        term.write(matches.join('  '));
        term.writeln('');
        printPrompt();
        term.write(currentCommand);
      }
    } else if (printable) {
      currentCommand += key;
      term.write(key);
    }
  });

  function clearCurrentCommand() {
    const len = currentCommand.length;
    for (let i = 0; i < len; i++) {
      term.write('\b \b');
    }
  }
});
