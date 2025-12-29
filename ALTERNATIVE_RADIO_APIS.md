# Alternative Radio Station APIs

## Current API Status

**Radio Browser API** - Currently experiencing downtime
- Multiple servers: de1, nl1, at1, fr1
- Free, open-source, no authentication required
- Status: https://www.radio-browser.info/

## Alternative APIs

### 1. Radio Browser API (Additional Servers)

Add more Radio Browser API servers to your list:

**Edit `server.js` (around line 1280):**

```javascript
const RADIO_BROWSER_API_SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://uk1.api.radio-browser.info/json',  // UK server
    'https://us1.api.radio-browser.info/json',  // US server
    'https://ch1.api.radio-browser.info/json'   // Switzerland server
];
```

**Check available servers:**
```powershell
# Get list of all Radio Browser API servers
Invoke-WebRequest -Uri "https://api.radio-browser.info/json/servers" -UseBasicParsing
```

### 2. IPRD (Internet Protocol Radio Directory)

**Already implemented in your app!**

- Source: GitHub repository (iprd-org/iprd)
- Format: M3U playlists by country
- No API needed - direct file access
- Status: ✅ Active

**Your code already uses this:**
```javascript
const iprdFetcher = require('./scripts/iprd-fetcher');
```

**Access directly:**
```
https://raw.githubusercontent.com/iprd-org/iprd/main/streams/{country_code}.m3u
```

### 3. Shoutcast Directory API

**Free, no authentication**

```javascript
// Shoutcast API endpoint
const SHOUTCAST_API = 'https://api.shoutcast.com/legacy';

// Search stations
app.get('/api/shoutcast/search', async (req, res) => {
    const { genre, limit = 100 } = req.query;
    const url = `${SHOUTCAST_API}/stationsearch?k=YOUR_API_KEY&genre=${genre}&limit=${limit}`;
    
    // Note: May require API key (free registration)
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Registration:** https://www.shoutcast.com/Developer

### 4. TuneIn API

**Requires API key (free tier available)**

```javascript
// TuneIn API
const TUNEIN_API = 'https://api.tunein.com/profiles';

// Search stations
app.get('/api/tunein/search', async (req, res) => {
    const { query, limit = 100 } = req.query;
    const url = `${TUNEIN_API}/search?q=${query}&limit=${limit}&partnerId=YOUR_PARTNER_ID`;
    
    const response = await fetch(url, {
        headers: {
            'X-TuneIn-PartnerId': 'YOUR_PARTNER_ID'
        }
    });
    const data = await response.json();
    res.json(data);
});
```

**Registration:** https://developers.tunein.com/

### 5. Radio Garden API

**Unofficial API (scraping)**

```javascript
// Radio Garden stations (unofficial)
const RADIO_GARDEN_API = 'http://radio.garden/api/ara/content';

