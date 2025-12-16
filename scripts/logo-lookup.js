const https = require('https');
const { URL } = require('url');

// Fetch content from URL (with timeout)
function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const timeout = 3000; // 3 second timeout for faster lookups
        const req = https.get(url, (res) => {
            clearTimeout(timer);
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                return fetchURL(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
        
        const timer = setTimeout(() => {
            req.destroy();
            reject(new Error('Request timeout'));
        }, timeout);
    });
}

// Google Favicon API (fast and reliable)
function getGoogleFavicon(domain) {
    if (!domain) return null;
    // Remove port numbers and paths
    const cleanDomain = domain.split(':')[0].split('/')[0];
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
}

// Extract domain from URL
function extractDomain(url) {
    if (!url) return null;
    try {
        // Handle URLs that might not have protocol
        let urlString = url;
        if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
            urlString = 'https://' + urlString;
        }
        const urlObj = new URL(urlString);
        let hostname = urlObj.hostname.replace('www.', '').toLowerCase();
        // Remove port
        hostname = hostname.split(':')[0];
        // Skip IP addresses
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return null;
        }
        return hostname;
    } catch (e) {
        return null;
    }
}

// Extract potential station name from URL or station name
function extractStationName(stationName) {
    if (!stationName) return null;
    // Remove common suffixes and clean up
    let name = stationName
        .replace(/\s*(FM|AM|Radio|TV|Channel|Station|Live|Stream|Online|Internet)\s*$/i, '')
        .replace(/\s*-\s*.*$/, '') // Remove anything after dash
        .replace(/\s*\(.*\)\s*/g, '') // Remove parenthetical info
        .trim();
    return name.length > 1 ? name : null;
}

