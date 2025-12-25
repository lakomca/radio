const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const repeatBtn = document.getElementById('repeatBtn');
const autoplayBtn = document.getElementById('autoplayBtn');
const playerFavoriteBtn = document.getElementById('playerFavoriteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSliderContainer = document.getElementById('volumeSliderContainer');
const searchQueryInput = document.getElementById('searchQuery');
const searchResults = document.getElementById('searchResults');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const repeatIcon = document.getElementById('repeatIcon');
const repeatOneIcon = document.getElementById('repeatOneIcon');
// Autoplay UI removed (kept autoplayEnabled internally for playlist flows)
const customProgressBar = document.getElementById('customProgressBar');
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const videoThumbnail = document.getElementById('videoThumbnail');
const equalizerCanvas = document.getElementById('equalizerCanvas');
const playerHeader = document.querySelector('.player-header');
// Navbar brand removed - always shows PULSE

// ===== DEBUG LOGGING =====
// Enable by adding ?debug=1 to the URL (or localStorage.DEBUG_STREAMING=1)
const DEBUG_STREAMING =
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') ||
    (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('DEBUG_STREAMING') === '1');

function dbg(...args) {
    if (DEBUG_STREAMING) console.log('[DBG]', ...args);
}

function dbgAudioState(label) {
    if (!DEBUG_STREAMING) return;
    try {
        const buffered = audioPlayer?.buffered;
        const bufferedEnd = buffered && buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
        console.log('[DBG]', label, {
            src: audioPlayer?.src,
            paused: audioPlayer?.paused,
            ended: audioPlayer?.ended,
            readyState: audioPlayer?.readyState,
            networkState: audioPlayer?.networkState,
            currentTime: audioPlayer?.currentTime,
            duration: audioPlayer?.duration,
            bufferedEnd
        });
    } catch (e) {
        console.log('[DBG]', label, '(failed to read audio state)', e?.message);
    }
}

// Authentication elements
const authModal = document.getElementById('authModal');
const authButtons = document.getElementById('authButtons');
const userProfile = document.getElementById('userProfile');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const menuDropdown = document.getElementById('menuDropdown');
const searchIconBtn = document.getElementById('searchIconBtn');
const searchSection = document.getElementById('searchSection');
const authFormElement = document.getElementById('authFormElement');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggle = document.getElementById('authToggle');
const authError = document.getElementById('authError');
const authEmail = document.getElementById('authEmail');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const signupFields = document.getElementById('signupFields');
const closeModal = document.querySelector('.close-modal');

// User state
let currentUser = null;
let isLoginMode = true;

let currentStreamUrl = null;
let currentSourceUrl = null; // Original URL requested (YouTube watch URL or direct station URL)
let currentVideoUrl = null; // Track current video URL (replaces youtubeUrlInput)
let currentVideoDuration = null; // Track current video duration from search results
let currentVideoTitle = null; // Track current video title
let currentVideoId = null; // Track current video ID for thumbnail
let currentStation = null; // Track current radio station with logo info
let isLoading = false;
let loadingUrl = null; // Track the URL currently being loaded
let playlist = []; // Array to store playlist
let currentIndex = -1; // Current song index in playlist
let endedHandler = null; // Handler for ended event
let isBuffering = false;
let lastCurrentTime = 0;
let streamStartTime = null; // Track when stream started
let connectionQuality = 'good'; // 'excellent', 'very-good', 'good', 'fair', 'poor'
let reconnectAttempts = 0;
let downloadSpeed = 0; // Bytes per second
let lastBufferedBytes = 0;
let lastBufferedTime = 0;
let speedMeasurementInterval = null;
// Option A (stability): don't hard-stop after a few retries during long listening sessions.
// We'll keep retrying with backoff instead of showing a "connection failed" alert.
let maxReconnectAttempts = 999999;
let adaptiveBufferTarget = 5; // Target buffer in seconds (adaptive)
let allSearchVideos = []; // Store all search results

// ===== AUTHENTICATION & FAVORITES =====

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                currentUser = data.user;
                updateAuthUI();
            } else {
                currentUser = null;
                updateAuthUI();
            }
        } else {
            currentUser = null;
            updateAuthUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
        updateAuthUI();
    }
}

// Update UI based on auth status
function updateAuthUI() {
    if (currentUser) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'block';
        usernameDisplay.textContent = currentUser.username;
    } else {
        authButtons.style.display = 'block';
        userProfile.style.display = 'none';
    }
    // Keep player favorite button state in sync with auth state
    if (typeof refreshPlayerFavoriteButton === 'function') {
        refreshPlayerFavoriteButton();
    }
}

// Login function
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server did not return JSON response');
        }
        
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            updateAuthUI();
            authModal.style.display = 'none';
            authError.style.display = 'none';
            return true;
        } else {
            authError.textContent = data.error || 'Login failed';
            authError.style.display = 'block';
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        authError.textContent = 'Login failed. Please try again.';
        authError.style.display = 'block';
        return false;
    }
}

// Signup function
async function signup(username, email, password) {
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server did not return JSON response');
        }
        
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            updateAuthUI();
            authModal.style.display = 'none';
            authError.style.display = 'none';
            return true;
        } else {
            authError.textContent = data.error || 'Signup failed';
            authError.style.display = 'block';
            return false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        authError.textContent = 'Signup failed. Please try again.';
        authError.style.display = 'block';
        return false;
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        updateAuthUI();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Add favorite
async function addFavorite(itemType, itemId, itemName, itemUrl, category, logoUrl, metadata) {
    if (!currentUser) {
        alert('Please login to add favorites');
        return false;
    }
    try {
        const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ itemType, itemId, itemName, itemUrl, category, logoUrl, metadata })
        });
        if (response.ok) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Add favorite error:', error);
        return false;
    }
}

// Remove favorite
async function removeFavorite(itemType, itemId) {
    if (!currentUser) return false;
    try {
        const response = await fetch('/api/favorites', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ itemType, itemId })
        });
        if (response.ok) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Remove favorite error:', error);
        return false;
    }
}

// Check if item is favorite
async function checkIfFavorite(itemType, itemId) {
    if (!currentUser) return false;
    try {
        const response = await fetch(`/api/favorites/check?itemType=${itemType}&itemId=${encodeURIComponent(itemId)}`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.isFavorite;
        }
        return false;
    } catch (error) {
        console.error('Check favorite error:', error);
        return false;
    }
}

// Create heart button
function createHeartButton(itemType, itemId, isFavorite = false) {
    const heartBtn = document.createElement('button');
    heartBtn.className = 'heart-btn' + (isFavorite ? ' favorite' : '');
    heartBtn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    `;
    return heartBtn;
}

// Toggle favorite
async function toggleFavorite(heartBtn, itemType, itemId, itemName, itemUrl, category, logoUrl, metadata) {
    const isFavorite = heartBtn.classList.contains('favorite');
    
    if (isFavorite) {
        const success = await removeFavorite(itemType, itemId);
        if (success) {
            heartBtn.classList.remove('favorite');
        }
    } else {
        const success = await addFavorite(itemType, itemId, itemName, itemUrl, category, logoUrl, metadata);
        if (success) {
            heartBtn.classList.add('favorite');
        }
    }
}

// Get favorites grouped by category
async function getFavoritesByCategory() {
    if (!currentUser) return {};
    try {
        const response = await fetch('/api/favorites', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.favoritesByCategory || {};
        }
        return {};
    } catch (error) {
        console.error('Get favorites error:', error);
        return {};
    }
}

// Load and display favorites
async function loadFavorites() {
    if (!currentUser) {
        searchResults.innerHTML = '<div class="error">Please login to view favorites</div>';
        return;
    }
    
    searchResults.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const favoritesByCategory = await getFavoritesByCategory();
        
        if (Object.keys(favoritesByCategory).length === 0) {
            searchResults.innerHTML = '<div class="error">No favorites yet. Click the heart icon on stations or videos to add them to favorites.</div>';
            return;
        }
        
        // Clear search results
        searchResults.innerHTML = '';
        
        // Display favorites grouped by category
        const categoryOrder = ['music', 'news', 'live-sports', 'international', 'search', 'audiobooks', 'podcasts'];
        const categories = Object.keys(favoritesByCategory).sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a.toLowerCase());
            const bIndex = categoryOrder.indexOf(b.toLowerCase());
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
        
        // Build a flattened list so user can "Play Favorites" as a playlist
        const flattenedFavorites = categories.flatMap(cat => (favoritesByCategory[cat] || []).map(f => ({ ...f, _category: cat })));

        const buildFavoritesPlaylist = () => flattenedFavorites.map(f => ({
            title: f.item_name,
            url: f.item_url,
            duration: f.metadata?.duration || null,
            id: f.metadata?.id || null,
            type: f.item_type,
            category: f._category,
            logo_url: f.logo_url || null,
            item_id: f.item_id
        }));

        const startFavoritesModeAt = async (fav) => {
            playbackMode = 'favorites';
            playlist = buildFavoritesPlaylist();
            const idx = playlist.findIndex(p => p.type === fav.item_type && p.item_id === fav.item_id);
            currentIndex = idx >= 0 ? idx : 0;
            updateNavigationButtons();
        };

        // Add a top toolbar for favorites playback
        const favoritesToolbar = document.createElement('div');
        favoritesToolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px;';

        const toolbarTitle = document.createElement('div');
        toolbarTitle.style.cssText = 'color: #ffffff; font-weight: 600; font-size: 1.1em;';
        toolbarTitle.textContent = 'Your Favorites';

        const playFavoritesBtn = document.createElement('button');
        playFavoritesBtn.className = 'auth-btn';
        playFavoritesBtn.textContent = 'Play Favorites';
        playFavoritesBtn.style.cssText = 'padding: 10px 14px;';

        playFavoritesBtn.addEventListener('click', async () => {
            if (!flattenedFavorites.length) return;
            playbackMode = 'favorites';

            // Convert favorites into playlist items compatible with next/prev flow
            playlist = buildFavoritesPlaylist();

            currentIndex = 0;
            const first = playlist[0];

            if (first.type === 'station') {
                // Play station; keep playing until user hits Next
                const station = {
                    name: first.title,
                    url: first.url,
                    url_resolved: first.url,
                    favicon: first.logo_url,
                    logo: first.logo_url,
                    stationuuid: first.item_id
                };
                await playCategoryStation(station);
            } else {
                currentStation = null;
                currentVideoUrl = first.url;
                currentVideoTitle = first.title;
                currentVideoDuration = first.duration;
                currentVideoId = first.id || getVideoIdFromUrl(first.url);

                updateVideoThumbnail(currentVideoId);
                updateNowPlayingTitle(first.title);
                highlightCurrentVideo(first.url);
                if (currentVideoDuration && totalTimeDisplay) {
                    totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                }
                loadStream(first.url);
            }
        });

        favoritesToolbar.appendChild(toolbarTitle);
        favoritesToolbar.appendChild(playFavoritesBtn);
        searchResults.appendChild(favoritesToolbar);

        categories.forEach(category => {
            const favorites = favoritesByCategory[category];
            if (!favorites || favorites.length === 0) return;
            
            // Create category section container
            const categorySection = document.createElement('div');
            categorySection.className = 'favorites-category-section';
            
            // Create category header with better styling
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'favorites-category-header';
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
            const categoryCount = document.createElement('span');
            categoryCount.className = 'favorites-count';
            categoryCount.textContent = `${favorites.length} ${favorites.length === 1 ? 'item' : 'items'}`;
            categoryHeader.appendChild(categoryTitle);
            categoryHeader.appendChild(categoryCount);
            categorySection.appendChild(categoryHeader);
            
            // Create items container for this category
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'favorites-items-grid';
            
            // Display favorites for this category
            favorites.forEach(fav => {
                if (fav.item_type === 'station') {
                    // Create station card
                    const stationCard = document.createElement('div');
                    stationCard.className = 'result-item favorite-item';
                    stationCard.style.cursor = 'pointer';
                    stationCard.style.position = 'relative';
                    
                    // Logo container
                    const logoContainer = document.createElement('div');
                    logoContainer.style.cssText = 'width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 2.5em; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #2a3a3f;';
                    
                    if (fav.logo_url) {
                        const logoImg = document.createElement('img');
                        logoImg.src = fav.logo_url;
                        logoImg.alt = fav.item_name;
                        logoImg.style.cssText = 'width: 60px; height: 60px; object-fit: cover;';
                        logoImg.onerror = function() {
                            this.style.display = 'none';
                            const emojiSpan = document.createElement('span');
                            emojiSpan.textContent = '📻';
                            emojiSpan.style.cssText = 'font-size: 2em;';
                            logoContainer.appendChild(emojiSpan);
                        };
                        logoContainer.appendChild(logoImg);
                    } else {
                        logoContainer.innerHTML = '<span style="font-size: 2em;">📻</span>';
                    }
                    
                    // Card content
                    const cardContent = document.createElement('div');
                    cardContent.style.cssText = 'display: flex; align-items: center; gap: 15px; flex: 1;';
                    
                    const textContent = document.createElement('div');
                    textContent.style.cssText = 'flex: 1; min-width: 0;';
                    
                    const nameDiv = document.createElement('div');
                    nameDiv.style.cssText = 'color: #ffffff; font-size: 1em; font-weight: 500; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
                    nameDiv.textContent = fav.item_name;
                    
                    textContent.appendChild(nameDiv);
                    cardContent.appendChild(logoContainer);
                    cardContent.appendChild(textContent);
                    
                    stationCard.appendChild(cardContent);
                    
                    // Add heart button (already favorited)
                    const heartBtn = createHeartButton('station', fav.item_id, true);
                    stationCard.appendChild(heartBtn);
                    heartBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await toggleFavorite(heartBtn, 'station', fav.item_id, fav.item_name, fav.item_url, category, fav.logo_url, fav.metadata);
                        // Reload favorites after removal
                        if (!heartBtn.classList.contains('favorite')) {
                            loadFavorites();
                        }
                    });
                    
                    stationCard.addEventListener('click', async () => {
                        await startFavoritesModeAt(fav);
                        // Parse metadata to reconstruct station object
                        const station = {
                            name: fav.item_name,
                            url: fav.item_url,
                            url_resolved: fav.item_url,
                            favicon: fav.logo_url,
                            logo: fav.logo_url,
                            stationuuid: fav.item_id,
                            ...(fav.metadata || {})
                        };
                        playCategoryStation(station);
                    });
                    
                    itemsContainer.appendChild(stationCard);
                } else if (fav.item_type === 'video') {
                    // Create video card
                    const videoCard = document.createElement('div');
                    videoCard.className = 'result-item favorite-item';
                    videoCard.style.cursor = 'pointer';
                    videoCard.style.position = 'relative';
                    videoCard.setAttribute('data-video-url', fav.item_url);
                    
                    // Try to get video thumbnail
                    const videoId = fav.metadata?.id || getVideoIdFromUrl(fav.item_url);
                    if (videoId) {
                        const thumbnailContainer = document.createElement('div');
                        thumbnailContainer.style.cssText = 'width: 120px; height: 68px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #2a3a3f; position: relative;';
                        
                        const thumbnailImg = document.createElement('img');
                        thumbnailImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        thumbnailImg.alt = fav.item_name;
                        thumbnailImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                        thumbnailImg.onerror = function() {
                            thumbnailContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 2em;">▶</div>';
                        };
                        thumbnailContainer.appendChild(thumbnailImg);
                        
                        // Play icon overlay
                        const playOverlay = document.createElement('div');
                        playOverlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffffff; font-size: 1.5em; opacity: 0.8;';
                        playOverlay.innerHTML = '▶';
                        thumbnailContainer.appendChild(playOverlay);
                        
                        videoCard.appendChild(thumbnailContainer);
                    }
                    
                    const textContent = document.createElement('div');
                    textContent.style.cssText = 'flex: 1; padding: 0 12px; min-width: 0;';
                    
                    const title = document.createElement('h3');
                    title.textContent = fav.item_name;
                    title.style.cssText = 'color: #ffffff; margin-bottom: 6px; font-size: 0.95em; font-weight: 500; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
                    
                    const duration = document.createElement('p');
                    duration.textContent = fav.metadata?.duration ? `Duration: ${formatDuration(fav.metadata.duration)}` : '';
                    duration.style.cssText = 'color: #88aabb; font-size: 0.85em;';
                    
                    textContent.appendChild(title);
                    if (duration.textContent) {
                        textContent.appendChild(duration);
                    }
                    
                    videoCard.style.cssText += 'display: flex; align-items: center; gap: 12px;';
                    videoCard.appendChild(textContent);
                    
                    // Add heart button (already favorited)
                    const heartBtn = createHeartButton('video', fav.item_id, true);
                    videoCard.appendChild(heartBtn);
                    heartBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await toggleFavorite(heartBtn, 'video', fav.item_id, fav.item_name, fav.item_url, category, fav.logo_url, fav.metadata);
                        // Reload favorites after removal
                        if (!heartBtn.classList.contains('favorite')) {
                            loadFavorites();
                        }
                    });
                    
                    videoCard.addEventListener('click', async () => {
                        await startFavoritesModeAt(fav);
                        currentVideoId = videoId;
                        currentVideoUrl = fav.item_url;
                        currentVideoTitle = fav.item_name;
                        currentVideoDuration = fav.metadata?.duration;
                        
                        updateVideoThumbnail(currentVideoId);
                        updateNowPlayingTitle(fav.item_name);
                        highlightCurrentVideo(fav.item_url);
                        
                        if (currentVideoDuration && totalTimeDisplay) {
                            totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                        }
                        
                        loadStream(fav.item_url);
                    });
                    
                    itemsContainer.appendChild(videoCard);
                }
            });
            
            categorySection.appendChild(itemsContainer);
            searchResults.appendChild(categorySection);
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
        searchResults.innerHTML = '<div class="error">Failed to load favorites. Please try again.</div>';
    }
}

// Initialize auth on page load
checkAuthStatus();

// Calculate download speed based on buffered data
function calculateDownloadSpeed() {
    if (audioPlayer.buffered.length > 0) {
        const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
        const now = Date.now();
        
        // Estimate bytes based on buffered time (rough estimate: ~16KB per second for 128kbps audio)
        const estimatedBytesPerSecond = 16 * 1024; // 128kbps = ~16KB/s
        const currentBufferedBytes = bufferedEnd * estimatedBytesPerSecond;
        
        if (lastBufferedTime > 0) {
            const timeDelta = (now - lastBufferedTime) / 1000; // seconds
            const bytesDelta = currentBufferedBytes - lastBufferedBytes;
            if (timeDelta > 0) {
                downloadSpeed = bytesDelta / timeDelta; // bytes per second
            }
        }
        
        lastBufferedBytes = currentBufferedBytes;
        lastBufferedTime = now;
    }
}

// Adaptive buffering - adjusts target buffer based on connection quality and download speed
function updateConnectionQuality(bufferedAhead, downloadSpeedParam) {
    // Calculate download speed if not provided
    if (downloadSpeedParam === null || downloadSpeedParam === undefined) {
        calculateDownloadSpeed();
        downloadSpeedParam = downloadSpeed;
    }
    
    // Convert bytes per second to Mbps for easier threshold comparison
    const speedMbps = (downloadSpeedParam / (1024 * 1024)) * 8; // Convert to Mbps
    
    // Determine connection quality based on download speed and buffered ahead
    // More granular levels: excellent, very-good, good, fair, poor
    if (speedMbps >= 5 || bufferedAhead >= 60) {
        // Excellent connection: buffer entire song/video (unlimited)
        connectionQuality = 'excellent';
        adaptiveBufferTarget = Infinity; // Buffer as much as possible (entire song)
    } else if (speedMbps >= 2 || bufferedAhead >= 30) {
        // Very good connection: buffer aggressively
        connectionQuality = 'very-good';
        adaptiveBufferTarget = 300; // 5 minutes buffer target
    } else if (speedMbps >= 1 || bufferedAhead >= 15) {
        // Good connection: buffer well ahead
        connectionQuality = 'good';
        adaptiveBufferTarget = 120; // 2 minutes buffer target
    } else if (speedMbps >= 0.5 || bufferedAhead >= 8) {
        // Fair connection: moderate buffer
        connectionQuality = 'fair';
        adaptiveBufferTarget = 30; // 30 seconds buffer target
    } else {
        // Poor connection: minimal buffer
        connectionQuality = 'poor';
        adaptiveBufferTarget = 15; // 15 seconds buffer target
    }
}

// Automatic reconnection function - retries stream with increased buffering
async function reconnectStream() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        // Never hard-stop in Option A mode; just keep trying.
        console.warn(`⚠️ Max reconnection attempts (${maxReconnectAttempts}) reached. Resetting counter and continuing retries.`);
        reconnectAttempts = 0;
    }
    
    reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    dbg('reconnectStream', { reconnectAttempts, currentSourceUrl, currentStreamUrl, isLoading });
    dbgAudioState('before reconnect');
    
    // Increase buffer target for reconnection
    adaptiveBufferTarget = Math.min(adaptiveBufferTarget + 5, 30); // Max 30 seconds buffer
    connectionQuality = 'poor';
    
    // Wait a bit before retrying (exponential backoff)
    // Cap increases to avoid hammering the server during long outages.
    const delay = Math.min(1000 * Math.pow(2, Math.min(reconnectAttempts - 1, 6)), 30000); // max 30s
    console.log(`⏳ Waiting ${delay}ms before reconnection...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Reload the stream if we have a current source URL
    if (currentSourceUrl) {
        console.log('🔄 Reconnecting to stream:', currentSourceUrl);
        // If we're stuck in a loading state (readyState 0, no buffer), loadStream() will ignore duplicates.
        // Force a restart by clearing the loading flag and resetting the media element.
        isLoading = false;
        loadingUrl = null;
        try {
            audioPlayer.pause();
            audioPlayer.removeAttribute('src');
            audioPlayer.load();
        } catch {}
        // Small delay to let the media element reset before reloading
        setTimeout(() => loadStream(currentSourceUrl), 50);
    }
}
let displayedVideosCount = 0; // Track how many videos are currently displayed
const VIDEOS_PER_BATCH = 9; // Number of videos to load per batch
let loadMoreBtn = null; // Reference to load more button
// Autoplay toggle removed from UI; we keep autoplayEnabled true for playlist/video flows.
let autoplayEnabled = true;
let playbackMode = 'normal'; // 'normal' | 'favorites'
let repeatMode = 0; // 0 = off, 1 = repeat all, 2 = repeat one
let isHandlingEnded = false; // Prevent multiple ended handlers from running simultaneously
let isSeeking = false; // Track if user is seeking on progress bar

