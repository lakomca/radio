/**
 * Script to research and update station logos
 * Processes all stations from radio-stations.json and server.js curated stations
 */

const fs = require('fs');
const path = require('path');
const { findStationLogo } = require('./logo-lookup');

// Path to radio-stations.json
const radioStationsPath = path.join(__dirname, '..', 'public', 'radio-stations.json');
const serverJsPath = path.join(__dirname, '..', 'server.js');

// Delay function to avoid rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return null;
    }
}

// Try to find homepage from station name and stream URL
function inferHomepage(station) {
    const name = (station.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const streamUrl = station.url || station.url_resolved || '';
    
    // Common patterns
    if (name.includes('npr')) return 'https://www.npr.org';
    if (name.includes('fox news')) return 'https://www.foxnews.com';
    if (name.includes('cbs')) return 'https://www.cbs.com';
    if (name.includes('cnn')) return 'https://www.cnn.com';
    if (name.includes('espn')) return 'https://www.espn.com';
    if (name.includes('abc news')) return 'https://abcnews.go.com';
    if (name.includes('nbc')) return 'https://www.nbc.com';
    if (name.includes('bbc')) return 'https://www.bbc.com';
    if (name.includes('newsmax')) return 'https://www.newsmax.com';
    if (name.includes('sky news')) return 'https://news.sky.com';
    if (name.includes('sky sports')) return 'https://www.skysports.com';
    if (name.includes('bt sport')) return 'https://www.bt.com/sport';
    if (name.includes('eurosport')) return 'https://www.eurosport.com';
    if (name.includes('mtv')) return 'https://www.mtv.com';
    if (name.includes('vh1')) return 'https://www.vh1.com';
    if (name.includes('bein sports')) return 'https://www.beinsports.com';
    if (name.includes('nfl')) return 'https://www.nfl.com';
    if (name.includes('nba')) return 'https://www.nba.com';
    if (name.includes('cbs sports')) return 'https://www.cbssports.com';
    if (name.includes('fox sports')) return 'https://www.foxsports.com';
    if (name.includes('nbc sports')) return 'https://www.nbcsports.com';
    if (name.includes('usa today')) return 'https://www.usatoday.com';
    if (name.includes('voice of america') || name.includes('voa')) return 'https://www.voanews.com';
    if (name.includes('newsy')) return 'https://www.newsy.com';
    if (name.includes('news nation')) return 'https://www.newsnationnow.com';
    if (name.includes('sportsgrid')) return 'https://www.sportsgrid.com';
    if (name.includes('radioparadise')) return 'https://radioparadise.com';
    if (name.includes('181.fm')) return 'https://www.181.fm';
    if (name.includes('somafm')) return 'https://somafm.com';
    if (name.includes('fuse')) return 'https://www.fuse.tv';
    if (name.includes('qwest')) return 'https://www.qwest.com';
    if (name.includes('rockbot')) return 'https://www.rockbot.com';
    
    // Try to extract domain from stream URL
    if (streamUrl) {
        const domain = extractDomain(streamUrl);
        if (domain && !domain.includes('cdn') && !domain.includes('stream') && 
            !domain.includes('akamai') && !domain.includes('amagi')) {
            // Try common patterns
            const cleanDomain = domain.replace(/\.(com|net|org|tv|fm|radio)$/, '');
            return `https://www.${cleanDomain}.com`;
        }
    }
    
    return null;
}

// Process a single station
async function processStation(station, category = '') {
    // Add homepage if missing
    if (!station.homepage) {
        station.homepage = inferHomepage(station);
    }
    
    // Create station object for logo lookup
    const stationForLookup = {
        name: station.name,
        homepage: station.homepage,
        url_resolved: station.url || station.url_resolved,
        favicon: station.logo || station.favicon || station.favicon_url
    };
    
    // Find logo (always try to find, even if station already has one - might find better)
    try {
        const hasExistingLogo = !!(station.logo || station.favicon || station.favicon_url);
        if (hasExistingLogo) {
            console.log(`  Researching: ${station.name} (has logo, checking for better)...`);
        } else {
            console.log(`  Researching: ${station.name} (no logo)...`);
        }
        
        const logo = await findStationLogo(stationForLookup);
        
        if (logo) {
            const existingLogo = station.logo || station.favicon || station.favicon_url;
            // Update if: no existing logo, or found a different logo (might be better)
            if (!existingLogo || logo !== existingLogo) {
                station.logo = logo;
                if (existingLogo) {
                    console.log(`    ✓ Found better logo: ${logo}`);
                } else {
                    console.log(`    ✓ Found logo: ${logo}`);
                }
                return { updated: true, logo, wasEmpty: !existingLogo };
            } else {
                console.log(`    - Same logo: ${logo.substring(0, 60)}...`);
                return { updated: false };
            }
        } else {
            if (hasExistingLogo) {
                console.log(`    - Keeping existing logo`);
            } else {
                console.log(`    ✗ No logo found`);
            }
            return { updated: false };
        }
    } catch (error) {
        console.error(`    ✗ Error finding logo for ${station.name}:`, error.message);
        return { updated: false, error: error.message };
    }
}

// Update radio-stations.json
async function updateRadioStationsJson() {
    console.log('\n📻 Processing radio-stations.json...\n');
    
    const data = JSON.parse(fs.readFileSync(radioStationsPath, 'utf8'));
    let totalUpdated = 0;
    let totalProcessed = 0;
    
    const categories = ['news', 'sports', 'music'];
    
    for (const category of categories) {
        if (!data[category] || !Array.isArray(data[category])) continue;
        
        console.log(`\n📂 Category: ${category.toUpperCase()} (${data[category].length} stations)`);
        
        for (let i = 0; i < data[category].length; i++) {
            const station = data[category][i];
            totalProcessed++;
            
            const result = await processStation(station, category);
            if (result.updated) {
                totalUpdated++;
            }
            
            // Delay to avoid rate limiting (50ms between requests)
            await delay(50);
        }
    }
    
    // Write updated data
    fs.writeFileSync(radioStationsPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`\n✅ Updated ${totalUpdated} out of ${totalProcessed} stations in radio-stations.json`);
    
    return { totalUpdated, totalProcessed };
}

// Update curated stations in server.js
async function updateCuratedStations() {
    console.log('\n📻 Processing curated stations in server.js...\n');
    
    let serverContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Extract curated stations section (simplified - assumes format)
    // This is a basic approach - in production, you'd want to parse properly
    const curatedMatch = serverContent.match(/const curatedStations\s*=\s*({[\s\S]*?});/);
    if (!curatedMatch) {
        console.log('⚠️  Could not find curatedStations in server.js');
        return { totalUpdated: 0, totalProcessed: 0 };
    }
    
    // For now, we'll note that curated stations use logo-lookup.js at runtime
    // via enhanceStationsWithLogos, so they're automatically enhanced
    console.log('ℹ️  Curated stations are enhanced at runtime via logo-lookup.js');
    console.log('   They will automatically get logos when the API is called.');
    
    return { totalUpdated: 0, totalProcessed: 0 };
}

// Main function
async function main() {
    console.log('🔍 Starting station logo research and update...\n');
    console.log('This may take several minutes due to rate limiting...\n');
    
    try {
        const jsonResults = await updateRadioStationsJson();
        const curatedResults = await updateCuratedStations();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ radio-stations.json: ${jsonResults.totalUpdated}/${jsonResults.totalProcessed} updated`);
        console.log(`ℹ️  Curated stations: Enhanced at runtime`);
        console.log('\n✨ Logo research complete!');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { processStation, updateRadioStationsJson, updateCuratedStations };

