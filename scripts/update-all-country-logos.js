/**
 * Script to update logos for all radio stations
 * Processes:
 * 1. International category - stations from IPRD and Radio Browser API for each country
 * 2. Other categories - stations from radio-stations.json (news, sports, music, etc.)
 */

const fs = require('fs');
const path = require('path');
const { getAllCountries, getStationsForCountry } = require('./iprd-fetcher');
const { findStationLogo, enhanceStationsWithLogos } = require('./logo-lookup');
const https = require('https');
const http = require('http');

// Path to radio-stations.json
const radioStationsPath = path.join(__dirname, '..', 'public', 'radio-stations.json');

// Delay function to avoid rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch Radio Browser API stations for a country
async function fetchRadioBrowserStations(countryCode) {
    try {
        // Use Radio Browser API to get stations
        const apiUrl = `https://de1.api.radio-browser.info/json/stations/bycountry/${countryCode}?limit=100&order=clickcount&reverse=true`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Radio App/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const stations = await response.json();
        return stations || [];
    } catch (error) {
        console.error(`Error fetching Radio Browser stations for ${countryCode}:`, error.message);
        return [];
    }
}

// Process a single station and find its logo
async function processStation(station, countryCode, countryName) {
    const stationName = station.name || 'Unknown';
    
    // Add homepage if missing (try to infer from name/url)
    if (!station.homepage && station.url_resolved) {
        try {
            const url = new URL(station.url_resolved);
            station.homepage = `https://${url.hostname}`;
        } catch (e) {
            // Invalid URL, skip
        }
    }
    
    try {
        // Check if we already have a valid logo
        const existingLogo = station.favicon || station.logo || station.favicon_url;
        
        if (existingLogo && existingLogo.startsWith('http')) {
            // Test if the logo URL is accessible
            try {
                const testResponse = await fetch(existingLogo, { method: 'HEAD', timeout: 5000 });
                if (testResponse.ok) {
                    console.log(`    ✓ ${stationName}: Already has valid logo`);
                    return { station, updated: false, logo: existingLogo };
                }
            } catch (e) {
                // Logo URL not accessible, try to find a new one
            }
        }
        
        // Try to find a better logo
        console.log(`    🔍 ${stationName}: Looking up logo...`);
        const newLogo = await findStationLogo(station);
        
        if (newLogo && newLogo !== existingLogo) {
            console.log(`    ✓ ${stationName}: Found logo: ${newLogo.substring(0, 60)}...`);
            return { 
                station: { ...station, favicon: newLogo }, 
                updated: true, 
                logo: newLogo 
            };
        } else if (existingLogo) {
            console.log(`    - ${stationName}: Keeping existing logo`);
            return { station, updated: false, logo: existingLogo };
        } else {
            console.log(`    ✗ ${stationName}: No logo found`);
            return { station, updated: false, logo: null };
        }
    } catch (error) {
        console.error(`    ✗ ${stationName}: Error - ${error.message}`);
        return { station, updated: false, logo: null, error: error.message };
    }
}