// Extensive well-known radio stations database (researched logos)
const wellKnownStations = {
    // Major Networks (US)
    'BBC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/512px-BBC_Logo_2021.svg.png',
    'NPR': 'https://media.npr.org/assets/img/2018/08/03/npr_270x270_sq-7c723c0a7a7e0aa58a22c9c25f0e37ea3c2e9c9f.png',
    'CNN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/512px-CNN.svg.png',
    'FOX': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Fox_News_Channel_logo.svg/512px-Fox_News_Channel_logo.svg.png',
    'FOX News': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Fox_News_Channel_logo.svg/512px-Fox_News_Channel_logo.svg.png',
    'CBS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CBS_News_logo_%282020%29.svg/200px-CBS_News_logo_%282020%29.svg.png',
    'ESPN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png',
    'ABC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/ABC_%282013%29_Dark_Grey.svg/512px-ABC_%282013%29_Dark_Grey.svg.png',
    'NBC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/NBC_logo.svg/512px-NBC_logo.svg.png',
    'Newsmax': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Newsmax_Logo.svg/512px-Newsmax_Logo.svg.png',
    
    // Popular Radio Platforms
    'iHeartRadio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Iheartmedia_logo.svg/512px-Iheartmedia_logo.svg.png',
    'iHeart': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Iheartmedia_logo.svg/512px-Iheartmedia_logo.svg.png',
    'Pandora': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pandora_media_logo.svg/512px-Pandora_media_logo.svg.png',
    'Spotify': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/512px-Spotify_logo_without_text.svg.png',
    'TuneIn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/TuneIn_logo.svg/512px-TuneIn_logo.svg.png',
    
    // International Stations
    'Radio France': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Radio_France_logo_2018.svg/512px-Radio_France_logo_2018.svg.png',
    'ARD': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/ARD_logo.svg/512px-ARD_logo.svg.png',
    'Deutschlandfunk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Deutschlandfunk_logo.svg/512px-Deutschlandfunk_logo.svg.png',
    'RTL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/RTL_logo.svg/512px-RTL_logo.svg.png',
    'RAI': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/RAI_logo.svg/512px-RAI_logo.svg.png',
    'CBC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/CBC_logo.svg/512px-CBC_logo.svg.png',
    'ABC Australia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/ABC_logo.svg/512px-ABC_logo.svg.png',
    
    // UK Music Networks
    'Capital': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Capital_%28radio_network%29_logo.svg/512px-Capital_%28radio_network%29_logo.svg.png',
    'Capital FM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Capital_%28radio_network%29_logo.svg/512px-Capital_%28radio_network%29_logo.svg.png',
    'Heart': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Heart_radio_logo.svg/512px-Heart_radio_logo.svg.png',
    'Kiss': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Kiss_logo.svg/512px-Kiss_logo.svg.png',
    'Kiss FM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Kiss_logo.svg/512px-Kiss_logo.svg.png',
    'Classic FM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Classic_FM_logo.svg/512px-Classic_FM_logo.svg.png',
    'Smooth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Smooth_Radio_logo.svg/512px-Smooth_Radio_logo.svg.png',
    'Smooth Radio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Smooth_Radio_logo.svg/512px-Smooth_Radio_logo.svg.png',
    'Magic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Magic_Radio_logo.svg/512px-Magic_Radio_logo.svg.png',
    'Radio X': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Radio_X_logo.svg/512px-Radio_X_logo.svg.png',
    'Absolute Radio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Absolute_Radio_logo.svg/512px-Absolute_Radio_logo.svg.png',
    
    // News Stations
    'Sky News': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Sky_News_logo.svg/512px-Sky_News_logo.svg.png',
    'Al Jazeera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Al_Jazeera_English_logo.svg/512px-Al_Jazeera_English_logo.svg.png',
    'Reuters': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Reuters_Logo.svg/512px-Reuters_Logo.svg.png',
    'Bloomberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Bloomberg_logo.svg/512px-Bloomberg_logo.svg.png',
    
    // BBC Radio Stations
    'Radio 1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/BBC_Radio_1_logo.svg/512px-BBC_Radio_1_logo.svg.png',
    'BBC Radio 1': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/BBC_Radio_1_logo.svg/512px-BBC_Radio_1_logo.svg.png',
    'Radio 2': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/BBC_Radio_2_logo.svg/512px-BBC_Radio_2_logo.svg.png',
    'BBC Radio 2': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/BBC_Radio_2_logo.svg/512px-BBC_Radio_2_logo.svg.png',
    'Radio 3': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/BBC_Radio_3_logo.svg/512px-BBC_Radio_3_logo.svg.png',
    'BBC Radio 3': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/BBC_Radio_3_logo.svg/512px-BBC_Radio_3_logo.svg.png',
    'Radio 4': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/BBC_Radio_4_logo.svg/512px-BBC_Radio_4_logo.svg.png',
    'BBC Radio 4': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/BBC_Radio_4_logo.svg/512px-BBC_Radio_4_logo.svg.png',
    'Radio 5': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/BBC_Radio_5_Live_logo.svg/512px-BBC_Radio_5_Live_logo.svg.png',
    'BBC Radio 5': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/BBC_Radio_5_Live_logo.svg/512px-BBC_Radio_5_Live_logo.svg.png',
    'World Service': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/512px-BBC_Logo_2021.svg.png',
    
    // Music Stations & Networks
    'Fuse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Fuse_TV_logo.svg/512px-Fuse_TV_logo.svg.png',
    'Fuse Backstage': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Fuse_TV_logo.svg/512px-Fuse_TV_logo.svg.png',
    'Fuse Beats': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Fuse_TV_logo.svg/512px-Fuse_TV_logo.svg.png',
    'Fuse XL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Fuse_TV_logo.svg/512px-Fuse_TV_logo.svg.png',
    'Radio Paradise': 'https://radioparadise.com/favicon.ico',
    '181.FM': 'https://www.181.fm/favicon.ico',
    'Smooth Jazz': 'https://somafm.com/favicon.ico',
    'SomaFM': 'https://somafm.com/favicon.ico',
    'Rockbot': 'https://www.rockbot.com/favicon.ico',
    'Circle Country': 'https://www.circleallaccess.com/favicon.ico',
    'Circle Country Music': 'https://www.circleallaccess.com/favicon.ico',
    'Qwest': 'https://www.qwest.com/favicon.ico',
    'Qwest Classical': 'https://www.qwest.com/favicon.ico',
    'Qwest Jazz': 'https://www.qwest.com/favicon.ico',
    'Qwest Mix': 'https://www.qwest.com/favicon.ico',
    'Kiss TV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Kiss_logo.svg/512px-Kiss_logo.svg.png',
    'Capital Radio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Capital_%28radio_network%29_logo.svg/512px-Capital_%28radio_network%29_logo.svg.png',
    'B4U': 'https://www.b4umusic.com/favicon.ico',
    'B4U Music': 'https://www.b4umusic.com/favicon.ico',
    'Best FM': 'https://www.google.com/s2/favicons?domain=bestfm.com.tr&sz=128',
    
    // Sports Stations - Additional
    'SportsGrid': 'https://www.sportsgrid.com/favicon.ico',
    'Racing America': 'https://racingamerica.com/favicon.ico',
    'EDGEsport': 'https://www.edgesport.tv/favicon.ico',
    'Pac12': 'https://pac-12.com/favicon.ico',
    'Players TV': 'https://playerstv.com/favicon.ico',
    'Combat GO': 'https://combatgo.com/favicon.ico',
    'MMA TV': 'https://www.mmatv.com/favicon.ico',
    'Origin Sports': 'https://originsports.com/favicon.ico',
    'Tennis Channel': 'https://www.tennischannel.com/favicon.ico',
    'Trace Sportstars': 'https://www.trace.tv/favicon.ico',
    'Whistle Sports': 'https://whistlesports.com/favicon.ico',
    'Campus Lore': 'https://campuslore.com/favicon.ico',
    'Liverpool FC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Liverpool_FC.svg/512px-Liverpool_FC.svg.png',
    'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/512px-Chelsea_FC.svg.png',
    'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/512px-Manchester_United_FC_crest.svg.png',
    'Motorsport TV': 'https://www.motorsport.tv/favicon.ico',
    'FanDuel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/FanDuel_Sports_Network_logo.svg/512px-FanDuel_Sports_Network_logo.svg.png',
    'MAVTV': 'https://www.mavtv.com/favicon.ico',
    'DAZN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/DAZN_logo.svg/512px-DAZN_logo.svg.png',
};

