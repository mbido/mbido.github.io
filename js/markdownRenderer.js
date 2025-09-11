function renderMarkdownToTerminal(markdown) {
  let rendered = markdown;

  // Headers (e.g., # Header, ## Subheader) - Gradient colors for better
  // visibility, avoiding white.
  // Using ANSI escape codes for colors: 30-37 for foreground, 90-97 for
  // bright foreground
  rendered = rendered.replace(
      /^#\s(.+)$/gm, '\x1b[1;93m$1\x1b[0m');  // H1: Bold Bright Yellow
  rendered = rendered.replace(
      /^##\s(.+)$/gm, '\x1b[1;96m$1\x1b[0m');  // H2: Bold Bright Cyan
  rendered = rendered.replace(
      /^###\s(.+)$/gm, '\x1b[1;94m$1\x1b[0m');  // H3: Bold Bright Blue
  rendered = rendered.replace(
      /^####\s(.+)$/gm, '\x1b[1;95m$1\x1b[0m');  // H4: Bold Bright Magenta
  rendered = rendered.replace(
      /^#####\s(.+)$/gm, '\x1b[1;97m$1\x1b[0m');  // H5: Bold Bright White
  rendered = rendered.replace(
      /^######\s(.+)$/gm, '\x1b[1;97m$1\x1b[0m');  // H6: Bold Bright White

  // Special case: Bold text followed by a link (e.g., **Github** : [link](url))
  // We need to handle this before processing links and bold separately
  rendered = rendered.replace(
      /\*\*([^*]+?)\*\*\s*:\s*\[([^\]]+?)\]\(([^)]+?)\)/g,
      '\x1b[1m$1\x1b[0m : \x1b]8;;$3\x1b\\$2\x1b]8;;\x1b\\'
  );
  rendered = rendered.replace(
      /__([^_]+?)__\s*:\s*\[([^\]]+?)\]\(([^)]+?)\)/g,
      '\x1b[1m$1\x1b[0m : \x1b]8;;$3\x1b\\$2\x1b]8;;\x1b\\'
  );

  // Links ([text](url)) - make them clickable
  rendered = rendered.replace(
      /\[([^\]]+?)\]\(([^)]+?)\)/g,
      '\x1b]8;;$2\x1b\\$1\x1b]8;;\x1b\\');  // Clickable link

  // Bold (**text** or __text__) - only match text that doesn't span multiple lines
  // and ensure we properly capture the content
  rendered = rendered.replace(/\*\*([^*\n]+?)\*\*/g, '\x1b[1m$1\x1b[0m');
  rendered = rendered.replace(/__([^_\n]+?)__/g, '\x1b[1m$1\x1b[0m');

  // Italic (*text* or _text_) - avoid conflicts with bold and lists
  rendered = rendered.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '\x1b[3m$1\x1b[0m');
  rendered = rendered.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '\x1b[3m$1\x1b[0m');

  // Lists (- item, * item)
  rendered = rendered.replace(/^[*-]\s(.+)$/gm, '  • $1');

  return rendered;
}
