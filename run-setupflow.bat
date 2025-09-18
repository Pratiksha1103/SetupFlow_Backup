@echo off
title SetupFlow - Starting Application
color 0B

echo ==========================================
echo          Starting SetupFlow
echo ==========================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as Administrator
    echo [WARNING] Software installation to C:\apps may fail
    echo [INFO] To run as admin: Right-click this file -> Run as administrator
    echo.
    timeout /t 3 /nobreak >nul
)

echo [INFO] Checking dependencies...

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    npm install
    if %errorLevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [INFO] Starting React development server...
echo [INFO] Starting Electron application...
echo.
echo IMPORTANT: 
echo - A browser window will open (you can ignore this)
echo - An Electron desktop app will also open (USE THIS ONE)
echo - The Electron app has the installer functionality
echo - Close the browser tab if it opens
echo.
echo Please wait for both to load...
echo.

REM Start the application
start /b npm run react-start
echo Waiting for React server to start...
timeout /t 8 /nobreak >nul

echo Starting Electron app...
npm run electron

echo.
echo [INFO] Application closed
pause 