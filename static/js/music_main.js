// music_main.js - Hauptdatei für Musik-Funktionalität

// Globale Variablen
let musicTracks = [];
let currentPage = 1;
const itemsPerPage = 10;

// Event-Listener hinzufügen, wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', function() {
  // Initialisiere Musik-Funktionalitäten
  initMusicCollection();
  initMusicAddTitle();
  initMusicStats();
  initMusicAiSuggestions();
  
  // Lade Musik-Tracks aus JSON-Datei
  loadMusicTracks();
});

// Lädt Musikdaten aus JSON-Datei
function loadMusicTracks() {
    fetch('/music_tracks.json')
      .then(response => response.json())
      .then(data => {
        musicTracks = data;
        console.log(musicTracks);
        displayMusicTracks();
        updateMusicFilters();
        
        // Aktualisiere Statistiken und AI-Vorschläge
        if (typeof updateMusicStats === 'function') updateMusicStats();
        if (typeof loadMusicGenreAnalysis === 'function') loadMusicGenreAnalysis();
        if (typeof loadMusicFavorites === 'function') loadMusicFavorites();
      })
      .catch(error => {
        console.error('Error loading music tracks:', error);
        showMusicErrorMessage('Failed to load music tracks. Please try again later.');
      });
  }

// Zeigt eine Fehlermeldung an
function showMusicErrorMessage(message) {
  // Implementation
  console.error(message);
}

// Collection Section Funktionen
function initMusicCollection() {
  // Event-Listener für Suchfeld
  const searchInput = document.getElementById('musicSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterMusicTracks();
    });
  }
  
  // Event-Listener für Filter-Toggle
  const filterToggle = document.getElementById('musicFilterToggle');
  const filterOptions = document.getElementById('musicFilterOptions');
  if (filterToggle && filterOptions) {
      filterToggle.addEventListener('click', function() {
          filterOptions.classList.toggle('hidden');
      });
  }
  
  // Event-Listener für Reset-Filter-Button
  const resetFiltersBtn = document.getElementById('resetMusicFilters');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetMusicFilters);
  }
  
  // Event-Listener für Navigation
  const prevBtn = document.getElementById('musicPrevBtn');
  const nextBtn = document.getElementById('musicNextBtn');
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        displayMusicTracks();
      }
    });
    
    nextBtn.addEventListener('click', function() {
      const totalPages = Math.ceil(getFilteredMusicTracks().length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayMusicTracks();
      }
    });
  }
}

