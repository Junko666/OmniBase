// Games database and state
let games = [];
let currentGameIndex = 0;
let filteredGames = [];
let activeGameViewType = 'all';
let editingGameId = null;

// DOM elements specific to games
const gameContainer = document.getElementById('gameContainer');
const gameEmptyState = document.getElementById('gameEmptyState');
const gameNavigation = document.getElementById('gameNavigation');
const gamePrevBtn = document.getElementById('gamePrevBtn');
const gameNextBtn = document.getElementById('gameNextBtn');
const currentGameIndexEl = document.getElementById('currentGameIndex');
const totalGamesEl = document.getElementById('totalGames');
const addGameForm = document.getElementById('addGameForm');
let currentLanguageCode = localStorage.getItem('language') || 'en';
const gameApiTabBtn = document.getElementById('gameApiTabBtn');
const gameManualTabBtn = document.getElementById('gameManualTabBtn');
const gameApiForm = document.getElementById('gameApiForm');
const gameManualForm = document.getElementById('gameManualForm');
const cancelGameEditBtn = document.getElementById('cancelGameEditBtn');

// Search and filter elements
const gameSearchInput = document.getElementById('gameSearchInput');
const gameFilterToggle = document.getElementById('gameFilterToggle');
const gameFilterOptions = document.getElementById('gameFilterOptions');
const gameGenreFilter = document.getElementById('gameGenreFilter');
const gamePlatformFilter = document.getElementById('gamePlatformFilter');
const gameReleaseYearFilter = document.getElementById('gameReleaseYearFilter');
const gameUserRatingFilter = document.getElementById('gameUserRatingFilter');
const gameRawgRatingFilter = document.getElementById('gameRawgRatingFilter');
const resetGameFiltersBtn = document.getElementById('resetGameFilters');

// API search elements
const gameApiSearchForm = document.getElementById('gameApiSearchForm');
const gameApiSearchResults = document.getElementById('gameApiSearchResults');
const gameApiSearchLoading = document.getElementById('gameApiSearchLoading');
const gameApiSearchError = document.getElementById('gameApiSearchError');
const gameApiErrorMessage = document.getElementById('gameApiErrorMessage');
const gameSearchResultsContainer = document.getElementById('gameSearchResultsContainer');
const gameSearchResults = document.getElementById('gameSearchResults');

// Fetch games from the server
function fetchGames() {
  fetch('/api/games')
    .then(response => response.json())
    .then(data => {
      games = data;
      updateGameFilterOptions();
      applyGameFiltersAndSearch();
    })
    .catch(error => {
      console.error('Error fetching games:', error);
      showNotification('Error loading games. Please check the console for details.', 'error');
    });
}

// Tab switching for Add Game section
gameApiTabBtn.addEventListener('click', () => {
  gameApiForm.classList.remove('hidden');
  gameManualForm.classList.add('hidden');
  gameApiTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameApiTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  gameManualTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  gameManualTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
});

gameManualTabBtn.addEventListener('click', () => {
  gameManualForm.classList.remove('hidden');
  gameApiForm.classList.add('hidden');
  gameManualTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameManualTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  gameApiTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  gameApiTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
});

// API Search form submission
gameApiSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const searchTitle = document.getElementById('gameApiSearchTitle').value.trim();
  if (!searchTitle) {
    showNotification('Please enter a title to search for', 'error');
    return;
  }
  
  // Show loading state
  gameApiSearchResults.classList.remove('hidden');
  gameApiSearchLoading.classList.remove('hidden');
  gameApiSearchError.classList.add('hidden');
  gameSearchResultsContainer.classList.add('hidden');
  
  // Disable search button during search
  const searchBtn = document.getElementById('gameApiSearchBtn');
  const originalBtnText = searchBtn.textContent;
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Searching...';
  
  // Make API request
  fetch(`/api/games/search?title=${encodeURIComponent(searchTitle)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(games => {
      // Re-enable search button
      searchBtn.disabled = false;
      searchBtn.textContent = originalBtnText;
      
      // Hide loading indicator
      gameApiSearchLoading.classList.add('hidden');
      
      // Display results
      displayGameSearchResults(games);
    })
    .catch(error => {
      console.error('Error searching for games:', error);
      
      // Re-enable search button
      searchBtn.disabled = false;
      searchBtn.textContent = originalBtnText;
      
      // Hide loading and show error
      gameApiSearchLoading.classList.add('hidden');
      gameApiSearchError.classList.remove('hidden');
      gameApiErrorMessage.textContent = 'Error searching for games. Please try again.';
    });
});

// Display game search results
function displayGameSearchResults(results) {
  if (!results || results.length === 0 || results.error) {
    gameApiSearchError.classList.remove('hidden');
    gameApiErrorMessage.textContent = results.error || 'No games found matching your search.';
    return;
  }
  
  // Clear previous results
  gameSearchResults.innerHTML = '';
  
  // Create result cards
  results.forEach(game => {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow';
    
    // Format platforms and stores for display
    const platformsList = game.platforms && game.platforms.length > 0 
      ? `<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">${game.platforms.join(', ')}</div>` 
      : '';
    
    const storesList = game.stores && game.stores.length > 0
      ? `<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">Available on: ${game.stores.join(', ')}</div>`
      : '';
    
    card.innerHTML = `
      <img src="${game.background_image}" alt="${game.title}" class="w-full h-36 object-cover">
      <div class="p-3">
        <h3 class="font-medium text-gray-800 dark:text-gray-200 truncate">${game.title}</h3>
        ${game.release_date ? `<div class="text-xs text-gray-600 dark:text-gray-400">Released: ${new Date(game.release_date).toLocaleDateString()}</div>` : ''}
        ${platformsList}
        ${game.rawg_rating ? `<div class="flex items-center mt-1"><span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${game.rawg_rating}/5</span></div>` : ''}
        <button class="mt-2 w-full bg-indigo-600 text-white py-1 px-2 rounded text-sm hover:bg-indigo-700 transition-colors add-game-btn" data-game='${JSON.stringify(game)}'>
          Add to Collection
        </button>
      </div>
    `;
    
    gameSearchResults.appendChild(card);
  });
  
  // Add event listeners to the Add buttons
  document.querySelectorAll('.add-game-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const gameData = JSON.parse(this.getAttribute('data-game'));
      addGameToCollection(gameData);
    });
  });
  
  // Show results container
  gameSearchResultsContainer.classList.remove('hidden');
}

