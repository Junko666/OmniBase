import os
import json
import csv
import requests
import time
from flask import Flask, render_template, request, jsonify, redirect, url_for
from werkzeug.utils import secure_filename
from datetime import datetime
import pandas as pd
import re
from collections import defaultdict
import base64
from openai import OpenAI
from google import genai
from google.genai import types
import subprocess
import sys
from threading import Thread
app = Flask(__name__)

# Konstanten für Dateipfade
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Konstanten für Dateipfade
MOVIES_FILE = os.path.join(BASE_DIR, 'movies.json')
MOVIE_API_CACHE_FILE = os.path.join(BASE_DIR, 'movie_api_cache.json')
SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.json')

# API-Konfiguration
API_KEY = ""
API_HOST = "streaming-availability.p.rapidapi.com"
@app.route('/api/install_update', methods=['POST'])
def install_update():
    """Startet den Update-Prozess und beendet die aktuelle App"""
    try:
        # Starte update.py in einem separaten Prozess
        update_script = os.path.join(BASE_DIR, 'update.py')
        subprocess.Popen([sys.executable, update_script])
        
        # Verzögertes Beenden der App
        def shutdown_server():
            # Gebe dem Update-Prozess Zeit zu starten
            time.sleep(2)
            sys.exit(0)
        
        # Starte Shutdown in einem Thread, damit die Antwort zurückgesendet werden kann
        Thread(target=shutdown_server).start()
        
        return jsonify({'success': True, 'message': 'Update started'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
def load_movies():
    """Lädt Filme aus der JSON-Datei."""
    if os.path.exists(MOVIES_FILE):
        with open(MOVIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_movies(movies):
    """Speichert Filme in der JSON-Datei."""
    with open(MOVIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(movies, f, ensure_ascii=False, indent=4)

def load_api_cache():
    """Lädt API-Cache aus der JSON-Datei."""
    if os.path.exists(MOVIE_API_CACHE_FILE):
        with open(MOVIE_API_CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_api_cache(cache):
    """Speichert API-Cache in der JSON-Datei."""
    with open(MOVIE_API_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=4)

def load_settings():
    """Lädt die Einstellungen aus der JSON-Datei."""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "streaming_api_key": "",
        "ai_provider": "openai",  # Default zu OpenAI
        "openai_api_key": "",
        "gemini_api_key": "",
        "language": "en"  # Standard: Englisch
    }
LANGUAGE_TRANSLATIONS_FILE = os.path.join(BASE_DIR, 'language_translations.json')

def load_translations():
    """Lädt Übersetzungen aus der JSON-Datei."""
    if os.path.exists(LANGUAGE_TRANSLATIONS_FILE):
        with open(LANGUAGE_TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

@app.route('/api/translations', methods=['GET'])
def get_translations():
    """API-Endpunkt zum Abrufen der Übersetzungen."""
    translations = load_translations()
    return jsonify(translations)
def save_settings(settings):
    """Speichert die Einstellungen in der JSON-Datei."""
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=4)

@app.route('/api/movies/search', methods=['GET'])
def search_movie():
    title = request.args.get('title', '')
    if not title:
        return jsonify({'error': 'No title provided'}), 400

    # Prüfe API-Limit
    if not check_api_usage_limit():
        return jsonify({'error': 'API usage limit reached. Please try again later.'}), 429

    # Suche Film in der API
    api_response = search_movie_api(title)
    if not api_response:
        return jsonify({'error': 'No results found'}), 404

    # Verarbeite API-Antwort
    movie_data = process_api_response(api_response)
    if not movie_data:
        return jsonify({'error': 'Could not process API response'}), 500

    return jsonify(movie_data)

def get_ai_answer(message):
    """Holt eine Antwort vom ausgewählten KI-Anbieter."""
    settings = load_settings()

    if settings["ai_provider"] == "gemini":
        return get_gemini_answer(message, settings["gemini_api_key"])
    else:  # Default zu OpenAI
        return get_openai_answer(message, settings["openai_api_key"])

def get_gemini_answer(message, api_key):
    """Holt eine Antwort von Gemini KI."""
    if not api_key:
        return "Kein Gemini API-Schlüssel vorhanden. Bitte richten Sie Ihren API-Schlüssel in den Einstellungen ein."

    try:
        # API-Schlüssel für Gemini setzen
        genai.configure(api_key=api_key)

        client = genai.Client()

        model = "gemini-2.0-flash"
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=message
                    ),
                ],
            ),
        ]
        generate_content_config = types.GenerateContentConfig(
            temperature=1,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
            response_mime_type="text/plain",
        )

        response = client.generate_content(
            model=model,
            contents=contents,
            generation_config=generate_content_config,
        )

        return response.text
    except Exception as e:
        return f"Fehler bei der Verwendung der Gemini API: {str(e)}"

def get_openai_answer(message, api_key):
    """Holt eine Antwort von OpenAI."""
    if not api_key:
        return "Kein OpenAI API-Schlüssel vorhanden. Bitte richten Sie Ihren API-Schlüssel in den Einstellungen ein."

    try:
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du bist ein hilfreicher Assistent."},
                {"role": "user", "content": message}
            ],
            response_format={"type": "text"},
            temperature=1,
            max_tokens=2048,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )

        return response.choices[0].message.content
    except Exception as e:
        return f"Fehler bei der Verwendung der OpenAI API: {str(e)}"

def search_movie_api(title, country="DE"):
    """
    Sucht nach einem Film über die Streaming-Verfügbarkeits-API.
    Gibt die API-Antwort zurück oder None, wenn nichts gefunden wurde.
    """
    # API-Schlüssel aus den Einstellungen holen
    settings = load_settings()
    api_key = settings.get("streaming_api_key", API_KEY)  # Fallback zur Konstante, wenn nicht gesetzt

    # Titel für das Caching normalisieren
    normalized_title = title.lower().strip()

    # Zuerst Cache prüfen
    cache = load_api_cache()
    cache_key = f"{normalized_title}_{country}"

    if cache_key in cache:
        print(f"Verwende Cache-Daten für '{title}'")
        # Prüfe, ob der Cache veraltet ist (älter als 7 Tage)
        cache_time = cache.get(f"{cache_key}_timestamp", 0)
        current_time = datetime.now().timestamp()

        # Cache ist 7 Tage gültig (604800 Sekunden)
        if current_time - cache_time < 604800:
            return cache[cache_key]
        else:
            print(f"Cache für '{title}' ist veraltet, wird aktualisiert...")

    # Vor dem API-Aufruf prüfen, ob genügend Budget vorhanden ist
    if not check_api_usage_limit():
        print(f"API-Limit erreicht! Kann keine Anfrage für '{title}' stellen.")
        return None

    # API-Anfrage stellen
    url = "https://streaming-availability.p.rapidapi.com/shows/search/title"

    querystring = {
        "country": country,
        "title": title,
        "series_granularity": "show"
    }

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": API_HOST
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        if response.status_code == 200:
            data = response.json()
            print(data)
            # API-Nutzungszähler erhöhen
            increment_api_usage()

            # Ergebnis mit Zeitstempel cachen
            cache[cache_key] = data
            cache[f"{cache_key}_timestamp"] = datetime.now().timestamp()
            save_api_cache(cache)
            return data
        else:
            print(f"API-Fehler: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Fehler beim Aufrufen der API: {str(e)}")
        return None
def get_api_usage():
    """Holt die aktuelle API-Nutzungszahl aus settings.json."""
    settings = load_settings()

    # Prüfen, ob ein neuer Monat begonnen hat und ggf. zurücksetzen
    last_reset_month = settings.get("last_reset_month", "")
    current_month = datetime.now().strftime("%Y-%m")

    if last_reset_month != current_month:
        settings["api_usage_count"] = 0
        settings["last_reset_month"] = current_month
        save_settings(settings)
        return 0

    return settings.get("api_usage_count", 0)

