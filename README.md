# 💻 Portfolio Terminal

This project is a personal portfolio presented as an interactive terminal. It's a fun way to explore my work and skills through a command-line interface.

Live at **[mbido.fr](https://mbido.fr/)**.

## ✨ Features

- **Interactive CLI**: Navigate using familiar terminal commands.
- **Virtual File System**: Explore projects, skills, and information about me as if browsing a file system. The tree is generated from `fs/`, so it can never drift from the actual content.
- **Static Content**: All content is embedded directly within the JavaScript, allowing the site to function entirely client-side without a server.
- **Line editing**: Command history (↑/↓), tab completion, caret movement (←/→, Home/End), and the usual `Ctrl+A/E/U/W/C/L` shortcuts.
- **Responsive**: A compact header and a tap-friendly shortcut bar on phones; output wraps to the terminal width on word boundaries.
- **Works without JavaScript**: a plain-HTML fallback of the same content is generated into `index.html` for crawlers and no-JS visitors.

## 🛠️ Technologies Used

- **HTML5**: Structure
- **CSS3**: Styling
- **JavaScript (Vanilla)**: Interactivity
- **Xterm.js**: Terminal emulation (pinned to an exact version, not `@latest`)
- **Python 3**: Build script, no third-party packages

## 🚀 Getting Started

### Building

The markdown under `fs/` is compiled into JavaScript before the site can run:

```bash
python3 build_content.py
```

This single command:

1. Generates `js/content/content_data.js` with the file contents **and** the directory tree.
2. Regenerates the `<noscript>` fallback inside `index.html`.
3. Appends a content hash (`?v=…`) to every local `js/*.js` and `style.css` reference for cache busting.

Run it after any change under `fs/`, `js/`, or `style.css`.

### Adding content

Drop a `.md` file anywhere under `fs/` and re-run the build. It shows up in `ls`, `tree`, and tab completion automatically — no JavaScript to edit.

### Local Development

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

### Tests

```bash
node test/terminal.test.js
```

The suite loads the real `js/` sources against a miniature terminal emulator and covers the key handling, every command, the markdown renderer, and path resolution.

### Deployment on GitHub Pages

The repository is served directly by GitHub Pages from the `main` branch, root folder, with the custom domain in `CNAME`. Remember to run `python3 build_content.py` and commit the generated files before pushing.

## 📚 How to Use

Upon loading, you'll see a terminal prompt. Type commands to interact:

- `help`: List all available commands.
- `ls [dir]`: List files and directories.
- `cat [file]`: Display file content (e.g., `cat about.md`).
- `cd [dir]`: Change directory (e.g., `cd projects`).
- `pwd`: Print current working directory.
- `tree`: Display the virtual file system structure.
- `whoami`: Short introduction.
- `contact`: How to reach me.
- `clear`: Clear the terminal screen.

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).
