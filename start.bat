@echo off
setlocal enabledelayedexpansion

:: SetupFlow Startup Script
title SetupFlow Startup

echo ========================================
echo          SetupFlow Startup
echo ========================================
echo.

:: Set application variables
set APP_NAME=SetupFlow
set APP_VERSION=0.1.0

echo Initializing SetupFlow v%APP_VERSION%...
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrator privileges
) else (
    echo [WARNING] Not running as administrator - some installations may fail
    echo           Consider running as administrator for best results
)
echo.

:: Check Node.js
echo Checking dependencies...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installation, restart this script.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo [OK] Node.js found - Version: !NODE_VERSION!
)

:: Check npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH
    echo        npm usually comes with Node.js installation
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    echo [OK] npm found - Version: !NPM_VERSION!
)

echo.

:: Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo         Make sure you're running this script from the SetupFlow directory
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [OK] All dependencies found
echo.

:: Create necessary directories
echo Setting up directories...
if not exist "installers" (
    mkdir "installers" 2>nul
    echo [OK] Created installers directory
) else (
    echo [OK] Installers directory exists
)

if not exist "logs" (
    mkdir "logs" 2>nul
    echo [OK] Created logs directory
) else (
    echo [OK] Logs directory exists
)

if not exist "profiles" (
    mkdir "profiles" 2>nul
    echo [OK] Created profiles directory
) else (
    echo [OK] Profiles directory exists
)

echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found - installing dependencies...
    echo        This may take a few minutes...
    echo.
    
    echo Running: npm install
    call npm install
    if %errorLevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        echo         Please check your internet connection and try again
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    
    echo [OK] Dependencies installed successfully
    echo.
) else (
    echo [OK] Dependencies already installed
    echo.
)

:: Set environment variables
set NODE_ENV=development
set ELECTRON_IS_DEV=true

:: Display startup information
echo ========================================
echo Starting %APP_NAME% v%APP_VERSION%
echo ========================================
echo.
echo Environment: %NODE_ENV%
echo Platform: Windows
echo.
echo The application will start in a few moments...
echo - React development server will start on http://localhost:3000
echo - Electron window will open automatically
echo.
echo NOTE: 
echo - Place installer files in the 'installers' folder
echo - Logs will be saved in the 'logs' folder
echo - Installation profiles are stored in the 'profiles' folder
echo.

:: Start the application
echo Starting SetupFlow...
echo.

:: Start npm start which runs both React and Electron
call npm start

:: If we reach here, the application has closed
echo.
echo SetupFlow has been closed
echo.

:: Check for any error logs
if exist "logs\error.log" (
    echo Error log detected:
    type "logs\error.log"
    echo.
)

echo Thank you for using SetupFlow!
echo.
echo Press any key to exit...
pause >nul 