// Process all stations for a country
async function processCountry(countryCode, countryName) {
    console.log(`\n🌍 Processing ${countryName} (${countryCode})...`);
    console.log('='.repeat(60));
    
    let allStations = [];
    let updatedCount = 0;
    let totalStations = 0;
    
    try {
        // Get stations from IPRD
        console.log(`📡 Fetching stations from IPRD...`);
        const iprdStations = await getStationsForCountry(countryCode);
        console.log(`   Found ${iprdStations.length} stations from IPRD`);
        allStations.push(...iprdStations);
        
        // Get additional stations from Radio Browser API (limit to top 50 to avoid too many)
        if (allStations.length < 50) {
            console.log(`📡 Fetching additional stations from Radio Browser API...`);
            const rbStations = await fetchRadioBrowserStations(countryCode);
            console.log(`   Found ${rbStations.length} stations from Radio Browser`);
            
            // Merge, avoiding duplicates
            const existingUrls = new Set(iprdStations.map(s => s.url_resolved || s.url));
            const newStations = rbStations
                .filter(s => {
                    const url = s.url_resolved || s.url;
                    return url && !existingUrls.has(url);
                })
                .slice(0, 50 - allStations.length); // Limit to 50 total
                
            allStations.push(...newStations);
        }
        
        totalStations = allStations.length;
        console.log(`\n📊 Total stations to process: ${totalStations}`);
        
        if (totalStations === 0) {
            console.log(`   No stations found for ${countryName}`);
            return { countryCode, countryName, totalStations: 0, updatedCount: 0 };
        }
        
        // Process stations in batches to avoid overwhelming
        const batchSize = 10;
        for (let i = 0; i < allStations.length; i += batchSize) {
            const batch = allStations.slice(i, i + batchSize);
            console.log(`\n   Processing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, allStations.length)} of ${allStations.length})...`);
            
            const results = await Promise.all(
                batch.map(station => processStation(station, countryCode, countryName))
            );
            
            results.forEach(result => {
                if (result.updated) {
                    updatedCount++;
                }
            });
            
            // Small delay between batches
            if (i + batchSize < allStations.length) {
                await delay(200);
            }
        }
        
        console.log(`\n✅ ${countryName}: Updated ${updatedCount} out of ${totalStations} stations`);
        
        return {
            countryCode,
            countryName,
            totalStations,
            updatedCount,
            stations: allStations
        };
        
    } catch (error) {
        console.error(`❌ Error processing ${countryName}:`, error.message);
        return {
            countryCode,
            countryName,
            totalStations: 0,
            updatedCount: 0,
            error: error.message
        };
    }
}

// Process stations from radio-stations.json categories
async function processRadioStationsJson() {
    console.log('\n📻 Processing radio-stations.json categories...\n');
    
    if (!fs.existsSync(radioStationsPath)) {
        console.log('⚠️  radio-stations.json not found, skipping...');
        return { totalUpdated: 0, totalProcessed: 0 };
    }
    
    const data = JSON.parse(fs.readFileSync(radioStationsPath, 'utf8'));
    const categories = ['news', 'sports', 'music', 'audiobooks', 'podcasts'];
    
    let totalUpdated = 0;
    let totalProcessed = 0;
    
    for (const category of categories) {
        if (!data[category] || !Array.isArray(data[category])) {
            console.log(`⚠️  Category '${category}' not found or invalid, skipping...`);
            continue;
        }
        
        const stations = data[category];
        if (stations.length === 0) {
            console.log(`📂 Category: ${category.toUpperCase()} - No stations\n`);
            continue;
        }
        
        console.log(`📂 Category: ${category.toUpperCase()} (${stations.length} stations)`);
        console.log('='.repeat(60));
        
        let categoryUpdated = 0;
        
        // Process stations in batches
        const batchSize = 10;
        for (let i = 0; i < stations.length; i += batchSize) {
            const batch = stations.slice(i, i + batchSize);
            console.log(`\n   Processing batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${Math.min(i + batchSize, stations.length)} of ${stations.length})...`);
            
            const results = await Promise.all(
                batch.map(async (station) => {
                    totalProcessed++;
                    
                    // Add homepage if missing
                    if (!station.homepage && station.url) {
                        try {
                            const url = new URL(station.url.startsWith('http') ? station.url : `https://${station.url}`);
                            station.homepage = `https://${url.hostname}`;
                        } catch (e) {
                            // Invalid URL, skip
                        }
                    }
                    
                    const result = await processStation(station, null, category);
                    if (result.updated) {
                        totalUpdated++;
                        categoryUpdated++;
                        // Update the station in the data object
                        Object.assign(station, result.station);
                    }
                    
                    return result;
                })
            );
            
            // Small delay between batches
            if (i + batchSize < stations.length) {
                await delay(200);
            }
        }
        
        console.log(`\n✅ ${category.toUpperCase()}: Updated ${categoryUpdated} out of ${stations.length} stations`);
    }
    
    // Write updated data back to file
    fs.writeFileSync(radioStationsPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`\n✅ radio-stations.json: Updated ${totalUpdated} out of ${totalProcessed} stations`);
    
    return { totalUpdated, totalProcessed };
}

