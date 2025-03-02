// Movie database and state
let movies = [];
let currentIndex = 0;
let filteredMovies = [];
let activeViewType = 'all';
let darkMode = localStorage.getItem('darkMode') === 'true';
let genreChart; // Chart.js object for stats
let editingMovieId = null; // ID of the movie being edited
let mainColor = localStorage.getItem('mainColor') || '#667EEA'; // Default indigo color
let userSettings = {}; // Store user settings

// DOM elements common to various functions
const manualTabBtn = document.getElementById('manualTabBtn');
const csvTabBtn = document.getElementById('csvTabBtn');
const manualForm = document.getElementById('manualForm');
const csvForm = document.getElementById('csvForm');
const addMovieForm = document.getElementById('addMovieForm');
const movieContainer = document.getElementById('movieContainer');
const emptyState = document.getElementById('emptyState');
const navigation = document.getElementById('navigation');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentIndexEl = document.getElementById('currentIndex');
const totalMoviesEl = document.getElementById('totalMovies');
const csvFileInput = document.getElementById('csvFile');
const browseBtn = document.getElementById('browseBtn');
const importBtn = document.getElementById('importBtn');
const selectedFileName = document.getElementById('selectedFileName');
const dropZone = document.getElementById('dropZone');
const darkModeToggle = document.getElementById('darkModeToggle');
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuContainer = document.getElementById('menuContainer');
const menuOverlay = document.getElementById('menuOverlay');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const mainColorPicker = document.getElementById('mainColorPicker');

// Settings elements
const settingsForm = document.getElementById('settingsForm');
const streamingApiKey = document.getElementById('streamingApiKey');
const streamingApiKeyShow = document.getElementById('streamingApiKeyShow');
const openaiApiKey = document.getElementById('openaiApiKey');
const openaiApiKeyShow = document.getElementById('openaiApiKeyShow');
const geminiApiKey = document.getElementById('geminiApiKey');
const geminiApiKeyShow = document.getElementById('geminiApiKeyShow');
const openaiApiSection = document.getElementById('openaiApiSection');
const geminiApiSection = document.getElementById('geminiApiSection');
const aiProviderRadios = document.getElementsByName('aiProvider');

// Search and filter elements
const searchInput = document.getElementById('searchInput');
const filterToggle = document.getElementById('filterToggle');
const filterOptions = document.getElementById('filterOptions');
const genreFilter = document.getElementById('genreFilter');
const yearFilter = document.getElementById('yearFilter');
const userRatingFilter = document.getElementById('userRatingFilter');
const imdbRatingFilter = document.getElementById('imdbRatingFilter');
const resetFiltersBtn = document.getElementById('resetFilters');

// View toggle buttons (inner collection view)
const viewAllBtn = document.getElementById('viewAll');
const viewMoviesBtn = document.getElementById('viewMovies');
const viewSeriesBtn = document.getElementById('viewSeries');

// Dark mode initialization
if (darkMode) {
  document.documentElement.classList.add('dark');
  darkModeToggle.checked = true;
}

// Initialize main color
mainColorPicker.value = mainColor;
applyMainColor(mainColor);

// Load settings from server
function loadSettings() {
  fetch('/api/settings')
    .then(response => response.json())
    .then(data => {
      userSettings = data;
    
      // Update UI with settings
      if (data.ai_provider === 'gemini') {
        document.querySelector('input[name="aiProvider"][value="gemini"]').checked = true;
        openaiApiSection.classList.add('hidden');
        geminiApiSection.classList.remove('hidden');
      } else {
        document.querySelector('input[name="aiProvider"][value="openai"]').checked = true;
        openaiApiSection.classList.remove('hidden');
        geminiApiSection.classList.add('hidden');
      }
    
      // Show if API keys are set by updating placeholder text
      if (data.streaming_api_key) {
        streamingApiKey.placeholder = "API Key is set (leave empty to keep)";
      } else {
        streamingApiKey.placeholder = "No API Key set";
      }
      
      if (data.openai_api_key) {
        openaiApiKey.placeholder = "API Key is set (leave empty to keep)";
      } else {
        openaiApiKey.placeholder = "No API Key set";
      }
      
      if (data.gemini_api_key) {
        geminiApiKey.placeholder = "API Key is set (leave empty to keep)";
      } else {
        geminiApiKey.placeholder = "No API Key set";
      }
    })
    .catch(error => {
      console.error('Error loading settings:', error);
    });
}
// Save settings to server
function saveSettings(e) {
  if (e) e.preventDefault();

  const aiProvider = document.querySelector('input[name="aiProvider"]:checked').value;

  const settings = {
    ai_provider: aiProvider
  };
  
  // Only include API keys if they have been entered
  if (streamingApiKey.value) {
    settings.streaming_api_key = streamingApiKey.value;
  }
  
  if (openaiApiKey.value) {
    settings.openai_api_key = openaiApiKey.value;
  }
  
  if (geminiApiKey.value) {
    settings.gemini_api_key = geminiApiKey.value;
  }

  fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Settings saved successfully!');
      
      // Clear the form
      streamingApiKey.value = '';
      openaiApiKey.value = '';
      geminiApiKey.value = '';
      
      // Reload settings
      loadSettings();
    } else {
      showNotification(`Error: ${data.message}`, 'error');
    }
  })
  .catch(error => {
    console.error('Error saving settings:', error);
    showNotification('Error saving settings. Please try again.', 'error');
  });
}
// Toggle password visibility for API keys
function setupPasswordToggle(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);

  button.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });
}

// Setup password toggles
setupPasswordToggle('streamingApiKey', 'streamingApiKeyShow');
setupPasswordToggle('openaiApiKey', 'openaiApiKeyShow');
setupPasswordToggle('geminiApiKey', 'geminiApiKeyShow');

// Toggle AI provider sections
for (const radio of aiProviderRadios) {
  radio.addEventListener('change', () => {
    if (radio.value === 'openai') {
      openaiApiSection.classList.remove('hidden');
      geminiApiSection.classList.add('hidden');
    } else {
      openaiApiSection.classList.add('hidden');
      geminiApiSection.classList.remove('hidden');
    }
  });
}

// Settings form submission
settingsForm.addEventListener('submit', saveSettings);

// Color picker change handler
mainColorPicker.addEventListener('input', (e) => {
  const newColor = e.target.value;
  applyMainColor(newColor);
  localStorage.setItem('mainColor', newColor);
});