// Try to find logo using multiple strategies
async function findStationLogo(station) {
    const stationName = (station.name || '').trim();
    const homepage = station.homepage || '';
    const streamUrl = station.url_resolved || station.url || '';
    
    // Strategy 1: If we already have a valid favicon, use it
    if (station.favicon && isValidLogoUrl(station.favicon)) {
        return station.favicon;
    }
    
    // Strategy 2: Try well-known stations database (exact and partial matches)
    const nameUpper = stationName.toUpperCase();
    for (const [key, logoUrl] of Object.entries(wellKnownStations)) {
        if (nameUpper === key.toUpperCase() || 
            nameUpper.includes(key.toUpperCase()) || 
            key.toUpperCase().includes(nameUpper.split(' ')[0])) {
            return logoUrl;
        }
    }
    
    // Strategy 3: Extract domain from homepage and use Google Favicon API (fastest)
    if (homepage) {
        const domain = extractDomain(homepage);
        if (domain) {
            return getGoogleFavicon(domain);
        }
    }
    
    // Strategy 4: Extract domain from stream URL and use Google Favicon API
    if (streamUrl) {
        const domain = extractDomain(streamUrl);
        if (domain) {
            return getGoogleFavicon(domain);
        }
    }
    
    // Strategy 5: Try to construct logo URL from station name and homepage (comprehensive search)
    if (homepage) {
        const domain = extractDomain(homepage);
        if (domain) {
            // Try common logo paths based on domain - comprehensive list
            const logoPaths = [
                `https://${domain}/logo.png`,
                `https://${domain}/logo.svg`,
                `https://${domain}/images/logo.png`,
                `https://${domain}/images/logo.svg`,
                `https://${domain}/assets/logo.png`,
                `https://${domain}/assets/logo.svg`,
                `https://${domain}/img/logo.png`,
                `https://${domain}/img/logo.svg`,
                `https://${domain}/static/logo.png`,
                `https://${domain}/static/images/logo.png`,
                `https://${domain}/wp-content/uploads/logo.png`,
                `https://${domain}/favicon.ico`,
                `https://${domain}/apple-touch-icon.png`,
                `https://${domain}/android-chrome-192x192.png`,
                `https://www.${domain}/logo.png`, // Try with www prefix
                `https://www.${domain}/logo.svg`,
            ];
            
            // Try multiple paths (limit to avoid too many requests)
            for (const logoPath of logoPaths.slice(0, 5)) {
                try {
                    await fetchURL(logoPath);
                    return logoPath; // If we can fetch it, it exists
                } catch (e) {
                    continue;
                }
            }
        }
    }
    
    // Strategy 6: Try domain extraction from stream URL for CDN/hosting services
    if (streamUrl) {
        const domain = extractDomain(streamUrl);
        if (domain) {
            // Some stations use CDN services - try to extract main domain
            // For example: streamguys1.com -> use Google favicon
            // For example: streamtheworld.com -> use Google favicon
            // For example: radyotvonline.com -> use Google favicon
            const cdnDomains = ['streamguys1.com', 'streamtheworld.com', 'radyotvonline.com', 
                               'streamtheworld.net', 'icecast.com', 'shoutcast.com'];
            for (const cdn of cdnDomains) {
                if (domain.includes(cdn)) {
                    // For CDN domains, try to find the actual station website
                    // Extract from URL path or use station name
                    if (stationName) {
                        const cleanName = extractStationName(stationName);
                        if (cleanName) {
                            // Try to construct potential website
                            const possibleDomain = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
                            return getGoogleFavicon(possibleDomain);
                        }
                    }
                    break;
                }
            }
        }
    }
    
    // Strategy 7: Use Google Favicon API with cleaned station name as domain hint (last resort)
    if (stationName && !homepage && !streamUrl) {
        const cleanName = extractStationName(stationName);
        if (cleanName && cleanName.length > 2) {
            // Try common domain patterns
            const possibleDomains = [
                `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fm`,
                `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.radio`,
                `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.net`,
                `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.uk`,
            ];
            
            // Return Google favicon for first possible domain (fast, no validation)
            return getGoogleFavicon(possibleDomains[0]);
        }
    }
    
    return null;
}

// Validate if URL is a valid logo URL
function isValidLogoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const urlObj = new URL(url);
        return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
               url.length > 10 && url.length < 500;
    } catch (e) {
        return false;
    }
}

// Enhance stations with logos (optimized - only for stations without logos)
async function enhanceStationsWithLogos(stations) {
    // Process stations in smaller batches to avoid overwhelming
    const batchSize = 20;
    const enhanced = [];
    
    for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (station) => {
            // If station already has a valid logo, keep it
            if (station.favicon && isValidLogoUrl(station.favicon)) {
                return station;
            }
            
            // Try to find a logo
            try {
                const logo = await findStationLogo(station);
                if (logo) {
                    return { ...station, favicon: logo };
                }
            } catch (e) {
                // If lookup fails, keep original station
            }
            
            return station;
        }));
        enhanced.push(...batchResults);
    }
    
    return enhanced;
}

module.exports = {
    findStationLogo,
    enhanceStationsWithLogos,
    getGoogleFavicon,
    extractDomain,
    isValidLogoUrl
};
