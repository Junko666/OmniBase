import os
import requests
import shutil
import hashlib
import logging
import sys
import json
from datetime import datetime

# Konfiguration
GITHUB_REPO = "Junko666/OmniBase"
BRANCH = "main"
API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/git/trees/{BRANCH}?recursive=1"
RAW_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO}/{BRANCH}/"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(LOCAL_DIR, "backup_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
LOG_FILE = os.path.join(LOCAL_DIR, "update.log")

# Logging einrichten
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger('').addHandler(console)

def create_backup():
    """Erstellt ein Backup des aktuellen Zustands"""
    logging.info(f"Erstelle Backup in {BACKUP_DIR}")
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Alle Dateien (außer Backups) kopieren
    for root, dirs, files in os.walk(LOCAL_DIR):
        # Backup-Verzeichnisse überspringen
        if "backup_" in root:
            continue

        for file in files:
            src_path = os.path.join(root, file)
            # Relative Pfad zum Projektverzeichnis
            rel_path = os.path.relpath(src_path, LOCAL_DIR)
            dst_path = os.path.join(BACKUP_DIR, rel_path)

            # Zielverzeichnis erstellen, falls nicht vorhanden
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

            # Datei kopieren
            shutil.copy2(src_path, dst_path)

    logging.info("Backup abgeschlossen")

def get_repo_tree():
    """Holt den Dateibaum vom Repository"""
    logging.info(f"Hole Dateibaum von {API_URL}")
    try:
        response = requests.get(API_URL)
        response.raise_for_status()
        data = response.json()
        return data["tree"]
    except Exception as e:
        logging.error(f"Fehler beim Abrufen des Repository-Baums: {str(e)}")
        return None

def download_file(remote_path):
    """Lädt eine Datei vom Repository herunter"""
    url = RAW_URL + remote_path
    logging.info(f"Lade Datei herunter: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logging.error(f"Fehler beim Herunterladen der Datei {remote_path}: {str(e)}")
        return None

def validate_sha(content, expected_sha):
    """Validiert den SHA-Hash des Dateiinhalts"""
    blob_content = b"blob " + str(len(content)).encode() + b"\0" + content
    actual_sha = hashlib.sha1(blob_content).hexdigest()
    return actual_sha == expected_sha

def sync_files():
    """Synchronisiert die Dateien mit dem Repository"""
    tree = get_repo_tree()
    if tree is None:
        logging.error("Konnte Repository-Baum nicht abrufen, Update abgebrochen")
        return False

    updated_files = []
    failed_files = []

    for item in tree:
        # Nur Dateien (Blobs) verarbeiten
        if item["type"] != "blob":
            continue

        remote_path = item["path"]
        local_file_path = os.path.join(LOCAL_DIR, remote_path)

        # Lokales Verzeichnis erstellen, falls nicht vorhanden
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)

        # Dateiinhalt von GitHub holen
        remote_content = download_file(remote_path)
        if remote_content is None:
            logging.error(f"Konnte Inhalt für {remote_path} nicht herunterladen, überspringe")
            failed_files.append(remote_path)
            continue

        # SHA validieren
        if not validate_sha(remote_content, item["sha"]):
            logging.error(f"SHA-Validation fehlgeschlagen für {remote_path}, überspringe")
            failed_files.append(remote_path)
            continue

        try:
            if os.path.exists(local_file_path):
                with open(local_file_path, "rb") as f:
                    local_content = f.read()
                # Wenn der Inhalt abweicht, aktualisieren
                if local_content != remote_content:
                    with open(local_file_path, "wb") as f:
                        f.write(remote_content)
                    logging.info(f"Aktualisiert: {remote_path}")
                    updated_files.append(remote_path)
                else:
                    logging.info(f"Unverändert: {remote_path}")
            else:
                # Neue Datei anlegen
                with open(local_file_path, "wb") as f:
                    f.write(remote_content)
                logging.info(f"Hinzugefügt: {remote_path}")
                updated_files.append(remote_path)
        except Exception as e:
            logging.error(f"Fehler beim Verarbeiten von {remote_path}: {str(e)}")
            failed_files.append(remote_path)

    # Update-Zusammenfassung
    if failed_files:
        logging.warning(f"Update teilweise erfolgreich. {len(updated_files)} Dateien aktualisiert, {len(failed_files)} fehlgeschlagen.")
        logging.warning(f"Fehlgeschlagene Dateien: {', '.join(failed_files)}")
        return False
    else:
        logging.info(f"Update erfolgreich. {len(updated_files)} Dateien aktualisiert.")
        return True

def main():
    """Hauptfunktion für das Update"""
    logging.info("Starte Update-Prozess")

    # Backup erstellen
    create_backup()

    # Dateien synchronisieren
    success = sync_files()

    if success:
        logging.info("Update erfolgreich abgeschlossen")
    else:
        logging.warning("Update mit Warnungen abgeschlossen, siehe Log für Details")

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