// Apply main color to all elements
function applyMainColor(color) {
  mainColor = color;

  // Create a temporary div to calculate RGB values
  const tempDiv = document.createElement('div');
  tempDiv.style.color = color;
  document.body.appendChild(tempDiv);
  const rgbColor = window.getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  // Get the RGB values
  const rgbMatch = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return;

  const r = parseInt(rgbMatch[1]);
  const g = parseInt(rgbMatch[2]);
  const b = parseInt(rgbMatch[3]);

  // Create CSS variables with different opacities
  const colorStyle = document.createElement('style');
  colorStyle.innerHTML = `
    :root {
      --main-color: ${color};
      --main-color-light: rgba(${r}, ${g}, ${b}, 0.1);
      --main-color-medium: rgba(${r}, ${g}, ${b}, 0.5);
      --main-color-dark: rgba(${r}, ${g}, ${b}, 0.8);
    }

    .text-indigo-800, .dark .text-indigo-300 {
      color: var(--main-color) !important;
    }
  
    .text-indigo-600, .dark .text-indigo-400 {
      color: var(--main-color-dark) !important;
    }
  
    .hover\\:text-indigo-600:hover, .dark .hover\\:text-indigo-100:hover {
      color: var(--main-color-dark) !important;
    }
  
    .bg-indigo-600, .hover\\:bg-indigo-700:hover {
      background-color: var(--main-color) !important;
    }
  
    .focus\\:ring-indigo-500:focus, .focus\\:border-indigo-500:focus {
      border-color: var(--main-color) !important;
      box-shadow: 0 0 0 3px var(--main-color-medium) !important;
    }
  
    .bg-indigo-100, .dark .bg-indigo-900 {
      background-color: var(--main-color-light) !important;
    }
  
    .text-indigo-700, .dark .text-indigo-300 {
      color: var(--main-color-dark) !important;
    }
  
    .hover\\:bg-indigo-200:hover, .dark .hover\\:bg-indigo-800:hover {
      background-color: var(--main-color-medium) !important;
    }
  
    .border-indigo-600, .dark .border-indigo-400 {
      border-color: var(--main-color) !important;
    }
  `;

  // Remove any existing style element
  const existingStyle = document.getElementById('main-color-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  colorStyle.id = 'main-color-style';
  document.head.appendChild(colorStyle);
}

// Dark mode toggle
darkModeToggle.addEventListener('change', () => {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  document.documentElement.classList.toggle('dark');

  // Update chart colors if it exists
  if (genreChart) {
    updateChartColors();
  }
});

// Update chart colors based on dark mode
function updateChartColors() {
  if (!genreChart) return;

  const textColor = darkMode ? '#E2E8F0' : '#4A5568';

  genreChart.options.plugins.legend.labels.color = textColor;
  genreChart.options.plugins.title.color = textColor;
  genreChart.options.scales.y.ticks.color = textColor;
  genreChart.options.scales.x.ticks.color = textColor;
  genreChart.update();
}

// Hamburger menu controls
menuBtn.addEventListener('click', () => {
  menuContainer.classList.add('open');
  menuOverlay.classList.add('open');
});

function closeMenu() {
  menuContainer.classList.remove('open');
  menuOverlay.classList.remove('open');
}

closeMenuBtn.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu);

// Hamburger menu navigation: show corresponding sections
document.getElementById('menuCollection').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('collectionSection');
  closeMenu();
});
document.getElementById('menuAddTitle').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('addTitleSection');
  closeMenu();
});
document.getElementById('menuStats').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('statsSection');
  closeMenu();
});
document.getElementById('menuSettings').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('settingsSection');
  closeMenu();
});

// Function to show a section and hide the others with animation
function showSection(sectionId) {
  // First add the hidden class to all sections
  ['collectionSection', 'addTitleSection', 'statsSection', 'settingsSection'].forEach(id => {
    if (id !== sectionId) {
      document.getElementById(id).classList.add('hidden');
    }
  });

  // Then show the selected section with a slight delay for animation
  setTimeout(() => {
    document.getElementById(sectionId).classList.remove('hidden');
  }, 50);

  if (sectionId === 'statsSection') {
    updateStats();
  }
}

// Tab switching for Add Title section
manualTabBtn.addEventListener('click', () => {
  manualForm.classList.remove('hidden');
  csvForm.classList.add('hidden');
  manualTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  manualTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  csvTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  csvTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
});

csvTabBtn.addEventListener('click', () => {
  manualForm.classList.add('hidden');
  csvForm.classList.remove('hidden');
  csvTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  csvTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  manualTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  manualTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
});

// Filter toggle with animation
filterToggle.addEventListener('click', () => {
  filterOptions.classList.toggle('expanded');
});

// Cancel edit button
cancelEditBtn.addEventListener('click', () => {
  resetForm();
  // If we were editing, return to collection
  if (editingMovieId) {
    showSection('collectionSection');
    editingMovieId = null;
  }
});

// Form submission for adding/updating a movie
addMovieForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(addMovieForm);

  // If we're editing a movie
  if (editingMovieId) {
    const movieIndex = movies.findIndex(m => m.id === editingMovieId);
    if (movieIndex !== -1) {
      const movie = movies[movieIndex];
  
      movie.title = formData.get('title');
      movie.type = formData.get('type') || 'movie';
      movie.year = formData.get('year') ? parseInt(formData.get('year')) : null;
      movie.director = formData.get('director') || '';
      movie.genre = formData.get('genre') || '';
      movie.rating = formData.get('rating') ? parseFloat(formData.get('rating')) : 0;
      movie.imdbRating = formData.get('imdbRating') ? parseFloat(formData.get('imdbRating')) : null;
      movie.notes = formData.get('notes') || '';
      movie.poster = formData.get('poster') || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster';

      fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movie)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update content');
        }
        return response.json();
      })
      .then(() => {
        resetForm();
        updateFilterOptions();
        applyFiltersAndSearch();
        showNotification(`${movie.type === 'movie' ? 'Movie' : 'TV Series'} updated successfully!`);
    
        // Return to collection section and scroll to the updated movie
        showSection('collectionSection');
    
        // Find the updated movie in filtered array
        const filteredIndex = filteredMovies.findIndex(m => m.id === movie.id);
        if (filteredIndex !== -1) {
          currentIndex = filteredIndex;
          setTimeout(() => {
            updateMovieDisplay();
          }, 300);
        }
      })
      .catch(error => {
        console.error('Error updating content:', error);
        showNotification('Error updating content. Please try again.', 'error');
      });
    }
  } else {
    // Adding a new movie
    const movie = {
      title: formData.get('title'),
      type: formData.get('type') || 'movie',
      year: formData.get('year') ? parseInt(formData.get('year')) : null,
      director: formData.get('director') || '',
      genre: formData.get('genre') || '',
      rating: formData.get('rating') ? parseFloat(formData.get('rating')) : 0,
      imdbRating: formData.get('imdbRating') ? parseFloat(formData.get('imdbRating')) : null,
      notes: formData.get('notes') || '',
      poster: formData.get('poster') || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster',
      id: Date.now()
    };

    movies.push(movie);
    resetForm();
    updateFilterOptions();
    applyFiltersAndSearch();
    showNotification(`${movie.type === 'movie' ? 'Movie' : 'TV Series'} added successfully!`);

    // Switch to collection view to see the new movie
    showSection('collectionSection');

    // Set currentIndex to show the new movie
    setTimeout(() => {
      const newIndex = filteredMovies.findIndex(m => m.id === movie.id);
      if (newIndex !== -1) {
        currentIndex = newIndex;
        updateMovieDisplay();
      }
    }, 300);
  }
});

