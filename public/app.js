const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const statusText = document.getElementById('statusText');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const loadBtn = document.getElementById('loadBtn');
const searchQueryInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progressBar = document.getElementById('progressBar');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');

let currentStreamUrl = null;
let isLoading = false;
let playlist = []; // Array to store playlist
let currentIndex = -1; // Current song index in playlist
let endedHandler = null; // Handler for ended event
let isBuffering = false;
let lastCurrentTime = 0;
let streamStartTime = null; // Track when stream started
let allSearchVideos = []; // Store all search results
let displayedVideosCount = 0; // Track how many videos are currently displayed
const VIDEOS_PER_BATCH = 20; // Number of videos to load per batch (always 20)

// Set initial volume
audioPlayer.volume = volumeSlider.value / 100;
volumeValue.textContent = `${volumeSlider.value}%`;

// ===== GLOBAL EVENT LISTENERS (set up once, not in loadStream) =====

// Track current time to detect restarts and update progress
audioPlayer.addEventListener('timeupdate', () => {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    // Update progress bar
    if (duration && !isNaN(duration) && duration > 0) {
        const progress = (currentTime / duration) * 100;
        progressBar.value = progress;
        currentTimeDisplay.textContent = formatTime(currentTime);
        totalTimeDisplay.textContent = formatTime(duration);
    } else {
        currentTimeDisplay.textContent = formatTime(currentTime);
        totalTimeDisplay.textContent = '--:--';
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
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Buffering...';
            }
        } else if (isBuffering && bufferedAhead > 5) {
            isBuffering = false;
            console.log('✅ Buffering complete - buffer ahead:', bufferedAhead.toFixed(2), 'seconds');
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Playing...';
            }
        }
    }
});

// Handle stalled events
audioPlayer.addEventListener('stalled', () => {
    console.log('⚠️ Stream stalled - waiting for data');
    if (!audioPlayer.paused) {
        if (currentIndex >= 0 && playlist[currentIndex]) {
            statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
        } else {
            statusText.textContent = 'Buffering...';
        }
    }
});

// Handle waiting events
audioPlayer.addEventListener('waiting', () => {
    console.log('⏳ Stream waiting for data');
    if (!audioPlayer.paused) {
        if (currentIndex >= 0 && playlist[currentIndex]) {
            statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
        } else {
            statusText.textContent = 'Buffering...';
        }
    }
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
            statusText.textContent = 'Please load a YouTube URL first';
            return;
        }
        audioPlayer.play();
        updatePlayPauseButton(true);
        statusText.textContent = 'Playing...';
    } else {
        audioPlayer.pause();
        updatePlayPauseButton(false);
        statusText.textContent = 'Paused';
    }
});

// Previous button functionality
prevBtn.addEventListener('click', () => {
    if (playlist.length === 0) {
        statusText.textContent = 'No playlist available';
        return;
    }
    
    if (currentIndex > 0) {
        currentIndex--;
        loadStream(playlist[currentIndex].url);
        statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
    } else {
        statusText.textContent = 'Already at first song';
    }
});

// Next button functionality - get next recommended video like YouTube
nextBtn.addEventListener('click', async () => {
    // Get current YouTube URL
    const currentUrl = youtubeUrlInput.value.trim();
    
    if (!currentUrl) {
        statusText.textContent = 'No video playing';
        return;
    }
    
    // Disable button while loading
    nextBtn.disabled = true;
    statusText.textContent = 'Loading next recommended video...';
    
    try {
        // Fetch related videos
        const response = await fetch(`/related?url=${encodeURIComponent(currentUrl)}`);
        const data = await response.json();
        
        if (data.error || !data.videos || data.videos.length === 0) {
            statusText.textContent = 'No related videos found';
            nextBtn.disabled = false;
            return;
        }
        
        // Play the first recommended video
        const nextVideo = data.videos[0];
        youtubeUrlInput.value = nextVideo.url;
        currentIndex = -1; // Reset index since we're not using playlist
        playlist = [nextVideo]; // Store as single item for display
        loadStream(nextVideo.url);
        statusText.textContent = `Next: ${nextVideo.title}`;
        
        // Ensure next button stays enabled after loading
        updateNavigationButtons();
    } catch (error) {
        console.error('Error getting next video:', error);
        statusText.textContent = 'Failed to load next video';
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
    statusText.textContent = 'Stopped';
});

// Volume control
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    audioPlayer.volume = volume / 100;
    volumeValue.textContent = `${volume}%`;
});

// Load YouTube URL
loadBtn.addEventListener('click', () => {
    const url = youtubeUrlInput.value.trim();
    if (!url) {
        statusText.textContent = 'Please enter a YouTube URL';
        return;
    }
    loadStream(url);
});