// Main function
async function main() {
    console.log('🚀 Starting logo update for all stations...\n');
    console.log('This will process:');
    console.log('  1. International category - stations from IPRD and Radio Browser API');
    console.log('  2. Other categories - stations from radio-stations.json (news, sports, music, etc.)');
    console.log('This may take a while depending on the number of stations...\n');
    
    try {
        let totalUpdated = 0;
        let totalProcessed = 0;
        const summaries = [];
        
        // Process radio-stations.json categories first
        console.log('📻 STEP 1: Processing radio-stations.json categories...');
        const jsonResults = await processRadioStationsJson();
        totalUpdated += jsonResults.totalUpdated;
        totalProcessed += jsonResults.totalProcessed;
        summaries.push({ type: 'JSON Categories', updated: jsonResults.totalUpdated, processed: jsonResults.totalProcessed });
        
        // Process International category (countries)
        console.log('\n\n🌍 STEP 2: Processing International category (countries)...\n');
        console.log('📋 Fetching list of countries...');
        const countries = await getAllCountries();
        console.log(`✅ Found ${countries.length} countries\n`);
        
        const countryResults = [];
        let countryTotalUpdated = 0;
        let countryTotalStations = 0;
        
        // Process countries one by one
        for (let i = 0; i < countries.length; i++) {
            const country = countries[i];
            // getAllCountries returns {name, iso_3166_1, stationcount}
            const code = country.iso_3166_1 || country.code;
            const name = country.name;
            
            if (!code || !name) {
                console.log(`⚠️  Skipping invalid country entry:`, country);
                continue;
            }
            
            const result = await processCountry(code, name);
            
            countryResults.push(result);
            countryTotalUpdated += result.updatedCount || 0;
            countryTotalStations += result.totalStations || 0;
            
            // Delay between countries to avoid rate limiting
            if (i < countries.length - 1) {
                console.log(`\n⏸️  Waiting 1 second before next country...`);
                await delay(1000);
            }
        }
        
        totalUpdated += countryTotalUpdated;
        totalProcessed += countryTotalStations;
        summaries.push({ type: 'International (Countries)', updated: countryTotalUpdated, processed: countryTotalStations });
        
        // Overall Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 OVERALL SUMMARY');
        console.log('='.repeat(60));
        
        summaries.forEach(summary => {
            console.log(`\n${summary.type}:`);
            console.log(`  Total stations processed: ${summary.processed}`);
            console.log(`  Stations with updated logos: ${summary.updated}`);
            console.log(`  Success rate: ${summary.processed > 0 ? ((summary.updated / summary.processed) * 100).toFixed(1) : 0}%`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`TOTAL: ${totalUpdated} out of ${totalProcessed} stations updated (${totalProcessed > 0 ? ((totalUpdated / totalProcessed) * 100).toFixed(1) : 0}%)`);
        console.log('='.repeat(60));
        
        // Top countries by updates
        const topUpdated = countryResults
            .filter(r => r.updatedCount > 0)
            .sort((a, b) => (b.updatedCount || 0) - (a.updatedCount || 0))
            .slice(0, 10);
            
        if (topUpdated.length > 0) {
            console.log('\n🏆 Top countries by logo updates:');
            topUpdated.forEach((r, i) => {
                console.log(`   ${i + 1}. ${r.countryName}: ${r.updatedCount} updated`);
            });
        }
        
        console.log('\n✨ Logo update complete!');
        console.log('\nNote: Logos are enhanced at runtime when stations are requested via API.');
        console.log('This script helps improve the logo lookup service by testing and caching results.');
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { processCountry, processStation };

