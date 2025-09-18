# SetupFlow Git Workflow Script
Write-Host "========================================" -ForegroundColor Green
Write-Host "         SetupFlow Git Workflow" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if we're in a git repository
try {
    git status | Out-Null
} catch {
    Write-Host "ERROR: Not in a Git repository!" -ForegroundColor Red
    Write-Host "Please run this script from the project root." -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "[1/6] Checking current status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Changes detected:" -ForegroundColor Cyan
    Write-Host $status
} else {
    Write-Host "Working directory is clean." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/6] Fetching latest changes from remote..." -ForegroundColor Yellow
try {
    git fetch origin 2>$null
    Write-Host "Fetch completed successfully." -ForegroundColor Green
} catch {
    Write-Host "WARNING: No remote repository configured or fetch failed." -ForegroundColor Yellow
    Write-Host "This is normal for the first push." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/6] Checking for merge conflicts..." -ForegroundColor Yellow
try {
    $behind = git status -uno | Select-String "behind"
    if ($behind) {
        Write-Host "WARNING: Your branch is behind the remote!" -ForegroundColor Yellow
        $choice = Read-Host "Would you like to pull the latest changes? (y/n)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            Write-Host "Pulling latest changes..." -ForegroundColor Cyan
            git pull origin main
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERROR: Pull failed! Please resolve conflicts manually." -ForegroundColor Red
                Read-Host "Press Enter to continue..."
                exit 1
            }
        }
    }
} catch {
    Write-Host "Unable to check remote status." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/6] Adding changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to add changes!" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host ""
Write-Host "[5/6] Current changes to be committed:" -ForegroundColor Yellow
git status --short

Write-Host ""
$commitMsg = Read-Host "Enter commit message"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    Write-Host "ERROR: Commit message cannot be empty!" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Commit failed!" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host ""
Write-Host "[6/6] Pushing to remote..." -ForegroundColor Yellow
try {
    git push origin main 2>$null
    Write-Host "Push completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "NOTE: Push failed. This might be because no remote is configured yet." -ForegroundColor Yellow
    Write-Host "Your changes are committed locally." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To push to GitHub, first add a remote:" -ForegroundColor Cyan
    Write-Host "  git remote add origin https://github.com/USERNAME/REPO-NAME.git" -ForegroundColor White
    Write-Host "  git branch -M main" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "            Workflow Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Your changes have been committed successfully." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue..."
