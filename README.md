
## Amazon Prime Video:
Go to: "https://www.amazon.(de, com, COUNTRY_TLD)/gp/video/mystuff/watchlist/all/ref=atv_mys_wl_tab"
Open the Webbrowser Console an paste this JavaScript Code. It will download your Watchlist as a csv file, which you can upload to the MovieBase WebUi.
// Funktion, um Filme und Serien aus der HTML-Seite zu extrahieren und als CSV herunterzuladen
function extractWatchlistToCSV() {
  // Alle Artikel mit den Datenattributen für Filme und Serien auswählen
  const items = document.querySelectorAll('article[data-card-title]');

  // Array, um die CSV-Daten zu speichern
  const csvData = [];
  const currentDate = new Date().toISOString().split('T')[0]; // Aktuelles Datum im Format YYYY-MM-DD

  // CSV-Header hinzufügen
  csvData.push('Title,Date');

  // Durch die Artikel iterieren und die Titel extrahieren
  items.forEach(item => {
    const title = item.getAttribute('data-card-title'); // Titel des Films/der Serie
    csvData.push(`"${title}","${currentDate}"`); // Titel und Datum im CSV-Format hinzufügen
  });

  // CSV-Daten in einen Blob umwandeln
  const csvContent = csvData.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });

  // Download-Link erstellen
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'watchlist.csv'; // Dateiname der CSV
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Funktion aufrufen
extractWatchlistToCSV();


## Netflix 
https://help.netflix.com/en/node/101917