function displayMusicTracks() {
  const musicContainer = document.getElementById('musicContainer');
  const emptyState = document.getElementById('musicEmptyState');
  const navigation = document.getElementById('musicNavigation');
  
  if (!musicContainer) return;
  
  // Filtere Tracks basierend auf Suchbegriff und Filtern
  const filteredTracks = getFilteredMusicTracks();
  
  // Leere den Container
  musicContainer.innerHTML = '';
  
  // Zeige Empty State, wenn keine Tracks vorhanden sind
  if (filteredTracks.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (navigation) navigation.classList.add('hidden');
    return;
  }
  
  // Verstecke Empty State und zeige Navigation
  if (emptyState) emptyState.classList.add('hidden');
  if (navigation) navigation.classList.remove('hidden');
  
  // Berechne Paginierung
  const totalPages = Math.ceil(filteredTracks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTracks.length);
  
  // Aktualisiere Paginierungs-Anzeige
  const currentIndexEl = document.getElementById('musicCurrentIndex');
  const totalTracksEl = document.getElementById('musicTotalTracks');
  if (currentIndexEl) currentIndexEl.textContent = currentPage;
  if (totalTracksEl) totalTracksEl.textContent = totalPages;
  
  // Zeige nur die Tracks für die aktuelle Seite an
  const tracksToDisplay = filteredTracks.slice(startIndex, endIndex);
  
  // Erstelle Musik-Karten
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  
  tracksToDisplay.forEach(track => {
    grid.appendChild(createMusicCard(track));
  });
  
  musicContainer.appendChild(grid);
}
function createMusicCard(track) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden transition-all duration-300 hover:shadow-lg';
  
  // Bestimme die primäre Künstlerinfo
  const primaryArtist = track.artists && track.artists.length > 0 ? track.artists[0] : null;
  const artistImage = primaryArtist && primaryArtist.artist_image ? primaryArtist.artist_image : 'https://placehold.co/200x200/e2e8f0/1e293b?text=No+Image';
  const albumImage = track.album && track.album.album_image ? track.album.album_image : 'https://placehold.co/300x300/e2e8f0/1e293b?text=No+Album+Cover';
  
  // Extrahiere Genres aus allen Künstlern
  const allGenres = [];
  if (track.artists) {
    track.artists.forEach(artist => {
      if (artist.genres) {
        allGenres.push(...artist.genres);
      }
    });
  }
  // Entferne Duplikate
  const uniqueGenres = [...new Set(allGenres)];
  const genreText = uniqueGenres.slice(0, 3).join(', ') + (uniqueGenres.length > 3 ? '...' : '');
  
  // Künstlernamen zusammenfügen
  const artistNames = track.artists ? track.artists.map(artist => artist.artist_name).join(', ') : 'Unknown Artist';
  
  // Card-Inhalt erstellen mit zusätzlichem [+] Button
  card.innerHTML = `
    <div class="md:flex">
      <div class="md:w-1/3 relative">
        <img src="${albumImage}" alt="Album Cover" class="h-40 w-full object-cover">
        <div class="absolute bottom-0 right-0 m-2 flex space-x-2">
          <a href="${track.track_spotify_link}" target="_blank" class="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors">
            <i class="fab fa-spotify"></i>
          </a>
          <button class="add-track-btn bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors" 
                  title="Add to Collection" data-track='${JSON.stringify(track)}'>
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="p-4 md:w-2/3">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">${track.track_name}</h3>
        <div class="flex items-center mt-1">
          <div class="w-6 h-6 rounded-full overflow-hidden mr-2">
            <img src="${artistImage}" alt="${primaryArtist ? primaryArtist.artist_name : 'Artist'}" class="w-full h-full object-cover">
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 truncate">${artistNames}</p>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span class="block truncate">${track.album ? track.album.album_name : 'Unknown Album'}</span>
        </p>
        <div class="mt-2 flex items-center">
          <div class="bg-gray-200 dark:bg-gray-600 h-2 rounded-full w-full">
            <div class="bg-green-500 h-2 rounded-full" style="width: ${track.popularity}%"></div>
          </div>
          <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">${track.popularity}%</span>
        </div>
        <div class="mt-2">
          <span class="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full">${genreText || 'No genres'}</span>
        </div>
      </div>
    </div>
  `;
  
  // Event-Listener für den Add-Button
  const addButton = card.querySelector('.add-track-btn');
  if (addButton) {
    addButton.addEventListener('click', function() {
      const trackData = JSON.parse(this.getAttribute('data-track'));
      addTrackToCollection(trackData);
    });
  }
  
  return card;
}
function addTrackToCollection(track) {
  console.log('Adding track to collection:', track);
  
  // Clone the track to avoid reference issues
  const trackData = JSON.parse(JSON.stringify(track));
  
  fetch('/api/add_track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(trackData)
  })
  .then(response => {
    if (!response.ok && response.status !== 200) {
      console.error('Server error:', response.status);
      throw new Error('Failed to add track');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      showNotification('Track added to your collection!');
      // Reload music tracks
      loadMusicTracks();
    } else {
      showNotification(data.message || 'Track could not be added', 'warning');
    }
  })
  .catch(error => {
    console.error('Error adding track:', error);
    showNotification('Error adding track to collection', 'error');
  });
}
function getFilteredMusicTracks() {
  if (!musicTracks.length) return [];
  
  const searchInput = document.getElementById('musicSearchInput');
  const artistFilter = document.getElementById('artistFilter');
  const genreFilter = document.getElementById('genreFilter');
  const popularityFilter = document.getElementById('popularityFilter');
  
  // Hole Filterwerte
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedArtist = artistFilter ? artistFilter.value : '';
  const selectedGenre = genreFilter ? genreFilter.value : '';
  const selectedPopularity = popularityFilter ? parseInt(popularityFilter.value) || 0 : 0;
  
  // Filtere Tracks
  return musicTracks.filter(track => {
    // Suche im Tracknamen, Album und Künstlern
    const trackName = track.track_name ? track.track_name.toLowerCase() : '';
    const albumName = track.album && track.album.album_name ? track.album.album_name.toLowerCase() : '';
    let artistNames = '';
    
    if (track.artists) {
      artistNames = track.artists.map(artist => artist.artist_name.toLowerCase()).join(' ');
    }
    
    const matchesSearch = !searchTerm || 
      trackName.includes(searchTerm) || 
      albumName.includes(searchTerm) || 
      artistNames.includes(searchTerm);
    
    // Filter für Künstler
    const matchesArtist = !selectedArtist || (track.artists && track.artists.some(artist => 
      artist.artist_name === selectedArtist
    ));
    
    // Filter für Genres
    const matchesGenre = !selectedGenre || (track.artists && track.artists.some(artist => 
      artist.genres && artist.genres.includes(selectedGenre)
    ));
    
    // Filter für Popularität
    const matchesPopularity = !selectedPopularity || track.popularity >= selectedPopularity;
    
    return matchesSearch && matchesArtist && matchesGenre && matchesPopularity;
  });
}

