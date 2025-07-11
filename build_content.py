import os


def build_content_js():
    fs_dir = "fs"
    js_content_dir = (
        "js/content"  # This directory will now only hold the single data file
    )

    # Ensure js/content directory exists
    os.makedirs(js_content_dir, exist_ok=True)

    # Prepare the content for the single data file
    content_data_js = "window.markdownContent = window.markdownContent || {};\n\n"

    for root, _, files in os.walk(fs_dir):
        for file_name in files:
            if file_name.endswith(".md"):
                md_path = os.path.join(root, file_name)
                # Get relative path from fs_dir (e.g., 'about.md', 'projects/portfolio.md')
                relative_md_path = os.path.relpath(md_path, fs_dir)

                # Read content and escape backticks
                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read().replace("`", "\\`")

                # Append to the content data string
                content_data_js += (
                    f"window.markdownContent['{relative_md_path}'] = `{content}`;\n"
                )

    # Write the single data file
    with open(
        os.path.join(js_content_dir, "content_data.js"), "w", encoding="utf-8"
    ) as f:
        f.write(content_data_js)

    print("Content JS data file built successfully!")


if __name__ == "__main__":
    build_content_js()