// Add game to collection
function addGameToCollection(gameData) {
  // Clean the data structure to ensure it's valid
  const cleanGameData = {
    title: gameData.title || '',
    slug: gameData.slug || '',
    release_date: gameData.release_date || '',
    platforms: Array.isArray(gameData.platforms) ? gameData.platforms : [],
    stores: Array.isArray(gameData.stores) ? gameData.stores : [],
    genre: gameData.genre || '',
    rating: gameData.rating || 0,
    rawg_rating: gameData.rawg_rating || 0,
    background_image: gameData.background_image || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image',
    notes: gameData.notes || ''
  };
  
  fetch('/api/add_game', {  // Use our new endpoint
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cleanGameData)
  })
  .then(response => {
    if (!response.ok) {
      console.error('Error response:', response.status, response.statusText);
      throw new Error('Failed to add game');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Add game to local array
      games.push(data.game);
      updateGameFilterOptions();
      applyGameFiltersAndSearch();
      
      // Show notification
      showNotification('Game added to your collection!');
      
      // Switch to collection view
      showSection('gamesCollectionSection');
    } else {
      throw new Error(data.message || 'Failed to add game');
    }
  })
  .catch(error => {
    console.error('Error adding game:', error);
    showNotification('Error adding game to collection', 'error');
  });
}
// Manual form submission
addGameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Collect form data
  const title = document.getElementById('gameTitle').value;
  const releaseDate = document.getElementById('gameReleaseDate').value;
  const genre = document.getElementById('gameGenre').value;
  const imageUrl = document.getElementById('gameImage').value;
  const notes = document.getElementById('gameNotes').value;
  
  // Get selected platforms
  const platformCheckboxes = document.querySelectorAll('input[name="platforms[]"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);
  
  // Get selected stores
  const storeCheckboxes = document.querySelectorAll('input[name="stores[]"]:checked');
  const stores = Array.from(storeCheckboxes).map(cb => cb.value);
  
  // Get rating
  const ratingInput = document.querySelector('input[name="gameRating"]:checked');
  const rating = ratingInput ? parseFloat(ratingInput.value) : 0;
  
  const gameData = {
    title,
    release_date: releaseDate,
    genre,
    platforms,
    stores,
    rating,
    background_image: imageUrl || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image',
    notes
  };
  
  // If editing an existing game
  if (editingGameId) {
    gameData.id = editingGameId;
    
    fetch(`/api/games/${editingGameId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update game');
      }
      return response.json();
    })
    .then(updatedGame => {
      // Update in local array
      const index = games.findIndex(g => g.id === editingGameId);
      if (index !== -1) {
        games[index] = updatedGame;
      }
      updateGameFilterOptions();
      applyGameFiltersAndSearch();
      
      // Reset form and state
      resetGameForm();
      showNotification('Game updated successfully!');
      
      // Return to collection
      showSection('gamesCollectionSection');
    })
    .catch(error => {
      console.error('Error updating game:', error);
      showNotification('Error updating game', 'error');
    });
  } else {
    // Adding a new game
    fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to add game');
      }
      return response.json();
    })
    .then(savedGame => {
      // Add game to local array
      games.push(savedGame);
      updateGameFilterOptions();
      applyGameFiltersAndSearch();
      
      // Reset form
      resetGameForm();
      showNotification('Game added to your collection!');
      
      // Switch to collection view
      showSection('gamesCollectionSection');
      
      // Set index to show the new game
      setTimeout(() => {
        const newIndex = filteredGames.findIndex(g => g.id === savedGame.id);
        if (newIndex !== -1) {
          currentGameIndex = newIndex;
          updateGameDisplay();
        }
      }, 300);
    })
    .catch(error => {
      console.error('Error adding game:', error);
      showNotification('Error adding game to collection', 'error');
    });
  }
});

// Reset game form
function resetGameForm() {
  addGameForm.reset();
  editingGameId = null;
  document.querySelector('button[type="submit"]', addGameForm).textContent = 'Add Game';
  cancelGameEditBtn.classList.add('hidden');
}

// Cancel edit button
cancelGameEditBtn.addEventListener('click', () => {
  resetGameForm();
  if (editingGameId) {
    showSection('gamesCollectionSection');
    editingGameId = null;
  }
});

// Search and filter functionality for games
gameSearchInput.addEventListener('input', debounce(() => {
  applyGameFiltersAndSearch();
}, 300));

gameGenreFilter.addEventListener('change', applyGameFiltersAndSearch);
gamePlatformFilter.addEventListener('change', applyGameFiltersAndSearch);
gameReleaseYearFilter.addEventListener('change', applyGameFiltersAndSearch);
gameUserRatingFilter.addEventListener('change', applyGameFiltersAndSearch);
gameRawgRatingFilter.addEventListener('change', applyGameFiltersAndSearch);

resetGameFiltersBtn.addEventListener('click', () => {
  gameSearchInput.value = '';
  gameGenreFilter.value = '';
  gamePlatformFilter.value = '';
  gameReleaseYearFilter.value = '';
  gameUserRatingFilter.value = '';
  gameRawgRatingFilter.value = '';
  setActiveGameView('all');
  applyGameFiltersAndSearch();
});

// View toggle for games collection
document.getElementById('viewAllGames').addEventListener('click', () => setActiveGameView('all'));
document.getElementById('viewPCGames').addEventListener('click', () => setActiveGameView('PC'));
document.getElementById('viewConsoleGames').addEventListener('click', () => setActiveGameView('Console'));

function setActiveGameView(viewType) {
  activeGameViewType = viewType;
  document.getElementById('viewAllGames').className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  document.getElementById('viewPCGames').className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  document.getElementById('viewConsoleGames').className = 'px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors';
  
  if (viewType === 'all') {
    document.getElementById('viewAllGames').className = 'px-3 py-2 bg-indigo-600 text-white rounded-l-md hover:bg-indigo-700 transition-colors';
  } else if (viewType === 'PC') {
    document.getElementById('viewPCGames').className = 'px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors';
  } else {
    document.getElementById('viewConsoleGames').className = 'px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 transition-colors';
  }
  
  applyGameFiltersAndSearch();
}

function applyGameFiltersAndSearch(resetIndex = true) {
  const searchTerm = gameSearchInput.value.toLowerCase();
  const genreValue = gameGenreFilter.value.toLowerCase();
  const platformValue = gamePlatformFilter.value.toLowerCase();
  const yearValue = gameReleaseYearFilter.value;
  const userRatingValue = gameUserRatingFilter.value;
  const rawgRatingValue = gameRawgRatingFilter.value;

  filteredGames = games.filter(game => {
    // Filter by view type (all, PC, Console)
    if (activeGameViewType !== 'all') {
      if (!game.platforms || !Array.isArray(game.platforms)) return false;
      
      const hasPlatformType = game.platforms.some(platform => {
        if (activeGameViewType === 'PC') {
          return platform.toLowerCase().includes('pc') || platform.toLowerCase().includes('windows');
        } else if (activeGameViewType === 'Console') {
          return platform.toLowerCase().includes('playstation') || 
                 platform.toLowerCase().includes('xbox') || 
                 platform.toLowerCase().includes('nintendo') || 
                 platform.toLowerCase().includes('switch');
        }
        return true;
      });
      
      if (!hasPlatformType) return false;
    }
    
    // Filter by search term
    if (searchTerm && !game.title.toLowerCase().includes(searchTerm)) {
      return false;
    }
    
    // Filter by genre
    if (genreValue && (!game.genre || !game.genre.toLowerCase().includes(genreValue))) {
      return false;
    }
    
    // Filter by platform
    if (platformValue && (!game.platforms || !game.platforms.some(p => p.toLowerCase().includes(platformValue)))) {
      return false;
    }
    
    // Filter by release year
    if (yearValue && game.release_date) {
      const gameYear = new Date(game.release_date).getFullYear();
      if (isNaN(gameYear) || gameYear !== parseInt(yearValue)) return false;
    }
    
    // Filter by user rating
    if (userRatingValue) {
      if (userRatingValue === 'notRated') {
        if (game.rating > 0) return false;
      } else {
        const minRating = parseFloat(userRatingValue);
        if (!game.rating || game.rating < minRating) return false;
      }
    }
    
    // Filter by RAWG rating
    if (rawgRatingValue) {
      if (rawgRatingValue === 'notRated') {
        if (game.rawg_rating > 0) return false;
      } else {
        const minRawgRating = parseFloat(rawgRatingValue);
        if (!game.rawg_rating || game.rawg_rating < minRawgRating) return false;
      }
    }
    
    return true;
  });

  // Only reset index if requested
  if (resetIndex) {
    currentGameIndex = 0;
  }
  
  updateGameDisplay();
}

function updateGameFilterOptions() {
  // Update genre filter options
  const genres = new Set();
  games.forEach(game => {
    if (game.genre) {
      game.genre.split(',').forEach(g => {
        genres.add(g.trim());
      });
    }
  });
  
  gameGenreFilter.innerHTML = '<option value="">All Genres</option>';
  [...genres].sort().forEach(genre => {
    if (genre) {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      gameGenreFilter.appendChild(option);
    }
  });
  
  // Update platform filter options
  const platforms = new Set();
  games.forEach(game => {
    if (game.platforms && Array.isArray(game.platforms)) {
      game.platforms.forEach(p => {
        platforms.add(p);
      });
    }
  });
// Add this to the games_main.js file

// First, ensure we have references to all the needed elements
const gameApiForm = document.getElementById('gameApiForm');
const gamesCsvForm = document.getElementById('gamesCsvForm');
const gameManualForm = document.getElementById('gameManualForm');
const gameApiTabBtn = document.getElementById('gameApiTabBtn');
const csvTabBtnGames = document.getElementById('csvTabBtnGames');
const gameManualTabBtn = document.getElementById('gameManualTabBtn');

// API tab click event
gameApiTabBtn.addEventListener('click', () => {
  // Show API form, hide others
  gameApiForm.classList.remove('hidden');
  gamesCsvForm.classList.add('hidden');
  gameManualForm.classList.add('hidden');
  
  // Update tab styling
  gameApiTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameApiTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  
  csvTabBtnGames.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  csvTabBtnGames.classList.add('text-gray-500', 'dark:text-gray-400');
  
  gameManualTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameManualTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
});

// CSV tab click event
csvTabBtnGames.addEventListener('click', () => {
  // Show CSV form, hide others
  gameApiForm.classList.add('hidden');
  gamesCsvForm.classList.remove('hidden');
  gameManualForm.classList.add('hidden');
  
  // Update tab styling
  csvTabBtnGames.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  csvTabBtnGames.classList.remove('text-gray-500', 'dark:text-gray-400');
  
  gameApiTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameApiTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  
  gameManualTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameManualTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
});

// Manual tab click event
gameManualTabBtn.addEventListener('click', () => {
  // Show Manual form, hide others
  gameApiForm.classList.add('hidden');
  gamesCsvForm.classList.add('hidden');
  gameManualForm.classList.remove('hidden');
  
  // Update tab styling
  gameManualTabBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameManualTabBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  
  gameApiTabBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  gameApiTabBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  
  csvTabBtnGames.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'border-b-2', 'border-indigo-600', 'dark:border-indigo-400');
  csvTabBtnGames.classList.add('text-gray-500', 'dark:text-gray-400');
});
  gamePlatformFilter.innerHTML = '<option value="">All Platforms</option>';
  [...platforms].sort().forEach(platform => {
    if (platform) {
      const option = document.createElement('option');
      option.value = platform;
      option.textContent = platform;
      gamePlatformFilter.appendChild(option);
    }
  });
  
  // Update release year filter options
  const years = new Set();
  games.forEach(game => {
    if (game.release_date) {
      const year = new Date(game.release_date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    }
  });
  
  gameReleaseYearFilter.innerHTML = '<option value="">All Years</option>';
  [...years].sort((a, b) => b - a).forEach(year => {  // Sort newest to oldest
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    gameReleaseYearFilter.appendChild(option);
  });
}

function updateGameDisplay() {
  const displayGames = filteredGames.length > 0 ? filteredGames : games;
  
  if (displayGames.length === 0) {
    gameEmptyState.classList.remove('hidden');
    gameNavigation.classList.add('hidden');
    return;
  }
  
  gameEmptyState.classList.add('hidden');
  gameNavigation.classList.remove('hidden');
  
  currentGameIndexEl.textContent = currentGameIndex + 1;
  totalGamesEl.textContent = displayGames.length;
  
  renderGame(displayGames[currentGameIndex]);
}

function renderGame(game) {
  const existingCards = document.querySelectorAll('.game-card');
  existingCards.forEach(card => card.remove());
  
  const gameCard = document.createElement('div');
  gameCard.className = 'game-card w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg';
  
  const imageUrl = game.background_image || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image';
  
  // Generate platforms badges
  let platformsHtml = '';
  if (game.platforms && Array.isArray(game.platforms) && game.platforms.length > 0) {
    platformsHtml = '<div class="mt-2 flex flex-wrap">';
    game.platforms.forEach(platform => {
      platformsHtml += `
        <span class="mr-2 mb-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
          ${platform}
        </span>
      `;
    });
    platformsHtml += '</div>';
  }
  
  // Generate stores badges
  let storesHtml = '';
  if (game.stores && Array.isArray(game.stores) && game.stores.length > 0) {
    storesHtml = '<div class="mt-4"><h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available on</h4><div class="flex flex-wrap">';
    game.stores.forEach(store => {
      storesHtml += `
        <span class="mr-2 mb-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
          ${store}
        </span>
      `;
    });
    storesHtml += '</div></div>';
  }
  
  gameCard.innerHTML = `
    <div class="flex flex-col md:flex-row">
      <div class="md:w-1/3 p-4 flex justify-center">
        <div class="relative">
          <img src="${imageUrl}" alt="${game.title}" class="poster-shadow h-64 md:h-80 object-cover rounded-lg">
        </div>
      </div>
      <div class="md:w-2/3 p-6">
        <div class="flex justify-between items-start">
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">${game.title}</h3>
        </div>
        <div class="mt-2 text-gray-600 dark:text-gray-400">
          ${game.release_date ? `<span class="mr-2">Released: ${new Date(game.release_date).toLocaleDateString()}</span>` : ''}
          ${game.genre ? `<span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">${game.genre}</span>` : ''}
        </div>
        ${platformsHtml}
        <div class="mt-4 flex flex-wrap">
          ${game.rating > 0 ? `
            <div class="rating-badge user-rating">
              ${generateStarRating(game.rating)}
              <span class="ml-1 text-xs">Your Rating</span>
            </div>` : ''
          }
          ${game.rawg_rating ? `
            <div class="rating-badge imdb-rating">
              <i class="fas fa-gamepad text-purple-600 mr-1"></i>
              <span>${game.rawg_rating}</span>
              <span class="ml-1 text-xs">RAWG</span>
            </div>` : ''
          }
        </div>
        ${storesHtml}
        ${game.notes ? `
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h4>
          <p class="text-gray-600 dark:text-gray-400">${game.notes}</p>
        </div>` : ''}
        <div class="mt-6 flex space-x-2">
          <button class="rate-game-btn px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors" data-id="${game.id}">
            <i class="fas fa-star mr-1"></i> Rate
          </button>
          <button class="edit-game-btn px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors" data-id="${game.id}">
            <i class="fas fa-edit mr-1"></i> Edit
          </button>
          <button class="delete-game-btn px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors" data-id="${game.id}">
            <i class="fas fa-trash-alt mr-1"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;
  
  gameContainer.appendChild(gameCard);
  
  gameCard.querySelector('.rate-game-btn').addEventListener('click', () => rateGame(game.id));
  gameCard.querySelector('.edit-game-btn').addEventListener('click', () => editGame(game.id));
  gameCard.querySelector('.delete-game-btn').addEventListener('click', () => deleteGame(game.id));
  
  setupSwipe(gameCard);
  
  // Apply entrance animation
  setTimeout(() => {
    gameCard.style.opacity = '1';
    gameCard.style.transform = 'translateY(0)';
  }, 10);
}
// Rate game function
function rateGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.3s ease';
  
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm transform scale-95 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Rate "${game.title}"
      </h3>
      <div class="mb-4 text-center">
        <fieldset class="rating inline-block" id="modalGameRating">
          <input type="radio" id="game-modal-star5" name="modalGameRating" value="5">
          <label class="full" for="game-modal-star5" title="Awesome - 5 stars"></label>
      
          <input type="radio" id="game-modal-star4half" name="modalGameRating" value="4.5">
          <label class="half" for="game-modal-star4half" title="Pretty good - 4.5 stars"></label>
      
          <input type="radio" id="game-modal-star4" name="modalGameRating" value="4">
          <label class="full" for="game-modal-star4" title="Pretty good - 4 stars"></label>
      
          <input type="radio" id="game-modal-star3half" name="modalGameRating" value="3.5">
          <label class="half" for="game-modal-star3half" title="Meh - 3.5 stars"></label>
      
          <input type="radio" id="game-modal-star3" name="modalGameRating" value="3">
          <label class="full" for="game-modal-star3" title="Meh - 3 stars"></label>
      
          <input type="radio" id="game-modal-star2half" name="modalGameRating" value="2.5">
          <label class="half" for="game-modal-star2half" title="Kinda bad - 2.5 stars"></label>
      
          <input type="radio" id="game-modal-star2" name="modalGameRating" value="2">
          <label class="full" for="game-modal-star2" title="Kinda bad - 2 stars"></label>
      
          <input type="radio" id="game-modal-star1half" name="modalGameRating" value="1.5">
          <label class="half" for="game-modal-star1half" title="Meh - 1.5 stars"></label>
      
          <input type="radio" id="game-modal-star1" name="modalGameRating" value="1">
          <label class="full" for="game-modal-star1" title="Sucks big time - 1 star"></label>
      
          <input type="radio" id="game-modal-star0.5" name="modalGameRating" value="0.5">
          <label class="half" for="game-modal-star0.5" title="Sucks big time - 0.5 stars"></label>
        </fieldset>
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to rate</div>
        
        <div class="mt-4">
          <button id="removeGameRatingBtn" class="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors ${game.rating > 0 ? '' : 'hidden'}">
            <i class="fas fa-times mr-1"></i> Remove Rating
          </button>
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        <button id="modalGameCancelBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Cancel
        </button>
        <button id="modalGameSaveBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
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
  
  if (game.rating > 0) {
    const currentRating = document.querySelector(`input[name="modalGameRating"][value="${game.rating}"]`);
    if (currentRating) currentRating.checked = true;
    document.getElementById('removeGameRatingBtn').classList.remove('hidden');
  } else {
    document.getElementById('removeGameRatingBtn').classList.add('hidden');
  }
  
  document.getElementById('modalGameCancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  // Handler for "Remove Rating" button
  document.getElementById('removeGameRatingBtn').addEventListener('click', () => {
    const oldRating = game.rating;
    game.rating = 0;
    
    fetch(`/api/games/${game.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(game)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to remove rating');
      }
      return response.json();
    })
    .then(() => {
      applyGameFiltersAndSearch();
      showNotification('Rating removed successfully!');
      closeModal(modal);
    })
    .catch(error => {
      console.error('Error removing rating:', error);
      game.rating = oldRating;
      showNotification('Error removing rating. Please try again.', 'error');
    });
  });
  
  document.getElementById('modalGameSaveBtn').addEventListener('click', () => {
    const selectedRating = document.querySelector('input[name="modalGameRating"]:checked');
    if (selectedRating) {
      const oldRating = game.rating;
      game.rating = parseFloat(selectedRating.value);
      
      fetch(`/api/games/${game.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(game)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update rating');
        }
        return response.json();
      })
      .then(() => {
        applyGameFiltersAndSearch(false);
        showNotification('Rating saved successfully!');
      })
      .catch(error => {
        console.error('Error updating rating:', error);
        game.rating = oldRating;
        showNotification('Error saving rating. Please try again.', 'error');
      });
    } else {
      showNotification('Please select a rating', 'error');
    }
    closeModal(modal);
  });
  
  function closeModal(modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  }
}

