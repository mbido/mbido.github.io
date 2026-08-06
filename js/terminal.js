const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT_GREEN: '\x1b[1;32m',
  BRIGHT_BLUE: '\x1b[1;34m',
  BRIGHT_CYAN: '\x1b[1;36m',
  BRIGHT_MAGENTA: '\x1b[1;35m',
  BRIGHT_YELLOW: '\x1b[1;33m',
  ITALIC: '\x1b[3m',
};

function boot() {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'monospace',
    // A phone at the default 15px only fits about 24 columns, which mangles
    // every line of output.
    fontSize: window.innerWidth < 600 ? 12 : 15,
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

  let currentPath = '/';
  let commandHistory = [];
  let historyIndex = -1;
  let currentCommand = '';
  let cursor = 0;  // index of the caret inside currentCommand

  // Re-fit whenever the container actually changes size. A ResizeObserver also
  // catches the mobile keyboard opening and orientation changes, which a plain
  // window 'resize' listener misses.
  let refitTimer = null;
  const scheduleRefit = () => {
    clearTimeout(refitTimer);
    refitTimer = setTimeout(() => fitAddon.fit(), 50);
  };
  window.addEventListener('resize', scheduleRefit);
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleRefit).observe(document.getElementById('terminal'));
  }

  function plainPrompt() {
    return `guest@MyPortfolio:${currentPath}$ `;
  }

  function getPrompt() {
    return `${COLORS.BRIGHT_GREEN}guest@MyPortfolio${COLORS.RESET}:${COLORS.BRIGHT_BLUE}${
        currentPath}${COLORS.RESET}$ `;
  }

  function printPrompt() {
    term.write(getPrompt());
  }

  // Repaints the prompt and the command being edited, then parks the caret at
  // `cursor`. Handles input that wraps over several rows.
  function renderInput() {
    const cols = term.cols;
    const pLen = plainPrompt().length;

    const curRow = Math.floor((pLen + cursor) / cols);
    if (curRow > 0) term.write(`\x1b[${curRow}A`);
    term.write('\r\x1b[0J');
    term.write(getPrompt() + currentCommand);

    const endTotal = pLen + currentCommand.length;
    const endRow = endTotal === 0 ? 0 : Math.floor((endTotal - 1) / cols);
    const tgtTotal = pLen + cursor;
    const tgtRow = Math.floor(tgtTotal / cols);
    const tgtCol = tgtTotal % cols;

    if (endRow > tgtRow) term.write(`\x1b[${endRow - tgtRow}A`);
    term.write('\r');
    if (tgtCol > 0) term.write(`\x1b[${tgtCol}C`);
  }

  function insertText(text) {
    // Strip control characters, but keep anything printable.
    const clean = text.replace(/[\x00-\x1F\x7F]/g, '');
    if (!clean) return;
    currentCommand =
        currentCommand.slice(0, cursor) + clean + currentCommand.slice(cursor);
    cursor += clean.length;
    renderInput();
  }

  function setLine(text) {
    currentCommand = text;
    cursor = text.length;
    renderInput();
  }

  async function submit() {
    const command = currentCommand;
    term.writeln('');
    if (command.trim() !== '') {
      if (commandHistory.length === 0 || commandHistory[0] !== command) {
        commandHistory.unshift(command);
      }
      historyIndex = -1;
      currentPath = await executeCommand(term, command, currentPath);
    }
    currentCommand = '';
    cursor = 0;
    printPrompt();
  }

  function complete() {
    const parts = currentCommand.slice(0, cursor).split(' ');
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
      let completion = match.substring(toComplete.length);
      if (dirContent[match].type === 'directory') completion += '/';
      insertText(completion);
    } else if (matches.length > 1) {
      term.writeln('');
      term.writeln(matches.join('  '));
      renderInput();
    }
  }

  term.onData(data => {
    // A multi-character chunk that is not an escape sequence is a paste.
    if (data.length > 1 && data.charCodeAt(0) !== 0x1b) {
      insertText(data);
      return;
    }

    switch (data) {
      case '\r':  // Enter
        submit();
        return;
      case '\x7f':  // Backspace
        if (cursor > 0) {
          currentCommand =
              currentCommand.slice(0, cursor - 1) + currentCommand.slice(cursor);
          cursor--;
          renderInput();
        }
        return;
      case '\x1b[3~':  // Delete
        if (cursor < currentCommand.length) {
          currentCommand =
              currentCommand.slice(0, cursor) + currentCommand.slice(cursor + 1);
          renderInput();
        }
        return;
      case '\t':
        complete();
        return;
      case '\x1b[D':  // Left
        if (cursor > 0) {
          cursor--;
          renderInput();
        }
        return;
      case '\x1b[C':  // Right
        if (cursor < currentCommand.length) {
          cursor++;
          renderInput();
        }
        return;
      case '\x1b[A':  // Up - older history
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          setLine(commandHistory[historyIndex]);
        }
        return;
      case '\x1b[B':  // Down - newer history
        if (historyIndex > 0) {
          historyIndex--;
          setLine(commandHistory[historyIndex]);
        } else {
          historyIndex = -1;
          setLine('');
        }
        return;
      case '\x1b[H':   // Home
      case '\x1b[1~':
      case '\x01':     // Ctrl+A
        cursor = 0;
        renderInput();
        return;
      case '\x1b[F':   // End
      case '\x1b[4~':
      case '\x05':     // Ctrl+E
        cursor = currentCommand.length;
        renderInput();
        return;
      case '\x15':  // Ctrl+U - clear the line
        setLine('');
        return;
      case '\x17':  // Ctrl+W - delete previous word
        {
          const head = currentCommand.slice(0, cursor).replace(/\s*\S*$/, '');
          const tail = currentCommand.slice(cursor);
          currentCommand = head + tail;
          cursor = head.length;
          renderInput();
        }
        return;
      case '\x03':  // Ctrl+C - abandon the line
        term.writeln('^C');
        currentCommand = '';
        cursor = 0;
        historyIndex = -1;
        printPrompt();
        return;
      case '\x0c':  // Ctrl+L - clear the screen
        term.clear();
        renderInput();
        return;
    }

    // Any other escape sequence (function keys, PageUp, ...) is ignored rather
    // than pasted into the line as junk.
    if (data.charCodeAt(0) === 0x1b) return;
    if (data >= ' ') insertText(data);
  });

  function printColoredText(text, colorCode) {
    text.split('\n').forEach((line, index, array) => {
      term.write(`${colorCode}${line}\x1b[0m`);
      if (index < array.length - 1) {
        term.writeln('');
      }
    });
  }

  // The full banner needs 64 columns; below that it wraps into noise, so a
  // narrow screen gets a compact header instead.
  if (term.cols >= 66) {
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
  } else {
    printColoredText('WELCOME', COLORS.BRIGHT_CYAN);
    term.writeln('');
    printColoredText('★ Matthieu Bidault ★', COLORS.BRIGHT_YELLOW);
    term.writeln('');
    printColoredText('Portfolio', COLORS.BRIGHT_MAGENTA);
  }
  term.writeln('');
  printColoredText(
      'Type `help` to see the list of available commands.', COLORS.ITALIC);
  term.writeln('');

  printPrompt();
  term.writeln('tree');
  executeCommand(term, 'tree', currentPath).then(() => printPrompt());

  // On-screen shortcut bar, so the site stays usable without a keyboard.
  // Revealed only once the terminal is live; CSS limits it to touch devices.
  const touchbar = document.getElementById('touchbar');
  if (touchbar) {
    touchbar.hidden = false;
    touchbar.addEventListener('mousedown', (event) => {
      // Keep focus on the terminal so the caret does not disappear.
      if (event.target.closest('button')) event.preventDefault();
    });
    touchbar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-cmd]');
      if (!button) return;
      setLine(button.dataset.cmd);
      term.focus();
      submit();
    });
  }
}

function startTerminal() {
  // Measuring the container before layout and webfonts have settled makes
  // fit() compute a near-zero size, which used to leave the first prompt
  // wrapped at a couple of columns. Wait for fonts, then for two frames.
  const start = () => requestAnimationFrame(() => requestAnimationFrame(boot));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
  } else {
    start();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startTerminal);
} else {
  startTerminal();
}