// Enter key support for URL input
youtubeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadBtn.click();
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
    
    // Find video title if in playlist
    let videoTitle = 'Loading stream...';
    if (currentIndex >= 0 && playlist[currentIndex]) {
        videoTitle = `Loading: ${playlist[currentIndex].title}`;
    } else {
        const foundVideo = playlist.find(v => v.url === youtubeUrl);
        if (foundVideo) {
            videoTitle = `Loading: ${foundVideo.title}`;
        }
    }
    statusText.textContent = videoTitle;
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
        
        // Reset tracking variables
        lastCurrentTime = 0;
        isBuffering = false;
    } catch (e) {
        console.warn('Error resetting audio player:', e);
    }
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        console.log('Setting new audio source:', streamUrl);
        audioPlayer.src = streamUrl;
        audioPlayer.load();
    }, 100);
    
    // Wait for metadata - use a single persistent listener
    const loadstartHandler = () => {
        console.log('📡 Audio loadstart event');
        if (currentIndex >= 0 && playlist[currentIndex]) {
            statusText.textContent = `Connecting: ${playlist[currentIndex].title}`;
        } else {
            statusText.textContent = 'Connecting to stream...';
        }
    };
    
    // Remove old listener if exists, then add new one
    audioPlayer.removeEventListener('loadstart', loadstartHandler);
    audioPlayer.addEventListener('loadstart', loadstartHandler, { once: true });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log('✅ Audio metadata loaded');
        isLoading = false;
        if (currentIndex >= 0 && playlist[currentIndex]) {
            statusText.textContent = `Ready: ${playlist[currentIndex].title}`;
        } else {
            statusText.textContent = 'Ready to play';
        }
        playPauseBtn.disabled = false;
        updateNavigationButtons();
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
        
        let errorMsg = 'Error loading stream. ';
        if (audioPlayer.error) {
            switch(audioPlayer.error.code) {
                case 1: errorMsg += 'MEDIA_ERR_ABORTED'; break;
                case 2: errorMsg += 'Network error - check your connection'; break;
                case 3: errorMsg += 'Decoding error - format not supported'; break;
                case 4: errorMsg += 'Source not supported'; break;
                default: errorMsg += audioPlayer.error.message || 'Unknown error';
            }
        }
        statusText.textContent = errorMsg;
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
        audioPlayer.play().then(() => {
            console.log('✅ Audio play started');
            updatePlayPauseButton(true);
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Playing...';
            }
        }).catch(err => {
            console.error('❌ Play error:', err);
            statusText.textContent = 'Click play to start';
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
            console.log('✅ Song actually ended, getting next recommended video');
            // Auto-play next recommended video (like YouTube autoplay)
            const currentUrl = youtubeUrlInput.value.trim();
            if (currentUrl) {
                statusText.textContent = 'Loading next recommended video...';
                fetch(`/related?url=${encodeURIComponent(currentUrl)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.videos && data.videos.length > 0) {
                            const nextVideo = data.videos[0];
                            youtubeUrlInput.value = nextVideo.url;
                            currentIndex = -1;
                            playlist = [nextVideo];
                            loadStream(nextVideo.url);
                            statusText.textContent = `Next: ${nextVideo.title}`;
                        } else {
                            updatePlayPauseButton(false);
                            statusText.textContent = 'No more videos';
                        }
                    })
                    .catch(error => {
                        console.error('Error getting next video:', error);
                        updatePlayPauseButton(false);
                        statusText.textContent = 'Song ended';
                    });
            } else {
                updatePlayPauseButton(false);
                statusText.textContent = 'Song ended';
            }
        } else {
            console.log('⚠️ Song did not actually end, ignoring ended event (likely network issue)');
            if (audioPlayer.error && audioPlayer.error.code === 2) {
                console.log('Network error detected');
                statusText.textContent = 'Connection lost. Please reload the stream.';
            }
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
        statusText.textContent = 'Please enter a search query';
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

// Search YouTube
async function searchYouTube(query) {
    searchResults.innerHTML = '<div class="loading">Searching...</div>';
    statusText.textContent = 'Searching...';
    
    // Reset infinite scroll state
    allSearchVideos = [];
    displayedVideosCount = 0;
    
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.error) {
            searchResults.innerHTML = `<div class="error">${data.error}</div>`;
            statusText.textContent = 'Search failed';
            return;
        }
        
        if (!data.videos || data.videos.length === 0) {
            searchResults.innerHTML = '<div class="loading">No results found</div>';
            statusText.textContent = 'No results found';
            return;
        }
        
        // Store all videos and display first batch
        allSearchVideos = data.videos;
        displayedVideosCount = 0;
        
        console.log(`Received ${data.videos.length} videos from server`);
        console.log(`First 5 videos:`, data.videos.slice(0, 5).map(v => v.title));
        
        // Display first batch
        loadMoreVideos();
        
        // Setup infinite scroll
        setupInfiniteScroll();
        
        statusText.textContent = `Found ${data.videos.length} results - Scroll down for more`;
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="error">Failed to search. Please try again.</div>';
        statusText.textContent = 'Search failed';
    }
}

// Load more videos (for infinite scroll)
function loadMoreVideos() {
    if (displayedVideosCount >= allSearchVideos.length) {
        return; // All videos already displayed
    }
    
    const endIndex = Math.min(displayedVideosCount + VIDEOS_PER_BATCH, allSearchVideos.length);
    const videosToDisplay = allSearchVideos.slice(displayedVideosCount, endIndex);
    
    videosToDisplay.forEach((video, relativeIndex) => {
        const absoluteIndex = displayedVideosCount + relativeIndex;
        const item = document.createElement('div');
        item.className = 'result-item';
        
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
            
            searchResults.innerHTML = '';
            youtubeUrlInput.value = video.url;
            
            // Update playlist with all search results
            playlist = allSearchVideos.map(v => ({
                title: v.title,
                url: v.url,
                duration: v.duration
            }));
            
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
        duration: v.duration
    }));
    
    updateNavigationButtons();
    
    // Show loading indicator if there are more videos
    if (displayedVideosCount < allSearchVideos.length) {
        // Remove existing loading indicator if any
        const existingLoader = searchResults.querySelector('.loading-more');
        if (existingLoader) {
            existingLoader.remove();
        }
        
        const loader = document.createElement('div');
        loader.className = 'loading-more';
        loader.textContent = `Showing ${displayedVideosCount} of ${allSearchVideos.length} videos...`;
        loader.style.textAlign = 'center';
        loader.style.padding = '10px';
        loader.style.color = '#666';
        searchResults.appendChild(loader);
    } else {
        // Remove loading indicator if all videos are shown
        const existingLoader = searchResults.querySelector('.loading-more');
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

// Setup infinite scroll
let isLoadingMore = false;
let scrollHandler = null;

function setupInfiniteScroll() {
    // Remove existing scroll listener if any
    if (scrollHandler) {
        searchResults.removeEventListener('scroll', scrollHandler);
    }
    
    // Create new scroll handler
    scrollHandler = () => {
        const element = searchResults;
        // Check if user scrolled near the bottom (within 200px)
        const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
        
        if (scrollBottom < 200 && !isLoadingMore && displayedVideosCount < allSearchVideos.length) {
            console.log(`Scroll detected: ${scrollBottom}px from bottom, loading more videos...`);
            isLoadingMore = true;
            loadMoreVideos();
            // Reset loading flag after videos are loaded
            setTimeout(() => {
                isLoadingMore = false;
            }, 300);
        }
    };
    
    // Add scroll listener
    searchResults.addEventListener('scroll', scrollHandler);
}

// Update navigation button states
function updateNavigationButtons() {
    // Previous button: only enable if we have a playlist and we're not at the first item
    if (playlist.length === 0 || currentIndex <= 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }
    
    // Next button: always enable if there's a current video
    // The next button gets related videos dynamically, not from playlist
    // So it doesn't depend on playlist length or currentIndex
    const hasCurrentVideo = youtubeUrlInput.value.trim().length > 0;
    nextBtn.disabled = !hasCurrentVideo;
    
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
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const sec = Math.floor(seconds);
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Progress bar seeking
let isSeeking = false;
if (progressBar) {
    progressBar.addEventListener('input', () => {
        isSeeking = true;
    });

    progressBar.addEventListener('change', () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            const seekTime = (progressBar.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(seekTime);
            }
        }
        isSeeking = false;
    });
}

// Update progress bar when duration is loaded
audioPlayer.addEventListener('loadedmetadata', () => {
    if (audioPlayer.duration && !isNaN(audioPlayer.duration) && totalTimeDisplay) {
        totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
    }
});

// Reset progress when stream ends
audioPlayer.addEventListener('ended', () => {
    if (progressBar) progressBar.value = 0;
    if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
});

// Reset progress when stopped
if (stopBtn) {
    const originalStopHandler = stopBtn.onclick;
    stopBtn.addEventListener('click', () => {
        if (progressBar) progressBar.value = 0;
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
    });
}

// Handle audio player events
audioPlayer.addEventListener('play', () => {
    updatePlayPauseButton(true);
    if (currentIndex >= 0 && playlist[currentIndex]) {
        statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
    } else {
        statusText.textContent = 'Playing...';
    }
});

audioPlayer.addEventListener('pause', () => {
    updatePlayPauseButton(false);
    if (currentIndex >= 0 && playlist[currentIndex]) {
        statusText.textContent = `Paused: ${playlist[currentIndex].title}`;
    } else {
        statusText.textContent = 'Paused';
    }
});

// Set up ended listener initially
setupEndedListener();
