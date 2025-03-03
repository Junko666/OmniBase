# MovieBase 🎬
**Your Intelligent Media Catalog System** - A sophisticated web application for managing and analyzing your movie/TV show collection with AI-powered insights.

## Screenshots (Version 1.0)🖼️
| Collection View | Add Title | Settings | AI-Suggestion | Architecture |
|-----------------|-----------|----------|---------------|--------------|
| ![Collection](https://github.com/user-attachments/assets/7146b562-106c-48fc-9dd9-55a8c2309389) | ![Content Details](https://github.com/user-attachments/assets/baf875fb-7884-4098-ae9a-3dc5b1d487ad) | ![Settings](https://github.com/user-attachments/assets/70466e50-2376-426d-8d37-1a6299cadde1) | ![AI Suggestions](https://github.com/user-attachments/assets/845c22f0-1375-4d50-a77f-5909522696db) | ![MovieBase Banner](https://github.com/user-attachments/assets/2d17687f-cac6-4b55-833c-6bbd55372236) |


## Table of Contents 📖
- [Introduction](#introduction-)
- [Screenshots](#screenshots-%EF%B8%8F)
- [Features](#features-)
- [Requirements](#requirements-)
- [Installation](#installation-%EF%B8%8F)
- [Usage](#usage-)
  - [Adding Content](#adding-content-)
  - [CSV Import](#2-csv-import)
  - [AI Suggestions](#ai-suggestions-)
- [Configuration](#configuration-)
- [Developer Notes](#developer-notes-)
- [Architecture](#architecture-)
- [Contributor](#contributor)
- [Version-Update](#versions)

## Introduction 🚀
MovieBase is a comprehensive media management solution that combines traditional collection tracking with modern AI capabilities. Designed for cinephiles and series enthusiasts, it offers:

- Intelligent content categorization
- Cross-platform streaming availability checks
- Personalized recommendation engine
- Advanced viewing habit analytics
- Multi-service import capabilities
- Translation for (German, English, Chinese, French, Spanic, Hindi, Arabic, Russian)

## Features ✨
### Core Functionality
- **Collection Management**
  - Rich metadata support (posters, directors, genres)
  - Precision rating system (0.5-5 stars)
  - Advanced search with filters (genre, year, ratings)
  - Bulk CSV imports (Netflix/Prime Video history)

### Intelligent Features
- **AI Integration**
  - GPT-4o & Gemini Pro recommendations
  - Automated genre analysis
  - Natural language queries
  - Content comparison engine
  - Movie Persona

- **Streaming Intelligence**
  - Real-time availability checks
  - 300+ streaming services coverage
  - Direct watch links
  - Price comparison (subscription vs rental)

### Analytics
- Interactive data visualizations
- Viewing habit reports
- Genre preference evolution
- Cross-service consumption patterns

## Requirements 💻
### System Requirements
- Python 3.8+
- PostgreSQL 12+ (recommended)
- 2GB+ free RAM
- 100MB disk space

### API Keys
| Service | Required | Documentation |
|---------|----------|---------------|
| RapidAPI Streaming Availability | ✓ | [Link](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability) |
| OpenAI GPT-4o | Optional | [Link](https://platform.openai.com) |
| Google Gemini | Optional | [Link](https://aistudio.google.com) |

## Installation ⚙️
```bash
# Clone repository
git clone https://github.com/junko_666/movie_db.git
cd moviebase

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
flask db upgrade

# Start application
flask run --port 16969
```

## Usage 📘
### Adding Content 🎥
#### 1. Manual Entry:
   - Navigate to *Add Title*
   - Fill metadata fields
   - Use automatic API lookup or manual input
   - Save to collection

#### 2. CSV Import:
   ```python
   # Supported Services:
   # - Netflix Viewing History
   # - Amazon Prime Watchlist
   # - Letterboxd Export (COMMING)
   # - IMDb Ratings Export (COMMING)
   # - Disney+ (COMMING)
   ```
   ![CSV Import Demo](https://github.com/user-attachments/assets/71a4068a-393e-4a4f-bc02-e7b27d24cdad)
  For Netflix, follow these instructions: https://help.netflix.com/en/node/101917
  
  For Amazon Prime Video, do following:
  Go to: "https://www.amazon.(de, com, COUNTRY_TLD)/gp/video/mystuff/watchlist/all/ref=atv_mys_wl_tab"
  Open the Webbrowser Console an paste this JavaScript Code. It will download your Watchlist as a csv file, which you can upload to the MovieBase WebUi.
  ```
  function extractWatchlistToCSV() {
    const items = document.querySelectorAll('article[data-card-title]');
    const csvData = [];
    const currentDate = new Date().toISOString().split('T')[0];
    csvData.push('Title,Date');
    items.forEach(item => {
      const title = item.getAttribute('data-card-title');
      csvData.push(`"${title}","${currentDate}"`);
    });
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'watchlist.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  extractWatchlistToCSV();
  ```

### AI Suggestions 🤖
1. Access *AI Suggestions* from menu
2. Set preferences:
   - Content type filter
   - Recommendation count (3-10)
   - Base selection (all/rated content)
3. Describe your mood/preferences
4. Generate & refine suggestions

![AI Suggestions](https://github.com/user-attachments/assets/845c22f0-1375-4d50-a77f-5909522696db)

## Configuration ⚙️
### API Configuration
```python
# settings.json
{
  "streaming_api_key": "your_rapidapi_key",
  "ai_provider": "openai",  # or "gemini"
  "openai_api_key": "sk-your-openai-key",
  "gemini_api_key": "your-gemini-key"
}
```

### Customization Options
- UI Themes (Dark/Light mode)
- Primary color customization
- Rating display styles
- Default view configurations

## Developer Notes 👨💻
### Project Structure
```
/movie_rating_app
├── app.py                # Main application logic
├── /templates           # HTML templates
├── /static              # CSS/JS assets
│   ├── /css
│   └── /js
├── movies.json          # Local database
├── api_cache.json       # API response cache
└── settings.json        # User configurations
```

### Key Dependencies
| Package | Purpose |
|---------|---------|
| Flask | Web framework |
| Pandas | CSV processing |
| Requests | API communication |
| Chart.js | Data visualization |
| FontAwesome | UI icons |

### Contribution Guidelines
1. Fork repository
2. Create feature branch
3. Submit PR with:
   - Detailed description
   - Testing evidence
   - Updated documentation


## Architecture 🔧
![System Diagram](https://github.com/user-attachments/assets/2d17687f-cac6-4b55-833c-6bbd55372236)

## Versions
### Version 1.1
+ Add Titel Entry via API, +Bar chart, +AI Movie Persona generation, +Favorite Titels in Stats, +Watch Trailer Function, +API-Usage Tracker, +Translation for (German, English, Chinese, French, Spanic, Hindi, Arabic, Russian), +Bug-Fix
## Contributor
1. Junko666 | Development Director https://github.com/Junko666
2. Claude 3.7 thinking | UI / Backend
3. OpenAi o3-mini high | Backend
