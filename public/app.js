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
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
    } catch (e) {
        console.warn('Error resetting audio player:', e);
    }
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        // Test if the stream endpoint is reachable
        console.log('Testing stream endpoint...');
        fetch(streamUrl, { method: 'HEAD' })
            .then(response => {
                console.log('Stream endpoint response:', response.status, response.statusText);
                console.log('Content-Type:', response.headers.get('Content-Type'));
            })
            .catch(err => {
                console.error('Stream endpoint test failed:', err);
            });
        
        // Set audio source
        audioPlayer.src = streamUrl;
        console.log('Audio player source set, waiting for metadata...');
        
        // Force load
        audioPlayer.load();
    }, 100);
    
        // Wait for metadata
        audioPlayer.addEventListener('loadstart', () => {
            console.log('Audio loadstart event');
            if (currentIndex >= 0 && playlist[currentIndex]) {
                statusText.textContent = `Connecting: ${playlist[currentIndex].title}`;
            } else {
                statusText.textContent = 'Connecting to stream...';
            }
        }, { once: true });
    
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
    
    audioPlayer.addEventListener('progress', () => {
        console.log('Audio progress - buffering...');
        if (currentIndex >= 0 && playlist[currentIndex]) {
            statusText.textContent = `Buffering: ${playlist[currentIndex].title}`;
        } else {
            statusText.textContent = 'Buffering...';
        }
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
    
    // Auto-play next song when current ends
    audioPlayer.addEventListener('ended', () => {
        console.log('Song ended');
        if (currentIndex < playlist.length - 1) {
            currentIndex++;
            loadStream(playlist[currentIndex].url);
            statusText.textContent = `Next: ${playlist[currentIndex].title}`;
        } else {
            updatePlayPauseButton(false);
            statusText.textContent = 'Playlist ended';
        }
    });
    
    audioPlayer.addEventListener('canplaythrough', () => {
        console.log('Audio can play through');
    }, { once: true });
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