// Reset the form to its initial state
function resetForm() {
  addMovieForm.reset();
  const submitBtn = addMovieForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Add Content';
  cancelEditBtn.classList.add('hidden');
  editingMovieId = null;
}

// CSV Import
browseBtn.addEventListener('click', () => {
  csvFileInput.click();
});

csvFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    selectedFileName.textContent = e.target.files[0].name;
    selectedFileName.classList.remove('hidden');
    importBtn.disabled = false;
  } else {
    selectedFileName.classList.add('hidden');
    importBtn.disabled = true;
  }
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropZone.classList.add('border-indigo-300', 'dark:border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900');
  dropZone.classList.add('scale-105');
  dropZone.style.transition = 'all 0.2s ease';
}

function unhighlight() {
  dropZone.classList.remove('border-indigo-300', 'dark:border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900');
  dropZone.classList.remove('scale-105');
}

dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    csvFileInput.files = files;
    selectedFileName.textContent = files[0].name;
    selectedFileName.classList.remove('hidden');
    importBtn.disabled = false;
  }
}

importBtn.addEventListener('click', () => {
  if (csvFileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('file', csvFileInput.files[0]);

  fetch('/api/import/netflix', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification(`Imported ${data.imported} items successfully! (${data.skipped} skipped)`);
      fetchMovies();
      csvFileInput.value = '';
      selectedFileName.classList.add('hidden');
      importBtn.disabled = true;
    } else {
      showNotification(`Error: ${data.error}`, 'error');
    }
  })
  .catch(error => {
    console.error('Error importing Netflix history:', error);
    showNotification('Error importing Netflix history. Please check the console for details.', 'error');
  });
});

// Fetch movies from the server
function fetchMovies() {
  fetch('/api/movies')
    .then(response => response.json())
    .then(data => {
      movies = data;
      movies.forEach(movie => {
        if (!movie.type) movie.type = 'movie';
      });
      updateFilterOptions();
      applyFiltersAndSearch();
    })
    .catch(error => {
      console.error('Error fetching movies:', error);
      showNotification('Error loading movies. Please check the console for details.', 'error');
    });
}

// Search and filter functionality
searchInput.addEventListener('input', debounce(() => {
  applyFiltersAndSearch();
}, 300));

genreFilter.addEventListener('change', applyFiltersAndSearch);
yearFilter.addEventListener('change', applyFiltersAndSearch);
userRatingFilter.addEventListener('change', applyFiltersAndSearch);
imdbRatingFilter.addEventListener('change', applyFiltersAndSearch);

resetFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  genreFilter.value = '';
  yearFilter.value = '';
  userRatingFilter.value = '';
  imdbRatingFilter.value = '';
  setActiveView('all');
  applyFiltersAndSearch();
});

// View toggle for collection (inner navigation)
viewAllBtn.addEventListener('click', () => setActiveView('all'));
viewMoviesBtn.addEventListener('click', () => setActiveView('movie'));
viewSeriesBtn.addEventListener('click', () => setActiveView('series'));

function setActiveView(viewType) {
  activeViewType = viewType;
  viewAllBtn.className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  viewMoviesBtn.className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  viewSeriesBtn.className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  if (viewType === 'all') {
    viewAllBtn.className = 'px-3 py-2 bg-indigo-600 text-white rounded-l-md hover:bg-indigo-700 transition-colors';
  } else if (viewType === 'movie') {
    viewMoviesBtn.className = 'px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors';
  } else {
    viewSeriesBtn.className = 'px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 transition-colors';
  }
  applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const genreValue = genreFilter.value.toLowerCase();
  const yearValue = yearFilter.value;
  const userRatingValue = userRatingFilter.value;
  const imdbRatingValue = imdbRatingFilter.value;

  filteredMovies = movies.filter(movie => {
    if (activeViewType !== 'all' && movie.type !== activeViewType) {
      return false;
    }
    if (searchTerm && !movie.title.toLowerCase().includes(searchTerm)) {
      return false;
    }
    if (genreValue && (!movie.genre || !movie.genre.toLowerCase().includes(genreValue))) {
      return false;
    }
    if (yearValue && movie.year !== parseInt(yearValue)) {
      return false;
    }
    if (userRatingValue) {
      if (userRatingValue === 'notRated') {
        if (movie.rating > 0) return false;
      } else {
        const minRating = parseFloat(userRatingValue);
        if (movie.rating < minRating) return false;
      }
    }
    if (imdbRatingValue) {
      if (imdbRatingValue === 'notRated') {
        if (movie.imdbRating !== null) return false;
      } else {
        const minImdbRating = parseFloat(imdbRatingValue);
        if (!movie.imdbRating || movie.imdbRating < minImdbRating) return false;
      }
    }
    return true;
  });

  currentIndex = 0;
  updateMovieDisplay();
}