// Set initial volume
audioPlayer.volume = volumeSlider.value / 100;

// ===== GLOBAL EVENT LISTENERS (set up once, not in loadStream) =====

// Track current time to detect restarts and update progress
audioPlayer.addEventListener('timeupdate', () => {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    // Update progress bar
    // Use actual duration if available, otherwise fall back to stored duration from search results
    const displayDuration = (duration && !isNaN(duration) && isFinite(duration) && duration > 0) 
        ? duration 
        : (currentVideoDuration ? parseInt(currentVideoDuration) : null);
    
    if (displayDuration && displayDuration > 0) {
        const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;
        const progressPercent = Math.min(progress, 100);
        // Update custom progress bar - only if not seeking
        if (progressFill && !isSeeking) {
            progressFill.style.width = progressPercent + '%';
        }
        if (progressThumb && !isSeeking) {
            progressThumb.style.left = progressPercent + '%';
        }
        
        // Update buffered portion on progress-track
        if (progressTrack && audioPlayer.buffered.length > 0 && !isSeeking) {
            const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
            const bufferedAhead = bufferedEnd - currentTime;
            if (bufferedAhead > 0) {
                const bufferedPercent = (bufferedEnd / displayDuration) * 100;
                // Set background gradient to show buffered portion (dark grey) on progress-track
                progressTrack.style.backgroundImage = 
                    `linear-gradient(to right, #1a2a2f 0%, #1a2a2f ${progressPercent}%, #555555 ${progressPercent}%, #555555 ${bufferedPercent}%, #1a2a2f ${bufferedPercent}%, #1a2a2f 100%)`;
            } else {
                // No buffered ahead, reset to solid background
                progressTrack.style.backgroundImage = 'none';
                progressTrack.style.background = '#1a2a2f';
            }
        }
        
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(currentTime);
        }
        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = formatTime(displayDuration);
        }
    } else {
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(currentTime);
        }
        // Note: totalTimeDisplay may not exist in HTML, so we check before using it
        if (totalTimeDisplay) {
            if (currentVideoDuration) {
                totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
            } else {
                totalTimeDisplay.textContent = '--:--';
            }
        }
        // Reset progress bar when no duration
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressThumb) {
            progressThumb.style.left = '0%';
        }
    }
    
    // Detect if stream restarted (time jumped backwards significantly)
    if (lastCurrentTime > 5 && currentTime < lastCurrentTime - 2 && !audioPlayer.seeking) {
        console.error('🚨 STREAM RESTART DETECTED!');
        console.error('Time jumped from', lastCurrentTime, 'to', currentTime);
        console.error('Current src:', audioPlayer.src);
        console.error('Error:', audioPlayer.error);
        console.error('Stack trace:', new Error().stack);
        // Don't do anything - just log for debugging
    }
    lastCurrentTime = currentTime;
});

// Handle progress events (buffering) - now with adaptive buffering
audioPlayer.addEventListener('progress', () => {
    if (audioPlayer.buffered.length > 0) {
        const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
        const currentTime = audioPlayer.currentTime;
        const bufferedAhead = bufferedEnd - currentTime;
        
        // Update buffered portion on progress-track (only show buffered ahead of current position)
        if (progressTrack) {
            const duration = audioPlayer.duration || (currentVideoDuration ? parseInt(currentVideoDuration) : null);
            if (duration && duration > 0 && bufferedAhead > 0) {
                const currentPercent = (currentTime / duration) * 100;
                const bufferedPercent = (bufferedEnd / duration) * 100;
                // Set background gradient to show buffered portion (dark grey) on progress-track
                progressTrack.style.backgroundImage = 
                    `linear-gradient(to right, #1a2a2f 0%, #1a2a2f ${currentPercent}%, #555555 ${currentPercent}%, #555555 ${bufferedPercent}%, #1a2a2f ${bufferedPercent}%, #1a2a2f 100%)`;
            } else {
                // No buffered ahead, reset to solid background
                progressTrack.style.backgroundImage = 'none';
                progressTrack.style.background = '#1a2a2f';
            }
        }
        
        // Update connection quality based on buffer levels and download speed
        updateConnectionQuality(bufferedAhead, null);
        
        // For excellent/very-good connections, continuously buffer ahead (entire song if possible)
        // For other connections, use adaptive threshold
        const isExcellentConnection = connectionQuality === 'excellent' || connectionQuality === 'very-good';
        const bufferThreshold = isExcellentConnection ? 0 : (adaptiveBufferTarget === Infinity ? 0 : adaptiveBufferTarget / 2);
        
        // Check if we need to buffer (works during both playback and when paused)
        const duration = audioPlayer.duration || (currentVideoDuration ? parseInt(currentVideoDuration) : null);
        const shouldBuffer = duration ? bufferedAhead < Math.min(adaptiveBufferTarget, duration - currentTime) : bufferedAhead < bufferThreshold;
        
        if (shouldBuffer) {
            if (!isBuffering) {
                isBuffering = true;
                const speedInfo = downloadSpeed > 0 ? ` (${(downloadSpeed / (1024 * 1024) * 8).toFixed(2)} Mbps)` : '';
                console.log(`📊 Buffering started - buffer ahead: ${bufferedAhead.toFixed(2)}s, target: ${adaptiveBufferTarget === Infinity ? 'entire song' : adaptiveBufferTarget + 's'} (${connectionQuality} connection${speedInfo})`);
            }
        } else if (isBuffering) {
            isBuffering = false;
            const speedInfo = downloadSpeed > 0 ? ` (${(downloadSpeed / (1024 * 1024) * 8).toFixed(2)} Mbps)` : '';
            console.log(`✅ Buffering complete - buffer ahead: ${bufferedAhead.toFixed(2)}s (${connectionQuality} connection${speedInfo})`);
        }
        
        // For excellent connections, try to buffer entire song continuously
        if (isExcellentConnection && duration && bufferedAhead < duration - currentTime - 1) {
            // Keep buffering - the browser will continue downloading
            // We can't force it, but we can ensure playback doesn't pause
            if (audioPlayer.paused && !isLoading) {
                // If paused and we have good connection, keep buffering in background
                // The browser will continue downloading
            }
        }
    } else if (progressTrack) {
        // Reset buffered portion on progress-track if no buffered data
        progressTrack.style.backgroundImage = 'none';
        progressTrack.style.background = '#1a2a2f';
    }
});

// Handle stalled events - with automatic retry and increased buffering
audioPlayer.addEventListener('stalled', () => {
    console.log('⚠️ Stream stalled - waiting for data');
    dbgAudioState('stalled');
    const buffered = audioPlayer.buffered;
    const bufferedTime = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
    console.log(`  Current readyState: ${audioPlayer.readyState}, buffered: ${bufferedTime.toFixed(2)}s`);
    
    // Mark connection as poor when stalling occurs
    connectionQuality = 'poor';
    adaptiveBufferTarget = 15; // Increase buffer target after stall
    
    // If we're still loading and have some data, try to play
    if (isLoading && (audioPlayer.readyState >= 1 || bufferedTime > 0)) {
        setTimeout(() => {
            if (isLoading && audioPlayer.paused) {
                const newBuffered = audioPlayer.buffered;
                const newBufferedTime = newBuffered.length > 0 ? newBuffered.end(newBuffered.length - 1) : 0;
                console.log(`Attempting to play after stall - readyState: ${audioPlayer.readyState}, buffered: ${newBufferedTime.toFixed(2)}s`);
                audioPlayer.play().then(() => {
                    console.log('✅ Playback resumed after stall');
                    isLoading = false;
        loadingUrl = null;
                    reconnectAttempts = 0; // Reset on successful play
                    updatePlayPauseButton(true);
                }).catch(err => {
                    console.error('Play failed after stall:', err.message);
                });
            }
        }, 1000);
    }
});

// Handle waiting events
audioPlayer.addEventListener('waiting', () => {
    console.log('⏳ Stream waiting for data');
    dbgAudioState('waiting');
    // Don't reload or restart - let browser handle buffering naturally
});

// Don't add a global canplay listener - it will interfere with loadStream's canplay handler
// The browser will automatically resume playback when buffering completes

// Handle suspend events
audioPlayer.addEventListener('suspend', () => {
    console.log('⏸️ Stream suspended (normal - enough data buffered)');
    dbgAudioState('suspend');
});

// Track when source changes
const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src').set;
Object.defineProperty(audioPlayer, 'src', {
    set: function(value) {
        console.log('🔄 Audio src changed from', this.src, 'to', value);
        if (this.src && value && this.src !== value) {
            console.log('⚠️ Source changed while playing - this might cause restart!');
        }
        const wasPlaying = !this.paused;
        originalSrcSetter.call(this, value);
        
        // Reconnect equalizer if it's active (check if equalizer is initialized)
        if (typeof isEqualizerActive !== 'undefined' && isEqualizerActive && typeof connectAudioToAnalyser !== 'undefined' && wasPlaying) {
            setTimeout(() => {
                if (!this.paused && this.src) {
                    connectAudioToAnalyser();
                }
            }, 100);
        }
    },
    get: function() {
        return this.getAttribute('src');
    }
});

// Track load() calls
const originalLoad = audioPlayer.load.bind(audioPlayer);
audioPlayer.load = function() {
    console.log('🔄 audioPlayer.load() called');
    console.trace('Load called from:');
    return originalLoad();
};

// ===== END GLOBAL EVENT LISTENERS =====

// Play/Pause functionality
playPauseBtn.addEventListener('click', () => {
    if (audioPlayer.paused) {
        if (!currentStreamUrl) {
            return;
        }
        audioPlayer.play();
        updatePlayPauseButton(true);
    } else {
        audioPlayer.pause();
        updatePlayPauseButton(false);
    }
});

// Previous button functionality
prevBtn.addEventListener('click', () => {
    if (playlist.length === 0) {
        return;
    }
    
    if (currentIndex > 0) {
        currentIndex--;
        const prevVideo = playlist[currentIndex];
        // Clear station state when switching to video
        currentStation = null;
        
        currentVideoUrl = prevVideo.url;
        currentVideoDuration = prevVideo.duration;
        currentVideoTitle = prevVideo.title;
        currentVideoId = prevVideo.id || getVideoIdFromUrl(prevVideo.url);
        updateVideoThumbnail(currentVideoId);
        updateNowPlayingTitle(prevVideo.title);
        highlightCurrentVideo(prevVideo.url);
        if (currentVideoDuration && totalTimeDisplay) {
            totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
        }
        loadStream(prevVideo.url);
    }
});

