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

let currentStreamUrl = null;
let isLoading = false;
let playlist = []; // Array to store playlist
let currentIndex = -1; // Current song index in playlist
let endedHandler = null; // Handler for ended event

// Set initial volume
audioPlayer.volume = volumeSlider.value / 100;
volumeValue.textContent = `${volumeSlider.value}%`;

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

// Next button functionality
nextBtn.addEventListener('click', () => {
    if (playlist.length === 0) {
        statusText.textContent = 'No playlist available';
        return;
    }
    
    if (currentIndex < playlist.length - 1) {
        currentIndex++;
        loadStream(playlist[currentIndex].url);
        statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
    } else {
        statusText.textContent = 'Already at last song';
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
        console.log('Already loading, ignoring duplicate request for:', youtubeUrl);
        return;
    }
    
    console.log('Setting isLoading to true');
    isLoading = true;
    console.log('Loading stream for:', youtubeUrl);
    
    // Find video title if in playlist
    let videoTitle = 'Loading stream...';
    if (currentIndex >= 0 && playlist[currentIndex]) {
        videoTitle = `Loading: ${playlist[currentIndex].title}`;
    } else {
        // Try to find in playlist by URL
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
    currentStreamUrl = streamUrl;
    
    // Reset audio player completely
    try {
        audioPlayer.pause();
        // Store current time if we're reloading the same stream (shouldn't happen, but just in case)
        const wasPlaying = !audioPlayer.paused;
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
    } catch (e) {
        console.warn('Error resetting audio player:', e);
    }
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        // Set audio source
        audioPlayer.src = streamUrl;
        console.log('Audio player source set, waiting for metadata...');
        
        // Force load
        audioPlayer.load();
    }, 100);
    
    // Wait for metadata - use a single persistent listener
    const loadstartHandler = () => {
        console.log('Audio loadstart event');
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
        console.log('Audio metadata loaded');
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
        console.log('Audio data loaded');
    }, { once: true });
    
    // Track buffering state to prevent restarts
    let isBuffering = false;
    let lastCurrentTime = 0;
    
    audioPlayer.addEventListener('progress', () => {
        // Only update status if actually buffering (not just normal progress)
        if (audioPlayer.buffered.length > 0) {
            const bufferedEnd = audioPlayer.buffered.end(audioPlayer.buffered.length - 1);
            const currentTime = audioPlayer.currentTime;
            const bufferedAhead = bufferedEnd - currentTime;
            
            // Only show buffering if we're running low on buffer
            if (bufferedAhead < 2 && !audioPlayer.paused) {
                isBuffering = true;
                if (currentIndex >= 0 && playlist[currentIndex]) {
                    statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
                } else {
                    statusText.textContent = 'Buffering...';
                }
            } else if (isBuffering && bufferedAhead > 5) {
                isBuffering = false;
                if (currentIndex >= 0 && playlist[currentIndex]) {
                    statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
                } else {
                    statusText.textContent = 'Playing...';
                }
            }
        }
    });
    
    // Handle stalled events (when stream stops downloading)
    audioPlayer.addEventListener('stalled', () => {
        console.log('Stream stalled - waiting for data');
        if (!audioPlayer.paused) {
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Buffering...';
            }
        }
    });
    
    // Handle waiting events (when playback stops due to lack of data)
    audioPlayer.addEventListener('waiting', () => {
        console.log('Stream waiting for data');
        if (!audioPlayer.paused) {
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Buffering...';
            }
        }
    });
    
    // Handle suspend events (when loading is paused)
    audioPlayer.addEventListener('suspend', () => {
        console.log('Stream suspended');
        // Don't do anything - this is normal when enough data is buffered
    });
    
    // Track current time to detect restarts
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        // If time jumps backwards significantly, it might have restarted
        if (lastCurrentTime > 5 && currentTime < lastCurrentTime - 2 && !audioPlayer.seeking) {
            console.warn('Detected possible restart: time jumped from', lastCurrentTime, 'to', currentTime);
            // Don't restart - just log it
        }
        lastCurrentTime = currentTime;
    });
    
    // Handle errors
    audioPlayer.addEventListener('error', (e) => {
        isLoading = false;
        console.error('Audio error:', e);
        console.error('Audio error code:', audioPlayer.error?.code);
        console.error('Audio error message:', audioPlayer.error?.message);
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
    
    // Timeout fallback - if no response after 30 seconds, reset loading flag
    setTimeout(() => {
        if (isLoading) {
            console.warn('Load timeout - resetting loading flag');
            isLoading = false;
        }
    }, 30000);
    
    // Auto-play when loaded
    audioPlayer.addEventListener('canplay', () => {
        console.log('Audio can play');
        audioPlayer.play().then(() => {
            console.log('Audio play started');
            updatePlayPauseButton(true);
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Playing: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Playing...';
            }
        }).catch(err => {
            console.error('Play error:', err);
            statusText.textContent = 'Click play to start';
        });
    }, { once: true });
    
    audioPlayer.addEventListener('canplaythrough', () => {
        console.log('Audio can play through');
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
        console.log('Song ended event fired');
        console.log('Audio ended:', audioPlayer.ended);
        console.log('Audio error:', audioPlayer.error);
        console.log('Audio paused:', audioPlayer.paused);
        console.log('Audio currentTime:', audioPlayer.currentTime);
        console.log('Audio duration:', audioPlayer.duration);
        
        // Prevent premature ending - check if we're actually at the end
        // Sometimes 'ended' fires due to network issues, not actual end of track
        const isActuallyEnded = audioPlayer.ended && 
                                !audioPlayer.error && 
                                audioPlayer.currentTime > 0 &&
                                (audioPlayer.duration === 0 || 
                                 Math.abs(audioPlayer.currentTime - audioPlayer.duration) < 2);
        
        if (isActuallyEnded) {
            console.log('Song actually ended, proceeding to next or stopping');
            if (playlist.length > 0 && currentIndex < playlist.length - 1) {
                currentIndex++;
                loadStream(playlist[currentIndex].url);
                statusText.textContent = `Next: ${playlist[currentIndex].title}`;
            } else {
                updatePlayPauseButton(false);
                statusText.textContent = playlist.length > 0 ? 'Playlist ended' : 'Song ended';
            }
        } else {
            console.log('Song did not actually end, ignoring ended event (likely network issue)');
            // Try to resume if it was a network hiccup
            if (audioPlayer.error && audioPlayer.error.code === 2) {
                console.log('Network error detected, attempting to reload stream');
                // Don't auto-reload, let user manually retry
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
        
        displaySearchResults(data.videos);
        statusText.textContent = `Found ${data.videos.length} results`;
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="error">Failed to search. Please try again.</div>';
        statusText.textContent = 'Search failed';
    }
}

// Display search results
function displaySearchResults(videos) {
    searchResults.innerHTML = '';
    
    // Update playlist with search results
    playlist = videos.map(v => ({
        title: v.title,
        url: v.url,
        duration: v.duration
    }));
    
    videos.forEach((video, index) => {
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
            
            // Set current index
            currentIndex = index;
            
            // Clear results immediately to prevent multiple clicks
            searchResults.innerHTML = '';
            
            // Set input value
            youtubeUrlInput.value = video.url;
            
            // Load stream (has isLoading check inside)
            loadStream(video.url);
            
            return false;
        }, { once: true }); // Only fire once per item
        
        searchResults.appendChild(item);
    });
    
    // Update button states
    updateNavigationButtons();
}

// Update navigation button states
function updateNavigationButtons() {
    if (playlist.length === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= playlist.length - 1;
}

// Format duration (seconds to MM:SS)
function formatDuration(seconds) {
    if (!seconds || seconds === 'N/A') return 'Unknown';
    const sec = parseInt(seconds);
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