function filterMusicTracks() {
  currentPage = 1; // Zurück zur ersten Seite
  displayMusicTracks();
}

function updateMusicFilters() {
  const artistFilter = document.getElementById('artistFilter');
  const genreFilter = document.getElementById('genreFilter');
  
  if (!musicTracks.length) return;
  
  // Sammle alle Künstler und Genres
  const artists = new Set();
  const genres = new Set();
  
  musicTracks.forEach(track => {
    if (track.artists) {
      track.artists.forEach(artist => {
        artists.add(artist.artist_name);
        
        if (artist.genres) {
          artist.genres.forEach(genre => genres.add(genre));
        }
      });
    }
  });
  
  // Aktualisiere Künstler-Filter
  if (artistFilter) {
    // Aktuelle Auswahl speichern
    const currentSelection = artistFilter.value;
    
    // Leere und fülle das Dropdown
    artistFilter.innerHTML = '<option value="">All Artists</option>';
    
    Array.from(artists).sort().forEach(artist => {
      const option = document.createElement('option');
      option.value = artist;
      option.textContent = artist;
      artistFilter.appendChild(option);
    });
    
    // Stelle die Auswahl wieder her
    if (currentSelection && artists.has(currentSelection)) {
      artistFilter.value = currentSelection;
    }
  }
  
  // Aktualisiere Genre-Filter
  if (genreFilter) {
    // Aktuelle Auswahl speichern
    const currentSelection = genreFilter.value;
    
    // Leere und fülle das Dropdown
    genreFilter.innerHTML = '<option value="">All Genres</option>';
    
    Array.from(genres).sort().forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    });
    
    // Stelle die Auswahl wieder her
    if (currentSelection && genres.has(currentSelection)) {
      genreFilter.value = currentSelection;
    }
  }
}

function resetMusicFilters() {
  const searchInput = document.getElementById('musicSearchInput');
  const artistFilter = document.getElementById('artistFilter');
  const genreFilter = document.getElementById('genreFilter');
  const popularityFilter = document.getElementById('popularityFilter');
  
  if (searchInput) searchInput.value = '';
  if (artistFilter) artistFilter.value = '';
  if (genreFilter) genreFilter.value = '';
  if (popularityFilter) popularityFilter.value = '';
  
  filterMusicTracks();
}

// Add Title Section Funktionen
function initMusicAddTitle() {
  // Tab-Wechsel-Funktionalität
  const csvTabBtn = document.getElementById('musicCsvTabBtn');
  const manualTabBtn = document.getElementById('musicManualTabBtn');
  const csvForm = document.getElementById('musicCsvForm');
  const manualForm = document.getElementById('musicManualForm');
  
  if (csvTabBtn && manualTabBtn && csvForm && manualForm) {
    csvTabBtn.addEventListener('click', function() {
      csvTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
      csvTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
      
      manualTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
      manualTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
      
      csvForm.classList.remove('hidden');
      manualForm.classList.add('hidden');
    });
    
    manualTabBtn.addEventListener('click', function() {
      manualTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
      manualTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
      
      csvTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
      csvTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
      
      manualForm.classList.remove('hidden');
      csvForm.classList.add('hidden');
    });
  }
  
  // CSV Upload-Funktionalität
  const dropZone = document.getElementById('musicDropZone');
  const csvInput = document.getElementById('musicCsvFile');
  const browseBtn = document.getElementById('musicBrowseBtn');
  const selectedFileName = document.getElementById('musicSelectedFileName');
  const importBtn = document.getElementById('musicImportBtn');
  
  if (dropZone && csvInput && browseBtn && selectedFileName && importBtn) {
    // Drag & Drop-Funktionalität
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('border-indigo-300', 'dark:border-indigo-700', 'bg-indigo-50', 'dark:bg-indigo-900/50');
    });
    
    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('border-indigo-300', 'dark:border-indigo-700', 'bg-indigo-50', 'dark:bg-indigo-900/50');
    });
    
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-300', 'dark:border-indigo-700', 'bg-indigo-50', 'dark:bg-indigo-900/50');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        csvInput.files = files;
        handleCsvFileSelect();
      }
    });
    
    // Klick auf Browse-Button
    browseBtn.addEventListener('click', function() {
      csvInput.click();
    });
    
    // Dateiauswahl-Event
    csvInput.addEventListener('change', handleCsvFileSelect);
    
    // Import-Button
    importBtn.addEventListener('click', uploadMusicCsv);
  }
  
  // Manuelles Hinzufügen von Musik
  const addMusicForm = document.getElementById('addMusicForm');
  if (addMusicForm) {
    addMusicForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addMusicTrack();
    });
  }
}