// Get stations by location
app.get('/api/radiogarden/stations', async (req, res) => {
    const { lat, lon } = req.query;
    const url = `${RADIO_GARDEN_API}/stations?lat=${lat}&lon=${lon}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Website:** http://radio.garden/

### 6. Streema API

**Free tier available**

```javascript
// Streema API
const STREEMA_API = 'https://streema.com/api/radios';

// Search stations
app.get('/api/streema/search', async (req, res) => {
    const { q, limit = 100 } = req.query;
    const url = `${STREEMA_API}/search?q=${q}&limit=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Website:** https://streema.com/

### 7. MyRadioStationList API

**Free, no authentication**

```javascript
// MyRadioStationList API
const MYRADIO_API = 'https://www.myradiostream.com/api';

// Get stations
app.get('/api/myradio/stations', async (req, res) => {
    const { genre, country } = req.query;
    const url = `${MYRADIO_API}/stations?genre=${genre}&country=${country}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Website:** https://www.myradiostream.com/

### 8. Radio.co API

**Requires API key**

```javascript
// Radio.co API
const RADIOCO_API = 'https://api.radio.co/stations';

// Get stations
app.get('/api/radioco/stations', async (req, res) => {
    const url = `${RADIOCO_API}?api_key=YOUR_API_KEY`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer YOUR_API_KEY'
        }
    });
    const data = await response.json();
    res.json(data);
});
```

**Registration:** https://radio.co/api

### 9. Live365 API

**Free access**

```javascript
// Live365 API
const LIVE365_API = 'https://api.live365.com/v1';

// Search stations
app.get('/api/live365/search', async (req, res) => {
    const { query, limit = 100 } = req.query;
    const url = `${LIVE365_API}/stations/search?q=${query}&limit=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Website:** https://live365.com/

### 10. RadioNet API

**Free, no authentication**

```javascript
// RadioNet API
const RADIONET_API = 'https://www.radio.net/api';

// Search stations
app.get('/api/radionet/search', async (req, res) => {
    const { q, limit = 100 } = req.query;
    const url = `${RADIONET_API}/search?q=${q}&limit=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});
```

**Website:** https://www.radio.net/

## Implementation Strategy

### Option 1: Multi-API Fallback

Try APIs in order until one works:

```javascript
async function searchStationsWithFallback(tag, limit) {
    const apis = [
        () => searchRadioBrowser(tag, limit),
        () => searchIPRD(tag, limit),
        () => searchShoutcast(tag, limit),
        () => searchStreema(tag, limit)
    ];
    
    for (const apiCall of apis) {
        try {
            const results = await apiCall();
            if (results && results.length > 0) {
                return results;
            }
        } catch (error) {
            console.warn('API failed, trying next:', error.message);
            continue;
        }
    }
    
    return []; // All APIs failed
}
```

### Option 2: Parallel Requests

Request from multiple APIs simultaneously:

```javascript
async function searchStationsParallel(tag, limit) {
    const promises = [
        searchRadioBrowser(tag, limit).catch(() => []),
        searchIPRD(tag, limit).catch(() => []),
        searchShoutcast(tag, limit).catch(() => [])
    ];
    
    const results = await Promise.all(promises);
    // Merge and deduplicate results
    return mergeStationResults(results);
}
```

### Option 3: Cached Fallback

Use cached results when APIs are down:

```javascript
const NodeCache = require('node-cache');
const stationCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

app.get('/api/radio/search', async (req, res) => {
    const cacheKey = `stations_${req.query.tag}`;
    const cached = stationCache.get(cacheKey);
    
    if (cached) {
        return res.json(cached);
    }
    
    try {
        const stations = await searchStationsWithFallback(req.query.tag, req.query.limit);
        if (stations.length > 0) {
            stationCache.set(cacheKey, stations);
        }
        return res.json(stations);
    } catch (error) {
        // Return cached data even if expired
        if (cached) {
            return res.json(cached);
        }
        return res.json([]);
    }
});
```

## Quick Integration Example

Add to `server.js`:

```javascript
// Add after Radio Browser API servers
const ALTERNATIVE_API_SERVERS = [
    {
        name: 'Radio Browser UK',
        url: 'https://uk1.api.radio-browser.info/json',
        enabled: true
    },
    {
        name: 'Radio Browser US',
        url: 'https://us1.api.radio-browser.info/json',
        enabled: true
    },
    {
        name: 'IPRD',
        url: null, // Direct file access
        enabled: true,
        handler: async (tag) => {
            // Use existing IPRD fetcher
            return await iprdFetcher.searchByTag(tag);
        }
    }
];

// Update search endpoint to try alternatives
app.get('/api/radio/search', async (req, res) => {
    // ... existing Radio Browser API code ...
    
    // If Radio Browser fails, try alternatives
    if (stations.length === 0) {
        for (const altApi of ALTERNATIVE_API_SERVERS) {
            if (!altApi.enabled) continue;
            
            try {
                if (altApi.handler) {
                    stations = await altApi.handler(req.query.tag);
                } else {
                    // Try API endpoint
                    const response = await fetch(`${altApi.url}/stations/search?tag=${req.query.tag}`);
                    stations = await response.json();
                }
                
                if (stations && stations.length > 0) {
                    console.log(`✅ Found ${stations.length} stations from ${altApi.name}`);
                    return res.json(stations);
                }
            } catch (error) {
                console.warn(`Failed ${altApi.name}:`, error.message);
                continue;
            }
        }
    }
    
    return res.json(stations);
});
```

## Recommended Approach

1. **Primary:** Radio Browser API (multiple servers)
2. **Fallback 1:** IPRD (already implemented ✅)
3. **Fallback 2:** Add more Radio Browser servers (uk1, us1, ch1)
4. **Fallback 3:** Shoutcast API (if needed)
5. **Cache:** Implement caching to reduce API calls

## Testing APIs

Create `test-all-apis.ps1`:

```powershell
$apis = @(
    @{ Name = "Radio Browser DE"; Url = "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1" },
    @{ Name = "Radio Browser UK"; Url = "https://uk1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1" },
    @{ Name = "Radio Browser US"; Url = "https://us1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1" },
    @{ Name = "IPRD"; Url = "https://raw.githubusercontent.com/iprd-org/iprd/main/streams/us.m3u" }
)

Write-Host "Testing Radio APIs...`n" -ForegroundColor Cyan

foreach ($api in $apis) {
    Write-Host "Testing: $($api.Name)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $api.Url -UseBasicParsing -TimeoutSec 10
        Write-Host "  ✅ OK (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

## Resources

- **Radio Browser API Docs:** https://api.radio-browser.info/
- **IPRD Repository:** https://github.com/iprd-org/iprd
- **Shoutcast Developer:** https://www.shoutcast.com/Developer
- **TuneIn Developer:** https://developers.tunein.com/
- **List of Radio APIs:** https://rapidapi.com/collection/radio-api

## Best Practices

1. **Always have fallbacks** - Don't depend on a single API
2. **Cache responses** - Reduce API calls and improve performance
3. **Handle errors gracefully** - Return empty arrays, not errors
4. **Monitor API status** - Check if APIs are up before using
5. **Rate limiting** - Respect API rate limits
6. **User feedback** - Show which API is being used (optional)