// Next button functionality - play next song from search results
nextBtn.addEventListener('click', async () => {
    // Check if we have a playlist from search results
    if (playlist.length > 0 && currentIndex >= 0) {
        // Play next song from search results
        if (currentIndex < playlist.length - 1) {
            currentIndex++;
            const nextVideo = playlist[currentIndex];
            // Favorites playlist can include stations + videos
            if (playbackMode === 'favorites' && nextVideo.type === 'station') {
                const station = {
                    name: nextVideo.title,
                    url: nextVideo.url,
                    url_resolved: nextVideo.url,
                    favicon: nextVideo.logo_url,
                    logo: nextVideo.logo_url,
                    stationuuid: nextVideo.item_id
                };
                await playCategoryStation(station);
            } else {
                // Video
                currentStation = null;
                currentVideoUrl = nextVideo.url;
                currentVideoDuration = nextVideo.duration;
                currentVideoTitle = nextVideo.title;
                currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                updateVideoThumbnail(currentVideoId);
                updateNowPlayingTitle(nextVideo.title);
                highlightCurrentVideo(nextVideo.url);
                if (currentVideoDuration && totalTimeDisplay) {
                    totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                }
                loadStream(nextVideo.url);
            }
            updateNavigationButtons();
            return;
        }
    }
    
    // Fallback: try to get next from current search results if available
    if (allSearchVideos.length > 0 && currentVideoUrl) {
        const currentIndexInSearch = allSearchVideos.findIndex(v => v.url === currentVideoUrl);
        if (currentIndexInSearch >= 0 && currentIndexInSearch < allSearchVideos.length - 1) {
            const nextVideo = allSearchVideos[currentIndexInSearch + 1];
            currentIndex = currentIndexInSearch + 1;
            currentVideoUrl = nextVideo.url;
            currentVideoDuration = nextVideo.duration;
            currentVideoTitle = nextVideo.title;
            currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
            updateVideoThumbnail(currentVideoId);
            updateNowPlayingTitle(nextVideo.title);
            playlist = allSearchVideos.map(v => ({
                title: v.title,
                url: v.url,
                duration: v.duration,
                id: v.id || getVideoIdFromUrl(v.url)
            }));
            highlightCurrentVideo(nextVideo.url);
            if (currentVideoDuration && totalTimeDisplay) {
                totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
            }
            loadStream(nextVideo.url);
            updateNavigationButtons();
            return;
        }
    }
    
    // If no search results available, try related videos as fallback
    const currentUrl = currentVideoUrl;
    if (!currentUrl) {
        return;
    }
    
    // Disable button while loading
    nextBtn.disabled = true;
    
    try {
        // Fetch related videos as fallback
        const response = await fetch(`/related?url=${encodeURIComponent(currentUrl)}`);
        const data = await response.json();
        
        if (data.error || !data.videos || data.videos.length === 0) {
            nextBtn.disabled = false;
            return;
        }
        
        // Play the first recommended video
        const nextVideo = data.videos[0];
        currentVideoUrl = nextVideo.url;
        currentVideoTitle = nextVideo.title;
        updateNowPlayingTitle(nextVideo.title);
        currentIndex = -1;
        playlist = [nextVideo];
        loadStream(nextVideo.url);
        
        updateNavigationButtons();
    } catch (error) {
        console.error('Error getting next video:', error);
    } finally {
        // Always re-enable next button
        nextBtn.disabled = false;
        updateNavigationButtons();
    }
});

// Stop functionality
stopBtn.addEventListener('click', () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    updatePlayPauseButton(false);
    updateNowPlayingTitle(null);
    currentStation = null; // Clear current station
    currentVideoId = null; // Clear video ID
    updateVideoThumbnail(null); // Clear thumbnail
    updateTabFavicon(null); // Revert to default favicon
});

// Volume control - toggle slider on button click
if (volumeBtn && volumeSliderContainer) {
    volumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = volumeSliderContainer.style.display !== 'none';
        volumeSliderContainer.style.display = isVisible ? 'none' : 'flex';
    });
}

// Close volume slider when clicking outside
document.addEventListener('click', (e) => {
    if (volumeSliderContainer && volumeBtn) {
        if (!volumeBtn.contains(e.target) && !volumeSliderContainer.contains(e.target)) {
            volumeSliderContainer.style.display = 'none';
        }
    }
});

// Volume slider control
if (volumeSlider) {
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    audioPlayer.volume = volume / 100;
    });
    
    // Prevent clicks on slider from closing it
    volumeSlider.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Repeat button functionality - only changes mode, doesn't trigger immediate repeat
// Actual repeating happens in the ended event handler when song finishes
repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3; // Cycle: 0 -> 1 -> 2 -> 0
    
    if (repeatMode === 0) {
        // Off
        repeatBtn.classList.remove('active');
        repeatIcon.style.display = 'block';
        repeatOneIcon.style.display = 'none';
        repeatBtn.title = 'Repeat: OFF';
    } else if (repeatMode === 1) {
        // Repeat all
        repeatBtn.classList.add('active');
        repeatIcon.style.display = 'block';
        repeatOneIcon.style.display = 'none';
        repeatBtn.title = 'Repeat: ALL';
    } else {
        // Repeat one
        repeatBtn.classList.add('active');
        repeatIcon.style.display = 'none';
        repeatOneIcon.style.display = 'block';
        repeatBtn.title = 'Repeat: ONE';
    }
    
    console.log('Repeat mode changed to:', repeatMode === 0 ? 'OFF' : (repeatMode === 1 ? 'ALL' : 'ONE'));
});

// Autoplay button functionality
// Autoplay button removed from UI; keep this guard so older markup doesn't break.
if (autoplayBtn) {
    autoplayBtn.style.display = 'none';
}

function getCurrentPlayableForFavorite() {
    // Station playing
    if (currentStation && (currentStation.url || currentStation.url_resolved)) {
        const itemId = currentStation.stationuuid || currentStation.url_resolved || currentStation.url || currentStation.name;
        return {
            itemType: 'station',
            itemId,
            itemName: currentStation.name || 'Station',
            itemUrl: currentStation.url_resolved || currentStation.url,
            category: activeCategory || (currentGenre ? 'music' : 'international'),
            logoUrl: currentStation.favicon || currentStation.logo || currentStation.favicon_url || null,
            metadata: currentStation
        };
    }
    // Video playing
    if (currentVideoUrl) {
        const vidId = currentVideoId || getVideoIdFromUrl(currentVideoUrl);
        const itemId = vidId || currentVideoUrl;
        return {
            itemType: 'video',
            itemId,
            itemName: currentVideoTitle || 'Video',
            itemUrl: currentVideoUrl,
            category: 'search',
            logoUrl: vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : null,
            metadata: { id: vidId, duration: currentVideoDuration }
        };
    }
    return null;
}

async function refreshPlayerFavoriteButton() {
    if (!playerFavoriteBtn) return;
    const playable = getCurrentPlayableForFavorite();
    if (!currentUser || !playable) {
        playerFavoriteBtn.classList.remove('favorite');
        playerFavoriteBtn.disabled = !playable;
        playerFavoriteBtn.title = playable ? 'Login to add to Favorites' : 'Nothing playing';
        return;
    }

    const isFav = await checkIfFavorite(playable.itemType, playable.itemId);
    playerFavoriteBtn.classList.toggle('favorite', !!isFav);
    playerFavoriteBtn.disabled = false;
    playerFavoriteBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
}

if (playerFavoriteBtn) {
    playerFavoriteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            alert('Please login to add favorites');
            return;
        }
        const playable = getCurrentPlayableForFavorite();
        if (!playable) return;
        
        // Use explicit add/remove logic for the player button (more reliable than reusing card logic)
        const currentlyFav = playerFavoriteBtn.classList.contains('favorite');
        let success = false;
        if (currentlyFav) {
            success = await removeFavorite(playable.itemType, playable.itemId);
            if (success) {
                playerFavoriteBtn.classList.remove('favorite');
                playerFavoriteBtn.title = 'Add to Favorites';
            }
        } else {
            success = await addFavorite(
                playable.itemType,
                playable.itemId,
                playable.itemName,
                playable.itemUrl,
                playable.category,
                playable.logoUrl,
                playable.metadata
            );
            if (success) {
                playerFavoriteBtn.classList.add('favorite');
                playerFavoriteBtn.title = 'Remove from Favorites';
            }
        }
        
        if (!success) {
            console.warn('Player favorite toggle failed', playable);
        }

        // If user is currently viewing favorites, refresh it.
        if (activeCategory === 'favorites') {
            loadFavorites();
        }
        
        // Re-sync with backend in case IDs differ
        refreshPlayerFavoriteButton();
    });
}