function handleCsvFileSelect() {
  const csvInput = document.getElementById('musicCsvFile');
  const selectedFileName = document.getElementById('musicSelectedFileName');
  const importBtn = document.getElementById('musicImportBtn');
  
  if (csvInput && csvInput.files.length > 0) {
    const file = csvInput.files[0];
    
    // Überprüfe, ob es sich um eine CSV-Datei handelt
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file.');
      csvInput.value = '';
      return;
    }
    
    // Zeige den Dateinamen an
    if (selectedFileName) {
      selectedFileName.textContent = file.name;
      selectedFileName.classList.remove('hidden');
    }
    
    // Aktiviere den Import-Button
    if (importBtn) {
      importBtn.disabled = false;
    }
  }
}

function uploadMusicCsv() {
  const csvInput = document.getElementById('musicCsvFile');
  const importBtn = document.getElementById('musicImportBtn');
  
  if (!csvInput || csvInput.files.length === 0) {
    alert('Please select a CSV file first.');
    return;
  }
  
  // Deaktiviere den Button während des Uploads
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.textContent = 'Uploading...';
  }
  
  const formData = new FormData();
  formData.append('file', csvInput.files[0]);
  
  // Sende die Datei an den Server
  fetch('/api/import/music', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert(`Successfully imported music tracks: ${data.imported}`);
      loadMusicTracks(); // Lade die Tracks neu
    } else {
      alert(`Error: ${data.message || 'Unknown error occurred'}`);
    }
  })
  .catch(error => {
    console.error('Error uploading CSV:', error);
    alert('Failed to upload CSV file. Please try again.');
  })
  .finally(() => {
    // Setze das Formular zurück
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.textContent = 'Import Music';
    }
    
    csvInput.value = '';
    const selectedFileName = document.getElementById('musicSelectedFileName');
    if (selectedFileName) {
      selectedFileName.classList.add('hidden');
    }
  });
}