def increment_api_usage():
    """Erhöht den API-Nutzungszähler in settings.json."""
    settings = load_settings()
    current_count = settings.get("api_usage_count", 0)
    settings["api_usage_count"] = current_count + 1
    settings["last_reset_month"] = datetime.now().strftime("%Y-%m")
    save_settings(settings)
    return current_count + 1

def check_api_usage_limit(needed_calls=1):
    """
    Prüft, ob genügend API-Budget für die benötigten Aufrufe übrig ist.
    Gibt True zurück, wenn genügend Budget vorhanden ist, sonst False.
    """
    current_count = get_api_usage()
    return current_count + needed_calls <= 1000  # Monatliches Limit

@app.route('/api/api_usage', methods=['GET'])
def get_api_usage_endpoint():
    """Gibt die aktuellen API-Nutzungsstatistiken zurück."""
    current_count = get_api_usage()

    return jsonify({
        "usage_count": current_count,
        "limit": 1000,
        "percentage": (current_count / 1000) * 100
    })
def process_api_response(api_response):
    """Extrahiert relevante Informationen aus der API-Antwort."""
    if not api_response:
        return None

    try:
        # API-Antwort parsen, wenn es ein String ist
        if isinstance(api_response, str):
            try:
                api_data = json.loads(api_response)
            except json.JSONDecodeError:
                print(f"API-Antwort konnte nicht als JSON geparst werden: {api_response[:100]}...")
                return None
        else:
            api_data = api_response

        # Ermitteln, ob wir es mit Cache-Daten oder einer direkten API-Antwort zu tun haben
        if isinstance(api_data, list):
            # Wahrscheinlich aus dem Cache, wo Daten als direkte Liste gespeichert sind
            if len(api_data) == 0:
                return None
            movie_data = api_data[0]  # Erstes Element aus der Liste nehmen
        elif 'results' in api_data and isinstance(api_data['results'], list):
            # Standard-API-Antwort mit einem "results"-Array
            if len(api_data['results']) == 0:
                return None
            movie_data = api_data['results'][0]
        else:
            print(f"Unerwartetes API-Datenformat: {str(api_data)[:100]}...")
            return None

        # Typ bestimmen (Film oder Serie)
        if 'showType' in movie_data:
            # Cache-Format
            content_type = 'series' if movie_data.get('showType') == 'series' else 'movie'
        else:
            # API-Format
            content_type = 'series' if movie_data.get('type') == 'series' else 'movie'

        # Poster-URL aus der entsprechenden Struktur extrahieren
        poster_url = 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster'

        if 'posterURLs' in movie_data:
            # Standard-API-Antwort
            poster_url = (
                movie_data.get('posterURLs', {}).get('300', '') or
                movie_data.get('posterURLs', {}).get('500', '') or
                movie_data.get('posterURLs', {}).get('original', '') or
                poster_url
            )
        elif 'imageSet' in movie_data and 'verticalPoster' in movie_data['imageSet']:
            # Cache-Antwortformat
            vertical_poster = movie_data['imageSet']['verticalPoster']
            poster_url = (
                vertical_poster.get('w480', '') or
                vertical_poster.get('w720', '') or
                vertical_poster.get('w600', '') or
                vertical_poster.get('w360', '') or
                vertical_poster.get('w240', '') or
                poster_url
            )

        # Extrahiere Genres mit Fallback-Mechanismus
        genres = []
        if 'genres' in movie_data and isinstance(movie_data['genres'], list):
            if all(isinstance(g, dict) and 'name' in g for g in movie_data['genres']):
                genres = [genre.get('name', '') for genre in movie_data['genres']]
            else:
                genres = movie_data['genres']
        genre_str = ', '.join(genres) if genres else ''

        # Extrahiere Regisseure
        directors = []
        if 'directors' in movie_data and isinstance(movie_data['directors'], list):
            directors = movie_data['directors']
        directors_str = ', '.join(directors) if directors else ''

        # Jahr extrahieren
        year = movie_data.get('year', movie_data.get('releaseYear', None))

        # IMDB-Bewertung extrahieren
        imdb_rating = movie_data.get('imdbRating', None)
        if imdb_rating is None and 'rating' in movie_data:
            # Verwende den 'rating'-Wert aus dem Cache als Fallback
            try:
                imdb_rating = float(movie_data['rating']) / 10.0 if movie_data['rating'] > 10 else movie_data['rating']
            except (ValueError, TypeError):
                imdb_rating = None

        # Streaming-Informationen extrahieren
        streaming_info = {}

        # Versuche, Streaming-Informationen aus verschiedenen möglichen Strukturen zu extrahieren
        if 'streamingInfo' in movie_data:
            streaming_info = movie_data['streamingInfo']
        elif 'offers' in movie_data:
            # Alternative Struktur könnte ein 'offers'-Feld haben
            offers = movie_data.get('offers', [])
            for offer in offers:
                provider = offer.get('provider', {}).get('name', '').lower()
                if provider:
                    if provider not in streaming_info:
                        streaming_info[provider] = []
                    streaming_info[provider].append({
                        'link': offer.get('url', ''),
                        'type': 'flatrate' if offer.get('type') == 'subscription' else offer.get('type', '')
                    })

        # Informationen extrahieren mit Fallbacks für fehlende Daten
        movie_info = {
            'title': movie_data.get('title', ''),
            'type': content_type,
            'year': year,
            'director': directors_str,
            'genre': genre_str,
            'poster': poster_url,
            'imdbId': movie_data.get('imdbId', ''),
            'tmdbId': movie_data.get('tmdbId', ''),
            'rating': 0,  # Eigene Bewertung wird auf 0 gesetzt (nicht bewertet)
            'imdbRating': imdb_rating,
            'notes': movie_data.get('overview', ''),  # Verwende overview als Notizen
            'streamingInfo': streaming_info  # Streaming-Informationen hinzufügen
        }

        return movie_info
    except Exception as e:
        print(f"Fehler bei der Verarbeitung der API-Antwort: {str(e)}")
        print(f"API-Antwort (gekürzt): {str(api_response)[:500]}...")
        return None