// Load stream function
// - YouTube URLs: stream via backend (/stream?url=...) so we can extract audio with yt-dlp + ffmpeg
// - Non-YouTube URLs (radio stations): play directly in the browser audio element
function loadStream(youtubeUrl) {
    // Prevent loading the same URL that's already being loaded
    if (loadingUrl === youtubeUrl || (currentStreamUrl && currentStreamUrl.includes(encodeURIComponent(youtubeUrl)))) {
        console.log('⚠️ Same URL already loading, ignoring duplicate request for:', youtubeUrl);
        // If it's already loading and paused, try to play it
        if (audioPlayer.paused && !isLoading) {
            console.log('🔄 Resuming already loaded stream');
            audioPlayer.play().then(() => {
                updatePlayPauseButton(true);
            }).catch(err => {
                console.error('Error resuming stream:', err);
            });
        }
        return;
    }
    
    // If loading a different URL, stop the current stream first
    if (isLoading && loadingUrl !== youtubeUrl) {
        console.log('⚠️ Stopping current stream to load new URL:', youtubeUrl);
        try {
            audioPlayer.pause();
            audioPlayer.removeAttribute('src');
            audioPlayer.load();
        } catch (e) {
            console.warn('Error stopping current stream:', e);
        }
        isLoading = false;
        loadingUrl = null;
    }
    
    loadingUrl = youtubeUrl; // Track the URL being loaded
    console.log('🎵 ===== LOADING NEW STREAM =====');
    console.log('URL:', youtubeUrl);
    dbg('loadStream called', {
        youtubeUrl,
        currentVideoUrl,
        currentVideoId,
        currentStation: currentStation?.name,
        playbackMode,
        playlistLen: playlist?.length,
        currentIndex,
        activeCategory,
        currentGenre,
        isLoading
    });
    dbgAudioState('before loadStream');
    console.trace('loadStream called from:');
    
    isLoading = true;
    
    playPauseBtn.disabled = true;
    
    // Defensive: sometimes a bad URL (like a ytimg storyboard/thumbnail) can slip in.
    // If we have a videoId, convert it back to a proper watch URL.
    if (typeof youtubeUrl === 'string') {
        const looksLikeImage = /(?:ytimg\.com|img\.youtube\.com)/i.test(youtubeUrl) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(youtubeUrl);
        if (looksLikeImage && currentVideoId) {
            console.warn('⚠️ Received image URL for playback; converting to watch URL using currentVideoId:', youtubeUrl);
            youtubeUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
        }
    }

    // Store original requested URL for reconnection logic
    currentSourceUrl = youtubeUrl;

    const isYouTubeSource = /(?:youtube\.com|youtu\.be)/i.test(youtubeUrl || '');
    const looksLikeHlsOrTs = /(\.m3u8(\?|$))|(\.ts(\?|$))/i.test(youtubeUrl || '');
    
    // Check if URL needs transcoding (formats browsers typically can't play directly)
    // Also check for common radio streaming patterns that may need transcoding
    const needsTranscoding = looksLikeHlsOrTs || 
        /\.(pls|asx|wax|wvx|ram|rm|ra)(\?|$)/i.test(youtubeUrl || '') ||
        /\/stream|\.stream|shoutcast|icecast/i.test(youtubeUrl || '') ||
        /:\d{4,5}\//i.test(youtubeUrl || ''); // URLs with ports (common for radio streams)
    
    // For radio stations (international or category), prefer transcoding for better compatibility
    // Only use direct playback for very simple, well-known formats from trusted sources
    const isRadioStation = currentStation !== null;
    const isDirectPlayable = !isRadioStation && // Don't use direct playback for radio stations
                            /\.(mp3|aac|ogg|wav|m4a)(\?|$)/i.test(youtubeUrl || '') && 
                            !needsTranscoding &&
                            !/(shoutcast|icecast|stream)/i.test(youtubeUrl || '') &&
                            /^https?:\/\/(www\.)?(radio|stream|listen)\./i.test(youtubeUrl || ''); // Only trusted radio domains
    
    // Create stream URL
    // Route playback:
    // - YouTube -> backend /stream
    // - Radio stations -> backend /radio-stream transcoder (for better compatibility with international stations)
    // - HLS (.m3u8/.ts) or other non-YouTube streams that browsers can't play -> backend /radio-stream transcoder
    // - Simple direct radio URLs (mp3/aac) from trusted sources -> direct (but will fallback to transcoder if they fail)
    const streamUrl = isYouTubeSource
        ? `/stream?url=${encodeURIComponent(youtubeUrl)}`
        : (isRadioStation || needsTranscoding || !isDirectPlayable 
            ? `/radio-stream?url=${encodeURIComponent(youtubeUrl)}` 
            : youtubeUrl);
    console.log('Stream URL:', streamUrl, `(direct=${isDirectPlayable}, transcoded=${needsTranscoding || !isDirectPlayable}, isRadioStation=${isRadioStation})`);
    if (isRadioStation) {
        console.log('📻 Radio station detected - using transcoder for better compatibility');
    }
    dbg('route decision', { isYouTubeSource, looksLikeHlsOrTs, needsTranscoding, isDirectPlayable, isRadioStation, streamUrl, currentSourceUrl });
    
    // Check if we're reloading the same stream
    if (currentStreamUrl === streamUrl && !audioPlayer.paused) {
        console.warn('⚠️ WARNING: Attempting to reload the same stream while playing!');
        console.warn('This will cause a restart. Current time:', audioPlayer.currentTime);
    }
    
    currentStreamUrl = streamUrl;
    streamStartTime = Date.now();
    
    // Reset audio player completely
    try {
        const wasPlaying = !audioPlayer.paused;
        const oldTime = audioPlayer.currentTime;
    console.log('Resetting audio player. Was playing:', wasPlaying, 'Time:', oldTime);
    dbgAudioState('after reset (before src set)');
        
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
        
        // Reset tracking variables and time display immediately
        lastCurrentTime = 0;
        isBuffering = false;
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (progressTrack) {
            progressTrack.style.backgroundImage = 'none';
            progressTrack.style.background = '#1a2a2f';
        }
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
    } catch (e) {
        console.warn('Error resetting audio player:', e);
    }
    
    // Reset reconnection attempts and download speed tracking for new stream
    reconnectAttempts = 0;
    connectionQuality = 'good';
    downloadSpeed = 0;
    lastBufferedBytes = 0;
    lastBufferedTime = 0;
    
    // Prefer stability for YouTube (Option A): buffer longer, fewer restarts
    adaptiveBufferTarget = isYouTubeSource ? 12 : 5; // seconds
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        console.log('Setting new audio source:', streamUrl);
        audioPlayer.src = streamUrl;
        audioPlayer.preload = 'auto';
        audioPlayer.load();
        dbgAudioState('after src set + load()');
    }, 100);
    
    // Track progress to detect if data is actually being received
    let hasReceivedData = false;
    let hasStartedPlayback = false;
    let progressCheckInterval = null;
    let timeoutIds = [];
    let didCleanup = false;
    
    // Cleanup function for progress checking
    const cleanupProgressCheck = () => {
        if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
            progressCheckInterval = null;
        }
    };

    const cleanupLoad = () => {
        if (didCleanup) return;
        didCleanup = true;
        cleanupProgressCheck();
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];
    };
    
    // Wait for metadata
    // Option A: do NOT force immediate playback as soon as any bytes arrive.
    // We only log progress here; actual play starts once we have enough buffer.
    audioPlayer.addEventListener('loadstart', () => {
        console.log('📡 Audio loadstart event');
        hasReceivedData = false;
        hasStartedPlayback = false;
        cleanupProgressCheck(); // Clear any existing interval
        
        progressCheckInterval = setInterval(() => {
            if (!isLoading) {
                cleanupProgressCheck();
                return;
            }
            
            const buffered = audioPlayer.buffered;
            const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
            if (bufferedEnd > 0) {
                hasReceivedData = true;
                const bufferedAhead = bufferedEnd - (audioPlayer.currentTime || 0);
                console.log(`📊 Buffer: ${bufferedAhead.toFixed(2)}s ahead (target: ${adaptiveBufferTarget}s), readyState: ${audioPlayer.readyState}`);
            }
        }, 1000);
    }, { once: true });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log('✅ Audio metadata loaded');
        // Don't set isLoading = false here - let canplay handler do it after playback starts
        playPauseBtn.disabled = false;
        updateNavigationButtons();
        // Ensure time display is reset when new stream loads
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (progressTrack) {
            progressTrack.style.backgroundImage = 'none';
            progressTrack.style.background = '#1a2a2f';
        }
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
    }, { once: true });
    
    audioPlayer.addEventListener('loadeddata', () => {
        console.log('✅ Audio data loaded, readyState:', audioPlayer.readyState);
        hasReceivedData = true;
    }, { once: true });
    
    // Progress event to track data download
    audioPlayer.addEventListener('progress', () => {
        if (!hasReceivedData) {
            hasReceivedData = true;
            console.log('📥 Progress event - data is being received');
        }
    }, { once: true });
    
    // Handle errors
    // Option A: prefer buffering; but for long YouTube playback, do a SILENT reconnect (no alerts)
    // instead of getting stuck after a couple tracks.
    audioPlayer.addEventListener('error', (e) => {
        cleanupLoad();
        console.error('❌ Audio error:', e);
        console.error('Error code:', audioPlayer.error?.code);
        console.error('Error message:', audioPlayer.error?.message);
        console.error('Error name:', audioPlayer.error?.name);
        console.trace('Error occurred at:');
        
        playPauseBtn.disabled = false;
        updatePlayPauseButton(false);
        
        // Try to get more details about the error and reconnect if needed
        if (audioPlayer.error) {
            const errorMessages = {
                1: 'MEDIA_ERR_ABORTED - The user aborted the loading',
                2: 'MEDIA_ERR_NETWORK - A network error caused the download to fail',
                3: 'MEDIA_ERR_DECODE - The decoding of the media failed',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The media could not be loaded'
            };
            console.error('Error details:', errorMessages[audioPlayer.error.code] || 'Unknown error');
            
            // If playback already started:
            // - YouTube: attempt silent reconnect to keep long playlists going
            // - Stations: let browser recover naturally
            if (hasStartedPlayback) {
                isLoading = false;
        loadingUrl = null;
                if (isYouTubeSource && (audioPlayer.error.code === 2 || audioPlayer.error.code === 3 || audioPlayer.error.code === 4)) {
                    console.warn('🔄 Error after playback started (YouTube) — attempting silent reconnection...');
                    reconnectStream();
                } else {
                    console.warn('⚠️ Error after playback started — not reconnecting (Option A).');
                }
                return;
            }
            
            // Before playback starts, we can still attempt a reconnect if needed.
            // For radio stations, if direct playback fails, try transcoding
            if (!isYouTubeSource && (audioPlayer.error.code === 4 || audioPlayer.error.code === 2)) {
                // MEDIA_ERR_SRC_NOT_SUPPORTED or MEDIA_ERR_NETWORK - try transcoding
                console.log(`🔄 Radio station error (code ${audioPlayer.error.code}), trying transcoder...`);
                const transcodedUrl = `/radio-stream?url=${encodeURIComponent(currentSourceUrl)}`;
                if (currentStreamUrl !== transcodedUrl) {
                    console.log('🔄 Switching to transcoded stream:', transcodedUrl);
                    isLoading = false;
                    loadingUrl = null;
                    currentStreamUrl = transcodedUrl;
                    setTimeout(() => {
                        audioPlayer.src = transcodedUrl;
                        audioPlayer.load();
                    }, 100);
                    return;
                }
            }
            
            // For YouTube or other sources, attempt reconnection
            if (isYouTubeSource || (!isYouTubeSource && audioPlayer.error.code !== 2 && audioPlayer.error.code !== 4)) {
            if (audioPlayer.error.code === 2 || audioPlayer.error.code === 4) {
                console.log('🔄 Network or source error before playback, attempting reconnection...');
                reconnectStream();
            } else if (audioPlayer.error.code === 3) {
                console.log('🔄 Decoding error before playback, attempting reconnection...');
                reconnectStream();
                }
            }
        }
    }, { once: true });
    
    // Timeout fallback - for Option A we do NOT force play early.
    // We only fail/reconnect if playback never starts.
    const timeoutChecks = [
        { time: 5000, message: '5s timeout check' },
        { time: 10000, message: '10s timeout check' },
        { time: 15000, message: '15s timeout check' },
        { time: 20000, message: '20s timeout check' }
    ];
    
    timeoutChecks.forEach(({ time, message }) => {
        const id = setTimeout(() => {
            if (isLoading) {
                const buffered = audioPlayer.buffered;
                const bufferedTime = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
                console.warn(`⏱️ ${message} - checking if we can play anyway`);
                console.warn(`  readyState: ${audioPlayer.readyState}, buffered: ${bufferedTime.toFixed(2)}s, hasReceivedData: ${hasReceivedData}`);
                // Only give up/reconnect on longer timeouts IF playback never started.
                if (!hasStartedPlayback && time >= 20000) {
                    console.warn(`⏱️ ${message} - playback never started; attempting reconnection...`);
                    reconnectStream();
                }
            }
        }, time);
        timeoutIds.push(id);
    });
    
    // Final timeout - give up after 25 seconds
    timeoutIds.push(setTimeout(() => {
        cleanupLoad();
        if (isLoading) {
            console.error('⏱️ Final timeout (25s) - giving up on loading');
            isLoading = false;
        loadingUrl = null;
            playPauseBtn.disabled = false;
            updatePlayPauseButton(false);
        }
    }, 25000));
    
    // Auto-play when loaded - only for new streams
    const canplayHandler = () => {
        console.log('▶️ Audio can play');
        // Only reset time if this is a new stream load (not a buffering recovery)
        if (isLoading) {
            // Ensure time is reset before playing new stream
            if (audioPlayer.currentTime > 0.1) {
                audioPlayer.currentTime = 0;
            }
            if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
            if (progressFill) progressFill.style.width = '0%';
            if (progressThumb) progressThumb.style.left = '0%';
            lastCurrentTime = 0;
            // Reset ended handler flag when new stream is ready to play
            isHandlingEnded = false;
            
            // Check buffer before playing (adaptive)
            const buffered = audioPlayer.buffered;
            const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
            const bufferedAhead = bufferedEnd - audioPlayer.currentTime;
            
            // Initial buffer requirements (adaptive based on stream type)
            // YouTube: start with 2s buffer (can start faster, will buffer more during playback)
            // Radio: start with 10s buffer for better stability
            // Recordings: start with 0.5s buffer since they're local
            const isRecording = /\/api\/recordings\/\d+\/file/.test(youtubeUrl || '');
            const isYouTube = isYouTubeSource;
            const minInitialBuffer = isRecording ? 0.5 : (isYouTube ? 2 : 10);
            
            // Also check if we have any data at all (readyState >= 3 means we have enough data to play)
            // For YouTube, be more lenient - allow playback with less buffer since it will buffer aggressively during playback
            const hasEnoughData = bufferedAhead >= minInitialBuffer || 
                                 audioPlayer.readyState >= 3 || 
                                 (isYouTube && audioPlayer.readyState >= 2 && bufferedAhead > 0.5) ||
                                 (!isYouTube && audioPlayer.readyState >= 2 && bufferedAhead > 0);
            
            if (hasEnoughData) {
                console.log(`▶️ Starting playback (buffer: ${bufferedAhead.toFixed(2)}s, readyState: ${audioPlayer.readyState})`);
                audioPlayer.play().then(() => {
                    console.log(`✅ Audio play started (buffer: ${bufferedAhead.toFixed(2)}s)`);
                    isLoading = false;
                    loadingUrl = null;
                    hasStartedPlayback = true;
                    // Auto-start equalizer when audio starts playing (always on by default)
                    if (!isEqualizerActive && !audioElementAlreadyConnected) {
                        // Small delay to ensure audio element is ready
                        setTimeout(() => {
                            // Double-check the flag before starting
                            if (!audioElementAlreadyConnected && !isEqualizerActive) {
                                startEqualizer();
                            }
                        }, 200);
                    }
                    reconnectAttempts = 0; // Reset on successful play
                    updatePlayPauseButton(true);
                    cleanupLoad();
                }).catch(err => {
                    console.error('❌ Play error:', err);
                    console.error('Error details:', err.message, err.name);
                    isLoading = false;
                    loadingUrl = null;
                    isHandlingEnded = false;
                    cleanupLoad();
                    
                    // If autoplay was blocked, enable manual play
                    if (err.name === 'NotAllowedError' || err.message.includes('play() request')) {
                        console.log('ℹ️ Autoplay blocked - user can click play button');
                        playPauseBtn.disabled = false;
                        updatePlayPauseButton(false);
                    }
                });
            } else {
                // Wait for more buffer, but with shorter timeout
                console.log(`⏳ Waiting for buffer (${bufferedAhead.toFixed(2)}s < ${minInitialBuffer}s, readyState: ${audioPlayer.readyState})...`);
                
                // Set up multiple checks with increasing urgency
                let checkCount = 0;
                const maxChecks = 10; // Check for up to 5 seconds (10 * 500ms)
                
                const checkBuffer = () => {
                    checkCount++;
                    if (!isLoading) return; // Stream was cancelled
                    
                    const currentBuffered = audioPlayer.buffered.length > 0 
                            ? audioPlayer.buffered.end(audioPlayer.buffered.length - 1) - audioPlayer.currentTime 
                            : 0;
                    
                    const canPlayNow = currentBuffered >= minInitialBuffer || 
                                      audioPlayer.readyState >= 3 ||
                                      (audioPlayer.readyState >= 2 && currentBuffered > 0 && checkCount >= 3); // After 1.5s, start with any buffer
                    
                    if (canPlayNow) {
                        console.log(`▶️ Starting playback after ${checkCount * 0.5}s wait (buffer: ${currentBuffered.toFixed(2)}s)`);
                            audioPlayer.play().then(() => {
                            console.log(`✅ Audio play started after buffering (buffer: ${currentBuffered.toFixed(2)}s)`);
                                isLoading = false;
                            loadingUrl = null;
                                hasStartedPlayback = true;
                                reconnectAttempts = 0;
                                updatePlayPauseButton(true);
                                cleanupLoad();
                            }).catch(err => {
                                console.error('❌ Play error after buffering:', err);
                                isLoading = false;
                            loadingUrl = null;
                                cleanupLoad();
                            
                            // If autoplay was blocked, enable manual play
                            if (err.name === 'NotAllowedError' || err.message.includes('play() request')) {
                                console.log('ℹ️ Autoplay blocked - user can click play button');
                                playPauseBtn.disabled = false;
                                updatePlayPauseButton(false);
                            }
                        });
                    } else if (checkCount < maxChecks) {
                        // Keep checking
                        setTimeout(checkBuffer, 500);
                        } else {
                        // Give up waiting and try to play anyway if we have any data
                        if (audioPlayer.readyState >= 2 && currentBuffered > 0) {
                            console.log(`⚠️ Buffer timeout - attempting to play with ${currentBuffered.toFixed(2)}s buffer`);
                            audioPlayer.play().then(() => {
                                console.log(`✅ Audio play started with minimal buffer (${currentBuffered.toFixed(2)}s)`);
                                isLoading = false;
                                loadingUrl = null;
                                hasStartedPlayback = true;
                                reconnectAttempts = 0;
                                updatePlayPauseButton(true);
                                cleanupLoad();
                            }).catch(err => {
                                console.error('❌ Play failed after timeout:', err);
                                isLoading = false;
                                loadingUrl = null;
                                cleanupLoad();
                                playPauseBtn.disabled = false;
                                updatePlayPauseButton(false);
                            });
                        } else {
                            console.error('❌ No data received after 5 seconds - stream may have failed');
                            isLoading = false;
                            loadingUrl = null;
                            cleanupLoad();
                            playPauseBtn.disabled = false;
                            updatePlayPauseButton(false);
                        }
                    }
                };
                
                // Start checking after 500ms
                setTimeout(checkBuffer, 500);
            }
        } else {
            // If isLoading is false but canplay fires, it might be buffering recovery
            // Don't interfere - let browser handle it
            console.log('▶️ Audio can play (buffering recovery)');
        }
    };
    audioPlayer.addEventListener('canplay', canplayHandler, { once: true });
    
    audioPlayer.addEventListener('canplaythrough', () => {
        console.log('✅ Audio can play through');
        // Option A: don't force pauses/restarts here; let the browser buffer naturally.
    }, { once: true });
    
    // Re-setup ended listener after loading new stream
    setupEndedListener();
}