// Stats- und AI-Funktionen - Implementierung gekürzt, würden ähnlich wie die Collection-Funktionen aufgebaut sein
function initMusicStats() {
  // Chart.js für Diagramme
  const pieChartBtn = document.getElementById('musicPieChartBtn');
  const barChartBtn = document.getElementById('musicBarChartBtn');
  
  if (pieChartBtn && barChartBtn) {
    pieChartBtn.addEventListener('click', function() {
      pieChartBtn.classList.add('bg-indigo-600', 'text-white');
      pieChartBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
      
      barChartBtn.classList.remove('bg-indigo-600', 'text-white');
      barChartBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
      
      updateMusicGenreChart('pie');
    });
    
    barChartBtn.addEventListener('click', function() {
      barChartBtn.classList.add('bg-indigo-600', 'text-white');
      barChartBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
      
      pieChartBtn.classList.remove('bg-indigo-600', 'text-white');
      pieChartBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
      
      updateMusicGenreChart('bar');
    });
  }
  
  // Music Persona Generator
  const generateMusicPersonaBtn = document.getElementById('generateMusicPersonaBtn');
  if (generateMusicPersonaBtn) {
    generateMusicPersonaBtn.addEventListener('click', generateMusicPersona);
  }
}
function updateMusicStats() {
    if (!musicTracks || musicTracks.length === 0) {
      console.log("No music tracks available");
      return;
    }
  
    // Statistik-Elemente finden
    const trackCountEl = document.getElementById('trackCount');
    const artistCountEl = document.getElementById('artistCount');
    const albumCountEl = document.getElementById('albumCount');
    const genreCountEl = document.getElementById('genreCount');
    const avgPopularityEl = document.getElementById('avgPopularity');
    const genreChartEl = document.getElementById('musicGenreChart');
    const topArtistsEl = document.getElementById('topArtistsList');
    const popularTracksEl = document.getElementById('popularTracksList');
  
    // Collection Overview berechnen
    const totalTracks = musicTracks.length;
    
    // Eindeutige Künstler zählen
    const uniqueArtists = new Set();
    const artistImages = {}; // Für Top Artists Liste
    
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          uniqueArtists.add(artist.artist_name);
          // Speichere das Bild für später
          if (!artistImages[artist.artist_name] && artist.artist_image) {
            artistImages[artist.artist_name] = artist.artist_image;
          }
        });
      }
    });
    const artistCount = uniqueArtists.size;
    
    // Eindeutige Alben zählen
    const uniqueAlbums = new Set();
    musicTracks.forEach(track => {
      if (track.album && track.album.album_name) {
        uniqueAlbums.add(track.album.album_name);
      }
    });
    const albumCount = uniqueAlbums.size;
    
    // Alle Genres sammeln
    const allGenres = new Set();
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (artist.genres) {
            artist.genres.forEach(genre => allGenres.add(genre));
          }
        });
      }
    });
    const genreCount = allGenres.size;
    
    // Durchschnittliche Popularität berechnen
    let totalPopularity = 0;
    let tracksWithPopularity = 0;
    musicTracks.forEach(track => {
      if (track.popularity) {
        totalPopularity += track.popularity;
        tracksWithPopularity++;
      }
    });
    const avgPopularity = tracksWithPopularity > 0 ? 
      Math.round(totalPopularity / tracksWithPopularity) : 0;
    
    // Übersicht aktualisieren
    if (trackCountEl) trackCountEl.textContent = totalTracks;
    if (artistCountEl) artistCountEl.textContent = artistCount;
    if (albumCountEl) albumCountEl.textContent = albumCount;
    if (genreCountEl) genreCountEl.textContent = genreCount;
    if (avgPopularityEl) avgPopularityEl.textContent = `${avgPopularity}%`;
    
    // Genre-Verteilung berechnen
    const genreCounts = {};
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (artist.genres) {
            artist.genres.forEach(genre => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
      }
    });
    
    // Genres sortieren und nur die Top 10 nehmen
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Genre-Chart erstellen, wenn das Element existiert
    if (genreChartEl) {
      // Chart erzeugen oder aktualisieren
      if (window.musicGenreChart && typeof window.musicGenreChart.destroy === 'function') {
        window.musicGenreChart.destroy();
      }
      
      if (sortedGenres.length > 0) {
        const labels = sortedGenres.map(g => g[0]);
        const data = sortedGenres.map(g => g[1]);
        
        try {
          const ctx = genreChartEl.getContext('2d');
          window.musicGenreChart = new Chart(ctx, {
            type: 'pie', // Standardtyp, kann später geändert werden
            data: {
              labels: labels,
              datasets: [{
                label: 'Tracks per Genre',
                data: data,
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(255, 206, 86, 0.6)',
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(153, 102, 255, 0.6)',
                  'rgba(255, 159, 64, 0.6)',
                  'rgba(201, 203, 207, 0.6)',
                  'rgba(255, 99, 132, 0.6)',
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(255, 206, 86, 0.6)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right'
                }
              }
            }
          });
        } catch (error) {
          console.error('Error creating genre chart:', error);
        }
      }
    }
    
    // Top-Künstler berechnen und anzeigen (ähnlich wie in loadMusicFavorites)
    if (topArtistsEl) {
      const artistTrackCounts = {};
      
      // Zähle die Häufigkeit jedes Künstlers
      musicTracks.forEach(track => {
        if (track.artists) {
          track.artists.forEach(artist => {
            artistTrackCounts[artist.artist_name] = (artistTrackCounts[artist.artist_name] || 0) + 1;
          });
        }
      });
      
      const topArtists = Object.entries(artistTrackCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (topArtists.length === 0) {
        topArtistsEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">Add more tracks to see your most frequent artists.</p>';
      } else {
        topArtistsEl.innerHTML = `
          <ul class="space-y-2">
            ${topArtists.map((artist, index) => {
              const artistName = artist[0];
              const trackCount = artist[1];
              const artistImage = artistImages[artistName] || 'https://placehold.co/200x200/e2e8f0/1e293b?text=No+Image';
              
              return `
                <li class="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow">
                  <div class="flex items-center">
                    <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
                    <img src="${artistImage}" alt="${artistName}" class="w-8 h-8 rounded-full mr-2">
                    <span class="text-gray-800 dark:text-gray-200">${artistName}</span>
                  </div>
                  <span class="text-indigo-600 dark:text-indigo-400">${trackCount} tracks</span>
                </li>
              `;
            }).join('')}
          </ul>
        `;
      }
    }
    
    // Beliebteste Tracks berechnen und anzeigen
    if (popularTracksEl) {
      const popularTracks = [...musicTracks]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 5);
      
      if (popularTracks.length === 0) {
        popularTracksEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">Add tracks to see your most popular songs here.</p>';
      } else {
        popularTracksEl.innerHTML = `
          <ul class="space-y-2">
            ${popularTracks.map((track, index) => `
              <li class="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow">
                <div class="flex items-center">
                  <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
                  <div>
                    <div class="text-gray-800 dark:text-gray-200">${track.track_name}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      ${track.artists ? track.artists.map(a => a.artist_name).join(', ') : 'Unknown Artist'}
                    </div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="w-24 bg-gray-200 dark:bg-gray-600 h-2 rounded-full mr-2">
                    <div class="bg-green-500 h-2 rounded-full" style="width: ${track.popularity || 0}%"></div>
                  </div>
                  <span class="text-green-600 dark:text-green-400 text-sm">${track.popularity || 0}%</span>
                </div>
              </li>
            `).join('')}
          </ul>
        `;
      }
    }
  }
  function initMusicAiSuggestions() {
    console.log("Music AI suggestions initialization function called");
    
    // Event-Listener für Generate-Button
    const generateMusicSuggestionsBtn = document.getElementById('generateMusicSuggestionsBtn');
    if (generateMusicSuggestionsBtn) {
      generateMusicSuggestionsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        generateMusicSuggestions();
      });
    }
    
    // Lade Genre-Analyse und Top-Künstler, wenn bereits Tracks vorhanden sind
    if (musicTracks && musicTracks.length > 0) {
      loadMusicGenreAnalysis();
      loadMusicFavorites();
    }
  }