def analyze_netflix_history(file_path):
    """
    Analysiert Netflix-Verlaufsdaten, unterscheidet zwischen Filmen und Serien
    und gruppiert Serien nach Staffeln.

    Args:
        file_path (str): Pfad zur Netflix-Verlaufsdatei (CSV)

    Returns:
        dict: Ein Dictionary mit Listen für 'movies' und 'series'
    """
    # CSV-Datei einlesen
    df = pd.read_csv(file_path)
    titles = df['Title'].tolist()

    # Präfix-Gruppen erstellen (alles vor dem ersten Doppelpunkt)
    prefix_groups = defaultdict(list)
    for title in titles:
        if ':' in title:
            prefix = title.split(':', 1)[0].strip()
            prefix_groups[prefix].append(title)
        else:
            prefix_groups[title].append(title)

    # Identifiziere Serien anhand von Gruppenmerkmalen
    series_dict = {}  # {name: set_of_seasons}
    movies = []       # Liste der Filme

    for prefix, group_titles in prefix_groups.items():
        # Analysiere Gruppenmerkmale
        group_size = len(group_titles)

        # Merkmale für Serienerkennung
        has_multiple_colons = any(title.count(':') >= 2 for title in group_titles)
        has_season_pattern = any(re.search(r'(?:Staffel|Season)\s*\d+', title, re.IGNORECASE) for title in group_titles)
        has_episode_pattern = any(re.search(r'S\d+E\d+', title, re.IGNORECASE) for title in group_titles)
        has_miniserie = any('miniserie' in title.lower() for title in group_titles)
        has_folge = any(re.search(r'(?:Folge|Episode|Kapitel)\s*\d+', title, re.IGNORECASE) for title in group_titles)

        # Extrahiere Staffelinformationen
        seasons = set()
        for title in group_titles:
            # Verschiedene Staffelmuster prüfen
            match = re.search(r'(?:Staffel|Season)\s*(\d+)', title, re.IGNORECASE)
            if match:
                seasons.add(match.group(1))
                continue

            match = re.search(r'S(\d+)E\d+', title, re.IGNORECASE)
            if match:
                seasons.add(match.group(1))
                continue

        # REGEL 1: Gruppen mit 3+ Titeln sind fast immer Serien
        if group_size >= 3:
            is_series = True

        # REGEL 2: Gruppen mit 2 Titeln und Serien-Strukturen sind Serien
        elif group_size == 2 and (has_multiple_colons or has_season_pattern or
                                 has_episode_pattern or has_miniserie or has_folge):
            is_series = True

        # REGEL 3: Einzeltitel mit Staffel- oder Episoden-Mustern sind Serien
        elif group_size == 1 and (has_season_pattern or has_episode_pattern or
                                 has_miniserie or has_folge):
            is_series = True

        # REGEL 4: Komplexe Titelstrukturen mit mehreren Doppelpunkten sind Serien
        elif has_multiple_colons:
            is_series = True

        # REGEL 5: Gemeinsames Format in Titeln deutet auf Episoden hin
        elif group_size >= 2:
            # Prüfe, ob alle Titel nach dem Doppelpunkt ein ähnliches Format haben
            if all(':' in title for title in group_titles):
                # Extrahiere die Teile nach dem ersten Doppelpunkt
                suffixes = [title.split(':', 1)[1].strip() for title in group_titles]

                # Wenn alle Suffixe unterschiedlich sind und ähnliche Länge haben,
                # handelt es sich wahrscheinlich um Episodentitel
                if len(set(suffixes)) == len(suffixes) and \
                   max(len(s) for s in suffixes) - min(len(s) for s in suffixes) < 20:
                    is_series = True
                else:
                    is_series = False
            else:
                is_series = False
        else:
            # Standardfall: Ein Einzeltitel ohne Serienmerkmale ist ein Film
            is_series = False

        # Verarbeite das Ergebnis
        if is_series:
            # Wenn keine Staffeln erkannt wurden, setze Staffel 1 als Standard
            if not seasons:
                seasons.add('1')

            series_dict[prefix] = seasons
        else:
            # Hinzufügen zu den Filmen
            movies.extend(group_titles)

    # Nachbearbeitung: Erkenne übersehene Episoden basierend auf Titelstruktur
    for title in titles:
        # Prüfe, ob dieser Titel bereits klassifiziert wurde
        if any(title.startswith(prefix + ':') for prefix in series_dict.keys()):
            # Bereits implizit als Teil einer Serie klassifiziert
            if title in movies:
                movies.remove(title)
            continue

        if ':' in title and title.count(':') >= 2:
            # Komplexe Titel mit mehreren Doppelpunkten sind fast immer Serien
            prefix = title.split(':', 1)[0].strip()
            if prefix not in series_dict:
                series_dict[prefix] = {'1'}

            # Entferne den Titel aus der Filmliste, falls er dort ist
            if title in movies:
                movies.remove(title)

    # Entferne Duplikate und sortiere
    final_movies = sorted(list(set(movies)))

    # Bereite die Serienausgabe vor
    series_list = []
    for name, seasons in sorted(series_dict.items()):
        seasons_sorted = sorted(seasons, key=lambda x: int(x))
        seasons_str = ', '.join(seasons_sorted)
        series_list.append(f"{name} (Staffel {seasons_str})")

    return_dict = {
        'movies': final_movies,
        'series': series_list
    }
    print(return_dict)
    return return_dict

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/movies', methods=['GET'])
def get_movies():
    movies = load_movies()
    return jsonify(movies)

@app.route('/api/movies', methods=['POST'])
def add_movie():
    data = request.json

    if not data or 'title' not in data:
        return jsonify({'error': 'Titel ist erforderlich'}), 400

    movies = load_movies()

    # Wenn API verwendet wird, Filminformationen abrufen
    if data.get('useApi', False):
        api_response = search_movie_api(data['title'])
        api_data = process_api_response(api_response)

        if api_data:
            # API-Daten mit Benutzereingaben zusammenführen, wobei Benutzereingaben Vorrang haben
            for key, value in api_data.items():
                if key not in data or not data[key]:
                    data[key] = value

    # Eindeutige ID und Zeitstempel hinzufügen
    data['id'] = datetime.now().timestamp()
    data['createdAt'] = datetime.now().isoformat()

    movies.append(data)
    save_movies(movies)

    return jsonify(data), 201

@app.route('/api/movies/<movie_id>', methods=['PUT'])
def update_movie(movie_id):
    data = request.json
    movies = load_movies()

    for i, movie in enumerate(movies):
        if str(movie.get('id')) == movie_id:
            # Wenn API verwendet wird und der Titel geändert wurde, Filminformationen neu abrufen
            if data.get('useApi', False) and data.get('title') != movie.get('title'):
                api_response = search_movie_api(data['title'])
                api_data = process_api_response(api_response)

                if api_data:
                    # API-Daten mit Benutzereingaben zusammenführen, wobei Benutzereingaben Vorrang haben
                    for key, value in api_data.items():
                        if key not in data or not data[key]:
                            data[key] = value

            # Filmdaten aktualisieren
            for key, value in data.items():
                movie[key] = value

            movie['updatedAt'] = datetime.now().isoformat()
            movies[i] = movie
            save_movies(movies)

            return jsonify(movie)

    return jsonify({'error': 'Film nicht gefunden'}), 404

@app.route('/api/movies/<movie_id>', methods=['DELETE'])
def delete_movie(movie_id):
    movies = load_movies()

    for i, movie in enumerate(movies):
        if str(movie.get('id')) == movie_id:
            deleted_movie = movies.pop(i)
            save_movies(movies)
            return jsonify(deleted_movie)

    return jsonify({'error': 'Film nicht gefunden'}), 404

