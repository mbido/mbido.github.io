import os
import hashlib
import re


def build():
    """
    Génère le contenu JS à partir des fichiers markdown et versionne tous les
    fichiers JS pour le cache busting.
    """
    # --- Étape 1: Générer le contenu dynamique (content_data.js) ---
    fs_dir = "fs"
    js_content_dir = "js/content"
    os.makedirs(js_content_dir, exist_ok=True)
    content_data_path = os.path.join(js_content_dir, "content_data.js")

    content_data_js = "window.markdownContent = window.markdownContent || {};\n\n"
    for root, _, files in os.walk(fs_dir):
        for file_name in files:
            if file_name.endswith(".md"):
                md_path = os.path.join(root, file_name)
                # S'assurer que les chemins sont au format web (avec /)
                relative_md_path = os.path.relpath(md_path, fs_dir).replace("\\", "/")
                with open(md_path, "r", encoding="utf-8") as f:
                    content = f.read().replace("`", "\\`")
                content_data_js += (
                    f"window.markdownContent['{relative_md_path}'] = `{content}`;\n"
                )

    with open(content_data_path, "w", encoding="utf-8") as f:
        f.write(content_data_js)
    print(f"✅ Fichier '{content_data_path}' généré.")

    # --- Étape 2: Versionner tous les fichiers JS cibles ---
    files_to_version = [
        content_data_path,
        "js/filesystem.js",
        "js/markdownRenderer.js",
        "js/commands.js",
        "js/terminal.js",
    ]

    # Dictionnaire pour stocker les chemins mis à jour
    path_mappings = {}
    newly_versioned_files = set()

    for original_path in files_to_version:
        original_path = original_path.replace("\\", "/")
        try:
            with open(original_path, "rb") as f:
                content = f.read()
                content_hash = hashlib.md5(content).hexdigest()[:8]

                path_parts = os.path.splitext(original_path)
                versioned_path = f"{path_parts[0]}.{content_hash}{path_parts[1]}"

                # Créer le nouveau fichier
                with open(versioned_path, "wb") as new_f:
                    new_f.write(content)

                path_mappings[original_path] = versioned_path
                newly_versioned_files.add(versioned_path)

        except FileNotFoundError:
            print(f"⚠️ Fichier non trouvé : {original_path}. Ignoré.")

    print("✅ Fichiers JS versionnés avec succès.")

    # --- Étape 3: Mettre à jour index.html ---
    with open("index.html", "r+", encoding="utf-8") as f:
        html_content = f.read()

        for original, versioned in path_mappings.items():
            # Utiliser une regex pour être sûr de ne remplacer que le bon chemin
            # et éviter de remplacer une partie d'un autre nom de fichier.
            # La regex cherche le chemin original, potentiellement déjà versionné.
            base, ext = os.path.splitext(original)
            pattern = re.compile(
                rf'"{re.escape(base)}(\.[a-f0-9]{{8}})?{re.escape(ext)}"'
            )
            replacement = f'"{versioned}"'
            html_content = pattern.sub(replacement, html_content)

        f.seek(0)
        f.write(html_content)
        f.truncate()
    print("✅ index.html mis à jour.")

    # --- Étape 4: Nettoyer les anciens fichiers versionnés ---
    all_versioned_dirs = {os.path.dirname(p) for p in newly_versioned_files}
    for directory in all_versioned_dirs:
        for filename in os.listdir(directory):
            # Vérifier si un fichier a un hash dans son nom mais n'est pas dans la liste des fichiers actuels
            if re.match(r".*\.[a-f0-9]{8}\.js$", filename):
                full_path = os.path.join(directory, filename).replace("\\", "/")
                if full_path not in newly_versioned_files:
                    os.remove(full_path)
                    print(f"🗑️ Ancien fichier supprimé : {full_path}")

    # Supprimer le content_data.js non-versionné car il n'est plus utilisé
    if os.path.exists(content_data_path):
        os.remove(content_data_path)


if __name__ == "__main__":
    build()