function loadMusicGenreAnalysis() {
    if (!musicTracks || musicTracks.length === 0) {
      console.log("No music tracks available");
      return;
    }
  
    const genrePreferencesList = document.getElementById('musicGenrePreferencesList');
    if (!genrePreferencesList) {
      console.error("Music genre preferences list container not found");
      return;
    }
  
    // Genre-Häufigkeiten berechnen
    const genreCounts = {};
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (artist.genres) {
            artist.genres.forEach(genre => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
      }
    });
  
    // Genres sortieren (häufigste zuerst)
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1]);
  
    if (sortedGenres.length === 0) {
      genrePreferencesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No genre data available.</p>';
      return;
    }
  
    // Das häufigste Genre bekommt 5 Sterne, das seltenste 1 Stern
    const maxCount = sortedGenres[0][1];
    const minCount = sortedGenres[sortedGenres.length - 1][1];
  
    // Bewertungen berechnen
    const genreRatings = sortedGenres.map(([genre, count]) => {
      let rating;
      if (maxCount === minCount) {
        rating = 5.0; // Wenn alle gleich häufig sind
      } else {
        // Lineare Skalierung zwischen 1.0 und 5.0
        rating = 1.0 + (count - minCount) / (maxCount - minCount) * 4.0;
        rating = Math.round(rating * 10) / 10; // Auf eine Dezimalstelle runden
      }
      return { genre, count, rating };
    });
  
    // HTML generieren
    let html = '<ul class="space-y-2">';
    genreRatings.forEach(({ genre, count, rating }) => {
      // Sterne für die Bewertung generieren
      let stars = '';
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      
      for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
          stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
          stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
          stars += '<i class="far fa-star"></i>';
        }
      }
      
      html += `
        <li class="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow">
          <span class="text-gray-800 dark:text-gray-200">${genre}</span>
          <div class="flex items-center space-x-3">
            <span class="text-gray-500 dark:text-gray-400 text-sm">${count} tracks</span>
            <div class="text-yellow-500">${stars}</div>
          </div>
        </li>
      `;
    });
    html += '</ul>';
    
    genrePreferencesList.innerHTML = html;
  }
  
  function loadMusicFavorites() {
    if (!musicTracks || musicTracks.length === 0) {
      console.log("No music tracks available");
      return;
    }
  
    const artistListEl = document.getElementById('topArtistsForAI');
    if (!artistListEl) {
      console.error("Music top artists for AI container not found");
      return;
    }
  
    // Zähle die Häufigkeit jedes Künstlers
    const artistCounts = {};
    const artistImages = {};
    
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (!artistCounts[artist.artist_name]) {
            artistCounts[artist.artist_name] = 0;
            artistImages[artist.artist_name] = artist.artist_image || 'https://placehold.co/200x200/e2e8f0/1e293b?text=No+Image';
          }
          artistCounts[artist.artist_name]++;
        });
      }
    });
    
    // Sortiere Künstler nach Häufigkeit
    const sortedArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedArtists.length === 0) {
      artistListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No artist data available.</p>';
      return;
    }
    
    // HTML generieren
    let html = '<ul class="space-y-2">';
    sortedArtists.forEach(([artist, count], index) => {
      html += `
        <li class="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow">
          <div class="flex items-center">
            <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
            <img src="${artistImages[artist]}" alt="${artist}" class="w-8 h-8 rounded-full mr-2">
            <span class="text-gray-800 dark:text-gray-200">${artist}</span>
          </div>
          <span class="text-indigo-600 dark:text-indigo-400">${count} tracks</span>
        </li>
      `;
    });
    html += '</ul>';
    
    artistListEl.innerHTML = html;
  }
