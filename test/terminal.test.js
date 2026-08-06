// Regression tests for the terminal portfolio.
//
// Loads the real js/ sources against a miniature terminal emulator, so the
// keyboard state machine, the commands and the markdown renderer can all be
// exercised without a browser.
//
//   node test/terminal.test.js
//
// Run build_content.py first if you changed anything under fs/.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.argv[2] || path.join(__dirname, '..');

class Screen {
  constructor(cols) {
    this.cols = cols;
    this.rows = [[]];
    this.x = 0;
    this.y = 0;
  }
  _row(y) {
    while (this.rows.length <= y) this.rows.push([]);
    return this.rows[y];
  }
  putChar(ch) {
    if (this.x >= this.cols) {  // deferred wrap, like xterm
      this.x = 0;
      this.y++;
    }
    const row = this._row(this.y);
    while (row.length < this.x) row.push(' ');
    row[this.x] = ch;
    this.x++;
  }
  write(data) {
    let i = 0;
    while (i < data.length) {
      const ch = data[i];
      if (ch === '\x1b') {
        // OSC 8 hyperlink: skip to the ESC \ terminator.
        if (data.startsWith('\x1b]8;;', i)) {
          const end = data.indexOf('\x1b\\', i + 5);
          i = end === -1 ? data.length : end + 2;
          continue;
        }
        const m = /^\x1b\[([0-9;]*)([A-Za-z])/.exec(data.slice(i));
        if (m) {
          const n = m[1] === '' ? 1 : parseInt(m[1].split(';')[0], 10);
          const cmd = m[2];
          if (cmd === 'A') this.y = Math.max(0, this.y - n);
          else if (cmd === 'B') this.y += n;
          else if (cmd === 'C') this.x = Math.min(this.cols, this.x + n);
          else if (cmd === 'D') this.x = Math.max(0, this.x - n);
          else if (cmd === 'J') {
            const mode = m[1] === '' ? 0 : parseInt(m[1], 10);
            if (mode === 0) {
              this._row(this.y).length = Math.min(this._row(this.y).length, this.x);
              this.rows.length = this.y + 1;
            } else if (mode === 2) {
              this.rows = [[]];
              this.x = this.y = 0;
            }
          } else if (cmd === 'K') {
            this._row(this.y).length = Math.min(this._row(this.y).length, this.x);
          }
          // 'm' (colours) intentionally ignored
          i += m[0].length;
          continue;
        }
        i++;
        continue;
      }
      if (ch === '\r') { this.x = 0; i++; continue; }
      if (ch === '\n') { this.y++; this._row(this.y); i++; continue; }
      this.putChar(ch);
      i++;
    }
  }
  lines() {
    return this.rows.map(r => r.map(c => (c === undefined ? ' ' : c)).join('').replace(/\s+$/, ''));
  }
  text() { return this.lines().join('\n'); }
}

function makeContext(cols) {
  const screen = new Screen(cols);
  let onData = null;
  const barHandlers = {};
  const touchbar = {
    hidden: true,
    addEventListener(type, fn) { barHandlers[type] = fn; },
  };
  const term = {
    cols,
    rows: 24,
    screen,
    loadAddon() {},
    open() {},
    focus() {},
    clear() { screen.rows = [[]]; screen.x = 0; screen.y = 0; },
    write(s) { screen.write(s); },
    writeln(s) { screen.write(s + '\r\n'); },
    onData(cb) { onData = cb; },
    onKey() {},
    get _onData() { return onData; },
  };

  const ctx = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (cb) => cb(),
    Terminal: function () { return term; },
    FitAddon: { FitAddon: function () { return {fit() {}}; } },
    ResizeObserver: function () { return {observe() {}}; },
    document: {
      readyState: 'complete',
      fonts: {ready: Promise.resolve()},
      getElementById: (id) => (id === 'touchbar' ? touchbar : null),
      addEventListener: () => {},
    },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);

  for (const f of ['js/content/content_data.js', 'js/filesystem.js',
                   'js/markdownRenderer.js', 'js/commands.js', 'js/terminal.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  }
  return {ctx, term, screen, touchbar, barHandlers,
          send: (s) => term._onData(s)};
}

// ---------------------------------------------------------------- assertions
let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; } else { failures.push(name + (detail ? '\n      ' + detail : '')); }
}