function updateFilterOptions() {
  const genres = new Set();
  movies.forEach(movie => {
    if (movie.genre) {
      movie.genre.split(',').forEach(g => {
        genres.add(g.trim());
      });
    }
  });
  genreFilter.innerHTML = '<option value="">All Genres</option>';
  [...genres].sort().forEach(genre => {
    if (genre) {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    }
  });
  const years = new Set();
  movies.forEach(movie => {
    if (movie.year) {
      years.add(movie.year);
    }
  });
  yearFilter.innerHTML = '<option value="">All Years</option>';
  [...years].sort((a, b) => b - a).forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Navigation buttons
function updateMovieDisplay() {
  const displayMovies = filteredMovies.length > 0 ? filteredMovies : movies;
  if (displayMovies.length === 0) {
    emptyState.classList.remove('hidden');
    navigation.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  navigation.classList.remove('hidden');

  currentIndexEl.textContent = currentIndex + 1;
  totalMoviesEl.textContent = displayMovies.length;

  renderMovie(displayMovies[currentIndex]);
}

// Function to generate streaming buttons for a movie
function generateStreamingButtons(streamingInfo) {
  if (!streamingInfo || Object.keys(streamingInfo).length === 0) {
    return '<p class="text-gray-500 dark:text-gray-400 text-sm mt-2">No streaming information available</p>';
  }

  let html = '<div class="mt-4"><h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Streaming Options</h4><div class="flex flex-wrap">';

  // Define provider display names and classes
  const providerInfo = {
    'netflix': { name: 'Netflix', class: 'netflix' },
    'prime': { name: 'Amazon', class: 'amazon' },
    'disney': { name: 'Disney+', class: 'disney' },
    'hbo': { name: 'HBO', class: 'hbo' },
    'hulu': { name: 'Hulu', class: 'hulu' },
    'apple': { name: 'Apple TV+', class: 'apple' }
  };

  // Process each streaming provider
  for (const [provider, options] of Object.entries(streamingInfo)) {
    if (!options || !options.length) continue;
  
    const info = providerInfo[provider.toLowerCase()] || { name: provider, class: 'default-provider' };
  
    // Find the best option (prefer subscription/flatrate)
    let bestOption = options[0];
    for (const option of options) {
      if (option.type === 'flatrate' || option.type === 'subscription') {
        bestOption = option;
        break;
      }
    }
  
    const link = bestOption.link || '#';
    const type = bestOption.type || 'unknown';
  
    html += `
      <a href="${link}" target="_blank" rel="noopener noreferrer" 
         class="streaming-button ${info.class} mr-2 mb-2">
        <span>${info.name}</span>
        <span class="ml-1 text-xs">(${type})</span>
      </a>
    `;
  }

  html += '</div></div>';
  return html;
}

function renderMovie(movie) {
  const existingCards = document.querySelectorAll('.movie-card');
  existingCards.forEach(card => card.remove());

  const movieCard = document.createElement('div');
  movieCard.className = 'movie-card w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg';

  const posterUrl = movie.poster || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster';
  const typeLabel = movie.type === 'series' ? 'TV Series' : 'Movie';
  const typeBadgeClass = movie.type === 'series' ? 'series-badge' : 'movie-badge';

  // Generate streaming buttons if available
  const streamingButtons = generateStreamingButtons(movie.streamingInfo);

  movieCard.innerHTML = `
    <div class="flex flex-col md:flex-row">
      <div class="md:w-1/3 p-4 flex justify-center">
        <div class="relative">
          <img src="${posterUrl}" alt="${movie.title}" class="poster-shadow h-64 md:h-80 object-cover rounded-lg">
          <div class="type-badge ${typeBadgeClass}">
            ${typeLabel}
          </div>
        </div>
      </div>
      <div class="md:w-2/3 p-6">
        <div class="flex justify-between items-start">
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">${movie.title}</h3>
        </div>
        <div class="mt-2 text-gray-600 dark:text-gray-400">
          ${movie.year ? `<span class="mr-2">${movie.year}</span>` : ''}
          ${movie.genre ? `<span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">${movie.genre}</span>` : ''}
        </div>
        <div class="mt-4 flex flex-wrap">
          ${movie.rating > 0 ? `
            <div class="rating-badge user-rating">
              ${generateStarRating(movie.rating)}
              <span class="ml-1 text-xs">Your Rating</span>
            </div>` : ''
          }
          ${movie.imdbRating ? `
            <div class="rating-badge imdb-rating">
              <i class="fab fa-imdb text-yellow-600 mr-1"></i>
              <span>${movie.imdbRating}</span>
              <span class="ml-1 text-xs">IMDB</span>
            </div>` : ''
          }
        </div>
        ${movie.director ? `
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Director</h4>
          <p class="text-gray-600 dark:text-gray-400">${movie.director}</p>
        </div>` : ''}
        ${movie.notes ? `
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h4>
          <p class="text-gray-600 dark:text-gray-400">${movie.notes}</p>
        </div>` : ''}
      
        <!-- Streaming Options -->
        ${streamingButtons}
      
        <div class="mt-6 flex space-x-2">
          <button class="rate-btn px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors" data-id="${movie.id}">
            <i class="fas fa-star mr-1"></i> Rate
          </button>
          <button class="edit-btn px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors" data-id="${movie.id}">
            <i class="fas fa-edit mr-1"></i> Edit
          </button>
          <button class="delete-btn px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors" data-id="${movie.id}">
            <i class="fas fa-trash-alt mr-1"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;

  movieContainer.appendChild(movieCard);

  movieCard.querySelector('.rate-btn').addEventListener('click', () => rateMovie(movie.id));
  movieCard.querySelector('.edit-btn').addEventListener('click', () => editMovie(movie.id));
  movieCard.querySelector('.delete-btn').addEventListener('click', () => deleteMovie(movie.id));

  setupSwipe(movieCard);

  // Apply entrance animation
  setTimeout(() => {
    movieCard.style.opacity = '1';
    movieCard.style.transform = 'translateY(0)';
  }, 10);
}

function generateStarRating(rating) {
  let html = '<div class="rating-display">';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      html += '<i class="fas fa-star"></i>';
    } else if (i === fullStars + 1 && hasHalfStar) {
      html += '<i class="fas fa-star-half-alt"></i>';
    } else {
      html += '<i class="far fa-star"></i>';
    }
  }

  html += '</div>';
  return html;
}

// Navigation buttons functionality with improved animations
prevBtn.addEventListener('click', () => {
  const displayMovies = filteredMovies.length > 0 ? filteredMovies : movies;
  if (displayMovies.length === 0) return;

  const movieCard = document.querySelector('.movie-card');
  movieCard.classList.add('swiping-right');

  setTimeout(() => {
    currentIndex = (currentIndex - 1 + displayMovies.length) % displayMovies.length;
    updateMovieDisplay();
  }, 300);
});

nextBtn.addEventListener('click', () => {
  const displayMovies = filteredMovies.length > 0 ? filteredMovies : movies;
  if (displayMovies.length === 0) return;

  const movieCard = document.querySelector('.movie-card');
  movieCard.classList.add('swiping-left');

  setTimeout(() => {
    currentIndex = (currentIndex + 1) % displayMovies.length;
    updateMovieDisplay();
  }, 300);
});

