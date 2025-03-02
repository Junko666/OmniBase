## Features ✨

- **Collection Management**
  - Add/Edit movies & TV series with rich metadata
  - Rate content with half-star precision (0.5-5 stars)
  - Advanced filtering & search capabilities
  - Bulk import from Netflix viewing history

- **Smart Features**
  - AI-powered recommendations (OpenAI/Gemini integration)
  - Automated genre analysis and preference tracking
  - Streaming availability checks (300+ services)
  - Netflix CSV import with smart content detection

- **Advanced Statistics**
  - Interactive genre distribution charts
  - Collection analytics (movies vs series, rated vs unrated)
  - Personalized preference reports

- **Customization**
  - Dark/Light theme with manual override
  - Custom color schemes
  - Multiple AI provider support
  - API key management

## Getting a CSV File:
- **Amazon Prime Video:**
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

- **Netflix**
Follow the Steps which netflix provides: https://help.netflix.com/en/node/101917



## UI Overview:
