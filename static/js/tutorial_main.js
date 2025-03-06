document.addEventListener('DOMContentLoaded', function () {
    const steamTutorialBtn = document.getElementById('steamTutorialBtn');
    const spotifyTutorialBtn = document.getElementById('spotifyTutorialBtn');
    const primeTutorialBtn = document.getElementById('primeTutorialBtn');
    const epicGamesTutorialBtn = document.getElementById('epicGamesTutorialBtn');
    const tutorialModal = document.getElementById('tutorialModal');
    const tutorialModalContent = document.getElementById('tutorialModalContent');
    const tutorialModalClose = document.getElementById('tutorialModalClose');
    const tutorial_extra_info = document.getElementById('tutorial_extra_info');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const openWebsiteBtn = document.getElementById('openWebsiteBtn');
    let tutorialMode = "";


    let currentCode = '';

    // Code-Snippet für Steam
    const steamCode = `function exportGamesToCSV() {
      let rows = document.querySelectorAll(".account_table tbody tr");
      let csvContent = "game_title,date\\n";
      
      rows.forEach((row, index) => {
          if (index === 0) return;
          
          let date = row.querySelector(".license_date_col")?.innerText.trim();
          let titleElement = row.querySelector("td:nth-child(2)");
          let title = titleElement ? titleElement.childNodes[titleElement.childNodes.length - 1].textContent.trim() : "";
          
          if (date && title) {
              csvContent += \`"\${title}","\${date}"\\n\`;
          }
      });
      
      let blob = new Blob([csvContent], { type: "text/csv" });
      let link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "steam_games.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
  
  exportGamesToCSV();`;

    // Code-Snippet für EpicGames
    const epicGamesCode = `function clickButtonUntilGoneAndExtract(freeGames = false) {
    const buttonSelector = "#payment-history-show-more-button";
    
    function clickLoop() {
      const button = document.querySelector(buttonSelector);
      if (button) {
        button.click();
        console.log("Button clicked");
        setTimeout(clickLoop, 100);
      } else {
        console.log("Button no longer exists. Extracting data...");
        extractDataToCSV(freeGames);
      }
    }
    
    clickLoop();
  }
  
  function extractDataToCSV(freeGames) {
    const rows = document.querySelectorAll("tbody.am-16qdn16 tr");
    let csvContent = "game_title,data\\n";
    
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 3) {
        const dateText = cells[0].innerText.trim();
        const gameTitle = cells[1].innerText.trim();
        const priceText = cells[2].innerText.trim();
        
        const numericString = priceText.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const priceValue = parseFloat(numericString);
        
        if (!freeGames && priceValue === 0) {
          return;
        }
        
        csvContent += \`"\${gameTitle}","\${dateText}"\\n\`;
      }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "epicgames_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log("CSV file exported");
  }
  
  clickButtonUntilGoneAndExtract(true);`;
    const primeCode = `function extractWatchlistToCSV() {
  const items = document.querySelectorAll('article[data-card-title]');
  const csvData = [];
  const currentDate = new Date().toISOString().split('T')[0];
  csvData.push('Title,Date');
  items.forEach(item => {
    const title = item.getAttribute('data-card-title');
    csvData.push(\`"\${title}","\${currentDate}"\`);
  });
  const csvContent = csvData.join('\\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'watchlist.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
extractWatchlistToCSV();`;
    // Gemeinsames Video-iframe (für beide Tutorials; Autoplay hinzugefügt)
    function getVideoIframe(videoId) {
        return `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    title="Download CSV File" frameborder="0"
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>
            </iframe>
        </div>`;
    }
    
    steamTutorialBtn.addEventListener('click', function () {
        copyCodeBtn.classList.remove('hidden');
        tutorialModalContent.innerHTML = getVideoIframe("9jzmK1urCTI");
        tutorialMode = "steam";
        currentCode = steamCode;
        tutorial_extra_info.innerText = "";
        tutorialModal.classList.remove('hidden');
    });
    primeTutorialBtn.addEventListener('click', function () {
        copyCodeBtn.classList.remove('hidden');
        tutorialModalContent.innerHTML = getVideoIframe("DZQuQV8uvKQ");
        tutorialMode = "prime";
        currentCode = primeCode;
        tutorial_extra_info.innerText = "";
        tutorialModal.classList.remove('hidden');
    });
    spotifyTutorialBtn.addEventListener('click', function () {
        tutorialModalContent.innerHTML = getVideoIframe("YGUrTMjNG5w");
        tutorialMode = "spotify";
        currentCode = steamCode;
        tutorial_extra_info.innerText = "";
        copyCodeBtn.classList.add('hidden');
        tutorialModal.classList.remove('hidden');
    });
    
    epicGamesTutorialBtn.addEventListener('click', function () {
        copyCodeBtn.classList.remove('hidden');
        tutorialModalContent.innerHTML = getVideoIframe("2u9xP6A4YYI");
        currentCode = epicGamesCode;
        tutorialMode = "epicgames";
        tutorial_extra_info.innerText = "clickButtonUntilGoneAndExtract(true) = Include Free Games \n clickButtonUntilGoneAndExtract(false) = Not include Free Games";
        tutorialModal.classList.remove('hidden');
    });
    openWebsiteBtn.addEventListener('click', function () {
        if (tutorialMode == "steam") {
            window.open('https://store.steampowered.com/account/licenses/', '_blank');
        }
        if (tutorialMode == "epicgames") {
            window.open('https://www.epicgames.com/account/transactions?lang=en-US', '_blank');
        }
        if(tutorialMode == "spotify"){
            window.open('https://exportify.net/#playlists', '_blank');
            window.open('https://developer.spotify.com/dashboard/create', '_blank');
            
        }
        if (tutorialMode == "prime") {
            // Verwende eine externe API (hier ipapi.co), um anhand der IP den Ländercode zu ermitteln
            fetch("https://ipapi.co/json/")
              .then(response => response.json())
              .then(data => {
                  const region = data.country; // z. B. "DE" für Deutschland
                  const countryMap = {
                      "DE": "de",
                      "FR": "fr",
                      "ES": "es",
                      "IT": "it",
                      "RU": "ru",
                      "GB": "co.uk",
                      "US": "com"
                  };
                  const domain = countryMap[region] || "com";
                  window.open(`https://www.amazon.${domain}/gp/video/mystuff/watchlist/all/ref=atv_mys_wl_tab`, '_blank');
              })
              .catch(error => {
                  console.error("Fehler bei der Standortermittlung:", error);
                  // Im Fehlerfall Standard auf .com
                  window.open(`https://www.amazon.com/gp/video/mystuff/watchlist/all/ref=atv_mys_wl_tab`, '_blank');
              });
        }
    });

    tutorialModalClose.addEventListener('click', function () {
        tutorialModal.classList.add('hidden');
        tutorialModalContent.innerHTML = '';
    });

    // Schließen, wenn außerhalb des Modal-Inhalts geklickt wird
    tutorialModal.addEventListener('click', function (e) {
        if (e.target === tutorialModal) {
            tutorialModal.classList.add('hidden');
            tutorialModalContent.innerHTML = '';
        }
    });

    copyCodeBtn.addEventListener('click', function () {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(currentCode).then(() => {
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyCodeBtn.textContent = 'Copy Code';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy code: ', err);
            });
        } else {
            // Fallback für ältere Browser
            const textarea = document.createElement('textarea');
            textarea.value = currentCode;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyCodeBtn.textContent = 'Copy Code';
                }, 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textarea);
        }
    });

});