// Touch swipe functionality
function setupSwipe(element) {
  let startX;
  let endX;
  const minSwipeDistance = 50;

  element.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  element.addEventListener('touchend', (e) => {
    if (!startX) return;

    endX = e.changedTouches[0].clientX;
    const distance = endX - startX;
    const displayMovies = filteredMovies.length > 0 ? filteredMovies : movies;

    if (Math.abs(distance) > minSwipeDistance && displayMovies.length > 0) {
      if (distance > 0) {
        element.classList.add('swiping-right');
        setTimeout(() => {
          currentIndex = (currentIndex - 1 + displayMovies.length) % displayMovies.length;
          updateMovieDisplay();
        }, 300);
      } else {
        element.classList.add('swiping-left');
        setTimeout(() => {
          currentIndex = (currentIndex + 1) % displayMovies.length;
          updateMovieDisplay();
        }, 300);
      }
    }

    startX = null;
  });
}

// Rate movie function
function rateMovie(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.3s ease';

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm transform scale-95 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Rate "${movie.title}"</h3>
      <div class="mb-4 text-center">
        <fieldset class="rating inline-block" id="modalRating">
          <input type="radio" id="modal-star5" name="modalRating" value="5">
          <label class="full" for="modal-star5" title="Awesome - 5 stars"></label>
      
          <input type="radio" id="modal-star4half" name="modalRating" value="4.5">
          <label class="half" for="modal-star4half" title="Pretty good - 4.5 stars"></label>
      
          <input type="radio" id="modal-star4" name="modalRating" value="4">
          <label class="full" for="modal-star4" title="Pretty good - 4 stars"></label>
      
          <input type="radio" id="modal-star3half" name="modalRating" value="3.5">
          <label class="half" for="modal-star3half" title="Meh - 3.5 stars"></label>
      
          <input type="radio" id="modal-star3" name="modalRating" value="3">
          <label class="full" for="modal-star3" title="Meh - 3 stars"></label>
      
          <input type="radio" id="modal-star2half" name="modalRating" value="2.5">
          <label class="half" for="modal-star2half" title="Kinda bad - 2.5 stars"></label>
      
          <input type="radio" id="modal-star2" name="modalRating" value="2">
          <label class="full" for="modal-star2" title="Kinda bad - 2 stars"></label>
      
          <input type="radio" id="modal-star1half" name="modalRating" value="1.5">
          <label class="half" for="modal-star1half" title="Meh - 1.5 stars"></label>
      
          <input type="radio" id="modal-star1" name="modalRating" value="1">
          <label class="full" for="modal-star1" title="Sucks big time - 1 star"></label>
      
          <input type="radio" id="modal-star0.5" name="modalRating" value="0.5">
          <label class="half" for="modal-star0.5" title="Sucks big time - 0.5 stars"></label>
        </fieldset>
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to rate</div>
        
        <div class="mt-4">
          <button id="removeRatingBtn" class="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors ${movie.rating > 0 ? '' : 'hidden'}">
            <i class="fas fa-times mr-1"></i> Remove Rating
          </button>
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        <button id="modalCancelBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Cancel
        </button>
        <button id="modalSaveBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          Save Rating
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fade in animation
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('div').classList.remove('scale-95');
    modal.querySelector('div').classList.add('scale-100');
  }, 10);

  if (movie.rating > 0) {
    const currentRating = document.querySelector(`input[name="modalRating"][value="${movie.rating}"]`);
    if (currentRating) currentRating.checked = true;
  }

  document.getElementById('modalCancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });

  // Handler für den "Remove Rating"-Button
  document.getElementById('removeRatingBtn').addEventListener('click', () => {
    const oldRating = movie.rating;
    movie.rating = 0;

    fetch(`/api/movies/${movie.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(movie)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to remove rating');
      }
      return response.json();
    })
    .then(() => {
      applyFiltersAndSearch();
      showNotification('Rating removed successfully!');
      closeModal(modal);
    })
    .catch(error => {
      console.error('Error removing rating:', error);
      movie.rating = oldRating;
      showNotification('Error removing rating. Please try again.', 'error');
    });
  });

  document.getElementById('modalSaveBtn').addEventListener('click', () => {
    const selectedRating = document.querySelector('input[name="modalRating"]:checked');
    if (selectedRating) {
      const oldRating = movie.rating;
      movie.rating = parseFloat(selectedRating.value);

      fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movie)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update rating');
        }
        return response.json();
      })
      .then(() => {
        applyFiltersAndSearch();
        showNotification('Rating saved successfully!');
      })
      .catch(error => {
        console.error('Error updating rating:', error);
        movie.rating = oldRating;
        showNotification('Error saving rating. Please try again.', 'error');
      });
    } else {
      showNotification('Please select a rating', 'error');
    }
    closeModal(modal);
  });

  // Close the modal with fade out animation
  function closeModal(modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');

    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  }
}

// Edit movie function - updated to fix scrolling issue
function editMovie(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  // Set the editingMovieId global variable
  editingMovieId = id;

  // First show the add title section
  showSection('addTitleSection');

  // Then populate the form
  setTimeout(() => {
    document.getElementById('title').value = movie.title;
    document.getElementById('type').value = movie.type || 'movie';
    document.getElementById('year').value = movie.year || '';
    document.getElementById('director').value = movie.director || '';
    document.getElementById('genre').value = movie.genre || '';
    document.getElementById('notes').value = movie.notes || '';
    document.getElementById('poster').value = movie.poster === 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster' ? '' : movie.poster;
    document.getElementById('imdbRating').value = movie.imdbRating || '';

    if (movie.rating > 0) {
      const ratingInput = document.querySelector(`input[name="rating"][value="${movie.rating}"]`);
      if (ratingInput) ratingInput.checked = true;
    } else {
      document.getElementById('noRating').checked = true;
    }

    // Show which tab we're on
    manualTabBtn.click();

    // Change the submit button text
    const submitBtn = addMovieForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Content';

    // Show the cancel button
    cancelEditBtn.classList.remove('hidden');

    // Smooth scroll to the form
    window.scrollTo({
      top: addMovieForm.offsetTop - 20,
      behavior: 'smooth'
    });
  }, 100);
}

// Delete movie function
function deleteMovie(id) {
  // Create a confirmation modal with animation
  const confirmModal = document.createElement('div');
  confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  confirmModal.style.opacity = '0';
  confirmModal.style.transition = 'opacity 0.3s ease';

  confirmModal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm transform scale-95 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Confirm Deletion</h3>
      <p class="text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2">
        <button id="cancelDeleteBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Cancel
        </button>
        <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
          Delete
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmModal);

  // Fade in animation
  setTimeout(() => {
    confirmModal.style.opacity = '1';
    confirmModal.querySelector('div').classList.remove('scale-95');
    confirmModal.querySelector('div').classList.add('scale-100');
  }, 10);

  // Setup event listeners
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    closeConfirmModal();
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    const index = movies.findIndex(m => m.id === id);
    if (index === -1) return;

    const movie = movies[index];

    fetch(`/api/movies/${id}`, {
      method: 'DELETE'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to delete content');
      }
      return response.json();
    })
    .then(() => {
      movies.splice(index, 1);
      const displayMovies = filteredMovies.length > 0 ? filteredMovies : movies;
      if (displayMovies.length === 0) {
        currentIndex = 0;
      } else if (currentIndex >= displayMovies.length) {
        currentIndex = displayMovies.length - 1;
      }
      updateFilterOptions();
      applyFiltersAndSearch();
      showNotification(`${movie.type === 'movie' ? 'Movie' : 'TV Series'} deleted successfully!`);
      closeConfirmModal();
    })
    .catch(error => {
      console.error('Error deleting content:', error);
      showNotification('Error deleting content. Please try again.', 'error');
      closeConfirmModal();
    });
  });

  // Close the confirmation modal with animation
  function closeConfirmModal() {
    confirmModal.style.opacity = '0';
    confirmModal.querySelector('div').classList.remove('scale-100');
    confirmModal.querySelector('div').classList.add('scale-95');

    setTimeout(() => {
      document.body.removeChild(confirmModal);
    }, 300);
  }
}

// Ask AI for movie recommendations
function askAI() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.3s ease';

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg transform scale-95 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Ask AI for Movie Recommendations</h3>
      <div class="mb-4">
        <label for="aiPrompt" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Describe what you're looking for:</label>
        <textarea id="aiPrompt" rows="4" 
                  placeholder="Example: Recommend sci-fi movies similar to Interstellar with great visuals" 
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-all"></textarea>
      </div>
      <div id="aiResponseContainer" class="mb-4 hidden">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Recommendations:</h4>
        <div id="aiResponse" class="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto"></div>
      </div>
      <div class="flex justify-between">
        <div id="aiProvider" class="text-xs text-gray-500 dark:text-gray-400 self-center">
          Using: <span id="aiProviderName">OpenAI 4o-mini</span>
        </div>
        <div class="flex space-x-2">
          <button id="modalCancelAIBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Close
          </button>
          <button id="askAIBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Get Recommendations
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Update the AI provider name based on settings
  const providerNameEl = document.getElementById('aiProviderName');
  if (userSettings.ai_provider === 'gemini') {
    providerNameEl.textContent = 'Gemini 2.0 Flash';
  } else {
    providerNameEl.textContent = 'OpenAI 4o-mini';
  }

  // Fade in animation
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('div').classList.remove('scale-95');
    modal.querySelector('div').classList.add('scale-100');
  }, 10);

  document.getElementById('modalCancelAIBtn').addEventListener('click', () => {
    closeAIModal();
  });

  document.getElementById('askAIBtn').addEventListener('click', () => {
    const prompt = document.getElementById('aiPrompt').value;
    if (!prompt) {
      showNotification('Please enter a prompt', 'error');
      return;
    }
  
    // Show loading state
    const askButton = document.getElementById('askAIBtn');
    const originalText = askButton.textContent;
    askButton.disabled = true;
    askButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Getting recommendations...';
  
    // Call the API
    fetch('/api/ask_ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: prompt })
    })
    .then(response => response.json())
    .then(data => {
      // Reset button
      askButton.disabled = false;
      askButton.textContent = originalText;
    
      if (data.success) {
        // Show the response
        document.getElementById('aiResponseContainer').classList.remove('hidden');
        document.getElementById('aiResponse').textContent = data.answer;
      } else {
        showNotification(`Error: ${data.message}`, 'error');
      }
    })
    .catch(error => {
      // Reset button
      askButton.disabled = false;
      askButton.textContent = originalText;
    
      console.error('Error getting AI recommendations:', error);
      showNotification('Error getting recommendations. Please try again.', 'error');
    });
  });

  function closeAIModal() {
    modal.style.opacity = '0';
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
  
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  }
}

// Notification system with improved animation
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 py-2 px-4 rounded-md shadow-lg ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white z-50 notification transform translate-y-10 opacity-0 transition-all duration-300`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Fade in animation
  setTimeout(() => {
    notification.classList.remove('translate-y-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    notification.classList.add('translate-y-10', 'opacity-0');

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Function to update the Stats section
function updateStats() {
  const movieCount = movies.filter(m => m.type === 'movie').length;
  const seriesCount = movies.filter(m => m.type === 'series').length;
  const notRatedCount = movies.filter(m => !m.rating || m.rating === 0).length;

  document.getElementById('movieCount').textContent = movieCount;
  document.getElementById('seriesCount').textContent = seriesCount;
  document.getElementById('notRatedCount').textContent = notRatedCount;

  const genreDensity = {};
  movies.forEach(movie => {
    if (movie.genre) {
      movie.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          genreDensity[genre] = (genreDensity[genre] || 0) + 1;
        }
      });
    }
  });

  const labels = Object.keys(genreDensity);
  const data = Object.values(genreDensity);

  const textColor = darkMode ? '#E2E8F0' : '#4A5568';

  const ctx = document.getElementById('genreChart').getContext('2d');
  if (genreChart) {
    genreChart.data.labels = labels;
    genreChart.data.datasets[0].data = data;
    genreChart.options.plugins.legend.labels.color = textColor;
    genreChart.update();
  } else {
    genreChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Genre Distribution',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }
}
// AI Suggestions related variables and state
let genrePreferences = {};
let favoritesList = [];

// Hamburger menu: show AI Suggestions section
document.getElementById('menuAiSuggestions').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('aiSuggestionsSection');
  loadGenreAnalysis();
  loadFavorites();
  closeMenu();
});

// Function to show a section (updating to include aiSuggestionsSection)
function showSection(sectionId) {
  // First add the hidden class to all sections
  ['collectionSection', 'addTitleSection', 'statsSection', 'settingsSection', 'aiSuggestionsSection'].forEach(id => {
    if (id !== sectionId) {
      document.getElementById(id).classList.add('hidden');
    }
  });

  // Then show the selected section with a slight delay for animation
  setTimeout(() => {
    document.getElementById(sectionId).classList.remove('hidden');
  }, 50);

  if (sectionId === 'statsSection') {
    updateStats();
  }
}
let genreRankingMode = 'count'; // 'count' oder 'user'

// Event-Listener für die Ranking-System-Buttons
function initGenreRankingButtons() {
  const genreCountBtn = document.getElementById('genreCountBtn');
  const userRankingBtn = document.getElementById('userRankingBtn');
  
  if (genreCountBtn && userRankingBtn) {
    genreCountBtn.addEventListener('click', () => {
      setGenreRankingMode('count');
    });
    
    userRankingBtn.addEventListener('click', () => {
      setGenreRankingMode('user');
    });
  }
}

// Funktion zum Setzen des Ranking-Modus
function setGenreRankingMode(mode) {
  genreRankingMode = mode;
  
  // Button-Styling aktualisieren
  const genreCountBtn = document.getElementById('genreCountBtn');
  const userRankingBtn = document.getElementById('userRankingBtn');
  
  if (mode === 'count') {
    genreCountBtn.className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-l-md';
    userRankingBtn.className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md';
  } else {
    genreCountBtn.className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md';
    userRankingBtn.className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-r-md';
  }
  
  // Genre-Analyse neu laden
  loadGenreAnalysis();
}

// Aktualisierte loadGenreAnalysis-Funktion
function loadGenreAnalysis() {
  const selectionMode = document.querySelector('input[name="selectionMode"]:checked').value;
  const genrePreferencesList = document.getElementById('genrePreferencesList');
  
  // Filter movies based on selection mode
  let selectedMovies = [];
  if (selectionMode === 'rated') {
    selectedMovies = movies.filter(m => m.rating > 0);
  } else {
    selectedMovies = movies;
  }
  
  if (genreRankingMode === 'count') {
    loadGenreAnalysisByCount(selectedMovies, genrePreferencesList);
  } else {
    loadGenreAnalysisByUserRanking(selectedMovies, genrePreferencesList);
  }
}

// Genre-Analyse basierend auf Anzahl
function loadGenreAnalysisByCount(selectedMovies, genrePreferencesList) {
  // Analyse der Genres nach Häufigkeit
  const genreCounts = {};
  
  selectedMovies.forEach(movie => {
    if (movie.genre) {
      movie.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });
  
  // Sortieren nach Häufigkeit (höchste zuerst)
  const sortedGenres = Object.keys(genreCounts).map(genre => {
    return {
      genre,
      count: genreCounts[genre]
    };
  }).sort((a, b) => b.count - a.count);
  
  if (sortedGenres.length === 0) {
    genrePreferencesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No genre data available.</p>';
    return;
  }
  
  // Das häufigste Genre bekommt 5 Sterne, das seltenste 1.5 Sterne
  const maxCount = sortedGenres[0].count;
  const minCount = sortedGenres[sortedGenres.length - 1].count;
  
  // Berechne die Bewertungen für jedes Genre
  sortedGenres.forEach(item => {
    if (maxCount === minCount) {
      // Wenn alle Genres gleich häufig sind, alle mit 5 Sternen bewerten
      item.rating = 5.0;
    } else {
      // Lineare Skalierung zwischen 1.5 und 5.0
      const range = 5.0 - 1.5;
      const scale = (item.count - minCount) / (maxCount - minCount);
      item.rating = 1.5 + (scale * range);
      item.rating = Math.round(item.rating * 10) / 10; // Auf eine Dezimalstelle runden
    }
  });
  
  // Generate HTML
  let html = '<ul class="space-y-2">';
  sortedGenres.forEach(item => {
    const ratingDisplay = `<span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${item.rating.toFixed(1)}/5</span>`;
    
    html += `
      <li class="flex justify-between items-center">
        <span class="text-gray-700 dark:text-gray-300">${item.genre}</span>
        <div class="flex items-center space-x-3">
          <span class="text-gray-500 dark:text-gray-400 text-sm">${item.count} titles</span>
          ${ratingDisplay}
        </div>
      </li>
    `;
  });
  html += '</ul>';
  
  genrePreferencesList.innerHTML = html;
  
  // Aktualisiere die globale genrePreferences für KI-Empfehlungen
  genrePreferences = {};
  sortedGenres.forEach(item => {
    genrePreferences[item.genre] = item.rating;
  });
}

// Genre-Analyse basierend auf Benutzerbewertungen
function loadGenreAnalysisByUserRanking(selectedMovies, genrePreferencesList) {
  // Analyze genres and ratings
  const genreRatings = {};
  const genreCounts = {};
  
  selectedMovies.forEach(movie => {
    if (movie.genre) {
      movie.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          if (!genreRatings[genre]) {
            genreRatings[genre] = {
              total: 0,
              count: 0
            };
          }
          
          if (movie.rating > 0) {
            genreRatings[genre].total += movie.rating;
            genreRatings[genre].count++;
          }
          
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });
  
  // Calculate averages and sort by popularity and rating
  const sortedGenres = Object.keys(genreRatings).map(genre => {
    const data = genreRatings[genre];
    const count = genreCounts[genre] || 0;
    const avgRating = data.count > 0 ? data.total / data.count : 0;
    
    return {
      genre,
      avgRating: avgRating.toFixed(1),
      count,
      popularity: count / selectedMovies.length
    };
  }).sort((a, b) => {
    // First sort by average rating (high to low)
    if (b.avgRating !== a.avgRating) {
      return b.avgRating - a.avgRating;
    }
    // Then by popularity (high to low)
    return b.popularity - a.popularity;
  });
  
  // Display the results
  if (sortedGenres.length > 0) {
    let html = '<ul class="space-y-2">';
    sortedGenres.forEach(item => {
      const ratingDisplay = item.avgRating > 0 
        ? `<span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${item.avgRating}/5</span>` 
        : '<span class="text-gray-400">Not rated</span>';
        
      html += `
        <li class="flex justify-between items-center">
          <span class="text-gray-700 dark:text-gray-300">${item.genre}</span>
          <div class="flex items-center space-x-3">
            <span class="text-gray-500 dark:text-gray-400 text-sm">${item.count} titles</span>
            ${ratingDisplay}
          </div>
        </li>
      `;
    });
    html += '</ul>';
    
    genrePreferencesList.innerHTML = html;
  } else {
    genrePreferencesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No genre data available.</p>';
  }
  
  // Aktualisiere die globale genrePreferences für KI-Empfehlungen
  genrePreferences = {};
  sortedGenres.forEach(item => {
    if (item.avgRating > 0) {
      genrePreferences[item.genre] = parseFloat(item.avgRating);
    }
  });
}

// Initialisieren der Ranking-Buttons beim Laden des AI Suggestions Bereichs
document.getElementById('menuAiSuggestions').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('aiSuggestionsSection');
  initGenreRankingButtons(); // Initialisiere die Ranking-Buttons
  loadGenreAnalysis();
  loadFavorites();
  closeMenu();
});

// Load favorite titles
function loadFavorites() {
  const favoriteTitlesList = document.getElementById('favoriteTitlesList');
  
  // Get movies with ratings and sort by rating (high to low)
  const ratedMovies = movies.filter(m => m.rating > 0)
    .sort((a, b) => b.rating - a.rating);
  
  // Take top 10
  favoritesList = ratedMovies.slice(0, 10).map(m => ({
    id: m.id,
    title: m.title,
    rating: m.rating,
    type: m.type || 'movie'
  }));
  
  if (favoritesList.length > 0) {
    let html = '<ul class="space-y-2" id="editableFavoritesList">';
    favoritesList.forEach((item, index) => {
      const typeIcon = item.type === 'movie' ? 'film' : 'tv';
      html += `
        <li class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md group" data-id="${item.id}">
          <div class="flex items-center">
            <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
            <i class="fas fa-${typeIcon} text-indigo-500 dark:text-indigo-400 mr-2"></i>
            <span class="text-gray-700 dark:text-gray-300">${item.title}</span>
          </div>
          <div class="flex items-center">
            <span class="text-yellow-500 mr-3"><i class="fas fa-star mr-1"></i>${item.rating}/5</span>
            <button type="button" class="favorite-remove-btn text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </li>
      `;
    });
    html += '</ul>';
    
    favoriteTitlesList.innerHTML = html;
    
    // Add event listeners for remove buttons
    document.querySelectorAll('.favorite-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const listItem = e.target.closest('li');
        const itemId = listItem.dataset.id;
        
        // Remove from favorites list
        favoritesList = favoritesList.filter(item => item.id != itemId);
        
        // Update the UI
        listItem.classList.add('opacity-50');
        setTimeout(() => {
          listItem.remove();
          
          // If no favorites left, show message
          if (favoritesList.length === 0) {
            favoriteTitlesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No favorites yet. Rate your titles to see them here.</p>';
          }
        }, 300);
      });
    });
  } else {
    favoriteTitlesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No favorites yet. Rate your titles to see them here.</p>';
  }
}

