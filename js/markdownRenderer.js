const MD_STYLES = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  ITALIC: '\x1b[3m',
  CODE: '\x1b[38;5;222m',
  QUOTE: '\x1b[38;5;245m',
  RULE: '\x1b[38;5;240m',
  H: [
    '\x1b[1;93m',  // H1 bold bright yellow
    '\x1b[1;96m',  // H2 bold bright cyan
    '\x1b[1;94m',  // H3 bold bright blue
    '\x1b[1;95m',  // H4 bold bright magenta
    '\x1b[1;97m',  // H5 bold bright white
    '\x1b[1;97m',  // H6 bold bright white
  ],
};

// SGR colour codes and OSC 8 hyperlink wrappers occupy no screen columns, so
// they must not count towards the wrap width.
const ANSI_PATTERN = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g;

function visibleLength(text) {
  return text.replace(ANSI_PATTERN, '').length;
}

// Wraps on word boundaries while carrying the active SGR state onto each new
// line, so a bold or coloured span that straddles a wrap keeps its styling.
function wrapAnsi(text, width, indent) {
  if (width <= indent + 4) return [text];
  const pad = ' '.repeat(indent);
  const limit = width - indent;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  let lineLen = 0;
  let active = '';

  const trackCodes = (chunk) => {
    const codes = chunk.match(/\x1b\[[0-9;]*m/g);
    if (!codes) return;
    for (const code of codes) {
      if (code === MD_STYLES.RESET) {
        active = '';
      } else {
        active += code;
      }
    }
  };

  for (const word of words) {
    const wordLen = visibleLength(word);
    if (lineLen > 0 && lineLen + 1 + wordLen > limit) {
      lines.push(pad + line);
      line = active + word;
      lineLen = wordLen;
    } else {
      line = lineLen === 0 ? word : `${line} ${word}`;
      lineLen = lineLen === 0 ? wordLen : lineLen + 1 + wordLen;
    }
    trackCodes(word);
  }
  lines.push(pad + line);
  return lines;
}

// Inline spans that must survive bold/italic substitution untouched: code
// spans, and the URL half of a link (which routinely contains _ and *).
function applyInline(text) {
  const vault = [];
  const stash = (value) => {
    vault.push(value);
    return `\uE000${vault.length - 1}\uE001`;
  };

  let out = text.replace(
      /`([^`]+)`/g,
      (_, code) => stash(`${MD_STYLES.CODE}${code}${MD_STYLES.RESET}`));

  out = out.replace(
      /\[([^\]]*)\]\(([^)]+)\)/g,
      (_, label, url) => stash(
          `\x1b]8;;${url}\x1b\\\x1b[4;36m${label || url}${MD_STYLES.RESET}\x1b]8;;\x1b\\`));

  out = out.replace(
      /\*\*([^*]+)\*\*/g, `${MD_STYLES.BOLD}$1${MD_STYLES.RESET}`);
  out = out.replace(/__([^_]+)__/g, `${MD_STYLES.BOLD}$1${MD_STYLES.RESET}`);
  out = out.replace(/\*([^*]+)\*/g, `${MD_STYLES.ITALIC}$1${MD_STYLES.RESET}`);
  // Underscore italics only at word boundaries, so snake_case survives intact.
  out = out.replace(
      /(^|[\s(])_([^_\s][^_]*)_(?=$|[\s.,;:!?)])/g,
      `$1${MD_STYLES.ITALIC}$2${MD_STYLES.RESET}`);

  return out.replace(/\uE000(\d+)\uE001/g, (_, i) => vault[Number(i)]);
}

function renderMarkdownToTerminal(markdown, width) {
  const cols = Math.max(24, (width || 80) - 1);
  const out = [];
  let inFence = false;
  // Source indent that opened each nesting level, so a file indenting its
  // top-level bullets by two spaces is not rendered as a nested list.
  let listIndents = [];

  for (const raw of markdown.split('\n')) {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(`  ${MD_STYLES.CODE}${raw}${MD_STYLES.RESET}`);
      continue;
    }

    if (raw.trim() === '') {
      out.push('');
      listIndents = [];
      continue;
    }

    const rule = raw.match(/^\s*([-*_])\1{2,}\s*$/);
    if (rule) {
      out.push(`${MD_STYLES.RULE}${'─'.repeat(cols)}${MD_STYLES.RESET}`);
      continue;
    }

    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const color = MD_STYLES.H[heading[1].length - 1];
      listIndents = [];
      // Inline resets would otherwise drop the heading colour mid-line.
      const body =
          applyInline(heading[2]).split(MD_STYLES.RESET).join(MD_STYLES.RESET + color);
      out.push(...wrapAnsi(`${color}${body}${MD_STYLES.RESET}`, cols, 0));
      continue;
    }

    const quote = raw.match(/^\s*>\s?(.*)$/);
    if (quote) {
      const body = applyInline(quote[1]);
      out.push(...wrapAnsi(
          `${MD_STYLES.QUOTE}│ ${body}${MD_STYLES.RESET}`, cols, 2));
      continue;
    }

    const bullet = raw.match(/^(\s*)[*-]\s+(.*)$/);
    if (bullet) {
      const rawIndent = bullet[1].length;
      while (listIndents.length &&
             rawIndent < listIndents[listIndents.length - 1]) {
        listIndents.pop();
      }
      if (!listIndents.length || rawIndent > listIndents[listIndents.length - 1]) {
        listIndents.push(rawIndent);
      }
      const depth = listIndents.length - 1;
      const indent = 2 + depth * 2;
      const marker = depth % 2 === 0 ? '•' : '◦';
      const body = applyInline(bullet[2]);
      out.push(...wrapAnsi(
          `${' '.repeat(indent)}${marker} ${body}`, cols, indent + 2));
      continue;
    }

    const ordered = raw.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ordered) {
      const indent = 2 + Math.floor(ordered[1].length / 2) * 2;
      const body = applyInline(ordered[3]);
      out.push(...wrapAnsi(
          `${' '.repeat(indent)}${ordered[2]}. ${body}`, cols, indent + 3));
      continue;
    }

    out.push(...wrapAnsi(applyInline(raw.trim()), cols, 0));
  }

  return out.join('\n');
}
