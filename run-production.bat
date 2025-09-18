@echo off
title SetupFlow - Production Mode
color 0A

echo ==========================================
echo   SetupFlow - Production Mode
echo ==========================================
echo.

REM Change to batch file directory
cd /d "%~dp0"
echo Current Directory: %CD%
echo.

REM Check admin status
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [ERROR] Not running as Administrator
    echo Requesting elevation...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo Setting environment variables...
set NODE_ENV=production
set ELECTRON_IS_DEV=false

echo NODE_ENV=%NODE_ENV%
echo ELECTRON_IS_DEV=%ELECTRON_IS_DEV%

echo.
echo Building React application...
npm run react-build

if %errorLevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo Starting SetupFlow in Production Mode...
echo.

REM Start only Electron (no React dev server)
npm run electron

echo.
echo ==========================================
echo Application closed
echo ==========================================
pause 