// Handle song ending - moved outside loadStream to prevent duplicate listeners
function setupEndedListener() {
    // Remove existing listener if any
    if (endedHandler) {
        audioPlayer.removeEventListener('ended', endedHandler);
    }
    
    // Create new handler
    endedHandler = () => {
        // Prevent multiple ended handlers from running simultaneously
        if (isHandlingEnded) {
            console.log('⚠️ Already handling ended event, skipping...');
            return;
        }
        
        console.log('🏁 Song ended event fired');
        console.log('Audio ended:', audioPlayer.ended);
        console.log('Audio error:', audioPlayer.error);
        console.log('Audio paused:', audioPlayer.paused);
        console.log('Audio currentTime:', audioPlayer.currentTime);
        console.log('Audio duration:', audioPlayer.duration);
        
        // Determine "real end" using a reliable duration source.
        // `audioPlayer.duration` is often 0/NaN for proxied streams (e.g., YouTube via ffmpeg),
        // which can cause false-ended events and skip tracks.
        const expectedDuration = currentVideoDuration ? parseInt(currentVideoDuration) : null;
        const mediaDuration = (audioPlayer.duration && isFinite(audioPlayer.duration) && audioPlayer.duration > 0)
            ? audioPlayer.duration
            : expectedDuration;

        const nearEnd = (mediaDuration && isFinite(mediaDuration) && mediaDuration > 0)
            ? Math.abs(audioPlayer.currentTime - mediaDuration) < 3
            : false;

        const isActuallyEnded = audioPlayer.ended &&
                                !audioPlayer.error &&
                                audioPlayer.currentTime > 1 &&
                                nearEnd;
        
        if (isActuallyEnded) {
            isHandlingEnded = true;
            console.log('✅ Song actually ended');
            
            // Check repeat mode first
            if (repeatMode === 2) {
                // Repeat one - reload and replay current song from beginning
                console.log('🔄 Repeating current song');
                if (currentVideoUrl) {
                    // Reset time display before reloading
                    if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
                    if (progressFill) progressFill.style.width = '0%';
                    if (progressThumb) progressThumb.style.left = '0%';
                    // Reload the stream to restart it properly
                    loadStream(currentVideoUrl);
                    // Flag will be reset when new stream starts playing
                } else {
                    isHandlingEnded = false;
                }
                return;
            }
            
            // Autoplay toggle removed from UI; keep behavior:
            // - In favorites/search playlist: advance to next
            // - Otherwise: stop at end
            if (!autoplayEnabled) {
                console.log('⏸️ Autoplay disabled, stopping');
                updatePlayPauseButton(false);
                isHandlingEnded = false;
                return;
            }
            
            console.log('▶️ Autoplay enabled, playing next song');
            
            // Check if we should repeat playlist (repeat all mode)
            if (repeatMode === 1 && playlist.length > 0 && currentIndex === playlist.length - 1) {
                // Loop back to start of playlist
                currentIndex = 0;
                const nextVideo = playlist[currentIndex];
                currentVideoUrl = nextVideo.url;
                currentVideoDuration = nextVideo.duration;
                currentVideoTitle = nextVideo.title;
                currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                updateVideoThumbnail(currentVideoId);
                updateNowPlayingTitle(nextVideo.title);
                highlightCurrentVideo(nextVideo.url);
                if (currentVideoDuration && totalTimeDisplay) {
                    totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                }
                loadStream(nextVideo.url);
                // Flag will be reset when new stream starts playing
                return;
            }
            
            // First try to play next from playlist (search results)
            // Ensure playlist is up to date with allSearchVideos if available
            if (allSearchVideos.length > 0 && playlist.length !== allSearchVideos.length) {
                playlist = allSearchVideos.map(v => ({
                    title: v.title,
                    url: v.url,
                    duration: v.duration,
                    id: v.id || getVideoIdFromUrl(v.url)
                }));
            }
            
            // Update currentIndex if needed (in case playlist was updated)
            if (playlist.length > 0 && currentVideoUrl) {
                const indexInPlaylist = playlist.findIndex(v => v.url === currentVideoUrl);
                if (indexInPlaylist >= 0) {
                    currentIndex = indexInPlaylist;
                }
            }
            
            // Play next from playlist (search results)
            if (playlist.length > 0 && currentIndex >= 0 && currentIndex < playlist.length - 1) {
                currentIndex++;
                const nextVideo = playlist[currentIndex];
                currentVideoUrl = nextVideo.url;
                currentVideoDuration = nextVideo.duration;
                currentVideoTitle = nextVideo.title;
                currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                updateVideoThumbnail(currentVideoId);
                updateNowPlayingTitle(nextVideo.title);
                highlightCurrentVideo(nextVideo.url);
                if (currentVideoDuration && totalTimeDisplay) {
                    totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                }
                loadStream(nextVideo.url);
                // Flag will be reset when new stream starts playing
                return;
            } else if (repeatMode === 1 && playlist.length > 0 && currentIndex === playlist.length - 1) {
                // Loop back to start if repeat all mode and at end of playlist
                currentIndex = 0;
                const nextVideo = playlist[currentIndex];
                currentVideoUrl = nextVideo.url;
                currentVideoDuration = nextVideo.duration;
                currentVideoTitle = nextVideo.title;
                currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                updateVideoThumbnail(currentVideoId);
                updateNowPlayingTitle(nextVideo.title);
                highlightCurrentVideo(nextVideo.url);
                if (currentVideoDuration && totalTimeDisplay) {
                    totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                }
                loadStream(nextVideo.url);
                // Flag will be reset when new stream starts playing
                return;
            }
            
            // Fallback: Try from allSearchVideos if playlist is empty but search results exist
            if (playlist.length === 0 && allSearchVideos.length > 0 && currentVideoUrl) {
                const currentIndexInSearch = allSearchVideos.findIndex(v => v.url === currentVideoUrl);
                if (currentIndexInSearch >= 0 && currentIndexInSearch < allSearchVideos.length - 1) {
                    const nextVideo = allSearchVideos[currentIndexInSearch + 1];
                    currentIndex = currentIndexInSearch + 1;
                    currentVideoUrl = nextVideo.url;
                    currentVideoDuration = nextVideo.duration;
                    currentVideoTitle = nextVideo.title;
                    currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                    updateVideoThumbnail(currentVideoId);
                    updateNowPlayingTitle(nextVideo.title);
                    playlist = allSearchVideos.map(v => ({
                        title: v.title,
                        url: v.url,
                        duration: v.duration,
                        id: v.id || getVideoIdFromUrl(v.url)
                    }));
                    highlightCurrentVideo(nextVideo.url);
                    if (currentVideoDuration && totalTimeDisplay) {
                        totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
                    }
                    loadStream(nextVideo.url);
                    // Flag will be reset when new stream starts playing
                    return;
                }
            }
            
            // Fallback: get related video if no search results available
            const currentUrl = currentVideoUrl;
            if (currentUrl) {
                fetch(`/related?url=${encodeURIComponent(currentUrl)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.videos && data.videos.length > 0) {
                            const nextVideo = data.videos[0];
                            currentVideoUrl = nextVideo.url;
                            currentVideoTitle = nextVideo.title;
                            currentVideoId = nextVideo.id || getVideoIdFromUrl(nextVideo.url);
                            updateVideoThumbnail(currentVideoId);
                            updateNowPlayingTitle(nextVideo.title);
                            currentIndex = -1;
                            playlist = [nextVideo];
                            loadStream(nextVideo.url);
                        } else {
                            updatePlayPauseButton(false);
                        }
                    })
                    .catch(error => {
                        console.error('Error getting next video:', error);
                        updatePlayPauseButton(false);
                    });
            } else {
                updatePlayPauseButton(false);
            }
        } else {
            console.log('⚠️ Ignoring ended event (likely network/buffer glitch)', {
                ended: audioPlayer.ended,
                error: audioPlayer.error?.code,
                currentTime: audioPlayer.currentTime,
                duration: audioPlayer.duration,
                expectedDuration: expectedDuration
            });
        }
    };
    
    audioPlayer.addEventListener('ended', endedHandler);
}

// Update play/pause button appearance
function updatePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playPauseBtn.classList.add('playing');
        playPauseBtn.classList.remove('paused');
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.classList.add('paused');
        playPauseBtn.classList.remove('playing');
    }
}

// Search functionality - Enter key support
searchQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchQueryInput.value.trim();
        if (query) {
            // Switch to search view - hide category sections and show search results
            countriesSection.style.display = 'none';
            genresSection.style.display = 'none';
            stationsSection.style.display = 'none';
            
            // Clear active category button
            categoryButtons.forEach(b => b.classList.remove('active'));
            activeCategory = null;
            
            searchYouTube(query);
        }
    }
});

// Radio Browser API elements
const countriesSection = document.getElementById('countriesSection');
const genresSection = document.getElementById('genresSection');
const stationsSection = document.getElementById('stationsSection');
const countriesGrid = document.getElementById('countriesGrid');
const genresGrid = document.getElementById('genresGrid');
const stationsList = document.getElementById('stationsList');
const stationsHeader = document.getElementById('stationsHeader');
const backToCountriesBtn = document.getElementById('backToCountriesBtn');
const backToGenresBtn = document.getElementById('backToGenresBtn');
let currentCountryCode = null;
let currentCountryName = null;
let currentGenre = null;

// Flag emoji helper function - converts ISO country code to flag emoji
function getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '🌐'; // Fallback to globe for invalid codes
    }
    
    try {
        const code = countryCode.toUpperCase();
        const base = 0x1F1E6; // Regional Indicator Symbol Letter A
        
        // Convert each letter to regional indicator symbol
        const first = String.fromCodePoint(base + (code.charCodeAt(0) - 65));
        const second = String.fromCodePoint(base + (code.charCodeAt(1) - 65));
        
        return first + second;
    } catch (error) {
        // Fallback to globe emoji if code point conversion fails
        console.warn('Failed to generate flag for', countryCode, error);
        return '🌐';
    }
}

// Store all countries for alphabet filtering
let allCountriesData = [];

// Load countries with alphabet navigation
async function loadCountriesWithAlphabet() {
    countriesGrid.innerHTML = '<div class="loading-spinner"></div>';
    countriesSection.style.display = 'block';
    stationsSection.style.display = 'none';
    
    try {
        const response = await fetch('/api/radio/countries');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.countries) {
            throw new Error('Invalid response format from server');
        }
        
        allCountriesData = data.countries;
        displayCountriesWithAlphabet(data.countries);
    } catch (error) {
        console.error('Error loading countries:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Failed to load countries: ${error.message}`;
        countriesGrid.innerHTML = '';
        countriesGrid.appendChild(errorDiv);
    }
}

// Display countries with alphabet navigation
function displayCountriesWithAlphabet(countries) {
    // Clear existing content
    countriesSection.innerHTML = '';
    
    // Create alphabet navigation
    const alphabetNav = document.createElement('div');
    alphabetNav.className = 'alphabet-nav';
    
    // Create A-Z buttons
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const letterBtn = document.createElement('button');
        letterBtn.className = 'alphabet-btn';
        letterBtn.textContent = letter;
        letterBtn.setAttribute('data-letter', letter);
        
        letterBtn.addEventListener('click', () => {
            // Remove active from all buttons
            document.querySelectorAll('.alphabet-btn').forEach(btn => btn.classList.remove('active'));
            // Add active to clicked button
            letterBtn.classList.add('active');
            // Filter countries by letter
            filterCountriesByLetter(letter);
        });
        
        alphabetNav.appendChild(letterBtn);
    }
    
    // Create container for countries grid
    const countriesContainer = document.createElement('div');
    countriesContainer.id = 'countriesGrid';
    countriesContainer.className = 'countries-grid';
    countriesContainer.style.display = 'none'; // Hide initially
    
    // Create section header
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Select a Country';
    sectionHeader.appendChild(headerTitle);
    
    countriesSection.appendChild(sectionHeader);
    countriesSection.appendChild(alphabetNav);
    countriesSection.appendChild(countriesContainer);
    
    // Store countries for filtering
    allCountriesData = countries;
    
    // Don't show countries initially - wait for letter selection
}

// Filter countries by letter
function filterCountriesByLetter(letter) {
    const countriesGrid = document.getElementById('countriesGrid');
    if (!countriesGrid) return;
    
    const filtered = allCountriesData.filter(country => {
        const countryName = String(country.name || '').trim().toUpperCase();
        return countryName.startsWith(letter);
    });
    
    // Show the countries grid when a letter is pressed
    countriesGrid.style.display = 'grid';
    
    displayFilteredCountries(filtered);
}

// Display filtered countries
function displayFilteredCountries(countries) {
    const countriesGrid = document.getElementById('countriesGrid');
    if (!countriesGrid) return;
    
    countriesGrid.innerHTML = '';
    
    if (!countries || countries.length === 0) {
        countriesGrid.innerHTML = '<div class="error">No countries found</div>';
        return;
    }
    
    // Sort countries alphabetically
    countries.sort((a, b) => {
        const nameA = (a.name || '').toUpperCase();
        const nameB = (b.name || '').toUpperCase();
        return nameA.localeCompare(nameB);
    });
    
    countries.forEach(country => {
        try {
            // Safely extract country code and name
            const countryCode = String(country.iso_3166_1 || country.iso_3166_1_2 || '').trim();
            const countryName = String(country.name || 'Unknown').trim();
            
            // Validate country code - must be exactly 2 characters
            if (!countryCode || countryCode.length !== 2) {
                console.warn('Skipping country with invalid code:', countryCode, countryName);
                return; // Skip invalid country codes
            }
            
            const countryItem = document.createElement('div');
            countryItem.className = 'country-item';
            
            const flagDiv = document.createElement('div');
            flagDiv.className = 'country-flag';
            flagDiv.textContent = getCountryFlag(countryCode);
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'country-name';
            nameDiv.textContent = countryName;
            
            countryItem.appendChild(flagDiv);
            countryItem.appendChild(nameDiv);
            
            countryItem.addEventListener('click', () => {
                loadStationsForCountry(countryCode.toUpperCase(), countryName);
            });
            
            countriesGrid.appendChild(countryItem);
        } catch (error) {
            console.error('Error displaying country:', country, error);
        }
    });
}

// Load countries from API (kept for backward compatibility)
async function loadCountries() {
    countriesGrid.innerHTML = '<div class="loading-spinner"></div>';
    countriesSection.style.display = 'block';
    stationsSection.style.display = 'none';
    
    try {
        const response = await fetch('/api/radio/countries');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.countries) {
            throw new Error('Invalid response format from server');
        }
        
        displayCountries(data.countries);
    } catch (error) {
        console.error('Error loading countries:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Failed to load countries: ${error.message}`;
        countriesGrid.innerHTML = '';
        countriesGrid.appendChild(errorDiv);
    }
}

// Display countries in grid
function displayCountries(countries) {
    countriesGrid.innerHTML = '';
    
    if (!countries || !Array.isArray(countries)) {
        countriesGrid.innerHTML = '<div class="error">Invalid countries data received</div>';
        return;
    }
    
    countries.forEach(country => {
        try {
            // Safely extract country code and name
            const countryCode = String(country.iso_3166_1 || country.iso_3166_1_2 || '').trim();
            const countryName = String(country.name || 'Unknown').trim();
            
            // Validate country code - must be exactly 2 characters
            if (!countryCode || countryCode.length !== 2) {
                console.warn('Skipping country with invalid code:', countryCode, countryName);
                return; // Skip invalid country codes
            }
            
            const countryItem = document.createElement('div');
            countryItem.className = 'country-item';
            
            const flagDiv = document.createElement('div');
            flagDiv.className = 'country-flag';
            flagDiv.textContent = getCountryFlag(countryCode);
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'country-name';
            nameDiv.textContent = countryName;
            
            countryItem.appendChild(flagDiv);
            countryItem.appendChild(nameDiv);
            
            countryItem.addEventListener('click', () => {
                loadStationsForCountry(countryCode.toUpperCase(), countryName);
            });
            
            countriesGrid.appendChild(countryItem);
        } catch (error) {
            console.error('Error displaying country:', country, error);
        }
    });
}

// Load international stations grouped by country alphabetically
async function loadInternationalStationsByCountry() {
    if (!stationsList || !stationsSection) return;
    
    stationsSection.style.display = 'block';
    stationsList.innerHTML = '<div class="loading-spinner">Loading international stations...</div>';
    if (stationsHeader) {
        stationsHeader.textContent = 'International Radio Stations';
    }
    
    try {
        // First, get list of countries
        const countriesResponse = await fetch('/api/radio/countries');
        if (!countriesResponse.ok) {
            throw new Error('Failed to load countries');
        }
        
        const countriesData = await countriesResponse.json();
        const countries = countriesData.countries || [];
        
        // Sort countries alphabetically by name
        countries.sort((a, b) => {
            const nameA = (a.name || '').toUpperCase();
            const nameB = (b.name || '').toUpperCase();
            return nameA.localeCompare(nameB);
        });
        
        // Group stations by country
        const stationsByCountry = {};
        const countryNames = {};
        
        // Fetch stations for each country (limit to top countries or all)
        const topCountries = countries.slice(0, 50); // Limit to first 50 countries to avoid too many requests
        
        for (const country of topCountries) {
            const countryCode = String(country.iso_3166_1 || country.iso_3166_1_2 || '').trim().toUpperCase();
            const countryName = String(country.name || 'Unknown').trim();
            
            if (!countryCode || countryCode.length !== 2) {
                continue;
            }
            
            try {
                const stationsResponse = await fetch(`/api/radio/stations/${countryCode}?limit=20`);
                if (stationsResponse.ok) {
                    const stationsData = await stationsResponse.json();
                    const stations = stationsData.stations || [];
                    
                    if (stations.length > 0) {
                        stationsByCountry[countryCode] = stations;
                        countryNames[countryCode] = countryName;
                    }
                }
            } catch (error) {
                console.warn(`Failed to load stations for ${countryName}:`, error);
            }
        }
        
        // Display stations grouped by country
        displayInternationalStationsByCountry(stationsByCountry, countryNames);
        
    } catch (error) {
        console.error('Error loading international stations:', error);
        stationsList.innerHTML = `<div class="error">Failed to load international stations: ${error.message}</div>`;
    }
}

// Display international stations grouped by country alphabetically
function displayInternationalStationsByCountry(stationsByCountry, countryNames) {
    stationsList.innerHTML = '';
    
    if (!stationsByCountry || Object.keys(stationsByCountry).length === 0) {
        stationsList.innerHTML = '<div class="error">No stations found</div>';
        return;
    }
    
    // Sort country codes alphabetically by country name
    const sortedCountryCodes = Object.keys(stationsByCountry).sort((a, b) => {
        const nameA = (countryNames[a] || '').toUpperCase();
        const nameB = (countryNames[b] || '').toUpperCase();
        return nameA.localeCompare(nameB);
    });
    
    sortedCountryCodes.forEach(countryCode => {
        const stations = stationsByCountry[countryCode];
        const countryName = countryNames[countryCode];
        
        if (!stations || stations.length === 0) return;
        
        // Create country section header
        const countrySection = document.createElement('div');
        countrySection.className = 'country-station-section';
        
        const countryHeader = document.createElement('div');
        countryHeader.className = 'country-station-header';
        
        const flagSpan = document.createElement('span');
        flagSpan.className = 'country-station-flag';
        flagSpan.textContent = getCountryFlag(countryCode);
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'country-station-name';
        nameSpan.textContent = countryName;
        
        countryHeader.appendChild(flagSpan);
        countryHeader.appendChild(nameSpan);
        countrySection.appendChild(countryHeader);
        
        // Create stations grid for this country
        const stationsGrid = document.createElement('div');
        stationsGrid.className = 'stations-list country-stations-grid';
        
        stations.forEach(station => {
            try {
                const stationItem = createStationItem(station);
                stationsGrid.appendChild(stationItem);
            } catch (error) {
                console.warn('Error displaying station:', station, error);
            }
        });
        
        countrySection.appendChild(stationsGrid);
        stationsList.appendChild(countrySection);
    });
}

// Helper function to create a station item (extracted from displayStations)
function createStationItem(station) {
    const stationItem = document.createElement('div');
    stationItem.className = 'station-item';
    
    // Create logo container
    const logoContainer = document.createElement('div');
    logoContainer.className = 'station-logo';
    
    // Try to use station logo/favicon if available
    const logoUrl = station.favicon || station.logo || station.favicon_url;
    if (logoUrl && isValidImageUrl(logoUrl)) {
        // Create emoji span as placeholder
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '📻';
        emojiSpan.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5em;';
        logoContainer.appendChild(emojiSpan);
        
        const logoImg = document.createElement('img');
        logoImg.src = logoUrl;
        logoImg.alt = station.name || 'Radio Station';
        logoImg.style.cssText = 'width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.2s; border-radius: 10px; padding: 4px; box-sizing: border-box;';
        logoImg.loading = 'lazy';
        
        logoImg.onload = function() {
            logoImg.style.opacity = '1';
            emojiSpan.style.display = 'none';
        };
        
        logoImg.onerror = function() {
            this.remove();
        };
        
        logoContainer.appendChild(logoImg);
    } else {
        logoContainer.textContent = '📻';
    }
    
    // Create station info
    const stationInfo = document.createElement('div');
    stationInfo.className = 'station-info';
    
    const stationName = document.createElement('div');
    stationName.className = 'station-name';
    stationName.textContent = station.name || 'Unknown Station';
    
    const stationGenre = document.createElement('div');
    stationGenre.className = 'station-genre';
    stationGenre.textContent = station.tags || station.genre || 'Radio';
    
    stationInfo.appendChild(stationName);
    stationInfo.appendChild(stationGenre);
    
    stationItem.appendChild(logoContainer);
    stationItem.appendChild(stationInfo);
    
    // Add heart button if user is logged in
    if (currentUser) {
        const itemId = station.stationuuid || station.url_resolved || station.url || station.name;
        checkIfFavorite('station', itemId).then(isFav => {
            const heartBtn = createHeartButton('station', itemId, isFav);
            stationItem.style.position = 'relative';
            stationItem.appendChild(heartBtn);
            heartBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const category = currentGenre ? 'music' : 'international';
                await toggleFavorite(
                    heartBtn, 
                    'station', 
                    itemId, 
                    station.name, 
                    station.url_resolved || station.url, 
                    category, 
                    station.favicon || station.logo, 
                    station
                );
            });
        });
    }
    
    stationItem.addEventListener('click', () => {
        playRadioStation(station);
    });
    
    return stationItem;
}

