# Setup Script for Firebase Hosting + Backend Server Configuration
# This script helps configure the backend URL for Firebase deployment

Write-Host "`n🔥 Firebase Hosting + Backend Server Setup" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Step 1: Get backend IP address
Write-Host "Step 1: Getting backend server information..." -ForegroundColor Green
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" 
} | Select-Object IPAddress, InterfaceAlias

if ($ipAddresses) {
    Write-Host "  ✅ Found network interfaces:" -ForegroundColor Green
    $ipAddresses | ForEach-Object {
        Write-Host "     - $($_.InterfaceAlias): $($_.IPAddress)" -ForegroundColor White
    }
    
    # Use Wi-Fi IP if available, otherwise use first IP
    $backendIP = ($ipAddresses | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object -First 1).IPAddress
    if (-not $backendIP) {
        $backendIP = ($ipAddresses | Select-Object -First 1).IPAddress
    }
    
    Write-Host "`n  📍 Selected backend IP: $backendIP" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  Could not determine IP address" -ForegroundColor Yellow
    $backendIP = Read-Host "  Enter your backend server IP address"
}

# Step 2: Update config.js
Write-Host "`nStep 2: Updating frontend configuration..." -ForegroundColor Green

$configPath = "public\config.js"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    
    # Update BACKEND_URL for Firebase Hosting
    $newConfig = $configContent -replace "window\.BACKEND_URL = window\.BACKEND_URL || 'http://YOUR_BACKEND_IP:3000';", "window.BACKEND_URL = window.BACKEND_URL || 'http://$backendIP:3000';"
    
    # If the replacement didn't work, try a different pattern
    if ($newConfig -eq $configContent) {
        # Check if BACKEND_URL is already set
        if ($configContent -match "window\.BACKEND_URL\s*=\s*['`"]([^'`"]+)['`"]") {
            Write-Host "  ℹ️  Backend URL already configured: $($matches[1])" -ForegroundColor Yellow
            $update = Read-Host "  Update to http://$backendIP:3000? (y/n)"
            if ($update -eq 'y' -or $update -eq 'Y') {
                $newConfig = $configContent -replace "window\.BACKEND_URL\s*=\s*['`"][^'`"]+['`"]", "window.BACKEND_URL = 'http://$backendIP:3000'"
                Set-Content -Path $configPath -Value $newConfig -NoNewline
                Write-Host "  ✅ Updated config.js" -ForegroundColor Green
            }
        } else {
            # Add BACKEND_URL configuration
            $newLine = "        window.BACKEND_URL = window.BACKEND_URL || 'http://$backendIP:3000';`n"
            $newConfig = $configContent -replace "(window\.BACKEND_URL = window\.BACKEND_URL \|\| '';)", $newLine
            if ($newConfig -eq $configContent) {
                # Try inserting after the comment
                $insertPoint = $configContent.IndexOf("// Set your backend server IP/domain here")
                if ($insertPoint -gt 0) {
                    $newConfig = $configContent.Insert($insertPoint + 50, "`n        window.BACKEND_URL = window.BACKEND_URL || 'http://$backendIP:3000';")
                    Set-Content -Path $configPath -Value $newConfig -NoNewline
                    Write-Host "  ✅ Added backend URL to config.js" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  Could not automatically update config.js" -ForegroundColor Yellow
                    Write-Host "  Please manually edit public/config.js and set:" -ForegroundColor Yellow
                    Write-Host "     window.BACKEND_URL = 'http://$backendIP:3000';" -ForegroundColor White
                }
            } else {
                Set-Content -Path $configPath -Value $newConfig -NoNewline
                Write-Host "  ✅ Updated config.js" -ForegroundColor Green
            }
        }
    } else {
        Set-Content -Path $configPath -Value $newConfig -NoNewline
        Write-Host "  ✅ Updated config.js" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  config.js not found. Creating it..." -ForegroundColor Yellow
    # Create basic config.js
    $configContent = @"
// Backend Server Configuration
(function() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.BACKEND_URL = 'http://localhost:3000';
    }
    else if (hostname.includes('firebaseapp.com') || hostname.includes('web.app')) {
        window.BACKEND_URL = window.BACKEND_URL || 'http://$backendIP:3000';
    }
    else {
        window.BACKEND_URL = window.BACKEND_URL || '';
    }
    
    console.log('Backend URL configured:', window.BACKEND_URL || '(using relative URLs)');
})();
"@
    Set-Content -Path $configPath -Value $configContent
    Write-Host "  ✅ Created config.js" -ForegroundColor Green
}

# Step 3: Check Firebase setup
Write-Host "`nStep 3: Checking Firebase setup..." -ForegroundColor Green

$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebaseInstalled) {
    Write-Host "  ✅ Firebase CLI is installed" -ForegroundColor Green
    
    # Check if logged in
    try {
        $firebaseProjects = firebase projects:list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Firebase CLI is logged in" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Not logged in to Firebase. Run: firebase login" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not verify Firebase login status" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Firebase CLI not found. Install with: npm install -g firebase-tools" -ForegroundColor Yellow
}

# Step 4: Summary
Write-Host "`n✅ Setup Complete!`n" -ForegroundColor Green
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Backend URL: http://$backendIP:3000" -ForegroundColor White
Write-Host "  Config file: public/config.js" -ForegroundColor White
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure backend server is running: npm start" -ForegroundColor White
Write-Host "2. Configure firewall (if not done): .\setup-backend-server.ps1" -ForegroundColor White
Write-Host "3. Deploy frontend to Firebase: firebase deploy --only hosting" -ForegroundColor White
Write-Host "`nNote: Backend URL is set for local network access." -ForegroundColor Yellow
Write-Host "For internet access, see FIREBASE_BACKEND_SETUP.md`n" -ForegroundColor Yellow