async function run() {
  const flush = () => new Promise(r => setImmediate(r));
  const h = makeContext(80);
  await flush();
  const send = h.send;
  const lines = () => h.screen.lines();
  const last = () => lines().filter(l => l.trim() !== '').pop() || '';
  const type = (s) => s.split('').forEach(send);
  const enter = async () => { send('\r'); await flush(); };
  // Clears, runs a command, and returns only its output (no echoed command
  // line, no trailing prompt).
  const exec = async (cmd) => {
    h.term.clear();
    type(cmd);
    await enter();
    const l = lines();
    return l.slice(1, l.length - 1).join('\n').trim();
  };

  check('boot: onData handler registered', typeof h.term._onData === 'function');
  check('boot: startup tree ran', h.screen.text().includes('about.md'));
  check('boot: contact.md auto-discovered', h.screen.text().includes('contact.md'));
  check('boot: prompt sits on one line',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));

  // --- escape sequences must never become junk text -----------------------
  for (const [name, seq] of [['Delete', '\x1b[3~'], ['F1', '\x1bOP'],
                             ['PageUp', '\x1b[5~'], ['ShiftTab', '\x1b[Z'],
                             ['Insert', '\x1b[2~']]) {
    const before = last();
    send(seq);
    check('escape ' + name + ' inserts nothing', last() === before,
          'before=' + JSON.stringify(before) + ' after=' + JSON.stringify(last()));
  }

  // --- typing and submit --------------------------------------------------
  type('help');
  check('typing echoes to the line', last().endsWith('help'), last());
  await enter();
  check('Enter runs the command', h.screen.text().includes('Available commands:'));
  check('help lists whoami', h.screen.text().includes('whoami'));
  check('help lists contact', h.screen.text().includes('contact'));
  check('prompt returns after a command',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));

  // --- caret editing ------------------------------------------------------
  type('cat about.md');
  send('\x1b[D'); send('\x1b[D');
  type('XY');
  check('ArrowLeft then insert edits mid-line',
        last().endsWith('cat about.XYmd'), last());
  send('\x1b[3~');
  check('Delete removes the char under the caret',
        last().endsWith('cat about.XYd'), last());
  send('\x7f');
  check('Backspace removes the char before the caret',
        last().endsWith('cat about.Xd'), last());
  send('\x1b[H'); type('Z');
  check('Home moves the caret to the start',
        last().endsWith('$ Zcat about.Xd'), last());
  send('\x1b[F'); type('W');
  check('End moves the caret to the end',
        last().endsWith('$ Zcat about.XdW'), last());
  send('\x17');
  check('Ctrl+W deletes the previous word',
        last().endsWith('$ Zcat'), last());
  send('\x15');
  check('Ctrl+U clears the line',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));

  // --- history ------------------------------------------------------------
  type('pwd'); await enter();
  send('\x1b[A');
  check('ArrowUp recalls the last command', last().endsWith('pwd'), last());
  send('\x1b[A');
  check('ArrowUp again recalls an older command', last().endsWith('help'), last());
  send('\x1b[B');
  check('ArrowDown returns to the newer command', last().endsWith('pwd'), last());
  send('\x1b[B');
  check('ArrowDown past the newest clears the line',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));

  // --- tab completion -----------------------------------------------------
  type('cat ab'); send('\t');
  check('Tab completes a unique file', last().endsWith('cat about.md'), last());
  send('\x15');
  type('cd pro'); send('\t');
  check('Tab completes a directory with a trailing slash',
        last().endsWith('cd projects/'), last());
  await enter();
  check('cd updates the prompt path',
        /guest@MyPortfolio:\/projects\$ ?$/.test(last()), JSON.stringify(last()));
  send('\t');
  check('Tab with several matches lists them',
        h.screen.text().includes('portfolio.md') &&
        h.screen.text().includes('MITM-Attack-on-HPC-hardwar.md'));

  // --- Ctrl+C -------------------------------------------------------------
  type('garbage'); send('\x03');
  check('Ctrl+C prints ^C', h.screen.text().includes('^C'));
  check('Ctrl+C leaves a clean prompt',
        /guest@MyPortfolio:\/projects\$ ?$/.test(last()), JSON.stringify(last()));

  type('cd ..'); await enter();
  check('cd .. returns to root',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));

  // --- command behaviour --------------------------------------------------
  check('ls on a file prints the basename only',
        (await exec('ls projects/portfolio.md')) === 'portfolio.md',
        JSON.stringify(await exec('ls projects/portfolio.md')));
  const lsDir = await exec('ls projects');
  check('ls on a directory lists its entries',
        lsDir.includes('portfolio.md') &&
        lsDir.includes('MITM-Attack-on-HPC-hardwar.md'), JSON.stringify(lsDir));
  check('ls does not split long names across a wrap',
        lsDir.split('\n').every(l => l.length <= 80), JSON.stringify(lsDir));
  check('cat on a directory is reported',
        (await exec('cat projects')).includes('Is a directory'));
  check('cat with no operand is reported',
        (await exec('cat')).includes('missing operand'));
  check('cat on a missing file is reported',
        (await exec('cat nope.md')).includes('No such file'));
  check('cd on a missing path is reported',
        (await exec('cd nope')).includes('No such file or directory'));
  check('unknown command is reported',
        (await exec('nosuchcmd')).includes('command not found'));
  check('whoami prints the name',
        (await exec('whoami')).includes('Matthieu Bidault'));
  check('contact prints the email',
        (await exec('contact')).includes('contact@mbido.fr'));
  check('contact prints the GitHub handle',
        (await exec('contact')).includes('github.com/mbido'));
  check('cat renders a file', (await exec('cat about.md')).includes('About me'));
  check('pwd prints the path', (await exec('pwd')) === '/');
  check('tree lists nested files',
        (await exec('tree')).includes('perturbed-oil-and-vinegar-signature-scheme.md'));
  check('empty input just reprints the prompt', (await exec('')) === '');

  h.term.clear();
  type('clear'); await enter();
  check('clear empties the screen',
        lines().filter(l => l.trim() !== '').length <= 1,
        JSON.stringify(lines()));

  // --- word wrap at a narrow width ---------------------------------------
  const narrow = makeContext(40);
  await flush();
  narrow.term.clear();
  'cat /about.md'.split('').forEach(narrow.send);
  narrow.send('\r');
  await flush();
  const tooLong = narrow.screen.lines().filter(l => l.length > 40);
  check('output wraps within 40 columns', tooLong.length === 0,
        'offending: ' + JSON.stringify(tooLong.slice(0, 3)));
  check('wrapping happens on word boundaries',
        !narrow.screen.lines().some(l => /Sorbo$|Universi$|Comput$/.test(l)));
  check('narrow terminal still renders the heading',
        narrow.screen.text().includes('About me'));

  // --- renderer details ---------------------------------------------------
  const render = h.ctx.renderMarkdownToTerminal;
  check('snake_case is not italicised',
        !render('The file content_data.js is generated.', 80).includes('\x1b[3m'));
  const link = render('[label](https://example.com/a_b_c)', 80);
  check('links become OSC 8 hyperlinks',
        link.includes('\x1b]8;;https://example.com/a_b_c'), JSON.stringify(link));
  check('link URLs keep their underscores', link.includes('a_b_c'));
  check('inline code keeps underscores',
        render('Use `snake_case_name` here.', 80).includes('snake_case_name'));
  const head = render('# Title with **bold** inside', 80);
  check('heading colour resumes after a nested reset',
        (head.split('\x1b[0m')[1] || '').startsWith('\x1b[1;93m'), JSON.stringify(head));
  check('markdown italics still work',
        render('an *emphasised* word', 80).includes('\x1b[3m'));
  check('bold still works', render('a **strong** word', 80).includes('\x1b[1m'));

  // --- filesystem helpers -------------------------------------------------
  const resolve = h.ctx.resolvePath;
  check('resolvePath normalises ..',
        resolve('/projects/../about.md', '/') === '/about.md');
  check('resolvePath handles relative paths',
        resolve('portfolio.md', '/projects') === '/projects/portfolio.md');
  check('resolvePath handles .', resolve('./x', '/projects') === '/projects/x');
  check('getNodeFromPath rejects a path through a file',
        h.ctx.getNodeFromPath('/about.md/x', '/') === null);
  check('getDirContent on a file returns {} instead of throwing',
        Object.keys(h.ctx.getDirContent('/about.md', '/')).length === 0);

  // --- on-screen shortcut bar --------------------------------------------
  check('shortcut bar is revealed once the terminal boots',
        h.touchbar.hidden === false);
  check('shortcut bar registers a click handler',
        typeof h.barHandlers.click === 'function');
  h.term.clear();
  const fakeButton = {dataset: {cmd: 'whoami'}};
  fakeButton.closest = () => fakeButton;
  h.barHandlers.click({target: fakeButton});
  await flush();
  check('shortcut bar button runs its command',
        h.screen.text().includes('Matthieu Bidault'), h.screen.text());
  check('shortcut bar leaves a usable prompt',
        /guest@MyPortfolio:\/\$ ?$/.test(last()), JSON.stringify(last()));
  const noButton = {closest: () => null};
  const before = h.screen.text();
  h.barHandlers.click({target: noButton});
  check('clicking the bar background does nothing',
        h.screen.text() === before);

  console.log('\n' + pass + ' passed, ' + failures.length + ' failed');
  if (failures.length) {
    console.log('\nFAILURES:');
    failures.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    process.exitCode = 1;
  }
}

run().catch(e => { console.error(e); process.exitCode = 1; });