// Load stations for a country
async function loadStationsForCountry(countryCode, countryName) {
    currentCountryCode = countryCode;
    currentCountryName = countryName;
    
    // Hide countries section and show stations section
    countriesSection.style.display = 'none';
    stationsSection.style.display = 'block';
    
    stationsList.innerHTML = '<div class="loading-spinner"></div>';
    stationsHeader.textContent = `Radio Stations - ${countryName}`;
    
    try {
        const response = await fetch(`/api/radio/stations/${countryCode}?limit=1000`);
        if (!response.ok) {
            throw new Error('Failed to load stations');
        }
        
        const data = await response.json();
        displayStations(data.stations);
    } catch (error) {
        console.error('Error loading stations:', error);
        stationsList.innerHTML = `<div class="error">Failed to load stations: ${error.message}</div>`;
    }
}

// Validate if a URL is valid and safe to use for images
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return false;
        }
        
        // Reject URLs that look like invalid paths (common problematic patterns)
        const problematicPatterns = [
            /^(logo|favicon|image|icon|300|192)$/i,  // Just a filename without domain
            /^\/\/[^\/]/,  // Protocol-relative URLs that might fail
            /\.(php|asp|aspx|jsp|cgi)$/i,  // Server-side scripts (might be dynamic)
        ];
        
        const pathname = urlObj.pathname.toLowerCase();
        for (const pattern of problematicPatterns) {
            if (pattern.test(pathname) || pattern.test(urlObj.hostname)) {
                return false;
            }
        }
        
        // Basic checks - reasonable length and has a domain
        if (url.length < 5 || url.length > 500) return false;
        if (!urlObj.hostname || urlObj.hostname.length < 3) return false;
        
        // Prefer common image extensions (but don't require them as some URLs use query params)
        const imageExtensions = /\.(jpg|jpeg|png|gif|svg|ico|webp)(\?|$)/i;
        const hasImageExtension = imageExtensions.test(pathname);
        
        // Allow URLs with image extensions or common favicon paths
        return hasImageExtension || /favicon|logo|icon/i.test(pathname);
    } catch (e) {
        // Invalid URL
        return false;
    }
}

// Display stations in grid
function displayStations(stations) {
    stationsList.innerHTML = '';
    
    if (!stations || stations.length === 0) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'No stations found for this country';
        stationsList.appendChild(errorDiv);
        return;
    }
    
    stations.forEach(station => {
        try {
            const stationItem = document.createElement('div');
            stationItem.className = 'station-item';
            
            // Create logo container
            const logoContainer = document.createElement('div');
            logoContainer.className = 'station-logo';
            
            // Try to use station logo/favicon if available
            // Check both favicon and logo fields (backend logo enhancement adds to favicon)
            const logoUrl = station.favicon || station.logo || station.favicon_url;
            if (logoUrl && isValidImageUrl(logoUrl)) {
                // Create emoji span as placeholder
                const emojiSpan = document.createElement('span');
                emojiSpan.textContent = '📻';
                emojiSpan.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5em;';
                logoContainer.appendChild(emojiSpan);
                
                const logoImg = document.createElement('img');
                logoImg.src = logoUrl;
                logoImg.alt = station.name || 'Radio Station';
                logoImg.style.cssText = 'width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.2s; border-radius: 10px; padding: 4px; box-sizing: border-box;';
                logoImg.loading = 'lazy';
                
                logoImg.onload = function() {
                    // Show image and hide emoji when image loads successfully
                    logoImg.style.opacity = '1';
                    emojiSpan.style.display = 'none';
                };
                
                logoImg.onerror = function() {
                    // Hide failed image, emoji will remain visible
                    this.remove();
                };
                
                // Append image
                logoContainer.appendChild(logoImg);
            } else {
                // No valid logo URL, use emoji
                logoContainer.textContent = '📻';
            }
            
            // Create station info
            const stationInfo = document.createElement('div');
            stationInfo.className = 'station-info';
            
            const stationName = document.createElement('div');
            stationName.className = 'station-name';
            stationName.textContent = station.name || 'Unknown Station';
            
            const stationGenre = document.createElement('div');
            stationGenre.className = 'station-genre';
            stationGenre.textContent = station.tags || station.genre || 'Radio';
            
            stationInfo.appendChild(stationName);
            stationInfo.appendChild(stationGenre);
            
            stationItem.appendChild(logoContainer);
            stationItem.appendChild(stationInfo);
            
            // Add heart button if user is logged in
            if (currentUser) {
                const itemId = station.stationuuid || station.url_resolved || station.url || station.name;
                checkIfFavorite('station', itemId).then(isFav => {
                    const heartBtn = createHeartButton('station', itemId, isFav);
                    stationItem.style.position = 'relative';
                    stationItem.appendChild(heartBtn);
                    heartBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const category = currentGenre ? 'music' : 'international';
                        await toggleFavorite(
                            heartBtn, 
                            'station', 
                            itemId, 
                            station.name, 
                            station.url_resolved || station.url, 
                            category, 
                            station.favicon || station.logo, 
                            station
                        );
                    });
                });
            }
            
            stationItem.addEventListener('click', () => {
                playRadioStation(station);
            });
            
            stationsList.appendChild(stationItem);
        } catch (error) {
            console.warn('Error displaying station:', station, error);
            // Skip this station and continue with others
        }
    });
}

// Show stations for a category
function showCategoryStations(category) {
    // Map category names to data keys
    const categoryMap = {
        'news': 'news',
        'live-sports': 'sports',
        'nonstop-music': 'music',
        'audiobooks': 'audiobooks',
        'podcasts': 'podcasts'
    };
    
    const dataKey = categoryMap[category];
    if (!dataKey || !radioStationsData || !radioStationsData[dataKey]) {
        searchResults.innerHTML = '<div class="error">No stations available for this category yet</div>';
        return;
    }
    
    const stations = radioStationsData[dataKey];
    if (stations.length === 0) {
        searchResults.innerHTML = '<div class="error">No stations available for this category yet</div>';
        return;
    }
    
    // Display stations in search results area
    displayCategoryStations(stations, category);
}

// Display category stations in search results as grid
function displayCategoryStations(stations, category) {
    // Use stations section for grid display
    if (stationsList && stationsSection) {
        stationsSection.style.display = 'block';
        stationsList.innerHTML = '';
        // Update header
        if (stationsHeader) {
            const categoryNames = {
                'news': 'News Stations',
                'live-sports': 'Sports Stations',
                'audiobooks': 'Audiobook Stations',
                'podcasts': 'Podcast Stations'
            };
            stationsHeader.textContent = categoryNames[category] || 'Radio Stations';
        }
    } else if (searchResults) {
        // Fallback to search results with grid layout
        searchResults.style.display = 'grid';
        searchResults.className = 'search-results stations-list';
    }
    
    // Build all station cards first in a document fragment to avoid flickering
    const fragment = document.createDocumentFragment();
    
    stations.forEach(station => {
        const stationItem = document.createElement('div');
        stationItem.className = 'station-item';
        stationItem.style.cursor = 'pointer';
        
        // Create logo container
        const logoContainer = document.createElement('div');
        logoContainer.className = 'station-logo';
        
        if (station.logo || station.favicon) {
            const logoImg = document.createElement('img');
            logoImg.src = station.logo || station.favicon;
            logoImg.alt = station.name;
            logoImg.onerror = function() {
                this.style.display = 'none';
                logoContainer.textContent = '📻';
            };
            logoContainer.appendChild(logoImg);
        } else {
            logoContainer.textContent = '📻';
        }
        
        // Create station info container
        const stationInfo = document.createElement('div');
        stationInfo.className = 'station-info';
        
        // Station name
        const stationName = document.createElement('div');
        stationName.className = 'station-name';
        stationName.textContent = station.name || 'Unknown Station';
        
        // Station country/genre
        const stationCountry = document.createElement('div');
        stationCountry.className = 'station-country';
        const countryText = station.country || '';
        const genreText = station.genre || station.tags || '';
        stationCountry.textContent = countryText + (countryText && genreText ? ' • ' : '') + genreText;
        
        stationInfo.appendChild(stationName);
        stationInfo.appendChild(stationCountry);
        
        stationItem.appendChild(logoContainer);
        stationItem.appendChild(stationInfo);
        
        // Add heart button if user is logged in
        if (currentUser) {
            const itemId = station.url || station.stationuuid || station.name;
            checkIfFavorite('station', itemId).then(isFav => {
                const heartBtn = createHeartButton('station', itemId, isFav);
                stationItem.style.position = 'relative';
                stationItem.appendChild(heartBtn);
                heartBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await toggleFavorite(heartBtn, 'station', itemId, station.name, station.url || station.url_resolved, category, station.logo || station.favicon, station);
                });
            });
        }
        
        stationItem.addEventListener('click', () => {
            playCategoryStation(station);
        });
        
        fragment.appendChild(stationItem);
    });
    
    // Replace content all at once to avoid flickering
    if (stationsList) {
        stationsList.appendChild(fragment);
    } else if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.appendChild(fragment);
    }
}

// Play radio station from category
async function playCategoryStation(station) {
    // Prefer url_resolved (working URL) over url (original URL)
    const streamUrl = station.url_resolved || station.url;
    
    if (!station || !streamUrl) {
        alert('Invalid station URL');
        return;
    }
    
    try {
        // Update player UI
        currentStation = station; // Store current station
        currentVideoId = null; // Clear video ID
        currentVideoUrl = null; // Clear video URL
        currentVideoTitle = null; // Clear video title
        nowPlayingTitle.textContent = station.name;
        updatePageTitle(station.name); // Update page title
        updateVideoThumbnail(null, station); // Show station logo and update favicon
        refreshPlayerFavoriteButton();
        
        // Load and play the stream
        await loadStream(streamUrl);
    } catch (error) {
        console.error('Error playing station:', error);
        alert(`Failed to play ${station.name}: ${error.message || 'Stream unavailable'}`);
    }
}

// Play radio station from Radio Browser API
async function playRadioStation(station) {
    try {
        let streamUrl = null;
        
        // IPRD stations and curated stations already have url_resolved
        if (station.url_resolved) {
            streamUrl = station.url_resolved;
        } else if (station.url) {
            streamUrl = station.url;
        } else {
            // Fallback to API call for Radio Browser API stations
            const response = await fetch(`/api/radio/stream/${station.stationuuid}`);
            if (!response.ok) {
                throw new Error('Failed to get stream URL');
            }
            
            const data = await response.json();
            streamUrl = data.streamUrl;
        }
        
        // Update player UI
        currentStation = station; // Store current station
        currentVideoId = null; // Clear video ID
        currentVideoUrl = null; // Clear video URL
        currentVideoTitle = null; // Clear video title
        nowPlayingTitle.textContent = station.name;
        updatePageTitle(station.name); // Update page title
        updateVideoThumbnail(null, station); // Show station logo and update favicon
        refreshPlayerFavoriteButton();
        
        // Try to load and play the stream
        try {
            await loadStream(streamUrl);
        } catch (streamError) {
            console.error('Stream error:', streamError);
            throw streamError;
        }
    } catch (error) {
        console.error('Error playing station:', error);
        alert(`Failed to play station: ${error.message}`);
    }
}

// Back to countries handler
if (backToCountriesBtn) {
    backToCountriesBtn.addEventListener('click', () => {
        stationsSection.style.display = 'none';
        countriesSection.style.display = 'block';
        genresSection.style.display = 'none';
        currentCountryCode = null;
        currentCountryName = null;
        backToCountriesBtn.style.display = 'none';
    });
}

// Back to genres handler
if (backToGenresBtn) {
    backToGenresBtn.addEventListener('click', () => {
        genresSection.style.display = 'block';
        stationsSection.style.display = 'none';
        countriesSection.style.display = 'none';
        currentGenre = null;
        backToGenresBtn.style.display = 'none';
    });
}

// Radio stations data
let radioStationsData = null;

// Load radio stations data
async function loadRadioStationsData() {
    try {
        const response = await fetch('/radio-stations.json');
        if (response.ok) {
            radioStationsData = await response.json();
        }
    } catch (error) {
        console.warn('Could not load radio stations data:', error);
        radioStationsData = { news: [], sports: [], music: [], audiobooks: [], podcasts: [] };
    }
}

// Load data on page load
loadRadioStationsData();

// Category button handlers
const categoryButtons = document.querySelectorAll('.category-btn');
let activeCategory = null;

categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        
        // Close menu after category selection
        if (hamburgerBtn && menuDropdown) {
            hamburgerBtn.classList.remove('active');
            menuDropdown.classList.remove('active');
        }
        
        // Handle international category separately
        if (category === 'international') {
            // Toggle active state
            if (activeCategory === category) {
                btn.classList.remove('active');
                activeCategory = null;
                countriesSection.style.display = 'none';
                genresSection.style.display = 'none';
                stationsSection.style.display = 'none';
                searchResults.innerHTML = '';
            } else {
                // Remove active from all buttons
                categoryButtons.forEach(b => b.classList.remove('active'));
                
                // Set active on clicked button
                btn.classList.add('active');
                activeCategory = category;
                
                // Hide search results and other sections
                searchResults.innerHTML = '';
                genresSection.style.display = 'none';
                stationsSection.style.display = 'none';
                
                // Load countries with alphabet navigation
                loadCountriesWithAlphabet();
            }
            return;
        }
        
        // Handle music category - show genres
        if (category === 'music') {
            // Toggle active state
            if (activeCategory === category) {
                btn.classList.remove('active');
                activeCategory = null;
                genresSection.style.display = 'none';
                stationsSection.style.display = 'none';
                countriesSection.style.display = 'none';
                searchResults.innerHTML = '';
            } else {
                // Remove active from all buttons
                categoryButtons.forEach(b => b.classList.remove('active'));
                
                // Set active on clicked button
                btn.classList.add('active');
                activeCategory = category;
                
                // Hide search results and other sections
                searchResults.innerHTML = '';
                countriesSection.style.display = 'none';
                stationsSection.style.display = 'none';
                
                // Load genres
                loadMusicGenres();
            }
            return;
        }
        
        // Handle favorites category
        if (category === 'favorites') {
            if (!currentUser) {
                alert('Please login to view favorites');
                return;
            }
            // Toggle active state
            if (activeCategory === category) {
                btn.classList.remove('active');
                activeCategory = null;
                searchResults.innerHTML = '';
                countriesSection.style.display = 'none';
                genresSection.style.display = 'none';
                stationsSection.style.display = 'none';
            } else {
                // Remove active from all buttons
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategory = category;
                
                // Hide other sections
                countriesSection.style.display = 'none';
                genresSection.style.display = 'none';
                stationsSection.style.display = 'none';
                
                // Load and display favorites
                loadFavorites();
            }
            return;
        }
        
        // Handle other categories with radio stations
        // Toggle active state
        if (activeCategory === category) {
            // Deselect if clicking the same category
            btn.classList.remove('active');
            activeCategory = null;
            searchQueryInput.value = '';
            // Hide sections
            countriesSection.style.display = 'none';
            genresSection.style.display = 'none';
            stationsSection.style.display = 'none';
            searchResults.innerHTML = '';
        } else {
            // Remove active from all buttons
            categoryButtons.forEach(b => b.classList.remove('active'));
            
            // Set active on clicked button
            btn.classList.add('active');
            activeCategory = category;
            
            // Hide radio sections
            countriesSection.style.display = 'none';
            genresSection.style.display = 'none';
            searchResults.innerHTML = '';
            
            // Show stations for this category in stations section
            showCategoryStations(category);
        }
    });
});

