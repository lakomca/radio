# Fix Radio Browser API Errors

## Current Issue

The Radio Browser API servers are experiencing downtime:
- `de1.api.radio-browser.info`: 502 Bad Gateway
- `nl1`, `at1`, `fr1`: DNS/Network errors

## Quick Fixes

### 1. Check API Status

Test if the API is back online:

```powershell
# Test API connectivity
Invoke-WebRequest -Uri "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1" -UseBasicParsing

# Or test with curl
curl "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1"
```

### 2. Restart Backend Server

Sometimes a restart helps:

```powershell
# Stop current server (Ctrl+C)
# Then restart
npm start
```

### 3. Check Network/Firewall

Ensure your firewall isn't blocking API requests:

```powershell
# Test DNS resolution
Resolve-DnsName de1.api.radio-browser.info

# Test connectivity
Test-NetConnection de1.api.radio-browser.info -Port 443
```

### 4. Use Alternative API Endpoints

The code already tries multiple servers, but you can add more:

**Edit `server.js`** (around line 1280):

```javascript
const RADIO_BROWSER_API_SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://uk1.api.radio-browser.info/json',  // Add UK server
    'https://us1.api.radio-browser.info/json'   // Add US server
];
```

### 5. Increase Timeout

If API is slow but responding:

**Edit `server.js`** (around line 1525):

```javascript
const timeout = 120000; // Increase to 120 seconds
```

### 6. Add Retry Logic with Delays

**Edit `server.js`** in the `/api/radio/search` endpoint:

```javascript
// Add delay between retries
for (const apiServer of RADIO_BROWSER_API_SERVERS) {
    // ... existing code ...
    
    // Add delay before trying next server
    if (lastError && apiServer !== RADIO_BROWSER_API_SERVERS[RADIO_BROWSER_API_SERVERS.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
}
```

## Permanent Solutions

### Option 1: Add Caching

Cache API responses to reduce load:

```javascript
// Add at top of server.js
const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// In /api/radio/search endpoint
app.get('/api/radio/search', async (req, res) => {
    const cacheKey = `search_${req.query.tag}_${req.query.limit}`;
    const cached = apiCache.get(cacheKey);
    
    if (cached) {
        return res.json(cached);
    }
    
    // ... existing API call code ...
    
    // Cache successful responses
    if (stations && stations.length > 0) {
        apiCache.set(cacheKey, stations);
    }
    
    return res.json(stations);
});
```

Install cache module:
```powershell
npm install node-cache
```

### Option 2: Use Local Station Database

Create a local fallback database:

1. Export stations when API is working
2. Store in `public/radio-stations-backup.json`
3. Load from backup when API fails

### Option 3: Implement Offline Mode

Show cached/curated stations when API is down:

```javascript
// In server.js
const curatedStations = require('./data/curated-stations.json');

app.get('/api/radio/search', async (req, res) => {
    try {
        // Try API first
        // ... existing code ...
    } catch (error) {
        // Fallback to curated stations
        const filtered = curatedStations.filter(s => 
            s.tags && s.tags.includes(req.query.tag)
        );
        return res.json(filtered.slice(0, req.query.limit || 100));
    }
});
```

## Testing API Connectivity

### Test Script

Create `test-api.ps1`:

```powershell
$servers = @(
    'https://de1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json'
)

Write-Host "Testing Radio Browser API servers...`n" -ForegroundColor Cyan

foreach ($server in $servers) {
    Write-Host "Testing: $server" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$server/stations/search?tag=electronic&limit=1" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ OK" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Status: $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

Run it:
```powershell
.\test-api.ps1
```

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 502 | Bad Gateway | API server is down, wait or try another server |
| 503 | Service Unavailable | API is overloaded, retry later |
| 504 | Gateway Timeout | Increase timeout, retry |
| ENOTFOUND | DNS error | Check internet connection, DNS settings |
| ETIMEDOUT | Connection timeout | Increase timeout, check firewall |

## Monitoring API Status

### Check Radio Browser Status Page

Visit: https://www.radio-browser.info/

Check their status page or GitHub issues for known outages.

### Add Health Check Endpoint

Add to `server.js`:

```javascript
app.get('/api/health/radio-browser', async (req, res) => {
    const results = {};
    
    for (const server of RADIO_BROWSER_API_SERVERS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${server}/stations/search?tag=test&limit=1`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            results[server] = {
                status: response.ok ? 'online' : 'error',
                code: response.status
            };
        } catch (error) {
            results[server] = {
                status: 'offline',
                error: error.message
            };
        }
    }
    
    res.json(results);
});
```

Check status:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health/radio-browser" -UseBasicParsing | Select-Object -ExpandProperty Content
```

## Temporary Workaround

While API is down, you can:

1. **Use curated stations** - Already implemented in your code
2. **Use IPRD stations** - Country-based stations (already implemented)
3. **Manual station entry** - Add stations manually via UI (if implemented)

## When API Comes Back Online

The app will automatically work again - no changes needed! The code already:
- Tries multiple servers
- Handles errors gracefully
- Returns empty results instead of crashing

## Still Having Issues?

1. **Check backend logs** for detailed error messages
2. **Test API directly** using the test script above
3. **Check firewall/antivirus** - may be blocking connections
4. **Try different network** - ISP may be blocking API
5. **Wait and retry** - API outages are usually temporary

## Quick Reference

```powershell
# Test API
curl "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=1"

# Check backend health
curl http://localhost:3000/health

# Check API health endpoint (if added)
curl http://localhost:3000/api/health/radio-browser

# Restart backend
npm start
```