// Edit game function
function editGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  // Set the editingGameId global variable
  editingGameId = id;
  
  // First show the add title section
  showSection('gamesAddTitleSection');
  
  // Then populate the form
  setTimeout(() => {
    document.getElementById('gameTitle').value = game.title;
    document.getElementById('gameReleaseDate').value = game.release_date || '';
    document.getElementById('gameGenre').value = game.genre || '';
    document.getElementById('gameNotes').value = game.notes || '';
    document.getElementById('gameImage').value = game.background_image || '';
    
    // Reset all checkboxes first
    document.querySelectorAll('input[name="platforms[]"]').forEach(cb => {
      cb.checked = false;
    });
    
    // Check the appropriate platform checkboxes
    if (game.platforms && Array.isArray(game.platforms)) {
      game.platforms.forEach(platform => {
        const platformId = `platform_${platform.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const checkbox = document.getElementById(platformId);
        if (checkbox) {
          checkbox.checked = true;
        } else {
          // If the checkbox doesn't exist, create a new one
          const platformsContainer = document.querySelector('.grid:has(#platform_pc)'); // Find the platforms container
          if (platformsContainer) {
            const label = document.createElement('label');
            label.className = 'inline-flex items-center';
            label.innerHTML = `
              <input type="checkbox" class="form-checkbox h-4 w-4" name="platforms[]" id="${platformId}" value="${platform}" checked>
              <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${platform}</span>
            `;
            platformsContainer.appendChild(label);
          }
        }
      });
    }
    
    // Reset all store checkboxes first
    document.querySelectorAll('input[name="stores[]"]').forEach(cb => {
      cb.checked = false;
    });
    
    // Check the appropriate store checkboxes
    if (game.stores && Array.isArray(game.stores)) {
      game.stores.forEach(store => {
        const storeId = `store_${store.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const checkbox = document.getElementById(storeId);
        if (checkbox) {
          checkbox.checked = true;
        } else {
          // If the checkbox doesn't exist, create a new one
          const storesContainer = document.querySelector('.grid:has(#store_steam)'); // Find the stores container
          if (storesContainer) {
            const label = document.createElement('label');
            label.className = 'inline-flex items-center';
            label.innerHTML = `
              <input type="checkbox" class="form-checkbox h-4 w-4" name="stores[]" id="${storeId}" value="${store}" checked>
              <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${store}</span>
            `;
            storesContainer.appendChild(label);
          }
        }
      });
    }
    
    if (game.rating > 0) {
      const ratingInput = document.querySelector(`input[name="gameRating"][value="${game.rating}"]`);
      if (ratingInput) ratingInput.checked = true;
    } else {
      document.getElementById('gameNoRating').checked = true;
    }
    
    // Show which tab we're on
    gameManualTabBtn.click();
    
    // Change the submit button text
    const submitBtn = addGameForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Game';
    
    // Show the cancel button
    cancelGameEditBtn.classList.remove('hidden');
    
    // Smooth scroll to the form
    window.scrollTo({
      top: addGameForm.offsetTop - 20,
      behavior: 'smooth'
    });
  }, 100);
}