// Music genres list
const musicGenres = [
    { name: 'Pop', tag: 'pop', icon: '🎵' },
    { name: 'Rock', tag: 'rock', icon: '🎸' },
    { name: 'Jazz', tag: 'jazz', icon: '🎷' },
    { name: 'Classical', tag: 'classical', icon: '🎹' },
    { name: 'Hip Hop', tag: 'hiphop', icon: '🎤' },
    { name: 'Electronic', tag: 'electronic', icon: '🎧' },
    { name: 'Country', tag: 'country', icon: '🤠' },
    { name: 'R&B', tag: 'r&b', icon: '🎙️' },
    { name: 'Reggae', tag: 'reggae', icon: '🎼' },
    { name: 'Metal', tag: 'metal', icon: '🤘' },
    { name: 'Blues', tag: 'blues', icon: '🎺' },
    { name: 'Folk', tag: 'folk', icon: '🪕' },
    { name: 'Latin', tag: 'latin', icon: '💃' },
    { name: 'Dance', tag: 'dance', icon: '🕺' },
    { name: 'Indie', tag: 'indie', icon: '🎨' },
    { name: 'Alternative', tag: 'alternative', icon: '🎪' }
];

// Load music genres
function loadMusicGenres() {
    if (!genresGrid) return;
    
    genresGrid.innerHTML = '';
    genresSection.style.display = 'block';
    stationsSection.style.display = 'none';
    countriesSection.style.display = 'none';
    
    musicGenres.forEach((genre, index) => {
        const genreItem = document.createElement('div');
        genreItem.className = 'country-item';
        
        // All subcategories are size-small
        genreItem.classList.add('size-small');
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'country-name';
        nameDiv.textContent = genre.name;
        
        genreItem.appendChild(nameDiv);
        
        genreItem.addEventListener('click', () => {
            loadStationsForGenre(genre.tag, genre.name);
        });
        
        genresGrid.appendChild(genreItem);
    });
}

// Load stations for a music genre
async function loadStationsForGenre(genreTag, genreName) {
    if (!stationsList || !stationsHeader) return;
    
    currentGenre = genreTag;
    stationsList.innerHTML = '<div class="loading-spinner"></div>';
    genresSection.style.display = 'block';
    stationsSection.style.display = 'block';
    countriesSection.style.display = 'none';
    if (stationsHeader) stationsHeader.textContent = '';
    
    if (backToGenresBtn) backToGenresBtn.style.display = 'none';
    if (backToCountriesBtn) backToCountriesBtn.style.display = 'none';
    
    try {
        // Use backend proxy to avoid CORS issues
        const response = await fetch(
            `/api/radio/search?tag=${encodeURIComponent(genreTag)}&limit=100&order=clickcount&reverse=true`,
            {
                credentials: 'include'
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const stations = await response.json();
        displayStations(stations || []);
    } catch (error) {
        console.error('Error loading genre stations:', error);
        stationsList.innerHTML = `<div class="error">Failed to load stations: ${error.message}</div>`;
    }
}

// Create skeleton screen for search results
function createSkeletonScreen() {
    searchResults.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const skeletonItem = document.createElement('div');
        skeletonItem.className = 'skeleton-item';
        skeletonItem.innerHTML = `
            <div class="skeleton-title"></div>
            <div class="skeleton-duration"></div>
        `;
        searchResults.appendChild(skeletonItem);
    }
}

// Search YouTube
async function searchYouTube(query) {
    // Ensure search results container is visible
    if (searchResults) {
        searchResults.style.display = '';
    }
    
    // Hide all category sections
    if (countriesSection) countriesSection.style.display = 'none';
    if (genresSection) genresSection.style.display = 'none';
    if (stationsSection) stationsSection.style.display = 'none';
    
    // Show skeleton screen
    createSkeletonScreen();
    
    // Reset search state
    allSearchVideos = [];
    displayedVideosCount = 0;
    if (loadMoreBtn) {
        loadMoreBtn.remove();
        loadMoreBtn = null;
    }
    
    try {
        // Add timeout to fetch request (25 seconds - backend has 30s timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            searchResults.innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        if (!data.videos || data.videos.length === 0) {
            searchResults.innerHTML = '<div class="error">No results found</div>';
            return;
        }
        
        // Store all videos and display first batch
        allSearchVideos = data.videos;
        displayedVideosCount = 0;
        
        console.log(`Received ${data.videos.length} videos from server`);
        console.log(`First 5 videos:`, data.videos.slice(0, 5).map(v => v.title));
        
        // Display first batch
        loadMoreVideos();
    } catch (error) {
        console.error('Search error:', error);
        if (error.name === 'AbortError') {
            searchResults.innerHTML = '<div class="error">Search timed out. The server may be slow. Please try again.</div>';
        } else {
        searchResults.innerHTML = '<div class="error">Failed to search. Please try again.</div>';
        }
    }
}

// Load more videos (with Load More button)
function loadMoreVideos() {
    if (displayedVideosCount >= allSearchVideos.length) {
        // Remove load more button if all videos are shown
        if (loadMoreBtn) {
            loadMoreBtn.remove();
            loadMoreBtn = null;
        }
        return; // All videos already displayed
    }
    
    // Clear skeleton screen before adding videos
    if (displayedVideosCount === 0) {
        searchResults.innerHTML = '';
    }
    
    const endIndex = Math.min(displayedVideosCount + VIDEOS_PER_BATCH, allSearchVideos.length);
    const videosToDisplay = allSearchVideos.slice(displayedVideosCount, endIndex);
    
    videosToDisplay.forEach((video, relativeIndex) => {
        const absoluteIndex = displayedVideosCount + relativeIndex;
        const item = document.createElement('div');
        item.className = 'result-item';
        item.setAttribute('data-video-url', video.url);
        
        const title = document.createElement('h3');
        title.textContent = video.title;
        
        const duration = document.createElement('p');
        duration.textContent = `Duration: ${formatDuration(video.duration)}`;
        
        item.appendChild(title);
        item.appendChild(duration);
        
        // Add heart button if user is logged in
        if (currentUser) {
            const videoId = video.id || getVideoIdFromUrl(video.url);
            const itemId = videoId || video.url;
            checkIfFavorite('video', itemId).then(isFav => {
                const heartBtn = createHeartButton('video', itemId, isFav);
                item.style.position = 'relative';
                item.appendChild(heartBtn);
                heartBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null;
                    await toggleFavorite(heartBtn, 'video', itemId, video.title, video.url, 'search', thumbnailUrl, { id: videoId, duration: video.duration });
                });
            });
        }
        
        // Attach click handler immediately (before heart button is added)
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on the heart button
            if (e.target.closest('.heart-btn, .favorite-btn')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎯 Clicked YouTube search result:', video.title, video.url);
            console.log('Current loading state:', { isLoading, loadingUrl, currentStreamUrl });
            
            // If already loading the same URL, ignore duplicate click
            if (isLoading && loadingUrl === video.url) {
                console.log('⚠️ Same URL already loading, ignoring duplicate click');
                return false;
            }
            
            // Find the index in the full playlist
            currentIndex = allSearchVideos.findIndex(v => v.url === video.url);
            if (currentIndex === -1) currentIndex = absoluteIndex;
            
            // Clear station state when switching to video
            currentStation = null;
            
            // Keep search results visible - don't clear them
            currentVideoUrl = video.url;
            currentVideoDuration = video.duration; // Store duration from search results
            currentVideoTitle = video.title; // Store title
            currentVideoId = video.id || getVideoIdFromUrl(video.url); // Store video ID for thumbnail
            
            // Update playlist with all search results
            playlist = allSearchVideos.map(v => ({
                title: v.title,
                url: v.url,
                duration: v.duration,
                id: v.id || getVideoIdFromUrl(v.url)
            }));
            
            console.log('📝 Updated playlist with', playlist.length, 'videos');
            console.log('🎵 Calling loadStream with URL:', video.url);
            
            // Update thumbnail and title (this will also update favicon)
            updateVideoThumbnail(currentVideoId);
            updateNowPlayingTitle(video.title);
            
            // Highlight the currently playing video
            highlightCurrentVideo(video.url);
            
            // Update total time display immediately with duration from search results
            if (currentVideoDuration && totalTimeDisplay) {
                totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
            }
            
            // Ensure volume is set before loading
            if (audioPlayer.volume === 0) {
                audioPlayer.volume = volumeSlider ? volumeSlider.value / 100 : 0.7;
            }
            
            // Load and play the stream
            loadStream(video.url);
            
            return false;
        });
        
        searchResults.appendChild(item);
    });
    
    displayedVideosCount = endIndex;
    
    // Update playlist with all search results (for navigation)
    playlist = allSearchVideos.map(v => ({
        title: v.title,
        url: v.url,
        duration: v.duration,
        id: v.id || getVideoIdFromUrl(v.url)
    }));
    
    updateNavigationButtons();
    
    // Remove existing load more button if any
    if (loadMoreBtn) {
        loadMoreBtn.remove();
        loadMoreBtn = null;
    }
    
    // Show Load More button if there are more videos
    if (displayedVideosCount < allSearchVideos.length) {
        const container = document.createElement('div');
        container.className = 'load-more-container';
        
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = `Load More (${displayedVideosCount} of ${allSearchVideos.length} shown)`;
        
        loadMoreBtn.addEventListener('click', () => {
            loadMoreVideos();
        });
        
        container.appendChild(loadMoreBtn);
        searchResults.appendChild(container);
    }
}

// Extract video ID from YouTube URL
function getVideoIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

// Update browser tab favicon with currently playing media
function updateTabFavicon(logoUrl) {
    // Remove existing favicon links to force refresh
    const existingIcons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    existingIcons.forEach(link => link.remove());
    
    if (logoUrl && isValidImageUrl(logoUrl)) {
        // Create new favicon link
        const faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/png';
        
        // Add timestamp to force browser to reload (avoid caching)
        const separator = logoUrl.includes('?') ? '&' : '?';
        const faviconUrlWithCache = `${logoUrl}${separator}t=${Date.now()}`;
        faviconLink.href = faviconUrlWithCache;
        
        // Add favicon link immediately with direct URL
        document.head.appendChild(faviconLink);
        
        // Try to convert to data URL using canvas (works if CORS allows)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            try {
                // Create canvas and resize image to 32x32 for favicon
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                
                // Draw image on canvas (will be resized automatically)
                ctx.drawImage(img, 0, 0, 32, 32);
                
                // Convert to data URL and update favicon (bypasses CORS completely)
                const dataUrl = canvas.toDataURL('image/png');
                faviconLink.href = dataUrl;
            } catch (e) {
                // Canvas conversion failed (likely CORS), keep direct URL
            }
        };
        
        img.onerror = function() {
            // Image failed to load, direct URL already set will work
        };
        
        // Start loading image for canvas conversion
        img.src = logoUrl;
    } else {
        // No media playing, revert to default favicon
        const defaultFavicon = document.createElement('link');
        defaultFavicon.rel = 'icon';
        defaultFavicon.href = '/favicon.ico';
        document.head.appendChild(defaultFavicon);
    }
}

// Update favicon based on currently playing media (station or video)
function updateTabFaviconFromMedia(stationLogo, videoId) {
    // Priority: stationLogo > currentStation > videoId > currentVideoId > default
    const station = stationLogo || currentStation;
    
    if (station) {
        // Get station logo from various possible fields
        const logoUrl = station.favicon || station.logo || station.favicon_url || station.image;
        if (logoUrl && isValidImageUrl(logoUrl)) {
            console.log('🎨 Updating favicon to station logo:', logoUrl);
            updateTabFavicon(logoUrl);
            return;
        }
    }
    
    // Fallback to video thumbnail
    const vidId = videoId || currentVideoId;
    if (vidId) {
        // For YouTube videos, use the same thumbnail "family" as the player (hqdefault).
        // updateTabFavicon() will resize to favicon sizes via canvas when possible.
        const thumbnailUrl = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
        console.log('🎨 Updating favicon to video thumbnail:', thumbnailUrl);
        updateTabFavicon(thumbnailUrl);
        return;
    }
    
    // No media playing, revert to default favicon
    console.log('🎨 Reverting to default favicon');
    updateTabFavicon(null);
}

// Update video thumbnail or station logo
function updateVideoThumbnail(videoId, stationLogo = null) {
    if (videoThumbnail) {
        if (stationLogo) {
            // Show station logo - check multiple possible logo fields
            const logoUrl = stationLogo.favicon || stationLogo.logo || stationLogo.favicon_url || stationLogo.image;
            if (logoUrl && isValidImageUrl(logoUrl)) {
                const img = document.createElement('img');
                img.src = logoUrl;
                img.alt = stationLogo.name || 'Radio Station';
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                
                // Handle image load errors
                img.onerror = function() {
                    // Fallback to emoji if image fails to load
                    videoThumbnail.innerHTML = '<div class="thumbnail-placeholder" style="font-size: 3em;">📻</div>';
                };
                
                // Clear and set image
                videoThumbnail.innerHTML = '';
                videoThumbnail.appendChild(img);
            } else {
                // Fallback to emoji if no valid logo
                videoThumbnail.innerHTML = '<div class="thumbnail-placeholder" style="font-size: 3em;">📻</div>';
            }
        } else if (videoId) {
            // Show YouTube video thumbnail
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            videoThumbnail.innerHTML = `<img src="${thumbnailUrl}" alt="Video thumbnail" />`;
        } else {
            // No video or station
            videoThumbnail.innerHTML = '<div class="thumbnail-placeholder">No media</div>';
        }
    }
    
    // Update browser tab favicon with currently playing media
    updateTabFaviconFromMedia(stationLogo, videoId);
}

// Store original page title
const originalPageTitle = document.title || 'PULSE - Your Frequency for Music & Talk';

// Update page title with currently playing media
function updatePageTitle(title) {
    if (title) {
        // Truncate long titles to keep page title reasonable (max 60 chars)
        const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
        document.title = `${truncatedTitle} - PULSE`;
    } else {
        // Revert to original title when nothing is playing
        document.title = originalPageTitle;
    }
}

// Update now playing title display
function updateNowPlayingTitle(title) {
    if (nowPlayingTitle) {
        if (title) {
            nowPlayingTitle.textContent = title;
            nowPlayingTitle.style.display = 'block';
        } else {
            nowPlayingTitle.textContent = 'No track playing';
        }
    }
    // Also update page title
    updatePageTitle(title);
    // Update favicon based on current media
    updateTabFaviconFromMedia(null, null);
    // Keep player heart button in sync
    refreshPlayerFavoriteButton();
}

