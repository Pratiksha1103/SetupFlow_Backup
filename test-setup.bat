@echo off
title SetupFlow Debug Test

echo ========================================
echo       SetupFlow Debug Test
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo Checking for required files...
if exist "package.json" (
    echo [OK] package.json found
) else (
    echo [ERROR] package.json NOT found
    echo Make sure you're in the SetupFlow directory
)

if exist "src\App.js" (
    echo [OK] src\App.js found
) else (
    echo [ERROR] src\App.js NOT found
)

if exist "src\main\main.js" (
    echo [OK] src\main\main.js found
) else (
    echo [ERROR] src\main\main.js NOT found
)

echo.
echo Checking Node.js and npm...

where node >nul 2>&1
if %errorLevel% == 0 (
    node --version
    echo [OK] Node.js is available
) else (
    echo [ERROR] Node.js not found in PATH
)

where npm >nul 2>&1
if %errorLevel% == 0 (
    npm --version
    echo [OK] npm is available
) else (
    echo [ERROR] npm not found in PATH
)

echo.
echo Directory contents:
dir /b

echo.
echo ========================================
echo Test complete. 
echo If you see errors above, fix them before running start.bat
echo ========================================
echo.
pause 