// Selection mode change handler
document.querySelectorAll('input[name="selectionMode"]').forEach(radio => {
  radio.addEventListener('change', loadGenreAnalysis);
});

// Generate suggestions form submission
document.getElementById('aiSuggestionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Show loading state
  const suggestionsContainer = document.getElementById('suggestionsResultsContainer');
  const loadingElement = document.getElementById('loadingSuggestions');
  const suggestionsListElement = document.getElementById('suggestionsList');
  
  suggestionsContainer.classList.remove('hidden');
  loadingElement.classList.remove('hidden');
  suggestionsListElement.innerHTML = '';
  
  // Get form data
  const selectionMode = document.querySelector('input[name="selectionMode"]:checked').value;
  const contentType = document.getElementById('contentType').value;
  const suggestionCount = parseInt(document.getElementById('suggestionCount').value);
  const description = document.getElementById('description').value;
  
  // Disable button
  const submitBtn = document.getElementById('generateSuggestionsBtn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
  
  // Prepare request data
  const requestData = {
    selectionMode,
    contentType,
    suggestionCount,
    description,
    favorites: favoritesList
  };
  
  // Send request to backend
  fetch('/api/ai_suggestions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  })
  .then(response => response.json())
  .then(data => {
    // Hide loading
    loadingElement.classList.add('hidden');
    
    if (data.success && data.recommendations && data.recommendations.length > 0) {
      // Display recommendations
      let html = '';
      data.recommendations.forEach(recommendation => {
        const typeIcon = recommendation.type === 'series' ? 'tv' : 'film';
        const typeBadge = recommendation.type === 'series' ? 'TV Series' : 'Movie';
        const posterUrl = recommendation.poster || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Poster';
        
        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div class="relative">
              <img src="${posterUrl}" alt="${recommendation.title}" class="w-full h-48 object-cover">
              <span class="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded-full text-xs">
                <i class="fas fa-${typeIcon} mr-1"></i> ${typeBadge}
              </span>
            </div>
            <div class="p-4">
              <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">${recommendation.title}</h4>
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                ${recommendation.year ? `<span class="mr-2">${recommendation.year}</span>` : ''}
                ${recommendation.genre ? `<span>${recommendation.genre}</span>` : ''}
              </div>
              ${recommendation.imdbRating ? `
                <div class="flex items-center mb-2">
                  <i class="fab fa-imdb text-yellow-600 mr-1"></i>
                  <span class="text-gray-700 dark:text-gray-300">${recommendation.imdbRating}</span>
                </div>` : ''
              }
              <p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3" title="${recommendation.notes || ''}">
                ${recommendation.notes || 'No description available.'}
              </p>
              <button class="w-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 py-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors add-to-collection" data-title="${recommendation.title}">
                <i class="fas fa-plus mr-1"></i> Add to Collection
              </button>
            </div>
          </div>
        `;
      });
      
      suggestionsListElement.innerHTML = html;
      
      // Add event listeners for "Add to Collection" buttons
      document.querySelectorAll('.add-to-collection').forEach(btn => {
        btn.addEventListener('click', () => {
          const title = btn.dataset.title;
          
          // Find the recommendation data
          const recommendation = data.recommendations.find(r => r.title === title);
          if (recommendation) {
            // Switch to Add Title section
            showSection('addTitleSection');
            
            // Populate the form with the recommendation data
            document.getElementById('title').value = recommendation.title;
            document.getElementById('type').value = recommendation.type || 'movie';
            document.getElementById('year').value = recommendation.year || '';
            document.getElementById('director').value = recommendation.director || '';
            document.getElementById('genre').value = recommendation.genre || '';
            document.getElementById('notes').value = recommendation.notes || '';
            document.getElementById('poster').value = recommendation.poster || '';
            
            if (recommendation.imdbRating) {
              document.getElementById('imdbRating').value = recommendation.imdbRating;
            }
            
            // Show which tab we're on
            manualTabBtn.click();
            
            // Smooth scroll to the form
            window.scrollTo({
              top: addMovieForm.offsetTop - 20,
              behavior: 'smooth'
            });
          }
        });
      });
    } else {
      // Show error or no results message
      suggestionsListElement.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-exclamation-circle text-3xl text-yellow-500 mb-3"></i>
          <p class="text-gray-600 dark:text-gray-400">
            ${data.message || 'No recommendations found. Try changing your criteria.'}
          </p>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error getting AI suggestions:', error);
    
    // Show error message
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
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  });
});
// Initialize on load
fetchMovies();
loadSettings();
