import os
import hashlib
import re


def build_content_js():
    fs_dir = "fs"
    js_content_dir = "js/content"

    os.makedirs(js_content_dir, exist_ok=True)

    content_data_js = "window.markdownContent = window.markdownContent || {};\n\n"
    for root, _, files in os.walk(fs_dir):
        for file_name in files:
            if file_name.endswith(".md"):
                md_path = os.path.join(root, file_name)
                relative_md_path = os.path.relpath(md_path, fs_dir).replace("\\", "/")
                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read().replace("`", "\\`")
                content_data_js += (
                    f"window.markdownContent['{relative_md_path}'] = `{content}`;\n"
                )

    # 1. Calculer le hash du contenu
    content_hash = hashlib.md5(content_data_js.encode("utf-8")).hexdigest()[:8]

    # 2. Créer le nouveau nom de fichier versionné
    versioned_filename = f"content_data.{content_hash}.js"
    versioned_filepath = os.path.join(js_content_dir, versioned_filename)

    # 3. Écrire le contenu dans le nouveau fichier versionné
    with open(versioned_filepath, "w", encoding="utf-8") as f:
        f.write(content_data_js)
    print(f"Fichier de contenu JS généré avec succès : {versioned_filepath}")

    # 4. Mettre à jour index.html
    with open("index.html", "r+", encoding="utf-8") as f:
        html_content = f.read()
        # Utiliser une regex pour trouver et remplacer l'ancien nom de fichier
        new_html_content = re.sub(
            r"js/content/content_data(\.[a-f0-9]{8})?\.js",
            f"js/content/{versioned_filename}",
            html_content,
        )
        f.seek(0)
        f.write(new_html_content)
        f.truncate()
    print("index.html mis à jour avec succès.")

    # 5. (Optionnel) Nettoyer les anciens fichiers de contenu
    for file in os.listdir(js_content_dir):
        if file.startswith("content_data.") and file != versioned_filename:
            os.remove(os.path.join(js_content_dir, file))
            print(f"Ancien fichier supprimé : {file}")


if __name__ == "__main__":
    build_content_js()