// Delete game function
function deleteGame(id) {
  // Create a confirmation modal with animation
  const confirmModal = document.createElement('div');
  confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  confirmModal.style.opacity = '0';
  confirmModal.style.transition = 'opacity 0.3s ease';
  
  confirmModal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm transform scale-95 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Confirm Deletion</h3>
      <p class="text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to delete this game? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2">
        <button id="cancelGameDeleteBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Cancel
        </button>
        <button id="confirmGameDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
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
  document.getElementById('cancelGameDeleteBtn').addEventListener('click', () => {
    closeConfirmModal();
  });
  
  document.getElementById('confirmGameDeleteBtn').addEventListener('click', () => {
    const index = games.findIndex(g => g.id === id);
    if (index === -1) return;
    
    fetch(`/api/games/${id}`, {
      method: 'DELETE'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to delete game');
      }
      return response.json();
    })
    .then(() => {
      games.splice(index, 1);
      const displayGames = filteredGames.length > 0 ? filteredGames : games;
      if (displayGames.length === 0) {
        currentGameIndex = 0;
      } else if (currentGameIndex >= displayGames.length) {
        currentGameIndex = displayGames.length - 1;
      }
      updateGameFilterOptions();
      applyGameFiltersAndSearch();
      showNotification('Game deleted successfully!');
      closeConfirmModal();
    })
    .catch(error => {
      console.error('Error deleting game:', error);
      showNotification('Error deleting game. Please try again.', 'error');
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

// Navigation buttons functionality
gamePrevBtn.addEventListener('click', () => {
  const displayGames = filteredGames.length > 0 ? filteredGames : games;
  if (displayGames.length === 0) return;
  
  const gameCard = document.querySelector('.game-card');
  gameCard.classList.add('swiping-right');
  
  setTimeout(() => {
    currentGameIndex = (currentGameIndex - 1 + displayGames.length) % displayGames.length;
    updateGameDisplay();
  }, 300);
});

gameNextBtn.addEventListener('click', () => {
  const displayGames = filteredGames.length > 0 ? filteredGames : games;
  if (displayGames.length === 0) return;
  
  const gameCard = document.querySelector('.game-card');
  gameCard.classList.add('swiping-left');
  
  setTimeout(() => {
    currentGameIndex = (currentGameIndex + 1) % displayGames.length;
    updateGameDisplay();
  }, 300);
});

// Function to update game statistics
let gameGenreChart;
// Variable für den Chart-Typ
let gameCurrentChartType = 'pie';

// Game Stats aktualisieren - mit besserer Fehlerbehandlung
function updateGameStats() {
  try {
    console.log("Updating game stats...");
    
    // Collection Overview aktualisieren - das funktioniert bereits
    const pcCount = games.filter(g => g.platforms && g.platforms.some(p => 
      p.toLowerCase().includes('pc') || p.toLowerCase().includes('windows'))).length;
    const consoleCount = games.filter(g => g.platforms && g.platforms.some(p => 
      p.toLowerCase().includes('playstation') || 
      p.toLowerCase().includes('xbox') || 
      p.toLowerCase().includes('nintendo') || 
      p.toLowerCase().includes('switch'))).length;
    const ratedCount = games.filter(g => g.rating > 0).length;
    const notRatedCount = games.length - ratedCount;
    
    // UI-Elemente aktualisieren
    document.getElementById('pcGameCount').textContent = pcCount;
    document.getElementById('consoleGameCount').textContent = consoleCount;
    document.getElementById('ratedGameCount').textContent = ratedCount;
    document.getElementById('notRatedGameCount').textContent = notRatedCount;
    document.getElementById('totalGamesCount').textContent = games.length;
    
    // Prozentangaben berechnen und anzeigen
    if (games.length > 0) {
      document.getElementById('pcGamePercentage').textContent = `(${Math.round(pcCount / games.length * 100)}%)`;
      document.getElementById('consoleGamePercentage').textContent = `(${Math.round(consoleCount / games.length * 100)}%)`;
      document.getElementById('ratedGamePercentage').textContent = `(${Math.round(ratedCount / games.length * 100)}%)`;
      document.getElementById('notRatedGamePercentage').textContent = `(${Math.round(notRatedCount / games.length * 100)}%)`;
    }
    
    // Genre-Verteilung berechnen
    const genreCounts = {};
    games.forEach(game => {
      if (game.genre) {
        game.genre.split(',').forEach(g => {
          const genre = g.trim();
          if (genre) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });
    
    // Chart-Daten vorbereiten
    const genreLabels = Object.keys(genreCounts);
    const genreData = Object.values(genreCounts);
    
    // Chart erstellen - prüfen, ob Chart.js verfügbar ist
    const chartCtx = document.getElementById('gameGenreChart');
    if (chartCtx && typeof Chart !== 'undefined') {
      // Vorhandenes Chart zerstören, falls es existiert
      if (gameGenreChart) {
        gameGenreChart.destroy();
      }
      
      const textColor = darkMode ? '#E2E8F0' : '#4A5568';
      
      // Chart-Konfiguration
      const chartConfig = {
        type: gameCurrentChartType,
        data: {
          labels: genreLabels,
          datasets: [{
            label: 'Number of Games',
            data: genreData,
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
            borderColor: darkMode ? '#1A202C' : '#FFFFFF',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: gameCurrentChartType === 'pie',
              position: 'right',
              labels: {
                color: textColor
              }
            },
            title: {
              display: false,
              text: 'Genre Distribution',
              color: textColor
            }
          },
          scales: {
            y: {
              display: gameCurrentChartType === 'bar',
              beginAtZero: true,
              ticks: {
                color: textColor
              },
              grid: {
                color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              display: gameCurrentChartType === 'bar',
              ticks: {
                color: textColor
              },
              grid: {
                display: false
              }
            }
          }
        }
      };
      
      // Chart erstellen
      gameGenreChart = new Chart(chartCtx, chartConfig);
    } else {
      console.error("Chart.js not available or canvas element not found");
    }
    
    // Lieblingsspiele aktualisieren
    const favoritesList = document.getElementById('gameFavoritesList');
    if (favoritesList) {
      const favoriteGames = games
        .filter(g => g.rating > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
      
      if (favoriteGames.length > 0) {
        let html = '<ul class="space-y-2">';
        favoriteGames.forEach((game, index) => {
          html += `
            <li class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <div class="flex items-center">
                <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
                <i class="fas fa-gamepad text-indigo-500 dark:text-indigo-400 mr-2"></i>
                <span class="text-gray-700 dark:text-gray-300">${game.title}</span>
              </div>
              <div class="flex items-center">
                <span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${game.rating}/5</span>
              </div>
            </li>
          `;
        });
        html += '</ul>';
        
        favoritesList.innerHTML = html;
      } else {
        favoritesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">Rate your games to see your favorites here.</p>';
      }
    }
  } catch (error) {
    console.error("Error updating game stats:", error);
  }
}
function switchGameChartType(type) {
  if (type === gameCurrentChartType) return;
  
  gameCurrentChartType = type;
  
  // Button-Styling aktualisieren
  if (type === 'pie') {
    document.getElementById('gamePieChartBtn').className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-l-md';
    document.getElementById('gameBarChartBtn').className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md';
  } else {
    document.getElementById('gamePieChartBtn').className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md';
    document.getElementById('gameBarChartBtn').className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-r-md';
  }
  
  // Stats neu laden, um Chart zu aktualisieren
  updateGameStats();
}

// Event-Listener für Chart-Typ-Buttons
document.addEventListener('DOMContentLoaded', function() {
  const pieChartBtn = document.getElementById('gamePieChartBtn');
  const barChartBtn = document.getElementById('gameBarChartBtn');
  
  if (pieChartBtn) {
    pieChartBtn.addEventListener('click', () => switchGameChartType('pie'));
  }
  
  if (barChartBtn) {
    barChartBtn.addEventListener('click', () => switchGameChartType('bar'));
  }
});
// Chart type switching
document.getElementById('gamePieChartBtn').addEventListener('click', () => {
  if (window.gameGenreChart && window.gameGenreChart.config.type !== 'pie') {
    window.gameGenreChart.destroy();
    window.gameGenreChart = null;
    document.getElementById('gamePieChartBtn').className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-l-md';
    document.getElementById('gameBarChartBtn').className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md';
    updateGameStats();
  }
});
// Globale Variablen für KI-Vorschläge
let gameGenrePreferences = {};
let gameFavoritesList = [];
let gameGenreRankingMode = 'count'; // 'count' oder 'user'

// Genre-Präferenzen laden
function loadGameGenreAnalysis() {
  try {
    console.log("Loading game genre analysis");
    const selectionMode = document.querySelector('input[name="gameSelectionMode"]:checked').value;
    const genrePreferencesList = document.getElementById('gameGenrePreferencesList');
    
    if (!genrePreferencesList) {
      console.error("Genre preferences list element not found");
      return;
    }
    
    // Spiele basierend auf Auswahlmodus filtern
    let selectedGames = [];
    if (selectionMode === 'rated') {
      selectedGames = games.filter(g => g.rating > 0);
    } else {
      selectedGames = games;
    }
    
    // Genre-Analyse nach Modus laden
    if (gameGenreRankingMode === 'count') {
      loadGameGenreAnalysisByCount(selectedGames, genrePreferencesList);
    } else {
      loadGameGenreAnalysisByUserRating(selectedGames, genrePreferencesList);
    }
  } catch (error) {
    console.error("Error loading game genre analysis:", error);
    const genrePreferencesList = document.getElementById('gameGenrePreferencesList');
    if (genrePreferencesList) {
      genrePreferencesList.innerHTML = '<p class="text-red-500">Error loading genre analysis</p>';
    }
  }
}

// Genre-Analyse nach Häufigkeit
function loadGameGenreAnalysisByCount(selectedGames, genrePreferencesList) {
  // Genre-Häufigkeiten ermitteln
  const genreCounts = {};
  selectedGames.forEach(game => {
    if (game.genre) {
      game.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });
  
  // Nach Häufigkeit sortieren
  const sortedGenres = Object.keys(genreCounts).map(genre => {
    return {
      genre,
      count: genreCounts[genre]
    };
  }).sort((a, b) => b.count - a.count);
  
  if (sortedGenres.length === 0) {
    genrePreferencesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No genre data available</p>';
    return;
  }
  
  // Bewertungen berechnen (häufigstes Genre = 5 Sterne, seltenstes = 1.5)
  const maxCount = sortedGenres[0].count;
  const minCount = sortedGenres[sortedGenres.length - 1].count;
  
  sortedGenres.forEach(item => {
    if (maxCount === minCount) {
      item.rating = 5.0;
    } else {
      const range = 5.0 - 1.5;
      const scale = (item.count - minCount) / (maxCount - minCount);
      item.rating = 1.5 + (scale * range);
      item.rating = Math.round(item.rating * 10) / 10; // Auf eine Dezimalstelle runden
    }
  });
  
  // HTML für die Liste generieren
  let html = '<ul class="space-y-2">';
  sortedGenres.forEach(item => {
    const ratingDisplay = `<span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${item.rating.toFixed(1)}/5</span>`;
    
    html += `
      <li class="flex justify-between items-center">
        <span class="text-gray-700 dark:text-gray-300">${item.genre}</span>
        <div class="flex items-center space-x-3">
          <span class="text-gray-500 dark:text-gray-400 text-sm">${item.count} games</span>
          ${ratingDisplay}
        </div>
      </li>
    `;
  });
  html += '</ul>';
  
  genrePreferencesList.innerHTML = html;
  
  // Globale Variable aktualisieren für KI-Vorschläge
  gameGenrePreferences = {};
  sortedGenres.forEach(item => {
    gameGenrePreferences[item.genre] = item.rating;
  });
}

// Genre-Analyse nach Benutzer-Bewertungen
function loadGameGenreAnalysisByUserRating(selectedGames, genrePreferencesList) {
  // Genre-Bewertungen analysieren
  const genreRatings = {};
  const genreCounts = {};
  
  selectedGames.forEach(game => {
    if (game.genre && game.rating > 0) {
      game.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          if (!genreRatings[genre]) {
            genreRatings[genre] = {
              total: 0,
              count: 0
            };
          }
          
          genreRatings[genre].total += game.rating;
          genreRatings[genre].count++;
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });
  
  // Durchschnitte berechnen und sortieren
  const sortedGenres = Object.keys(genreRatings).map(genre => {
    const data = genreRatings[genre];
    const count = genreCounts[genre] || 0;
    const avgRating = data.count > 0 ? data.total / data.count : 0;
    
    return {
      genre,
      avgRating: parseFloat(avgRating.toFixed(1)),
      count
    };
  }).sort((a, b) => b.avgRating - a.avgRating);
  
  if (sortedGenres.length === 0) {
    genrePreferencesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No rated genres available</p>';
    return;
  }
  
  // HTML für die Liste generieren
  let html = '<ul class="space-y-2">';
  sortedGenres.forEach(item => {
    const ratingDisplay = `<span class="text-yellow-500"><i class="fas fa-star mr-1"></i>${item.avgRating.toFixed(1)}/5</span>`;
    
    html += `
      <li class="flex justify-between items-center">
        <span class="text-gray-700 dark:text-gray-300">${item.genre}</span>
        <div class="flex items-center space-x-3">
          <span class="text-gray-500 dark:text-gray-400 text-sm">${item.count} games</span>
          ${ratingDisplay}
        </div>
      </li>
    `;
  });
  html += '</ul>';
  
  genrePreferencesList.innerHTML = html;
  
  // Globale Variable aktualisieren für KI-Vorschläge
  gameGenrePreferences = {};
  sortedGenres.forEach(item => {
    gameGenrePreferences[item.genre] = item.avgRating;
  });
}

// Lieblingsspiele laden
function loadGameFavorites() {
  try {
    const favoriteTitlesList = document.getElementById('gameFavoriteTitlesList');
    
    if (!favoriteTitlesList) {
      console.error("Favorite titles list element not found");
      return;
    }
    
    // Mit Bewertung versehene Spiele holen und nach Bewertung sortieren
    const ratedGames = games.filter(g => g.rating > 0)
      .sort((a, b) => b.rating - a.rating);
    
    // Top 10 auswählen
    gameFavoritesList = ratedGames.slice(0, 10).map(g => ({
      id: g.id,
      title: g.title,
      rating: g.rating,
      platforms: g.platforms || []
    }));
    
    if (gameFavoritesList.length > 0) {
      let html = '<ul class="space-y-2" id="editableGameFavoritesList">';
      gameFavoritesList.forEach((item, index) => {
        // Platform-Icon bestimmen
        const isPCGame = item.platforms && item.platforms.some(p => 
          p.toLowerCase().includes('pc') || p.toLowerCase().includes('windows'));
        const isConsoleGame = item.platforms && item.platforms.some(p => 
          p.toLowerCase().includes('playstation') || 
          p.toLowerCase().includes('xbox') || 
          p.toLowerCase().includes('nintendo') || 
          p.toLowerCase().includes('switch'));
        
        const platformIcon = isPCGame ? 'desktop' : (isConsoleGame ? 'gamepad' : 'gamepad');
        
        html += `
          <li class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md group" data-id="${item.id}">
            <div class="flex items-center">
              <span class="text-gray-500 dark:text-gray-400 mr-2">${index + 1}.</span>
              <i class="fas fa-${platformIcon} text-indigo-500 dark:text-indigo-400 mr-2"></i>
              <span class="text-gray-700 dark:text-gray-300">${item.title}</span>
            </div>
            <div class="flex items-center">
              <span class="text-yellow-500 mr-3"><i class="fas fa-star mr-1"></i>${item.rating}/5</span>
              <button type="button" class="game-favorite-remove-btn text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </li>
        `;
      });
      html += '</ul>';
      
      favoriteTitlesList.innerHTML = html;
      
      // Event-Listener für "Remove"-Buttons
      document.querySelectorAll('.game-favorite-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const listItem = e.target.closest('li');
          const itemId = listItem.dataset.id;
          
          // Aus Favoritenliste entfernen
          gameFavoritesList = gameFavoritesList.filter(item => item.id != itemId);
          
          // UI aktualisieren
          listItem.classList.add('opacity-50');
          setTimeout(() => {
            listItem.remove();
            
            // Nachricht anzeigen, wenn keine Favoriten mehr vorhanden
            if (gameFavoritesList.length === 0) {
              favoriteTitlesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Rate your games to see your favorites here.</p>';
            }
          }, 300);
        });
      });
    } else {
      favoriteTitlesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Rate your games to see your favorites here.</p>';
    }
  } catch (error) {
    console.error("Error loading game favorites:", error);
    const favoriteTitlesList = document.getElementById('gameFavoriteTitlesList');
    if (favoriteTitlesList) {
      favoriteTitlesList.innerHTML = '<p class="text-red-500">Error loading favorites</p>';
    }
  }
}

// Ranking-Modus setzen (nach Anzahl oder Bewertung)
function setGameRankingMode(mode) {
  gameGenreRankingMode = mode;
  
  // Button-Styling aktualisieren
  const genreCountBtn = document.getElementById('gameGenreCountBtn');
  const userRankingBtn = document.getElementById('gameUserRankingBtn');
  
  if (mode === 'count') {
    genreCountBtn.className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-l-md';
    userRankingBtn.className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-md';
  } else {
    genreCountBtn.className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md';
    userRankingBtn.className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-r-md';
  }
  
  // Genre-Analyse neu laden
  loadGameGenreAnalysis();
}

// Formular für KI-Vorschläge
document.addEventListener('DOMContentLoaded', function() {
  // Ranking-Buttons initialisieren
  const genreCountBtn = document.getElementById('gameGenreCountBtn');
  const userRankingBtn = document.getElementById('gameUserRankingBtn');
  
  if (genreCountBtn) {
    genreCountBtn.addEventListener('click', () => setGameRankingMode('count'));
  }
  
  if (userRankingBtn) {
    userRankingBtn.addEventListener('click', () => setGameRankingMode('user'));
  }
  
  // Auswahlmodus-Änderung
  document.querySelectorAll('input[name="gameSelectionMode"]').forEach(radio => {
    radio.addEventListener('change', loadGameGenreAnalysis);
  });
  
  // Formular-Handler für KI-Vorschläge
  const gamesAiSuggestionsForm = document.getElementById('gamesAiSuggestionsForm');
  if (gamesAiSuggestionsForm) {
    gamesAiSuggestionsForm.addEventListener('submit', function(e) {
      e.preventDefault(); // Verhindert die Standard-Formular-Aktion
      
      // Loading-Status anzeigen
      const suggestionsContainer = document.getElementById('gameSuggestionsResultsContainer');
      const loadingElement = document.getElementById('loadingGameSuggestions');
      const suggestionsListElement = document.getElementById('gamesSuggestionsList');
      
      suggestionsContainer.classList.remove('hidden');
      loadingElement.classList.remove('hidden');
      suggestionsListElement.innerHTML = '';
      
      // Formulardaten sammeln
      const selectionMode = document.querySelector('input[name="gameSelectionMode"]:checked').value;
      const contentType = document.getElementById('gameContentType').value;
      const suggestionCount = parseInt(document.getElementById('gameSuggestionCount').value);
      const description = document.getElementById('gameDescription').value;
      
      // Button deaktivieren
      const submitBtn = document.getElementById('generateGameSuggestionsBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
      
      // Anfrage vorbereiten
      const requestData = {
        selectionMode,
        contentType,
        suggestionCount,
        description,
        favorites: gameFavoritesList
      };
      console.log(JSON.stringify(requestData))
      // API-Anfrage senden
      fetch('/api/ai_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => response.json())
      .then(data => {
        // Loading ausblenden
        loadingElement.classList.add('hidden');
        console.log(data);
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          // Empfehlungen anzeigen
          let html = '';
          data.recommendations.forEach(recommendation => {
            const posterUrl = recommendation.background_image || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image';
            
            // Plattformen anzeigen
            let platformsHtml = '';
            if (recommendation.platforms && recommendation.platforms.length > 0) {
              platformsHtml = '<div class="mt-1 flex flex-wrap">';
              recommendation.platforms.forEach(platform => {
                platformsHtml += `
                  <span class="mr-1 mb-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                    ${platform}
                  </span>
                `;
              });
              platformsHtml += '</div>';
            }
            const gameDataJSON = JSON.stringify(recommendation);
            html += `
              <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
                <div class="relative">
                  <img src="${posterUrl}" alt="${recommendation.title}" class="w-full h-48 object-cover">
                  <span class="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded-full text-xs">
                    <i class="fas fa-gamepad mr-1"></i> Game
                  </span>
                </div>
                <div class="p-4">
                  <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">${recommendation.title}</h4>
                  ${platformsHtml}
                  ${recommendation.release_date ? `<div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Released: ${new Date(recommendation.release_date).toLocaleDateString()}</div>` : ''}
                  ${recommendation.genre ? `<div class="text-sm text-gray-600 dark:text-gray-400 mb-2">${recommendation.genre}</div>` : ''}
                  ${recommendation.rawg_rating ? `
                    <div class="flex items-center mb-2">
                      <i class="fas fa-star text-yellow-500 mr-1"></i>
                      <span class="text-gray-700 dark:text-gray-300">${recommendation.rawg_rating}</span>
                      <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">RAWG</span>
                    </div>` : ''
                  }
                <button class="... add-game-to-collection" data-game='${gameDataJSON}'>
                    <i class="fas fa-plus mr-1"></i> Add to Collection
                  </button>
                </div>
              </div>
            `;
          });
          
          suggestionsListElement.innerHTML = html;
        
        // Replace the event handler for 'add-game-to-collection' buttons
// Die korrigierte Version
        document.querySelectorAll('.add-game-to-collection').forEach(btn => {
          btn.addEventListener('click', function() {
            const title = this.getAttribute('data-title');
            if (title) {
              // Erstellen Sie ein einfaches Game-Objekt mit dem Titel
              const gameData = {
                title: title,
                // Optional: Fügen Sie weitere Standardwerte hinzu, die benötigt werden könnten
                platforms: [],
                stores: [],
                background_image: 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image',
                rating: 0
              };
              addGameToCollection(gameData);
            } else {
              console.error('Game title missing for add to collection button');
              showNotification('Fehler beim Hinzufügen: Spieltitel fehlt', 'error');
            }
          });
        });
        } else {
          // Fehlermeldung oder keine Ergebnisse
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
        console.error('Error getting game AI suggestions:', error);
        
        // Fehlermeldung anzeigen
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
        // Button wieder aktivieren
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
    });
  }
});

// Initialisierung, wenn die Games-Sektion angezeigt wird
// Formular für KI-Vorschläge
document.addEventListener('DOMContentLoaded', function() {
  // Ranking-Buttons initialisieren
  const genreCountBtn = document.getElementById('gameGenreCountBtn');
  const userRankingBtn = document.getElementById('gameUserRankingBtn');
  
  if (genreCountBtn) {
    genreCountBtn.addEventListener('click', () => setGameRankingMode('count'));
  }
  
  if (userRankingBtn) {
    userRankingBtn.addEventListener('click', () => setGameRankingMode('user'));
  }
  
  // Auswahlmodus-Änderung
  document.querySelectorAll('input[name="gameSelectionMode"]').forEach(radio => {
    radio.addEventListener('change', loadGameGenreAnalysis);
  });
  
  // Formular-Handler für KI-Vorschläge
  const gamesAiSuggestionsForm = document.getElementById('gamesAiSuggestionsForm');
  if (gamesAiSuggestionsForm) {
    gamesAiSuggestionsForm.addEventListener('submit', function(e) {
      e.preventDefault(); // Verhindert die Standard-Formular-Aktion
      
      // Loading-Status anzeigen
      const suggestionsContainer = document.getElementById('gameSuggestionsResultsContainer');
      const loadingElement = document.getElementById('loadingGameSuggestions');
      const suggestionsListElement = document.getElementById('gamesSuggestionsList');
      
      suggestionsContainer.classList.remove('hidden');
      loadingElement.classList.remove('hidden');
      suggestionsListElement.innerHTML = '';
      
      // Formulardaten sammeln
      const selectionMode = document.querySelector('input[name="gameSelectionMode"]:checked').value;
      const contentType = document.getElementById('gameContentType').value;
      const suggestionCount = parseInt(document.getElementById('gameSuggestionCount').value);
      const description = document.getElementById('gameDescription').value;
      
      // Button deaktivieren
      const submitBtn = document.getElementById('generateGameSuggestionsBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
      
      // Anfrage vorbereiten
      const requestData = {
        selectionMode,
        contentType,
        suggestionCount,
        description,
        favorites: gameFavoritesList
      };
      console.log(JSON.stringify(requestData))
      // API-Anfrage senden
      fetch('/api/ai_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => response.json())
      .then(data => {
        // Loading ausblenden
        loadingElement.classList.add('hidden');
        console.log(data);
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          // Empfehlungen anzeigen
          let html = '';
          data.recommendations.forEach(recommendation => {
            const posterUrl = recommendation.background_image || 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image';
            
            // Plattformen anzeigen
            let platformsHtml = '';
            if (recommendation.platforms && recommendation.platforms.length > 0) {
              platformsHtml = '<div class="mt-1 flex flex-wrap">';
              recommendation.platforms.forEach(platform => {
                platformsHtml += `
                  <span class="mr-1 mb-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                    ${platform}
                  </span>
                `;
              });
              platformsHtml += '</div>';
            }
            
            // Sicherstellen, dass das JSON korrekt formatiert ist
            const gameDataJSON = JSON.stringify(recommendation).replace(/'/g, "&#39;");
            
            html += `
              <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
                <div class="relative">
                  <img src="${posterUrl}" alt="${recommendation.title}" class="w-full h-48 object-cover">
                  <span class="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded-full text-xs">
                    <i class="fas fa-gamepad mr-1"></i> Game
                  </span>
                </div>
                <div class="p-4">
                  <h4 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">${recommendation.title}</h4>
                  ${platformsHtml}
                  ${recommendation.release_date ? `<div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Released: ${new Date(recommendation.release_date).toLocaleDateString()}</div>` : ''}
                  ${recommendation.genre ? `<div class="text-sm text-gray-600 dark:text-gray-400 mb-2">${recommendation.genre}</div>` : ''}
                  ${recommendation.rawg_rating ? `
                    <div class="flex items-center mb-2">
                      <i class="fas fa-star text-yellow-500 mr-1"></i>
                      <span class="text-gray-700 dark:text-gray-300">${recommendation.rawg_rating}</span>
                      <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">RAWG</span>
                    </div>` : ''
                  }
                  <button class="w-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 py-2 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors add-game-to-collection" 
                         data-title="${recommendation.title}" 
                         data-game='${gameDataJSON}'>
                    <i class="fas fa-plus mr-1"></i> Add to Collection
                  </button>
                </div>
              </div>
            `;
          });
          
          suggestionsListElement.innerHTML = html;
        
          // Verbesserte Event-Handler für 'add-game-to-collection' Buttons
          document.querySelectorAll('.add-game-to-collection').forEach(btn => {
            btn.addEventListener('click', function() {
              let gameData;
              
              try {
                // Versuche zuerst, die vollständigen Spieldaten zu bekommen
                const gameDataJson = this.getAttribute('data-game');
                if (gameDataJson) {
                  gameData = JSON.parse(gameDataJson);
                } else {
                  // Fallback auf einfachen Titel
                  const title = this.getAttribute('data-title');
                  if (title) {
                    gameData = {
                      title: title,
                      platforms: [],
                      stores: [],
                      background_image: 'https://placehold.co/300x450/e2e8f0/1e293b?text=No+Image',
                      rating: 0
                    };
                  } else {
                    throw new Error('No game data available');
                  }
                }
                
                console.log("Adding game to collection:", gameData.title);
                addGameToCollection(gameData);
                
              } catch (e) {
                console.error('Error processing game data:', e);
                showNotification('Fehler beim Hinzufügen des Spiels: ' + e.message, 'error');
              }
            });
          });
        } else {
          // Fehlermeldung oder keine Ergebnisse
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
        console.error('Error getting game AI suggestions:', error);
        
        // Fehlermeldung anzeigen
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
        // Button wieder aktivieren
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
    });
  }
});

// Initialisierung, wenn die Games-Sektion angezeigt wird
document.addEventListener('DOMContentLoaded', function() {
  // Menü-Listener für Games-AI-Suggestions
  const menuAiSuggestions = document.getElementById('menuAiSuggestions');
  if (menuAiSuggestions) {
    menuAiSuggestions.addEventListener('click', function() {
      const currentMode = localStorage.getItem('omnibaseMode');
      if (currentMode === 'Games') {
        // Für Spiele die entsprechenden Funktionen aufrufen
        setTimeout(() => {
          loadGameGenreAnalysis();
          loadGameFavorites();
        }, 100);
      }
    });
  }
});
document.getElementById('gameBarChartBtn').addEventListener('click', () => {
  if (window.gameGenreChart && window.gameGenreChart.config.type !== 'bar') {
    window.gameGenreChart.destroy();
    
    const textColor = darkMode ? '#E2E8F0' : '#4A5568';
    const genreCounts = {};
    
    games.forEach(game => {
      if (game.genre) {
        game.genre.split(',').forEach(g => {
          const genre = g.trim();
          if (genre) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });
    
    const genreLabels = Object.keys(genreCounts);
    const genreData = Object.values(genreCounts);
    
    const chartCtx = document.getElementById('gameGenreChart');
    window.gameGenreChart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: genreLabels,
        datasets: [{
          label: 'Number of Games',
          data: genreData,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor
            },
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            ticks: {
              color: textColor
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
    
    document.getElementById('gamePieChartBtn').className = 'px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-md';
    document.getElementById('gameBarChartBtn').className = 'px-2 py-1 text-xs bg-indigo-600 text-white rounded-r-md';
  }
});
// Beim Laden der Seite gespeicherte Gaming-Persona auslesen und anwenden
document.addEventListener('DOMContentLoaded', () => {
  const savedPersona = localStorage.getItem('gamingPersona');
  if (savedPersona) {
    try {
      const result = JSON.parse(savedPersona);
      if (result.persona && result.description) {
        document.getElementById('gamePersonaTitle').textContent = result.persona;
        document.getElementById('gamePersonaDescription').textContent = result.description;
        document.getElementById('gamePersonaPlaceholder').classList.add('hidden');
        document.getElementById('gamePersonaContent').classList.remove('hidden');
      }
    } catch (e) {
      console.error('Fehler beim Laden der gespeicherten Gaming-Persona:', e);
    }
  }
});

document.getElementById('generateGamePersonaBtn').addEventListener('click', () => {
  const btn = document.getElementById('generateGamePersonaBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  // Daten zu den Gaming-Präferenzen sammeln
  const favoriteGames = games
    .filter(g => g.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);
  
  // Genre-Präferenzen sammeln
  const genreCounts = {};
  games.forEach(game => {
    if (game.genre) {
      game.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (genre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    }
  });
  
  // Prompt für AI erstellen
  let prompt = "Based on my video game preferences, create a 'gaming persona' that describes my taste in 1-2 words, followed by a 4-5 sentence description of my gaming profile.";
  
  // Lieblingsspiele hinzufügen
  if (favoriteGames.length > 0) {
    prompt += " My favorite games are: ";
    prompt += favoriteGames.map(g => `${g.title} (${g.rating}/5)`).join(", ");
    prompt += ".";
  }
  
  // Genre-Präferenzen hinzufügen
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (sortedGenres.length > 0) {
    prompt += " My most played genres are: ";
    prompt += sortedGenres.map(([genre, count]) => `${genre} (${count} games)`).join(", ");
    prompt += ".";
  }
  
  // Plattforminformationen hinzufügen
  const pcCount = games.filter(g => g.platforms && g.platforms.some(p => p.toLowerCase().includes('pc'))).length;
  const consoleCount = games.filter(g => g.platforms && g.platforms.some(p => 
    p.toLowerCase().includes('playstation') || 
    p.toLowerCase().includes('xbox') || 
    p.toLowerCase().includes('nintendo')
  )).length;
  
  if (pcCount > 0 || consoleCount > 0) {
    prompt += ` I play on ${pcCount > 0 ? 'PC' : ''}${pcCount > 0 && consoleCount > 0 ? ' and ' : ''}${consoleCount > 0 ? 'console' : ''}.`;
  }
  
  // Ausgabeanweisungen formatieren
  prompt += " Please respond ONLY with a JSON object in this format: {\"persona\":\"1-2 word description\", \"description\":\"4-5 sentences about my gaming profile\"}. Do not include any other text. Please provide tge Text in the Language '"+currentLanguage+"'";
  
  // AI-Aufruf zur Generierung der Persona
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
        // JSON aus der Antwort extrahieren
        const jsonMatch = data.answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.persona && result.description) {
            document.getElementById('gamePersonaTitle').textContent = result.persona;
            document.getElementById('gamePersonaDescription').textContent = result.description;
            document.getElementById('gamePersonaPlaceholder').classList.add('hidden');
            document.getElementById('gamePersonaContent').classList.remove('hidden');
            // Persona im localStorage speichern
            localStorage.setItem('gamingPersona', JSON.stringify(result));
          }
        } else {
          throw new Error('Invalid JSON format in response');
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
        showNotification('Could not generate gaming persona. Please try again.', 'error');
      }
    } else {
      showNotification('Could not generate gaming persona. Please try again.', 'error');
    }
  })
  .catch(error => {
    console.error('Error generating gaming persona:', error);
    btn.disabled = false;
    btn.innerHTML = 'Generate';
    showNotification('Error connecting to AI service. Please try again.', 'error');
  });
});


// Initialize on load if on games section
document.addEventListener('DOMContentLoaded', () => {
  const currentMode = localStorage.getItem('omnibaseMode');
  if (currentMode === 'Games') {
    fetchGames();
  }
  
  // Setup game filter toggle
  if (gameFilterToggle) {
    gameFilterToggle.addEventListener('click', () => {
      gameFilterOptions.classList.toggle('expanded');
    });
  }
});
// File: static/js/games_main.js

document.addEventListener('DOMContentLoaded', function () {
    // Elemente für Games-CSV Upload
    const gamesCsvFileInput = document.getElementById('gamesCsvFile');
    const gamesBrowseBtn = document.getElementById('gamesBrowseBtn');
    const gamesImportBtn = document.getElementById('gamesImportBtn');
    const gamesSelectedFileName = document.getElementById('gamesSelectedFileName');
    const gamesDropZone = document.getElementById('gamesDropZone');
  
    // Beim Klick auf "Browse Files" den Dateidialog öffnen
    gamesBrowseBtn.addEventListener('click', () => {
      gamesCsvFileInput.click();
    });
  
    // Bei Dateiänderung: Dateinamen anzeigen und Import-Button aktivieren
    gamesCsvFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        gamesSelectedFileName.textContent = e.target.files[0].name;
        gamesSelectedFileName.classList.remove('hidden');
        gamesImportBtn.disabled = false;
      } else {
        gamesSelectedFileName.classList.add('hidden');
        gamesImportBtn.disabled = true;
      }
    });
  
    // Standard-DnD-Verhalten unterbinden
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      gamesDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
  
    // Hervorheben beim Draggeover/Dragenter
    ['dragenter', 'dragover'].forEach(eventName => {
      gamesDropZone.addEventListener(eventName, () => {
        gamesDropZone.classList.add('border-indigo-300', 'dark:border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900', 'scale-105');
        gamesDropZone.style.transition = 'all 0.2s ease';
      }, false);
    });
  
    // Hervorhebung bei Dragleave/Dropped entfernen
    ['dragleave', 'drop'].forEach(eventName => {
      gamesDropZone.addEventListener(eventName, () => {
        gamesDropZone.classList.remove('border-indigo-300', 'dark:border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900', 'scale-105');
      }, false);
    });
  
    // Behandlung des Drops: Datei übernehmen und UI aktualisieren
    gamesDropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        gamesCsvFileInput.files = files;
        gamesSelectedFileName.textContent = files[0].name;
        gamesSelectedFileName.classList.remove('hidden');
        gamesImportBtn.disabled = false;
      }
    });
  
    // Beim Klick auf "Import Content" den CSV-File per API senden
    gamesImportBtn.addEventListener('click', () => {
      if (gamesCsvFileInput.files.length === 0) return;
  
      const formData = new FormData();
      formData.append('file', gamesCsvFileInput.files[0]);
  
      // API-Aufruf an den Games-Import Endpunkt
      fetch('/api/import/games', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showNotification(`Imported ${data.imported} game items successfully! (${data.skipped} skipped)`);
            // Hier wird angenommen, dass es eine fetchGames()-Funktion gibt,
            // die die Games-Collection neu lädt.
            if (typeof fetchGames === 'function') {
              fetchGames();
            }
            gamesCsvFileInput.value = '';
            gamesSelectedFileName.classList.add('hidden');
            gamesImportBtn.disabled = true;
          } else {
            showNotification(`Error: ${data.error}`, 'error');
          }
        })
        .catch(error => {
          console.error('Error importing games CSV:', error);
          showNotification('Error importing games CSV. Please check the console for details.', 'error');
        });
    });
  
    // Hilfsfunktion zum Anzeigen von Benachrichtigungen (sofern nicht bereits global vorhanden)
    function showNotification(message, type = 'success') {
      const notification = document.createElement('div');
      notification.className = `fixed bottom-4 right-4 py-2 px-4 rounded-md shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white z-50 notification transform translate-y-10 opacity-0 transition-all duration-300`;
      notification.textContent = message;
  
      document.body.appendChild(notification);
  
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
  });
