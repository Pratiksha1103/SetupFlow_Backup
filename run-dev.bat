@echo off
title SetupFlow - Development Mode
color 0A

echo ==========================================
echo   SetupFlow - Development Mode
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
set NODE_ENV=development
set ELECTRON_IS_DEV=true

echo NODE_ENV=%NODE_ENV%
echo ELECTRON_IS_DEV=%ELECTRON_IS_DEV%

echo.
echo Starting SetupFlow in Development Mode...
echo This will use the React dev server if available, otherwise built files.
echo.

REM Start the application
npm start

echo.
echo ==========================================
echo Application closed
echo ==========================================
pause 