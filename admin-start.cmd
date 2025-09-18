@echo off
cd /d "%~dp0"

echo Starting SetupFlow with Administrator privileges...
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Starting application...
    npm start
    pause
) else (
    echo Requesting Administrator privileges...
    powershell "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && npm start && pause' -Verb RunAs"
) 