const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const repeatBtn = document.getElementById('repeatBtn');
const autoplayBtn = document.getElementById('autoplayBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSliderContainer = document.getElementById('volumeSliderContainer');
const searchQueryInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const repeatIcon = document.getElementById('repeatIcon');
const repeatOneIcon = document.getElementById('repeatOneIcon');
const autoplayOnIcon = document.getElementById('autoplayOnIcon');
const autoplayOffIcon = document.getElementById('autoplayOffIcon');
const customProgressBar = document.getElementById('customProgressBar');
const progressFill = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const videoThumbnail = document.getElementById('videoThumbnail');

let currentStreamUrl = null;
let currentVideoUrl = null; // Track current video URL (replaces youtubeUrlInput)
let currentVideoDuration = null; // Track current video duration from search results
let currentVideoTitle = null; // Track current video title
let currentVideoId = null; // Track current video ID for thumbnail
let isLoading = false;
let playlist = []; // Array to store playlist
let currentIndex = -1; // Current song index in playlist
let endedHandler = null; // Handler for ended event
let isBuffering = false;
let lastCurrentTime = 0;
let streamStartTime = null; // Track when stream started
let allSearchVideos = []; // Store all search results
let displayedVideosCount = 0; // Track how many videos are currently displayed
const VIDEOS_PER_BATCH = 9; // Number of videos to load per batch
let loadMoreBtn = null; // Reference to load more button
let autoplayEnabled = true; // Autoplay is enabled by default
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
        currentTimeDisplay.textContent = formatTime(currentTime);
        totalTimeDisplay.textContent = formatTime(displayDuration);
    } else {
        currentTimeDisplay.textContent = formatTime(currentTime);
        if (currentVideoDuration) {
            totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
        } else {
            totalTimeDisplay.textContent = '--:--';
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

// Handle progress events (buffering)
audioPlayer.addEventListener('progress', () => {
    if (audioPlayer.buffered.length > 0) {
        const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
        const currentTime = audioPlayer.currentTime;
        const bufferedAhead = bufferedEnd - currentTime;
        
        if (bufferedAhead < 2 && !audioPlayer.paused) {
            if (!isBuffering) {
                isBuffering = true;
                console.log('📊 Buffering started - buffer ahead:', bufferedAhead.toFixed(2), 'seconds');
            }
        } else if (isBuffering && bufferedAhead > 5) {
            isBuffering = false;
            console.log('✅ Buffering complete - buffer ahead:', bufferedAhead.toFixed(2), 'seconds');
        }
    }
});

// Handle stalled events
audioPlayer.addEventListener('stalled', () => {
    console.log('⚠️ Stream stalled - waiting for data');
});

// Handle waiting events
audioPlayer.addEventListener('waiting', () => {
    console.log('⏳ Stream waiting for data');
});

// Handle suspend events
audioPlayer.addEventListener('suspend', () => {
    console.log('⏸️ Stream suspended (normal - enough data buffered)');
});

// Track when source changes
const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src').set;
Object.defineProperty(audioPlayer, 'src', {
    set: function(value) {
        console.log('🔄 Audio src changed from', this.src, 'to', value);
        if (this.src && value && this.src !== value) {
            console.log('⚠️ Source changed while playing - this might cause restart!');
        }
        originalSrcSetter.call(this, value);
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
    updateVideoThumbnail(null);
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
autoplayBtn.addEventListener('click', () => {
    autoplayEnabled = !autoplayEnabled;
    
    if (autoplayEnabled) {
        autoplayBtn.classList.add('active');
        autoplayBtn.classList.remove('inactive');
        autoplayOnIcon.style.display = 'block';
        autoplayOffIcon.style.display = 'none';
        autoplayBtn.title = 'Autoplay: ON';
    } else {
        autoplayBtn.classList.remove('active');
        autoplayBtn.classList.add('inactive');
        autoplayOnIcon.style.display = 'none';
        autoplayOffIcon.style.display = 'block';
        autoplayBtn.title = 'Autoplay: OFF';
    }
});


// Load stream function
function loadStream(youtubeUrl) {
    // Prevent multiple simultaneous loads
    if (isLoading) {
        console.log('⚠️ Already loading, ignoring duplicate request for:', youtubeUrl);
        return;
    }
    
    console.log('🎵 ===== LOADING NEW STREAM =====');
    console.log('URL:', youtubeUrl);
    console.trace('loadStream called from:');
    
    isLoading = true;
    
    playPauseBtn.disabled = true;
    
    // Create stream URL
    const streamUrl = `/stream?url=${encodeURIComponent(youtubeUrl)}`;
    console.log('Stream URL:', streamUrl);
    
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
        
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
        
        // Reset tracking variables and time display immediately
        lastCurrentTime = 0;
        isBuffering = false;
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
    } catch (e) {
        console.warn('Error resetting audio player:', e);
    }
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        console.log('Setting new audio source:', streamUrl);
        audioPlayer.src = streamUrl;
        audioPlayer.load();
    }, 100);
    
    // Wait for metadata
    audioPlayer.addEventListener('loadstart', () => {
        console.log('📡 Audio loadstart event');
    }, { once: true });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log('✅ Audio metadata loaded');
        isLoading = false;
        playPauseBtn.disabled = false;
        updateNavigationButtons();
        // Ensure time display is reset when new stream loads
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
    }, { once: true });
    
    audioPlayer.addEventListener('loadeddata', () => {
        console.log('✅ Audio data loaded');
    }, { once: true });
    
    // Handle errors
    audioPlayer.addEventListener('error', (e) => {
        isLoading = false;
        console.error('❌ Audio error:', e);
        console.error('Error code:', audioPlayer.error?.code);
        console.error('Error message:', audioPlayer.error?.message);
        console.trace('Error occurred at:');
        
        playPauseBtn.disabled = false;
        updatePlayPauseButton(false);
    }, { once: true });
    
    // Timeout fallback
    setTimeout(() => {
        if (isLoading) {
            console.warn('⏱️ Load timeout - resetting loading flag');
            isLoading = false;
        }
    }, 30000);
    
    // Auto-play when loaded
    audioPlayer.addEventListener('canplay', () => {
        console.log('▶️ Audio can play');
        // Ensure time is reset before playing
        if (audioPlayer.currentTime > 0.1) {
            audioPlayer.currentTime = 0;
        }
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (progressFill) progressFill.style.width = '0%';
        if (progressThumb) progressThumb.style.left = '0%';
        lastCurrentTime = 0;
        // Reset ended handler flag when new stream is ready to play
        isHandlingEnded = false;
        
        audioPlayer.play().then(() => {
            console.log('✅ Audio play started');
            updatePlayPauseButton(true);
        }).catch(err => {
            console.error('❌ Play error:', err);
            isHandlingEnded = false;
        });
    }, { once: true });
    
    audioPlayer.addEventListener('canplaythrough', () => {
        console.log('✅ Audio can play through');
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
        
        const isActuallyEnded = audioPlayer.ended && 
                                !audioPlayer.error && 
                                audioPlayer.currentTime > 0 &&
                                (audioPlayer.duration === 0 || 
                                 Math.abs(audioPlayer.currentTime - audioPlayer.duration) < 2);
        
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
            
            // If autoplay is disabled, just stop
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
            console.log('⚠️ Song did not actually end, ignoring ended event (likely network issue)');
        }
    };
    
    audioPlayer.addEventListener('ended', endedHandler);
}