// Highlight the currently playing video in search results
function highlightCurrentVideo(videoUrl) {
    // Remove previous highlight
    const allItems = searchResults.querySelectorAll('.result-item');
    allItems.forEach(item => {
        item.classList.remove('playing');
    });
    
    // Add highlight to current video
    allItems.forEach(item => {
        const itemUrl = item.getAttribute('data-video-url');
        if (itemUrl === videoUrl) {
            item.classList.add('playing');
            // Scroll into view if needed (only if not already visible)
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    });
}

// Update navigation button states
function updateNavigationButtons() {
    // Previous button: only enable if we have a playlist and we're not at the first item
    if (playlist.length === 0 || currentIndex <= 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }
    
    // Next button: enable if there's a current video and there's a next song available
    const hasCurrentVideo = currentVideoUrl && currentVideoUrl.length > 0;
    let hasNextSong = false;
    
    // Check if there's a next song in playlist
    if (playlist.length > 0 && currentIndex >= 0 && currentIndex < playlist.length - 1) {
        hasNextSong = true;
    } else if (allSearchVideos.length > 0 && currentVideoUrl) {
        // Check if there's a next song in search results
        const currentIndexInSearch = allSearchVideos.findIndex(v => v.url === currentVideoUrl);
        if (currentIndexInSearch >= 0 && currentIndexInSearch < allSearchVideos.length - 1) {
            hasNextSong = true;
        }
    }
    
    // Enable if we have a current video and either have a next song or can fetch related videos
    nextBtn.disabled = !hasCurrentVideo || (!hasNextSong && playlist.length === 0 && allSearchVideos.length === 0);
    
    console.log('Navigation buttons updated:', {
        hasCurrentVideo,
        nextBtnDisabled: nextBtn.disabled,
        playlistLength: playlist.length,
        currentIndex,
        prevBtnDisabled: prevBtn.disabled
    });
}

// Format duration (seconds to MM:SS)
function formatDuration(seconds) {
    if (!seconds || seconds === 'N/A') return 'Unknown';
    const sec = parseInt(seconds);
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format time for progress display (seconds to MM:SS or HH:MM:SS)
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const sec = Math.floor(seconds);
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Progress bar seeking functionality
if (customProgressBar) {
    let isDragging = false;
    
    function updateProgressFromMouse(e) {
        const rect = customProgressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (progressThumb) {
            progressThumb.style.left = percent + '%';
        }
        
        // Update buffered portion on progress-track when seeking
        if (progressTrack && audioPlayer.buffered.length > 0) {
            const duration = audioPlayer.duration || (currentVideoDuration ? parseInt(currentVideoDuration) : null);
            if (duration && duration > 0) {
                const seekTime = (percent / 100) * duration;
                const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
                const bufferedAhead = bufferedEnd - seekTime;
                if (bufferedAhead > 0) {
                    const bufferedPercent = (bufferedEnd / duration) * 100;
                    // Set background gradient to show buffered portion (dark grey) on progress-track
                    progressTrack.style.backgroundImage = 
                        `linear-gradient(to right, #1a2a2f 0%, #1a2a2f ${percent}%, #555555 ${percent}%, #555555 ${bufferedPercent}%, #1a2a2f ${bufferedPercent}%, #1a2a2f 100%)`;
                } else {
                    // No buffered ahead, reset to solid background
                    progressTrack.style.backgroundImage = 'none';
                    progressTrack.style.background = '#1a2a2f';
                }
            }
        }
        
        // Update time display
        const duration = audioPlayer.duration || (currentVideoDuration ? parseInt(currentVideoDuration) : null);
        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
            const seekTime = (percent / 100) * duration;
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(seekTime);
            }
            
            // Only seek audio if mouse is released (not while dragging)
            if (!isDragging && !e.buttons) {
                audioPlayer.currentTime = seekTime;
                isSeeking = false;
            } else {
        isSeeking = true;
            }
        }
    }
    
    customProgressBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        isSeeking = true;
        customProgressBar.classList.add('dragging');
        updateProgressFromMouse(e);
    });
    
    customProgressBar.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateProgressFromMouse(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            customProgressBar.classList.remove('dragging');
            // Final seek when mouse is released
            if (progressFill && audioPlayer.duration && !isNaN(audioPlayer.duration) && isFinite(audioPlayer.duration)) {
                const percent = parseFloat(progressFill.style.width);
                const seekTime = (percent / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
            }
            isSeeking = false;
        }
    });
    
    customProgressBar.addEventListener('click', (e) => {
        if (!isDragging) {
            updateProgressFromMouse(e);
            // Immediate seek on click
            if (progressFill && audioPlayer.duration && !isNaN(audioPlayer.duration) && isFinite(audioPlayer.duration)) {
                const percent = parseFloat(progressFill.style.width);
                const seekTime = (percent / 100) * audioPlayer.duration;
                audioPlayer.currentTime = seekTime;
        }
        isSeeking = false;
        }
    });
}

// Update progress bar when duration is loaded
audioPlayer.addEventListener('loadedmetadata', () => {
    // Prefer actual duration from audio player, but fall back to stored duration
    if (audioPlayer.duration && !isNaN(audioPlayer.duration) && isFinite(audioPlayer.duration) && totalTimeDisplay) {
        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
    } else if (currentVideoDuration && totalTimeDisplay) {
        totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
    } else if (totalTimeDisplay) {
        totalTimeDisplay.textContent = '--:--';
    }
});

// Reset progress when stream ends
audioPlayer.addEventListener('ended', () => {
    if (progressFill) progressFill.style.width = '0%';
    if (progressThumb) progressThumb.style.left = '0%';
    if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
});

// Reset progress when stopped
if (stopBtn) {
    const originalStopHandler = stopBtn.onclick;
    stopBtn.addEventListener('click', () => {
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
    });
}

// Handle audio player events
audioPlayer.addEventListener('play', () => {
    updatePlayPauseButton(true);
});

audioPlayer.addEventListener('pause', () => {
    updatePlayPauseButton(false);
});

// Set up ended listener initially
setupEndedListener();

// Initialize play/pause button state
updatePlayPauseButton(false);

// ===== HAMBURGER MENU =====

// Toggle hamburger menu
if (hamburgerBtn && menuDropdown) {
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerBtn.classList.toggle('active');
        menuDropdown.classList.toggle('active');
    });

    // Search icon button handler
    if (searchIconBtn && searchSection) {
        searchIconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle search section visibility
            if (searchSection.style.display === 'none' || !searchSection.style.display) {
                searchSection.style.display = 'block';
                // Focus on search input when opened
                setTimeout(() => {
                    searchQueryInput.focus();
                }, 50);
            } else {
                searchSection.style.display = 'none';
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchIconBtn.contains(e.target) && !searchSection.contains(e.target)) {
                searchSection.style.display = 'none';
            }
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburgerBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            hamburgerBtn.classList.remove('active');
            menuDropdown.classList.remove('active');
        }
    });

    // Close menu when clicking on menu items
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            menuDropdown.classList.remove('active');
        });
    }
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            menuDropdown.classList.remove('active');
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            menuDropdown.classList.remove('active');
        });
    }
}

// ===== AUTHENTICATION MODAL EVENT LISTENERS =====

// Login button
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        isLoginMode = true;
        authTitle.textContent = 'Login';
        signupFields.style.display = 'none';
        // Remove required attribute from email when hidden
        if (authEmail) {
            authEmail.removeAttribute('required');
        }
        authSubmitBtn.textContent = 'Login';
        authToggle.textContent = "Don't have an account? Sign up";
        authModal.style.display = 'block';
        authError.style.display = 'none';
    });
}

// Signup button
if (signupBtn) {
    signupBtn.addEventListener('click', () => {
        isLoginMode = false;
        authTitle.textContent = 'Sign Up';
        signupFields.style.display = 'block';
        // Add required attribute to email when visible
        if (authEmail) {
            authEmail.setAttribute('required', 'required');
        }
        authSubmitBtn.textContent = 'Sign Up';
        authToggle.textContent = 'Already have an account? Login';
        authModal.style.display = 'block';
        authError.style.display = 'none';
    });
}

// Logout button
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logout();
    });
}

// Close modal
if (closeModal) {
    closeModal.addEventListener('click', () => {
        authModal.style.display = 'none';
    });
}

// Close modal on outside click
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });
}

// Toggle between login and signup
if (authToggle) {
    authToggle.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = 'Login';
            signupFields.style.display = 'none';
            // Remove required attribute from email when hidden
            if (authEmail) {
                authEmail.removeAttribute('required');
            }
            authSubmitBtn.textContent = 'Login';
            authToggle.textContent = "Don't have an account? Sign up";
        } else {
            authTitle.textContent = 'Sign Up';
            signupFields.style.display = 'block';
            // Add required attribute to email when visible
            if (authEmail) {
                authEmail.setAttribute('required', 'required');
            }
            authSubmitBtn.textContent = 'Sign Up';
            authToggle.textContent = 'Already have an account? Login';
        }
        authError.style.display = 'none';
    });
}

// Form submission
if (authFormElement) {
    authFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Temporarily remove required from hidden fields to prevent validation errors
        if (isLoginMode && authEmail) {
            authEmail.removeAttribute('required');
        }
        
        const username = authUsername.value.trim();
        const password = authPassword.value.trim();
        
        if (!username || !password) {
            authError.textContent = 'Please fill in all fields';
            authError.style.display = 'block';
            return;
        }
        
        if (isLoginMode) {
            await login(username, password);
        } else {
            // Ensure email is required in signup mode
            if (authEmail) {
                authEmail.setAttribute('required', 'required');
            }
            const email = authEmail.value.trim();
            if (!email) {
                authError.textContent = 'Please fill in all fields';
                authError.style.display = 'block';
                return;
            }
            await signup(username, email, password);
        }
        
        // Clear form on success
        if (currentUser) {
            authUsername.value = '';
            authPassword.value = '';
            if (authEmail) authEmail.value = '';
            // Reset required attributes
            if (authEmail && !isLoginMode) {
                authEmail.setAttribute('required', 'required');
            } else if (authEmail) {
                authEmail.removeAttribute('required');
            }
        }
    });
}

// ===== VISUAL EQUALIZER =====
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let animationFrameId = null;
let isEqualizerActive = false;
let audioElementAlreadyConnected = false; // Flag to prevent trying to connect if already connected elsewhere
const NUM_BARS = 32; // Number of frequency bars

// Initialize Web Audio API
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256; // Higher resolution for smoother visualization
            analyser.smoothingTimeConstant = 0.8; // Smooth transitions
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        } catch (error) {
            console.error('Error initializing audio context:', error);
            return false;
        }
    }
    return true;
}

// Connect audio player to analyser
function connectAudioToAnalyser() {
    if (!audioContext || !analyser || !audioPlayer) return false;
    
    // If we've already determined the audio element is connected elsewhere, don't try again
    if (audioElementAlreadyConnected) {
        console.warn('⚠️ Audio element already connected elsewhere. Equalizer cannot be used.');
        return false;
    }
    
    try {
        // Check if we already have a source connected to this audio element
        // You can only create one MediaElementSourceNode per audio element
        // Once created, we must reuse it
        if (source) {
            // Source already exists, just reconnect the analyser chain
            try {
                source.disconnect();
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                return true;
            } catch (e) {
                // If disconnect fails, source might be in a bad state
                console.warn('Failed to reconnect existing source:', e);
                source = null;
            }
        }
        
        // Create media source from audio element (only if not already created)
        // Note: This will fail if the audio element was already connected elsewhere
        // In that case, we can't use the equalizer with this audio element
        if (!source) {
            source = audioContext.createMediaElementSource(audioPlayer);
        }
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        return true;
    } catch (error) {
        console.error('Error connecting audio to analyser:', error);
        // If error is "already connected", the audio element was connected elsewhere
        // We can't use the equalizer in this case - set flag to prevent trying again
        if (error.message && (error.message.includes('already connected') || error.name === 'InvalidStateError')) {
            console.warn('⚠️ Audio element already connected to another MediaElementSourceNode. Equalizer cannot be used.');
            console.warn('This usually happens if the audio element was connected to Web Audio API elsewhere.');
            audioElementAlreadyConnected = true; // Set flag to prevent trying again
            source = null; // Clear source so we don't try to reuse it
        }
        return false;
    }
}

// Draw equalizer bars
function drawEqualizer() {
    if (!equalizerCanvas || !analyser || !dataArray || !isEqualizerActive) {
        return;
    }
    
    const canvas = equalizerCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0a1a1f';
    ctx.fillRect(0, 0, width, height);
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate bar dimensions
    const barWidth = width / NUM_BARS;
    const barGap = barWidth * 0.1; // 10% gap between bars
    const actualBarWidth = barWidth - barGap;
    
    // Draw bars
    for (let i = 0; i < NUM_BARS; i++) {
        // Map to frequency data (use logarithmic distribution for better visualization)
        const dataIndex = Math.floor((i / NUM_BARS) * dataArray.length);
        const barHeight = (dataArray[dataIndex] / 255) * height;
        
        const x = i * barWidth + barGap / 2;
        const y = height - barHeight;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, height);
        
        // Use theme colors: cyan -> orange gradient
        const intensity = dataArray[dataIndex] / 255;
        if (intensity > 0.7) {
            // High intensity: orange/red
            gradient.addColorStop(0, '#ff8800');
            gradient.addColorStop(0.5, '#ffaa33');
            gradient.addColorStop(1, '#00d9ff');
        } else if (intensity > 0.4) {
            // Medium intensity: orange/cyan
            gradient.addColorStop(0, '#ffaa33');
            gradient.addColorStop(0.5, '#00d9ff');
            gradient.addColorStop(1, '#00b8d4');
        } else {
            // Low intensity: cyan/blue
            gradient.addColorStop(0, '#00d9ff');
            gradient.addColorStop(0.5, '#00b8d4');
            gradient.addColorStop(1, '#0097a7');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
        
        // Add glow effect for active bars
        if (barHeight > 5) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d9ff';
            ctx.fillRect(x, y, actualBarWidth, barHeight);
            ctx.shadowBlur = 0;
        }
    }
    
    // Continue animation
    animationFrameId = requestAnimationFrame(drawEqualizer);
}

// Start equalizer
function startEqualizer() {
    if (isEqualizerActive) {
        console.log('Equalizer already active');
        return true; // Return true if already active
    }
    
    // Check if audio element is already connected elsewhere
    if (audioElementAlreadyConnected) {
        console.warn('⚠️ Cannot start equalizer: Audio element already connected to another MediaElementSourceNode.');
        // Return false to indicate failure, but don't show alert here
        // Let the caller decide whether to show an alert
        return false;
    }
    
    if (!initAudioContext()) {
        console.error('Failed to initialize audio context');
        return false;
    }
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (!connectAudioToAnalyser()) {
        console.error('Failed to connect audio to analyser');
        // Check flag again - it might have been set during connectAudioToAnalyser
        if (audioElementAlreadyConnected) {
            // Don't show alert here - let the caller decide
            return false;
        }
        return false;
    }
    
    // Set canvas size and ensure it's always visible
    if (equalizerCanvas) {
        const rect = equalizerCanvas.getBoundingClientRect();
        equalizerCanvas.width = rect.width || equalizerCanvas.offsetWidth || 400;
        equalizerCanvas.height = 60; // Fixed height for equalizer
        equalizerCanvas.style.display = 'block'; // Always visible - part of player
    }
    
    isEqualizerActive = true;
    drawEqualizer();
    return true; // Return true on success
}

// Stop equalizer
function stopEqualizer() {
    if (!isEqualizerActive) return;
    
    isEqualizerActive = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Clear canvas
    if (equalizerCanvas) {
        const ctx = equalizerCanvas.getContext('2d');
        ctx.clearRect(0, 0, equalizerCanvas.width, equalizerCanvas.height);
        ctx.fillStyle = '#0a1a1f';
        ctx.fillRect(0, 0, equalizerCanvas.width, equalizerCanvas.height);
    }
    
    // Disconnect source
    if (source) {
        try {
            source.disconnect();
        } catch (e) {
            // Ignore
        }
        source = null;
    }
}

// Equalizer is now always on by default - no button needed
// The equalizer will auto-start when audio begins playing

// Equalizer reconnection is handled in the existing src setter above

// Start equalizer when audio starts playing
audioPlayer.addEventListener('play', () => {
    if (equalizerCanvas && equalizerCanvas.style.display !== 'none' && playerHeader && playerHeader.classList.contains('equalizer-active')) {
        if (!isEqualizerActive) {
            startEqualizer();
        } else if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                connectAudioToAnalyser();
            });
        }
    }
});

// Stop equalizer when audio pauses
audioPlayer.addEventListener('pause', () => {
    // Keep equalizer running but it will show no activity
    // This allows smooth transitions
});

// Handle window resize
window.addEventListener('resize', () => {
    if (equalizerCanvas && isEqualizerActive) {
        const rect = equalizerCanvas.getBoundingClientRect();
        equalizerCanvas.width = rect.width;
        equalizerCanvas.height = 60; // Fixed height for equalizer
    }
});

