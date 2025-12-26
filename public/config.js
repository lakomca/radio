// Backend Server Configuration
// This file is loaded before app.js to configure the backend URL

// Backend server URL - update this to your backend server address
// For local development: 'http://localhost:3000'
// For production backend server: 'http://YOUR_IP:3000' or 'https://your-domain.com'
// For Firebase Hosting with separate backend: 'http://YOUR_BACKEND_IP:3000'

// IMPORTANT: Update YOUR_BACKEND_IP below with your actual backend server IP address
// Run: .\setup-firebase-backend.ps1 to automatically configure this

// Auto-detect backend URL based on environment
(function() {
    const hostname = window.location.hostname;
    
    // If running on localhost, use localhost backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.BACKEND_URL = 'http://localhost:3000';
    }
    // If running on Firebase Hosting (firebaseapp.com or web.app domain)
    else if (hostname.includes('firebaseapp.com') || hostname.includes('web.app')) {
        // Backend server URL - MUST use HTTPS for Firebase Hosting (mixed content policy)
        // Option 1: Use ngrok (quick fix): 'https://abc123.ngrok.io'
        // Option 2: Use Cloudflare Tunnel: 'https://radio-backend.criticmobile.duckdns.org'
        // Option 3: HTTP only works for local network: 'http://192.168.1.182:3000'
        // 
        // ⚠️ HTTP backends won't work from HTTPS Firebase Hosting due to mixed content policy
        window.BACKEND_URL = window.BACKEND_URL || 'https://governessy-pathologically-leta.ngrok-free.dev';
        
        // Warn if using HTTP (will be blocked by browsers)
        if (window.BACKEND_URL.startsWith('http://')) {
            console.warn('⚠️ WARNING: Using HTTP backend with HTTPS Firebase Hosting!');
            console.warn('   Browsers will block this due to mixed content policy.');
            console.warn('   Use HTTPS backend (ngrok or Cloudflare Tunnel) instead.');
            console.warn('   See FIX_MIXED_CONTENT.md for solutions.');
        }
    }
    // For any other domain (custom domain, etc.)
    else {
        // Default: assume backend is on same domain (relative URLs)
        // Or set explicit backend URL
        window.BACKEND_URL = window.BACKEND_URL || '';
    }
    
    console.log('Backend URL configured:', window.BACKEND_URL || '(using relative URLs)');
    
    // Warn if backend URL is not configured for Firebase Hosting
    if ((hostname.includes('firebaseapp.com') || hostname.includes('web.app')) && 
        window.BACKEND_URL.includes('YOUR_BACKEND_IP')) {
        console.warn('⚠️ Backend URL not configured! Update public/config.js with your backend server IP.');
    }
})();

// Helper function to get full API URL
window.getApiUrl = function(path) {
    // Remove leading slash if present (we'll add it)
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    
    if (window.BACKEND_URL) {
        // Ensure backend URL doesn't end with slash
        const backendUrl = window.BACKEND_URL.replace(/\/$/, '');
        return backendUrl + cleanPath;
    }
    
    // Use relative URL if no backend URL configured
    return cleanPath;
};