// Update play/pause button appearance
function updatePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Search functionality
searchBtn.addEventListener('click', () => {
    const query = searchQueryInput.value.trim();
    if (!query) {
        return;
    }
    searchYouTube(query);
});

// Enter key support for search
searchQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

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
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
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
        searchResults.innerHTML = '<div class="error">Failed to search. Please try again.</div>';
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
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isLoading) {
                console.log('Already loading, ignoring click');
                return false;
            }
            
            console.log('Clicked video:', video.title, video.url);
            
            // Find the index in the full playlist
            currentIndex = allSearchVideos.findIndex(v => v.url === video.url);
            if (currentIndex === -1) currentIndex = absoluteIndex;
            
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
            
            // Update thumbnail and title
            updateVideoThumbnail(currentVideoId);
            updateNowPlayingTitle(video.title);
            
            // Highlight the currently playing video
            highlightCurrentVideo(video.url);
            
            // Update total time display immediately with duration from search results
            if (currentVideoDuration && totalTimeDisplay) {
                totalTimeDisplay.textContent = formatTime(parseInt(currentVideoDuration));
            }
            
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

// Update video thumbnail
function updateVideoThumbnail(videoId) {
    if (videoThumbnail) {
        if (videoId) {
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            videoThumbnail.innerHTML = `<img src="${thumbnailUrl}" alt="Video thumbnail" />`;
        } else {
            videoThumbnail.innerHTML = '<div class="thumbnail-placeholder">No video</div>';
        }
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