@app.route('/api/import/netflix', methods=['POST'])
def import_netflix():
    if 'file' not in request.files:
        return jsonify({'error': 'Keine Datei vorhanden'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Keine Datei ausgewählt'}), 400

    if file:
        # Hochgeladene Datei temporär speichern
        file_path = os.path.join(os.path.dirname(__file__), 'temp_netflix.csv')
        file.save(file_path)

        try:
            # Datei verarbeiten
            result = analyze_netflix_history(file_path)
            needed_calls = len(result['movies']) + len(result['series'])

            # Prüfen, ob genügend API-Budget vorhanden ist
            if not check_api_usage_limit(needed_calls):
                os.remove(file_path)  # Aufräumen
                return jsonify({
                    'error': 'API-Limit erreicht. Bitte versuchen Sie es im nächsten Monat erneut oder verwenden Sie manuelle Eingabe.'
                })
            # Jeden Filmtitel verarbeiten
            movies = load_movies()
            print(movies)
            imported_count = 0
            skipped_count = 0

            # Verarbeite Filme
            for title in result['movies']:
                # Prüfen, ob Film bereits existiert
                print(title)
                if any(m.get('title') == title for m in movies):
                    skipped_count += 1
                    continue

                # Versuche, Informationen über die API zu erhalten
                api_response = search_movie_api(title)
                api_data = process_api_response(api_response)

                if api_data:
                    # Zusätzliche Felder hinzufügen
                    api_data['id'] = datetime.now().timestamp() + imported_count
                    api_data['createdAt'] = datetime.now().isoformat()
                    api_data['source'] = 'netflix_import'

                    movies.append(api_data)
                    imported_count += 1
                else:
                    # Grundeintrag hinzufügen, wenn API-Daten nicht verfügbar sind
                    movies.append({
                        'title': title,
                        'id': datetime.now().timestamp() + imported_count,
                        'createdAt': datetime.now().isoformat(),
                        'source': 'netflix_import',
                        'rating': 0,
                        'type': 'movie'  # Explizit als Film kennzeichnen
                    })
                    imported_count += 1

                # Kleine Verzögerung, um API-Ratenlimits zu vermeiden
                time.sleep(0.05)

            # Verarbeite Serien
            for series_title in result['series']:
                # Prüfen, ob Serie bereits existiert
                print(series_title)
                if any(m.get('title') == series_title for m in movies):
                    skipped_count += 1
                    continue

                # Bereinigen des Serientitels für die API-Anfrage
                # z.B. "Serienname (Staffel 1, 2)" zu "Serienname"
                clean_title = series_title
                if '(' in series_title:
                    clean_title = series_title.split('(')[0].strip()

                # Versuche, Informationen über die API zu erhalten
                api_response = search_movie_api(clean_title)
                api_data = process_api_response(api_response)

                if api_data:
                    # Zusätzliche Felder hinzufügen
                    api_data['id'] = datetime.now().timestamp() + imported_count
                    api_data['createdAt'] = datetime.now().isoformat()
                    api_data['source'] = 'netflix_import'
                    api_data['title'] = series_title  # Vollständigen Titel mit Staffelinfos beibehalten
                    api_data['type'] = 'series'  # Sicherstellen, dass es als Serie markiert ist

                    movies.append(api_data)
                    imported_count += 1
                else:
                    # Grundeintrag hinzufügen, wenn API-Daten nicht verfügbar sind
                    movies.append({
                        'title': series_title,
                        'id': datetime.now().timestamp() + imported_count,
                        'createdAt': datetime.now().isoformat(),
                        'source': 'netflix_import',
                        'rating': 0,
                        'type': 'series'  # Explizit als Serie kennzeichnen
                    })
                    imported_count += 1

                # Kleine Verzögerung, um API-Ratenlimits zu vermeiden
                time.sleep(0.05)

            # Aktualisierte Filme speichern
            save_movies(movies)

            # Aufräumen
            os.remove(file_path)

            return jsonify({
                'success': True,
                'imported': imported_count,
                'skipped': skipped_count,
                'movies': result['movies'],
                'series': result['series']
            })

        except Exception as e:
            # Aufräumen im Fehlerfall
            if os.path.exists(file_path):
                os.remove(file_path)

            print(f"Fehler beim Importieren des Netflix-Verlaufs: {str(e)}")
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Ungültige Datei'}), 400

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        new_settings = request.json
        # Load current settings and merge with new settings
        try:
            current_settings = load_settings()

            # Only update keys that have a non-empty value in the request
            for key, value in new_settings.items():
                if value != "":  # Only update if value is not an empty string
                    current_settings[key] = value

            save_settings(current_settings)
            return jsonify({"success": True, "message": "Einstellungen erfolgreich gespeichert"})
        except Exception as e:
            return jsonify({"success": False, "message": f"Fehler beim Speichern der Einstellungen: {str(e)}"}), 500
    else:
        # Aktuelle Einstellungen zurückgeben
        try:
            settings = load_settings()
            # API-Schlüssel aus Sicherheitsgründen maskieren
            settings_to_return = settings.copy()
            for key in ["streaming_api_key", "openai_api_key", "gemini_api_key"]:
                if settings_to_return.get(key):
                    settings_to_return[key] = "********"  # Tatsächlichen Schlüssel maskieren
            return jsonify(settings_to_return)
        except Exception as e:
            return jsonify({"success": False, "message": f"Fehler beim Laden der Einstellungen: {str(e)}"}), 500
        
@app.route('/api/ai_suggestions', methods=['POST'])
def get_ai_suggestions():
    data = request.json

    # Extrahiere Anfrageparameter
    selection_mode = data.get('selectionMode', 'all')  # 'all' oder 'rated'
    content_type = data.get('contentType', 'both')     # 'movie', 'series' oder 'both' für Filme
                                                       # 'PC', 'Console' oder 'both' für Spiele
    description = data.get('description', '')          # Beschreibung des Inhalts
    custom_favorites = data.get('favorites', [])       # Vom Benutzer bearbeitete Favoriten
    suggestion_count = data.get('suggestionCount', 5)

    # Überprüfe, ob es sich um eine Spieleanfrage handelt
    is_game_request = content_type in ['PC', 'Console', 'both']

    if not check_api_usage_limit(suggestion_count):
        return jsonify({
            'success': False,
            'message': 'API-Limit erreicht. Bitte versuchen Sie es im nächsten Monat erneut oder reduzieren Sie die Anzahl der Vorschläge.'
        })

    if is_game_request:
        # Für Spieleanfragen
        all_items = load_games()
    else:
        # Für Filmanfragen
        all_items = load_movies()

    # Titel basierend auf Auswahlmodus filtern
    if selection_mode == 'rated':
        selected_items = [item for item in all_items if item.get('rating', 0) > 0]
    else:
        selected_items = all_items

    # Genres und Bewertungen analysieren
    genre_ratings = analyze_genre_ratings(selected_items)

    # Top 10 Lieblings-Titel nach Benutzerbewertung ermitteln
    # Wenn benutzerdefinierte Favoriten übergeben wurden, verwenden wir diese
    if custom_favorites:
        favorite_items = custom_favorites
    else:
        favorite_items = get_favorite_titles(all_items, 10)

    # Bereits gesehene Titel (zum Ausschließen von Vorschlägen)
    watched_items = [item.get('title', '') for item in all_items]

    # Prompt für KI formulieren
    prompt = formulate_suggestion_prompt(
        genre_ratings,
        favorite_items,
        watched_items,
        content_type,
        suggestion_count,
        description,
        is_game_request  # Neuer Parameter, der angibt, ob es sich um eine Spieleanfrage handelt
    )
    print(prompt)

    # KI-Antwort holen
    ai_response = get_ai_answer(prompt)

    # Empfehlungen aus KI-Antwort extrahieren
    recommendations = extract_recommendations(ai_response)

    # Detaillierte Informationen für jede Empfehlung holen
    detailed_recommendations = []
    for rec in recommendations:
        if is_game_request:
            # Für Spieleanfragen
            api_response = search_game_api(rec)
            processed_data = process_game_api_response(api_response)
        else:
            # Für Filmanfragen
            api_response = search_movie_api(rec)
            processed_data = process_api_response(api_response)

        if processed_data:
            detailed_recommendations.append(processed_data)

    return jsonify({
        'success': True,
        'recommendations': detailed_recommendations,
        'favorites': favorite_items,
        'prompt': prompt,  # Für Debug-Zwecke
        'ai_response': ai_response  # Für Debug-Zwecke
    })

def analyze_genre_ratings(titles):
    """
    Analysiert die Genres in den gegebenen Titeln und bewertet sie basierend auf der Anzahl der Einträge.
    Je mehr Einträge ein Genre hat, desto höher ist seine Bewertung (0-5 Sterne).

    Returns:
        dict: Ein Dictionary der Genres mit ihren Bewertungen.
    """
    # Zähle Titel pro Genre
    genre_counts = {}

    for title in titles:
        genres = title.get('genre', '').split(',')
        for genre in genres:
            genre = genre.strip()
            if genre:
                if genre not in genre_counts:
                    genre_counts[genre] = 0

                genre_counts[genre] += 1

    # Wenn keine Genres gefunden wurden, leeres Dictionary zurückgeben
    if not genre_counts:
        return {}

    # Finde die höchste Anzahl von Titeln in einem Genre
    max_count = max(genre_counts.values()) if genre_counts else 0

    # Berechne Bewertungen basierend auf der Anzahl der Einträge
    # Normalisiere auf eine Skala von 0-5 Sternen
    genre_ratings = {}
    for genre, count in genre_counts.items():
        # Wenn max_count > 0, normalisiere zu einem Wert zwischen 0 und 5
        if max_count > 0:
            # Lineare Normalisierung auf Skala 0-5
            rating = round(count / max_count * 5, 1)  # Auf 1 Nachkommastelle runden
            genre_ratings[genre] = rating
        else:
            genre_ratings[genre] = 0

    return genre_ratings

def get_favorite_titles(titles, limit=10):
    """
    Ermittelt die Lieblings-Titel des Benutzers basierend auf seinen Bewertungen.

    Args:
        titles (list): Liste der Titel-Dictionaries
        limit (int): Maximale Anzahl an Favoriten

    Returns:
        list: Liste der Favoriten-Titel-Dictionaries mit Titel und Bewertung
    """
    # Titel mit Bewertung filtern
    rated_titles = [t for t in titles if t.get('rating', 0) > 0]

    # Nach Bewertung sortieren (höchste zuerst)
    sorted_titles = sorted(rated_titles, key=lambda x: x.get('rating', 0), reverse=True)

    # Top N Favoriten zurückgeben
    favorites = []
    for title in sorted_titles[:limit]:
        favorites.append({
            'title': title.get('title', ''),
            'rating': title.get('rating', 0),
            'id': title.get('id', ''),
            'type': title.get('type', 'movie')
        })

    return favorites

def formulate_suggestion_prompt(genre_ratings, favorite_titles, watched_titles, content_type, suggestion_count, description, is_game_request=False):
    """
    Formuliert einen Prompt für die KI, um Film-/Serienempfehlungen oder Spieleempfehlungen zu generieren.

    Returns:
        str: Der formatierte Prompt
    """
    if is_game_request:
        prompt = "I need recommendations for "

        # Inhaltstyp
        if content_type == 'PC':
            prompt += "PC games "
        elif content_type == 'Console':
            prompt += "console games "
        else:
            prompt += "games "

        # Anzahl der Vorschläge
        prompt += f"(please suggest exactly {suggestion_count} titles). "

        # Beschreibung des Benutzers
        if description:
            prompt += f"I'm looking for something about: {description}. "

        # Genre-Präferenzen basierend auf Anzahl der Einträge
        if genre_ratings:
            prompt += "Based on my collection, I seem to prefer these genres (with ratings based on frequency out of 5): "
            genre_items = [f"{genre} ({rating}/5)" for genre, rating in sorted(genre_ratings.items(), key=lambda x: x[1], reverse=True)]
            prompt += ", ".join(genre_items) + ". "

        # Lieblings-Titel
        if favorite_titles:
            prompt += "My favorite games are: "
            fav_items = []
            for title in favorite_titles:
                if isinstance(title, dict) and 'title' in title and 'rating' in title:
                    fav_items.append(f"{title['title']} ({title['rating']}/5)")
                elif isinstance(title, str):
                    fav_items.append(title)
            prompt += ", ".join(fav_items) + ". "

        # Bereits gesehene Titel ausschließen
        if watched_titles:
            prompt += "Please DO NOT recommend any of these games as I've already played them: "
            prompt += ", ".join(watched_titles) + ". "
    else:
        # Bestehender Code für Filmempfehlungen
        prompt = "I need recommendations for "

        # Inhaltstyp
        if content_type == 'movie':
            prompt += "movies "
        elif content_type == 'series':
            prompt += "TV series "
        else:
            prompt += "movies or TV series "

        # Anzahl der Vorschläge
        prompt += f"(please suggest exactly {suggestion_count} titles). "

        # Beschreibung des Benutzers
        if description:
            prompt += f"I'm looking for something about: {description}. "

        # Genre-Präferenzen basierend auf Anzahl der Einträge
        if genre_ratings:
            prompt += "Based on my collection, I seem to prefer these genres (with ratings based on frequency out of 5): "
            genre_items = [f"{genre} ({rating}/5)" for genre, rating in sorted(genre_ratings.items(), key=lambda x: x[1], reverse=True)]
            prompt += ", ".join(genre_items) + ". "

        # Lieblings-Titel
        if favorite_titles:
            prompt += "My favorite titles are: "
            fav_items = [f"{title['title']} ({title['rating']}/5)" for title in favorite_titles]
            prompt += ", ".join(fav_items) + ". "

        # Bereits gesehene Titel ausschließen
        if watched_titles:
            prompt += "Please DO NOT recommend any of these titles as I've already seen them: "
            prompt += ", ".join(watched_titles) + ". "

    # Formatierungsanweisungen (gleich für beide Typen)
    prompt += "Please format your answer ONLY as a JSON object with the following syntax: " \
            "[{\"recomendation_1\":\"title_of_the_recomendation\", \"recomendation_2\":\"title_of_the_recomendation\"}]. " \
            "Do not include any other text or explanations in your response, just the JSON array with exactly the recommendations I asked for."

    return prompt

def extract_recommendations(ai_response):
    """
    Extrahiert die Empfehlungen aus der Antwort der KI.

    Args:
        ai_response (str): Der Antworttext der KI

    Returns:
        list: Eine Liste empfohlener Titel
    """
    try:
        # Versuche, den JSON-Teil der Antwort zu finden und zu parsen
        start_idx = ai_response.find('[')
        end_idx = ai_response.rfind(']') + 1

        if start_idx >= 0 and end_idx > start_idx:
            json_str = ai_response[start_idx:end_idx]
            recommendations_obj = json.loads(json_str)

            # Extrahiere alle Empfehlungswerte
            recommendations = []
            if isinstance(recommendations_obj, list) and len(recommendations_obj) > 0:
                # Wenn es eine Liste von Objekten ist
                for item in recommendations_obj:
                    for key, value in item.items():
                        if key.startswith('recomendation_') and value:
                            recommendations.append(value)
            elif isinstance(recommendations_obj, dict):
                # Wenn es ein einzelnes Objekt ist
                for key, value in recommendations_obj.items():
                    if key.startswith('recomendation_') and value:
                        recommendations.append(value)

            return recommendations
        else:
            # Fallback: Versuche, die gesamte Antwort als JSON zu parsen
            recommendations_obj = json.loads(ai_response)

            # Verarbeite wie oben
            recommendations = []
            if isinstance(recommendations_obj, list):
                for item in recommendations_obj:
                    for key, value in item.items():
                        if key.startswith('recomendation_') and value:
                            recommendations.append(value)
            elif isinstance(recommendations_obj, dict):
                for key, value in recommendations_obj.items():
                    if key.startswith('recomendation_') and value:
                        recommendations.append(value)

            return recommendations

    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error extracting recommendations: {str(e)}")
        print(f"AI response: {ai_response}")

        # Letzter Ausweg: Versuche, Titel manuell mit Regex zu extrahieren
        import re
        matches = re.findall(r'recomendation_\d+\":\s*\"([^\"]+)\"', ai_response)
        if matches:
            return matches

    return []
GAMES_FILE = os.path.join(BASE_DIR, 'games.json')
GAMES_API_CACHE_FILE = os.path.join(BASE_DIR, 'games_api_cache.json')

def load_games():
    """Loads games from the JSON file."""
    if os.path.exists(GAMES_FILE):
        with open(GAMES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_games(games):
    """Saves games to the JSON file."""
    with open(GAMES_FILE, 'w', encoding='utf-8') as f:
        json.dump(games, f, ensure_ascii=False, indent=4)

def load_games_api_cache():
    """Loads games API cache from the JSON file."""
    if os.path.exists(GAMES_API_CACHE_FILE):
        with open(GAMES_API_CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_games_api_cache(cache):
    """Saves games API cache to the JSON file."""
    with open(GAMES_API_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=4)

def search_game_api(title):
    """
    Searches for a game via the RAWG API.
    Returns the API response or None if nothing was found.
    """
    # Get API key from settings
    settings = load_settings()
    api_key = settings.get("rawg_api_key", "")

    if not api_key:
        print("No RAWG API key found in settings")
        return None

    # Normalize title for caching
    normalized_title = title.lower().strip()

    # Check cache first
    cache = load_games_api_cache()
    cache_key = f"{normalized_title}"

    if cache_key in cache:
        print(f"Using cached data for '{title}'")
        # Check if the cache is older than 7 days
        cache_time = cache.get(f"{cache_key}_timestamp", 0)
        current_time = datetime.now().timestamp()

        # Cache is valid for 7 days (604800 seconds)
        if current_time - cache_time < 604800:
            return cache[cache_key]
        else:
            print(f"Cache for '{title}' is outdated, will be updated...")

    # Check API limit before making a request
    if not check_api_usage_limit():
        print(f"API limit reached! Cannot make a request for '{title}'")
        return None

    # Make API request
    url = f"https://api.rawg.io/api/games"

    params = {
        "search": title,
        "key": api_key
    }

    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()

            # Increment API usage counter
            increment_api_usage()

            # Cache the result with timestamp
            cache[cache_key] = data
            cache[f"{cache_key}_timestamp"] = datetime.now().timestamp()
            save_games_api_cache(cache)

            return data
        else:
            print(f"API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error calling the API: {str(e)}")
        return None

def process_game_api_response(api_response):
    """Extracts relevant information from the RAWG API response."""
    if not api_response:
        return None

    try:
        # Parse API response if it's a string
        if isinstance(api_response, str):
            try:
                api_data = json.loads(api_response)
            except json.JSONDecodeError:
                print(f"API response could not be parsed as JSON: {api_response[:100]}...")
                return None
        else:
            api_data = api_response

        # Check if results exist and have data
        if 'results' in api_data and isinstance(api_data['results'], list):
            if len(api_data['results']) == 0:
                return None
            game_data = api_data['results'][0]  # Take the first result
        else:
            print(f"Unexpected API data format: {str(api_data)[:100]}...")
            return None

        # Extract platforms
        platforms = []
        if 'platforms' in game_data and game_data['platforms']:
            for platform_entry in game_data['platforms']:
                if 'platform' in platform_entry and 'name' in platform_entry['platform']:
                    platforms.append(platform_entry['platform']['name'])

        # Extract stores
        stores = []
        if 'stores' in game_data and game_data['stores']:
            for store_entry in game_data['stores']:
                if 'store' in store_entry and 'name' in store_entry['store']:
                    stores.append(store_entry['store']['name'])

        # Extract genres
        genres = []
        if 'genres' in game_data and game_data['genres']:
            for genre in game_data['genres']:
                if 'name' in genre:
                    genres.append(genre['name'])

        # Get the background image or a placeholder
        background_image = game_data.get('background_image', 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image')

        # Extract game info
        game_info = {
            'title': game_data.get('name', ''),
            'slug': game_data.get('slug', ''),
            'release_date': game_data.get('released', ''),
            'platforms': platforms,
            'stores': stores,
            'genre': ', '.join(genres),
            'rating': 0,  # User rating starts at 0
            'rawg_rating': game_data.get('rating', 0),  # Store the RAWG rating
            'background_image': background_image,
            'notes': '',  # No description in the provided example
        }

        return game_info
    except Exception as e:
        print(f"Error processing API response: {str(e)}")
        print(f"API response (shortened): {str(api_response)[:500]}...")
        return None

# API endpoints for games
@app.route('/api/games', methods=['GET'])
def get_games():
    games = load_games()
    return jsonify(games)

@app.route('/api/games', methods=['POST'])
def add_game():
    data = request.json

    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400

    games = load_games()

    # If API is used, get game information
    if data.get('useApi', False):
        api_response = search_game_api(data['title'])
        api_data = process_game_api_response(api_response)

        if api_data:
            # Merge API data with user input, giving precedence to user input
            for key, value in api_data.items():
                if key not in data or not data[key]:
                    data[key] = value

    # Add unique ID and timestamp
    data['id'] = datetime.now().timestamp()
    data['createdAt'] = datetime.now().isoformat()

    games.append(data)
    save_games(games)

    return jsonify(data), 201

@app.route('/api/games/<game_id>', methods=['PUT'])
def update_game(game_id):
    data = request.json
    games = load_games()

    for i, game in enumerate(games):
        if str(game.get('id')) == game_id:
            # If API is used and title has changed, get new information
            if data.get('useApi', False) and data.get('title') != game.get('title'):
                api_response = search_game_api(data['title'])
                api_data = process_game_api_response(api_response)

                if api_data:
                    # Merge API data with user input
                    for key, value in api_data.items():
                        if key not in data or not data[key]:
                            data[key] = value

            # Update game data
            for key, value in data.items():
                game[key] = value

            game['updatedAt'] = datetime.now().isoformat()
            games[i] = game
            save_games(games)

            return jsonify(game)

    return jsonify({'error': 'Game not found'}), 404

@app.route('/api/games/<game_id>', methods=['DELETE'])
def delete_game(game_id):
    games = load_games()

    for i, game in enumerate(games):
        if str(game.get('id')) == game_id:
            deleted_game = games.pop(i)
            save_games(games)
            return jsonify(deleted_game)

    return jsonify({'error': 'Game not found'}), 404

@app.route('/api/games/search', methods=['GET'])
def search_game():
    title = request.args.get('title', '')
    if not title:
        return jsonify({'error': 'No title provided'}), 400

    # Check API limit
    if not check_api_usage_limit():
        return jsonify({'error': 'API usage limit reached. Please try again later.'}), 429

    # Search for the game in the API
    api_response = search_game_api(title)
    if not api_response:
        return jsonify({'error': 'No results found'}), 404

    # Extract first few results for game selection
    try:
        results = api_response.get('results', [])
        if not results:
            return jsonify({'error': 'No results found'}), 404

        # Take up to 5 results
        game_results = []
        for game in results[:5]:
            # Extract platforms
            platforms = []
            if 'platforms' in game and game['platforms']:
                for platform_entry in game['platforms']:
                    if 'platform' in platform_entry and 'name' in platform_entry['platform']:
                        platforms.append(platform_entry['platform']['name'])

            # Extract stores
            stores = []
            if 'stores' in game and game['stores']:
                for store_entry in game['stores']:
                    if 'store' in store_entry and 'name' in store_entry['store']:
                        stores.append(store_entry['store']['name'])

            # Extract genres
            genres = []
            if 'genres' in game and game['genres']:
                for genre in game['genres']:
                    if 'name' in genre:
                        genres.append(genre['name'])

            # Get the background image or a placeholder
            background_image = game.get('background_image', 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image')

            game_info = {
                'id': game.get('id'),
                'title': game.get('name', ''),
                'slug': game.get('slug', ''),
                'release_date': game.get('released', ''),
                'platforms': platforms,
                'stores': stores,
                'genre': ', '.join(genres),
                'rating': 0,
                'rawg_rating': game.get('rating', 0),
                'background_image': background_image
            }

            game_results.append(game_info)

        return jsonify(game_results)

    except Exception as e:
        print(f"Error processing search results: {str(e)}")
        return jsonify({'error': 'Failed to process search results'}), 500
    

@app.route('/api/import/games', methods=['POST'])
def import_games_csv():
    """
    Erwartet eine CSV-Datei (multipart/form-data) mit den Spalten:
      game_title,date
    Für jede Zeile wird der Spieltitel per API gesucht, es wird nur das erste Suchergebnis verwendet,
    und das Ergebnis (ggf. angereichert mit dem CSV-Datum) wird der Games-Collection hinzugefügt.
    """
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400

    try:
        # Falls vorhanden, BOM entfernen (utf-8-sig)
        stream = file.stream.read().decode('utf-8-sig').splitlines()
        reader = csv.DictReader(stream)
    except Exception as e:
        return jsonify({'error': 'CSV parsing error', 'details': str(e)}), 400

    games = load_games()
    imported = 0
    skipped = 0

    for row in reader:
        title = row.get('game_title', '').strip()
        csv_date = row.get('date', '').strip()
        if not title:
            skipped += 1
            continue

        api_response = search_game_api(title)
        if not api_response:
            print(f"No API response for '{title}'")
            skipped += 1
            continue

        game_info = process_game_api_response(api_response)
        if not game_info:
            print(f"Failed to process API response for '{title}'")
            skipped += 1
            continue

        # Optional: Datum aus CSV hinzufügen (z. B. als "csv_date" speichern)
        if csv_date:
            game_info['csv_date'] = csv_date

        # Eindeutige ID und Zeitstempel hinzufügen
        game_info['id'] = datetime.now().timestamp()
        game_info['createdAt'] = datetime.now().isoformat()

        games.append(game_info)
        imported += 1

    save_games(games)
    return jsonify({'success': True, 'imported': imported, 'skipped': skipped})
@app.route('/api/ask_ai', methods=['POST'])
def ask_ai():
    data = request.json
    message = data.get('message')

    if not message:
        return jsonify({"success": False, "message": "Keine Nachricht angegeben"}), 400

    try:
        print("AI Prompt:"+message)
        answer = get_ai_answer(message)
        print("AI Answer: "+answer)
        return jsonify({"success": True, "answer": answer})
    except Exception as e:
        return jsonify({"success": False, "message": f"Fehler beim Abrufen der KI-Antwort: {str(e)}"}), 500

def get_tracks_from_csv(file_path):
    tracks = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            track = f"{row['Track Name']} {row['Artist Name(s)']}"
            tracks.append(track)
    return tracks
import os
import json
import csv
import requests
import base64

# Spotify API Zugangsdaten

# Verzeichnis der aktuellen Python-Datei
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_access_token(client_id, client_secret):
    token_url = "https://accounts.spotify.com/api/token"
    auth_str = f"{client_id}:{client_secret}"
    b64_auth_str = base64.b64encode(auth_str.encode()).decode()
    headers = {
        "Authorization": f"Basic {b64_auth_str}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    response = requests.post(token_url, headers=headers, data=data)
    response.raise_for_status()
    return response.json()['access_token']

def search_track(token, query):
    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "type": "track",
        "limit": 1
    }
    response = requests.get(search_url, headers=headers, params=params)
    response.raise_for_status()
    reqjson = response.json()
    print(reqjson)
    return reqjson

def get_artist_data(token, artist_id):
    url = f"https://api.spotify.com/v1/artists/{artist_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    reqjson = response.json()
    print(reqjson)
    return reqjson

def load_cache(filename):
    path = os.path.join(BASE_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(filename, data):
    path = os.path.join(BASE_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def select_best_image(images):
    if not images:
        return None
    # Wähle das Bild mit maximaler Breite
    best = max(images, key=lambda x: x.get('width', 0))
    return best.get('url')
@app.route('/api/import/music', methods=['POST'])
def import_music_csv():
    """
    Verarbeitet eine hochgeladene Musik-CSV-Datei.
    Erwartet Spalten: "Track Name" und "Artist Name(s)"

    Gibt eine JSON-Antwort zurück mit dem Status und der Anzahl importierter Tracks.
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if file and file.filename.endswith('.csv'):
        # Hochgeladene Datei temporär speichern
        file_path = os.path.join(BASE_DIR, 'temp_music.csv')
        file.save(file_path)

        try:
            # get_trackinfo Funktion mit dem Dateipfad aufrufen
            track_infos = get_trackinfo(file_path=file_path)

            # Erfolgsantwort mit Anzahl der importierten Tracks
            return jsonify({
                'success': True,
                'imported': len(track_infos),
                'message': f'Successfully imported {len(track_infos)} music tracks'
            })

        except Exception as e:
            return jsonify({'success': False, 'message': f'Error processing file: {str(e)}'}), 500

        finally:
            # Temporäre Datei nach der Verarbeitung löschen
            if os.path.exists(file_path):
                os.remove(file_path)

    else:
        return jsonify({'success': False, 'message': 'Invalid file format. Please upload a CSV file.'}), 400
@app.route('/music_tracks.json')
def get_music_tracks():
    """API-Endpunkt zum Abrufen der Music Tracks."""
    music_tracks_file = os.path.join(BASE_DIR, 'music_tracks.json')
    if os.path.exists(music_tracks_file):
        with open(music_tracks_file, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])
def get_trackinfo(file_path=None, download=False, track_name=""):
    # Cache-Dateien und Ausgabedatei im BASE_DIR
    music_api_cache_file = "music_api_cache.json"
    artist_cache_file = "spotify_artists_api_cache.json"
    output_file = "music_tracks.json"  # Korrigiert von "music_tacks.json"

    music_api_cache = load_cache(music_api_cache_file)
    artist_cache = load_cache(artist_cache_file)

    try:
        # API-Schlüssel aus den Einstellungen holen
        settings = load_settings()
        SPOTIFY_CLIENT_ID = settings.get("spotify_client_id", "")
        SPOTIFY_CLIENT_SECRET = settings.get("spotify_client_secret", "")
        token = get_access_token(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    except Exception as e:
        print(f"Fehler beim Abruf des Tokens: {e}")
        return []

    # CSV-Datei mit den Track-Queries
    if file_path:
        track_queries = get_tracks_from_csv(file_path)
    elif track_name:
        track_queries = [track_name]
    else:
        return []

    all_track_infos = []

    for query in track_queries:
        # API-Anfrage cachen und sofort abspeichern
        if query in music_api_cache and not download:
            search_result = music_api_cache[query]
        else:
            try:
                search_result = search_track(token, query)
                music_api_cache[query] = search_result
                save_cache(music_api_cache_file, music_api_cache)
            except Exception as e:
                print(f"Fehler bei der Suchanfrage für '{query}': {e}")
                continue

        items = search_result.get("tracks", {}).get("items", [])
        if not items:
            print(f"Kein Treffer für: {query}")
            continue

        track_data = items[0]
        track_info = {
            "query": query,
            "track_id": track_data.get("id"),
            "track_name": track_data.get("name"),
            "track_spotify_link": track_data.get("external_urls", {}).get("spotify"),
            "popularity": track_data.get("popularity")
        }

        # Album-Informationen
        album = track_data.get("album", {})
        album_info = {
            "album_name": album.get("name"),
            "album_spotify_link": album.get("external_urls", {}).get("spotify"),
            "album_image": select_best_image(album.get("images", []))
        }
        track_info["album"] = album_info

        # Künstler-Informationen
        artists_info = []
        for artist in track_data.get("artists", []):
            artist_id = artist.get("id")
            if artist_id in artist_cache and not download:
                artist_data = artist_cache[artist_id]
            else:
                try:
                    artist_data = get_artist_data(token, artist_id)
                    artist_cache[artist_id] = artist_data
                    save_cache(artist_cache_file, artist_cache)
                except Exception as e:
                    print(f"Fehler bei der Künstleranfrage für ID '{artist_id}': {e}")
                    continue
            artist_info = {
                "artist_id": artist_id,
                "artist_name": artist.get("name"),
                "artist_spotify_link": artist.get("external_urls", {}).get("spotify"),
                "genres": artist_data.get("genres", []),
                "artist_image": select_best_image(artist_data.get("images", []))
            }
            artists_info.append(artist_info)
        track_info["artists"] = artists_info

        all_track_infos.append(track_info)

    # Bei Vorschlagsanfragen (track_name ist gesetzt, file_path nicht)
    # nur Ergebnisse zurückgeben, ohne die Datei zu überschreiben
    if track_name and not file_path:
        return all_track_infos

    # Nur bei einem Import (file_path ist gesetzt) die Datei aktualisieren
    output_path = os.path.join(BASE_DIR, output_file)
    existing_tracks = []
    if os.path.exists(output_path):
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                existing_tracks = json.load(f)
        except Exception as e:
            print(f"Fehler beim Laden bestehender Tracks: {e}")

    # Bei einem Import alle neuen Tracks hinzufügen (keine Duplikate)
    if file_path:
        existing_track_ids = set(track.get('track_id') for track in existing_tracks if track.get('track_id'))

        for track in all_track_infos:
            if track.get('track_id') and track.get('track_id') not in existing_track_ids:
                existing_tracks.append(track)
                existing_track_ids.add(track.get('track_id'))

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(existing_tracks, f, indent=2)

        return existing_tracks

    return all_track_infos
@app.route('/api/add_game', methods=['POST'])
def add_game_endpoint():
    try:
        # Get the game data from the request
        game_data = request.json
        
        if not game_data:
            return jsonify({'success': False, 'message': 'No game data provided'}), 400
        
        # Load existing games
        games = load_games()
        
        # Add the new game to the collection with a unique ID
        if 'id' not in game_data:
            game_data['id'] = datetime.now().timestamp()
        if 'createdAt' not in game_data:
            game_data['createdAt'] = datetime.now().isoformat()
        
        games.append(game_data)
        save_games(games)
        
        return jsonify({'success': True, 'game': game_data})
    
    except Exception as e:
        import traceback
        print(f"Error adding game: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f"Error: {str(e)}"}), 500
@app.route('/api/music_suggestions', methods=['POST'])
def get_music_suggestions():
    try:
        data = request.json

        description = data.get('description', '')
        suggestion_count = data.get('suggestionCount', 5)
        suggestion_type = data.get('suggestionType', 'similar')

        # Get all tracks
        music_tracks_file = os.path.join(BASE_DIR, 'music_tracks.json')
        tracks = []
        if os.path.exists(music_tracks_file):
            try:
                with open(music_tracks_file, 'r', encoding='utf-8') as f:
                    tracks = json.load(f)
                print(f"Successfully loaded {len(tracks)} tracks")
            except Exception as e:
                print(f"Error loading music tracks: {str(e)}")
                tracks = []

        # Extract information for AI prompt
        artists = {}
        genres = {}

        for track in tracks:
            if track.get('artists'):
                for artist in track['artists']:
                    artist_name = artist.get('artist_name', '')
                    if artist_name:
                        artists[artist_name] = artists.get(artist_name, 0) + 1

                    if artist.get('genres'):
                        for genre in artist['genres']:
                            genres[genre] = genres.get(genre, 0) + 1

        # Create AI prompt
        prompt = f"I need recommendations for {suggestion_count} music tracks that I might enjoy."

        if description:
            prompt += f" I'm looking for music that is: {description}."

        # Add genre preferences
        if genres:
            top_genres = sorted(genres.items(), key=lambda x: x[1], reverse=True)[:10]
            prompt += " Based on my collection, my top genres are: "
            prompt += ", ".join([genre for genre, _ in top_genres])
            prompt += "."

        # Add artist preferences
        if artists:
            top_artists = sorted(artists.items(), key=lambda x: x[1], reverse=True)[:10]
            prompt += " My favorite artists include: "
            prompt += ", ".join([artist for artist, _ in top_artists])
            prompt += "."

        # Format instructions
        prompt += " Please format your answer ONLY as a JSON object with the following syntax: "
        prompt += "[{\"track\":\"track_name\", \"artist\":\"artist_name\"}]. "
        prompt += "Do not include any other text or explanations in your response, just the JSON array with exactly the recommendations I asked for."

        # Get AI response
        try:
            print("AI Prompt: " + prompt)
            ai_response = get_ai_answer(prompt)
            print("AI Response: " + ai_response)

            # Extract recommendations from AI response
            recommendations = []
            try:
                # Find JSON array in response
                import re
                json_match = re.search(r'\[[\s\S]*\]', ai_response)
                if json_match:
                    recommendations = json.loads(json_match.group(0))
                else:
                    print("No JSON array found in AI response")
                    # Try direct parsing if it's already a JSON
                    try:
                        recommendations = json.loads(ai_response)
                        if isinstance(recommendations, dict):
                            # Convert single dict to list if needed
                            recommendations = [recommendations]
                    except:
                        print("Failed to parse AI response as direct JSON")
            except Exception as e:
                print(f"Failed to parse AI response: {str(e)}")
                return jsonify({'success': False, 'error': f'Failed to parse AI response: {str(e)}'}), 500

            # Ensure we have valid recommendations
            if not recommendations or not isinstance(recommendations, list):
                return jsonify({'success': False, 'error': 'No valid recommendations generated'}), 500

            # Get track info for each recommendation
            track_results = []
            for rec in recommendations:
                if isinstance(rec, dict):
                    track_name = rec.get('track', '')
                    artist_name = rec.get('artist', '')

                    if track_name and artist_name:
                        query = f"{track_name} {artist_name}"
                        track_info = get_trackinfo(track_name=query)

                        if track_info and len(track_info) > 0:
                            track_results.append(track_info[0])

            return jsonify({
                'success': True,
                'recommendations': track_results,
                'prompt': prompt,
                'ai_response': ai_response
            })
        except Exception as e:
            import traceback
            print(f"Error in AI processing: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'success': False, 'error': f'Error in AI processing: {str(e)}'}), 500
    except Exception as e:
        import traceback
        print(f"Error in music suggestions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': f'General error: {str(e)}'}), 500
    
@app.route('/api/add_track', methods=['POST'])
def add_track_endpoint():
    try:
        # Get the track data from the request
        track_data = request.json

        if not track_data:
            return jsonify({'success': False, 'message': 'No track data provided'}), 400

        # Load existing tracks
        music_tracks_file = os.path.join(BASE_DIR, 'music_tracks.json')
        tracks = []
        if os.path.exists(music_tracks_file):
            with open(music_tracks_file, 'r', encoding='utf-8') as f:
                tracks = json.load(f)

        # Check if track already exists by track_id
        track_id = track_data.get('track_id')
        if track_id:
            # Check if track already exists
            if any(track.get('track_id') == track_id for track in tracks):
                return jsonify({'success': False, 'message': 'Track already exists in your collection'}), 200

        # Add the new track to the collection
        tracks.append(track_data)

        # Save the updated collection
        with open(music_tracks_file, 'w', encoding='utf-8') as f:
            json.dump(tracks, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'message': 'Track added to collection successfully'})

    except Exception as e:
        import traceback
        print(f"Error adding track: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f"Error: {str(e)}"}), 500
if __name__ == '__main__':
    infos = get_trackinfo(download=False)
    print(json.dumps(infos, indent=2))

# Beispielaufruf:
# tracks_list = get_tracks_from_csv("deine_datei.csv")
# print(tracks_list)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=16969)
    #print(get_ai_answer("Test 1234"))
    #rint(get_tracks_from_csv("/root/project_omnibase/180_puls.csv"))
