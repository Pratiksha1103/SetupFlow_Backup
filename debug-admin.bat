@echo off
title SetupFlow Debug - Administrator Mode
color 0A

echo ==========================================
echo   SetupFlow Debug - Administrator Mode
echo ==========================================
echo.

REM Show current directory
echo Current Directory: %CD%
echo Batch File Location: %~dp0
echo.

REM Change to batch file directory
cd /d "%~dp0"
echo Changed to: %CD%
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
echo Checking Node.js installation...
where node
if %errorLevel% neq 0 (
    echo [ERROR] Node.js not found in PATH
    pause
    exit /b 1
)

echo.
echo Checking npm installation...
where npm
if %errorLevel% neq 0 (
    echo [ERROR] npm not found in PATH
    pause
    exit /b 1
)

echo.
echo Checking package.json...
if not exist package.json (
    echo [ERROR] package.json not found in current directory
    echo Current directory: %CD%
    dir
    pause
    exit /b 1
) else (
    echo [OK] package.json found
)

echo.
echo Node.js version:
node --version

echo.
echo npm version:
npm --version

echo.
echo Starting SetupFlow...
echo Command: npm start
echo.

REM Start the application
npm start

echo.
echo ==========================================
echo npm start command completed
echo Exit code: %errorLevel%
echo ==========================================
pause 