function updateMusicGenreChart(chartType) {
    if (!window.musicGenreChart) {
      console.error("Music genre chart not initialized");
      return;
    }
    
    // Aktuelles Chart zerstören
    window.musicGenreChart.destroy();
    
    // Chart-Container
    const genreChartEl = document.getElementById('musicGenreChart');
    if (!genreChartEl) return;
    
    // Genre-Daten abrufen (wir müssen die Berechnung erneut durchführen)
    const genreCounts = {};
    musicTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (artist.genres) {
            artist.genres.forEach(genre => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
      }
    });
    
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    const labels = sortedGenres.map(g => g[0]);
    const data = sortedGenres.map(g => g[1]);
    
    // Chart-Typ-spezifische Optionen
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartType === 'pie',
          position: 'right'
        }
      }
    };
    
    // Achsen nur für das Balkendiagramm hinzufügen
    if (chartType === 'bar') {
      options.scales = {
        y: {
          beginAtZero: true
        }
      };
    }
    
    // Neues Chart erstellen
    const ctx = genreChartEl.getContext('2d');
    window.musicGenreChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: 'Tracks per Genre',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(201, 203, 207, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)'
          ],
          borderWidth: 1
        }]
      },
      options: options
    });
  }
function generateMusicPersona() {
  // Implementierung würde hier folgen
  console.log("Generate music persona function called");
}
// Add this to music_main.js
// Beim Laden der Seite gespeicherte Music-Persona auslesen und anwenden
document.addEventListener('DOMContentLoaded', () => {
  const savedPersona = localStorage.getItem('musicPersona');
  if (savedPersona) {
    try {
      const result = JSON.parse(savedPersona);
      if (result.persona && result.description) {
        document.getElementById('musicPersonaTitle').textContent = result.persona;
        document.getElementById('musicPersonaDescription').textContent = result.description;
        document.getElementById('musicPersonaPlaceholder').classList.add('hidden');
        document.getElementById('musicPersonaContent').classList.remove('hidden');
      }
    } catch (e) {
      console.error('Error loading saved music persona:', e);
    }
  }
});

