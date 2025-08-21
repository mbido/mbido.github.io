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

  // Bold (**text** or __text__)
  rendered = rendered.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '\x1b[1m$1$2\x1b[0m');

  // Italic (*text* or _text_)
  rendered = rendered.replace(/\*(.*?)\*|_(.*?)_/g, '\x1b[3m$1$2\x1b[0m');

  // Lists (- item, * item)
  rendered = rendered.replace(/^[*-]\s(.+)$/gm, '  • $1');

  // Links ([text](url)) - make them clickable
  rendered = rendered.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '\x1b]8;;$2\x1b\\$1\x1b]8;;\x1b\\');  // Clickable link

  return rendered;
}
