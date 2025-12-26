// API Wrapper - Intercepts fetch calls to prepend backend URL
// This allows the frontend to work with both local development and Firebase Hosting

(function() {
    'use strict';
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Override fetch to prepend BACKEND_URL when needed
    window.fetch = function(url, options = {}) {
        // Ensure options object exists
        options = options || {};
        options.headers = options.headers || {};
        
        // If url is already absolute (starts with http:// or https://), use as-is
        if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
            // Add ngrok skip header if needed
            if (url.includes('ngrok')) {
                options.headers['ngrok-skip-browser-warning'] = 'true';
            }
            return originalFetch(url, options);
        }
        
        // If BACKEND_URL is configured and URL is relative, prepend it
        if (window.BACKEND_URL && typeof url === 'string' && url.startsWith('/')) {
            const backendUrl = window.BACKEND_URL.replace(/\/$/, '');
            const fullUrl = backendUrl + url;
            console.log('[API]', url, '->', fullUrl);
            
            // Add ngrok skip header if using ngrok
            if (backendUrl.includes('ngrok')) {
                options.headers['ngrok-skip-browser-warning'] = 'true';
            }
            
            // Add error handling for failed fetches
            return originalFetch(fullUrl, options).catch(error => {
                console.error('[API] Fetch failed:', {
                    url: fullUrl,
                    originalUrl: url,
                    backendUrl: window.BACKEND_URL,
                    error: error.message
                });
                
                // If backend is not accessible, show helpful error
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    console.warn('⚠️ Backend server may not be accessible. Check:');
                    console.warn('  1. Backend is running: npm start');
                    console.warn('  2. ngrok is running (if using ngrok)');
                    console.warn('  3. Visit ngrok URL in browser to accept warning (first time only)');
                    console.warn('  4. Backend URL:', window.BACKEND_URL);
                }
                
                // Re-throw the error so calling code can handle it
                throw error;
            });
        }
        
        // Otherwise use original fetch (relative URLs work normally)
        return originalFetch(url, options);
    };
    
    console.log('API wrapper initialized. Backend URL:', window.BACKEND_URL || '(using relative URLs)');
})();