// Generate music persona 
document.getElementById('generateMusicPersonaBtn').addEventListener('click', () => {
  const btn = document.getElementById('generateMusicPersonaBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  // Collect data about music preferences
  const artists = [];
  const genres = new Set();
  
  // Gather artist and genre data from tracks
  musicTracks.forEach(track => {
    if (track.artists) {
      track.artists.forEach(artist => {
        // Add artist to list or increment count
        const existingArtist = artists.find(a => a.name === artist.artist_name);
        if (existingArtist) {
          existingArtist.count++;
        } else {
          artists.push({
            name: artist.artist_name,
            count: 1
          });
        }
        
        // Add genres
        if (artist.genres) {
          artist.genres.forEach(genre => genres.add(genre));
        }
      });
    }
  });
  
  // Sort artists by frequency
  artists.sort((a, b) => b.count - a.count);
  const topArtists = artists.slice(0, 10);
  
  // Create AI prompt
  let prompt = "Based on my music preferences, create a 'music persona' that describes my taste in 1-2 words, followed by a 4-5 sentence description of my musical profile.";
  
  if (topArtists.length > 0) {
    prompt += " My most listened artists are: ";
    prompt += topArtists.map(a => `${a.name} (${a.count} tracks)`).join(", ");
    prompt += ".";
  }
  
  if (genres.size > 0) {
    prompt += " My preferred genres include: ";
    prompt += Array.from(genres).join(", ");
    prompt += ".";
  }
  
  // Add output formatting instructions
  prompt += " Please respond ONLY with a JSON object in this format: {\"persona\":\"1-2 word description\", \"description\":\"4-5 sentences about my musical profile\"}. Do not include any other text.";
  
  // Call AI API
  fetch('/api/ask_ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: prompt })
  })
  .then(response => response.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = 'Generate';
    
    if (data.success && data.answer) {
      try {
        // Extract JSON from response
        const jsonMatch = data.answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.persona && result.description) {
            document.getElementById('musicPersonaTitle').textContent = result.persona;
            document.getElementById('musicPersonaDescription').textContent = result.description;
            document.getElementById('musicPersonaPlaceholder').classList.add('hidden');
            document.getElementById('musicPersonaContent').classList.remove('hidden');
            // Save persona to localStorage
            localStorage.setItem('musicPersona', JSON.stringify(result));
          }
        } else {
          throw new Error('Invalid JSON format in response');
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
        showNotification('Could not generate music persona. Please try again.', 'error');
      }
    } else {
      showNotification('Could not generate music persona. Please try again.', 'error');
    }
  })
  .catch(error => {
    console.error('Error generating music persona:', error);
    btn.disabled = false;
    btn.innerHTML = 'Generate';
    showNotification('Error connecting to AI service. Please try again.', 'error');
  });
});
function generateMusicSuggestions() {
  const suggestionsContainer = document.getElementById('musicSuggestionsResultsContainer');
  const loadingElement = document.getElementById('loadingMusicSuggestions');
  const suggestionsListElement = document.getElementById('musicSuggestionsList');
  
  suggestionsContainer.classList.remove('hidden');
  loadingElement.classList.remove('hidden');
  suggestionsListElement.innerHTML = '';
  
  // Get form data
  const suggestionType = document.getElementById('musicSuggestionType').value;
  const suggestionCount = parseInt(document.getElementById('musicSuggestionCount').value);
  const description = document.getElementById('musicDescription').value;
  
  // Disable submit button
  const submitBtn = document.getElementById('generateMusicSuggestionsBtn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
  
  // Prepare request data
  const requestData = {
    suggestionType: suggestionType,
    suggestionCount: suggestionCount,
    description: description
  };
  
  // Call API
  fetch('/api/music_suggestions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  })
  .then(response => response.json())
  .then(data => {
    // Hide loading indicator
    loadingElement.classList.add('hidden');
    
    if (data.success && data.recommendations && data.recommendations.length > 0) {
      // Display recommendations
      const recommendations = data.recommendations;
      
      recommendations.forEach(track => {
        suggestionsListElement.appendChild(createMusicCard(track));
      });
    } else {
      // Show error or empty state
      suggestionsListElement.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-exclamation-circle text-3xl text-yellow-500 mb-3"></i>
          <p class="text-gray-600 dark:text-gray-400">
            ${data.error || 'No recommendations found. Try changing your criteria.'}
          </p>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error getting music AI suggestions:', error);
    
    // Show error
    loadingElement.classList.add('hidden');
    suggestionsListElement.innerHTML = `
      <div class="col-span-full text-center py-8">
        <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-3"></i>
        <p class="text-gray-600 dark:text-gray-400">
          Error getting recommendations. Please try again.
        </p>
      </div>
    `;
  })
  .finally(() => {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  });
}