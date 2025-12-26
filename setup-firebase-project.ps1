# Setup Firebase Project for Radio Backend
# This script helps you select and configure your Firebase project

Write-Host ""
Write-Host "Firebase Project Setup" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check current project
Write-Host "Current Firebase project:" -ForegroundColor Green
firebase use

Write-Host ""
Write-Host "Available Firebase projects:" -ForegroundColor Green
firebase projects:list

Write-Host ""
Write-Host "Options:" -ForegroundColor Yellow
Write-Host "1. Use an existing project from the list above" -ForegroundColor White
Write-Host "2. Create a new Firebase project" -ForegroundColor White
Write-Host "3. Keep current project (myradym-test)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or 3)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Enter the Project ID you want to use:" -ForegroundColor Yellow
    Write-Host "(Example: alilive-f04dd, alitube-e06d7, etc.)" -ForegroundColor Gray
    $projectId = Read-Host "Project ID"
    
    if ($projectId) {
        Write-Host ""
        Write-Host "Switching to project: $projectId" -ForegroundColor Green
        firebase use $projectId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Project switched successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Make sure backend is running: npm start" -ForegroundColor White
            Write-Host "2. Deploy frontend: firebase deploy --only hosting" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "Error switching project. Make sure the Project ID is correct." -ForegroundColor Red
        }
    }
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "To create a new Firebase project:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "2. Click 'Add project' or 'Create a project'" -ForegroundColor White
    Write-Host "3. Enter a project name" -ForegroundColor White
    Write-Host "4. Follow the setup wizard" -ForegroundColor White
    Write-Host "5. Copy the Project ID" -ForegroundColor White
    Write-Host "6. Run this script again and select option 1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Firebase CLI:" -ForegroundColor Yellow
    Write-Host "  firebase projects:create PROJECT_ID" -ForegroundColor White
} elseif ($choice -eq "3") {
    Write-Host ""
    Write-Host "Keeping current project: myradym-test" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: If this project doesn't exist, you may need to:" -ForegroundColor Yellow
    Write-Host "1. Create it at https://console.firebase.google.com" -ForegroundColor White
    Write-Host "2. Or select a different project (option 1)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
}

Write-Host ""

