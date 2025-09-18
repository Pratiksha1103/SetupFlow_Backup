@echo off
echo ========================================
echo         SetupFlow Git Workflow
echo ========================================
echo.

REM Check if we're in a git repository
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not in a Git repository!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

echo [1/6] Checking current status...
git status --porcelain
if %errorlevel% neq 0 (
    echo ERROR: Git status check failed!
    pause
    exit /b 1
)

echo.
echo [2/6] Fetching latest changes from remote...
git fetch origin 2>nul
if %errorlevel% neq 0 (
    echo WARNING: No remote repository configured or fetch failed.
    echo This is normal for the first push.
)

echo.
echo [3/6] Checking for merge conflicts...
git merge-base HEAD origin/main >nul 2>&1
if %errorlevel% equ 0 (
    echo Checking if local branch is behind...
    git status -uno | findstr "behind" >nul
    if %errorlevel% equ 0 (
        echo WARNING: Your branch is behind the remote!
        echo Would you like to pull the latest changes? (y/n)
        set /p choice=
        if /i "%choice%"=="y" (
            echo Pulling latest changes...
            git pull origin main
            if %errorlevel% neq 0 (
                echo ERROR: Pull failed! Please resolve conflicts manually.
                pause
                exit /b 1
            )
        )
    )
)

echo.
echo [4/6] Adding changes...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to add changes!
    pause
    exit /b 1
)

echo.
echo [5/6] Current changes to be committed:
git status --short

echo.
set /p commit_msg="Enter commit message: "
if "%commit_msg%"=="" (
    echo ERROR: Commit message cannot be empty!
    pause
    exit /b 1
)

echo Committing changes...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ERROR: Commit failed!
    pause
    exit /b 1
)

echo.
echo [6/6] Pushing to remote...
git push origin main 2>nul
if %errorlevel% neq 0 (
    echo NOTE: Push failed. This might be because no remote is configured yet.
    echo Your changes are committed locally.
    echo To push to GitHub, first add a remote:
    echo   git remote add origin https://github.com/USERNAME/REPO-NAME.git
    echo   git branch -M main
    echo   git push -u origin main
)

echo.
echo ========================================
echo            Workflow Complete!
echo ========================================
echo Your changes have been committed successfully.
echo.
pause
