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

  const COLORS = {
    RESET: '\x1b[0m',
    BRIGHT_GREEN: '\x1b[1;32m',
    BRIGHT_BLUE: '\x1b[1;34m',
    BRIGHT_CYAN: '\x1b[1;36m',
    BRIGHT_MAGENTA: '\x1b[1;35m',
    BRIGHT_YELLOW: '\x1b[1;33m',
    ITALIC: '\x1b[3m',
  };

  function getPrompt() {
    return `${COLORS.BRIGHT_GREEN}guest@MyPortfolio${COLORS.RESET}:${COLORS.BRIGHT_BLUE}${
        currentPath}${COLORS.RESET}$ `;
  }

  function printPrompt() {
    term.write(getPrompt());
  }

  printColoredText(`
  ██╗    ██╗███████╗██╗      ██████╗ ██████╗ ███╗   ███╗███████╗
  ██║    ██║██╔════╝██║     ██╔════╝██╔═══██╗████╗ ████║██╔════╝
  ██║ █╗ ██║█████╗  ██║     ██║     ██║   ██║██╔████╔██║█████╗
  ██║███╗██║██╔══╝  ██║     ██║     ██║   ██║██║╚██╔╝██║██╔══╝
  ╚███╔███╔╝███████╗███████╗╚██████╗╚██████╔╝██║ ╚═╝ ██║███████╗
   ╚══╝╚══╝ ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝
`, COLORS.BRIGHT_CYAN);
  term.writeln('');
  printColoredText(`  ╭───────────────────────────────────────────────╮
  │      ★ ${COLORS.BRIGHT_YELLOW}Matthieu Bidault - Portfolio${COLORS.RESET}${COLORS.BRIGHT_MAGENTA} ★          │
  ╰───────────────────────────────────────────────╯`, COLORS.BRIGHT_MAGENTA);
  term.writeln('');
  printColoredText('Type `help` to see the list of available commands.', COLORS.ITALIC);
  term.writeln('');

  printPrompt();
  term.writeln('tree');
  executeCommand(term, 'tree', currentPath);
  printPrompt();

  // Handle paste functionality
  async function handlePaste(text) {
    // Filter out non-printable characters except newlines and tabs
    const filteredText = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    currentCommand += filteredText;
    term.write(filteredText);
  }

  // Handle data input (for paste events)
  term.onData(async (data) => {
    // Ignore arrow key sequences from xterm.js
    if (data === '\x1b[A' || data === '\x1b[B' || data === '\x1b[C' ||
        data === '\x1b[D') {
      return;
    }

    // Handle paste events (multiple characters)
    if (data.length > 1) {
      const filteredText = data.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
      currentCommand += filteredText;
      term.write(filteredText);
      return;
    }

    // Handle single character input normally via onKey
  });

  // Handle keyboard events (including arrow keys, backspace, etc.)
  term.onKey(async ({key, domEvent}) => {
    // Handle paste keyboard shortcuts (Ctrl+V and Cmd+V)
    if ((domEvent.ctrlKey || domEvent.metaKey) && domEvent.key === 'v') {
      domEvent.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        await handlePaste(text);
      } catch (err) {
        console.warn('Failed to read clipboard:', err);
      }
      return;
    }

    const printable = !domEvent.altKey && !domEvent.ctrlKey &&
        !domEvent.metaKey && domEvent.key !== 'ArrowUp' &&
        domEvent.key !== 'ArrowDown' && domEvent.key !== 'ArrowLeft' &&
        domEvent.key !== 'ArrowRight';

    if (domEvent.key === 'Enter') {
      if (currentCommand.trim() === 'clear') {
        currentCommand = '';
        term.write('\x1b[2K\r');
        term.clear();
        printPrompt();
      } else if (currentCommand.trim() !== '') {
        // Add to history only if it's different from the last command
        if (commandHistory.length === 0 ||
            commandHistory[0] !== currentCommand) {
          commandHistory.unshift(currentCommand);
        }
        historyIndex = -1; // Reset history index after new command
        term.writeln('');
        currentPath = await executeCommand(term, currentCommand, currentPath);
        currentCommand = '';
        printPrompt();
      } else {
        term.writeln('');
        currentCommand = '';
        printPrompt();
      }
    } else if (domEvent.key === 'Backspace') {
      if (currentCommand.length > 0) {
        term.write('\b \b');
        currentCommand = currentCommand.slice(0, -1);
      }
    } else if (domEvent.key === 'ArrowUp') {
      domEvent.preventDefault(); // Empêche l'ajout de caractères ANSI
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        clearCurrentCommand();
        currentCommand = commandHistory[historyIndex];
        term.write(currentCommand);
      }
    } else if (domEvent.key === 'ArrowDown') {
      domEvent.preventDefault(); // Empêche l'ajout de caractères ANSI
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

  // Nouvelle fonction pour imprimer du texte coloré avec gestion des retours à la ligne
  function printColoredText(text, colorCode) {
    text.split('\n').forEach((line, index, array) => {
      term.write(`${colorCode}${line}\x1b[0m`);
      if (index < array.length - 1) {
        term.writeln(''); // Ajouter un retour à la ligne pour chaque ligne sauf la dernière
      }
    });
  }
});
