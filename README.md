# 💻 Portfolio Terminal

This project is a personal portfolio presented as an interactive terminal. It's a fun way to explore my work and skills through a command-line interface.

## ✨ Features

- **Interactive CLI**: Navigate using familiar terminal commands.
- **Virtual File System**: Explore projects, skills, and information about me as if browsing a file system.
- **Static Content**: All content is embedded directly within the JavaScript, allowing the site to function entirely client-side without a server.
- **Responsive Design**: Works on various screen sizes.
- **Command Enhancements**: Includes command history (arrow keys) and tab autocompletion.

## 🛠️ Technologies Used

- **HTML5**: Structure
- **CSS3**: Styling
- **JavaScript (Vanilla)**: Interactivity
- **Xterm.js**: Terminal emulation

## 🚀 Getting Started

### Building Content

Before running or deploying the site, you need to convert the markdown content (`.md` files in the `fs/` directory) into JavaScript files. This is done using a Python script:

1.  Ensure you have Python installed.
2.  Open your terminal in the project's root directory.
3.  Run the command: `python3 build_content.py`

This will generate the necessary JavaScript content data file (`js/content/content_data.js`).

### Local Development

To run this portfolio locally, simply open the `index.html` file in your web browser. All content is embedded, so no local server is required.

### Deployment on GitHub Pages

This project is designed for static hosting, making it ideal for GitHub Pages.

1.  **Create a GitHub Repository**: If you haven't already, create a new public repository on GitHub (e.g., `your-username.github.io` for a user page, or any name for a project page).
2.  **Push Your Code**: Push all the project files (including `index.html`, `style.css`, `js/`, `fs/`, `build_content.py`, and the generated `js/content/content_data.js`) to your GitHub repository. Remember to run `python3 build_content.py` before pushing to ensure your content is up-to-date.
3.  **Configure GitHub Pages**:
    *   Go to your repository on GitHub.
    *   Click on "Settings" (⚙️).
    *   In the left sidebar, click on "Pages".
    *   Under "Build and deployment", select "Deploy from a branch".
    *   Choose the branch you want to deploy from (e.g., `main` or `master`) and the `/ (root)` folder.
    *   Click "Save".
4.  **Access Your Site**: Your site will be available at `https://your-username.github.io/your-repository-name/` (or `https://your-username.github.io/` for a user page) within a few minutes.

## 📚 How to Use

Upon loading, you'll see a terminal prompt. Type commands to interact:

- `help`: List all available commands.
- `ls`: List files and directories in the current location.
- `cat [filename]`: Display file content (e.g., `cat about.md`).
- `cd [directory]`: Change directory (e.g., `cd projects`).
- `pwd`: Print current working directory.
- `tree`: Display the virtual file system structure.
- `clear`: Clear the terminal screen.

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).
