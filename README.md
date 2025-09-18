# SetupFlow

A modern software installation manager for Windows.

## Features

- Install multiple software packages to `C:\apps`
- Silent installations with progress tracking
- Modern React-based UI with Material-UI
- Electron desktop application

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the application

## Running the Application

### Method 1: Run with Administrator Privileges (Recommended)
```bash
run-as-admin.bat
```
This will automatically request administrator privileges needed to install software to `C:\apps`.

### Method 2: Manual Admin Mode
1. Right-click on Command Prompt
2. Select "Run as administrator"
3. Navigate to the project directory
4. Run: `npm start`

### Method 3: Standard Mode (Limited)
```bash
npm start
```
Note: This may fail to install software to `C:\apps` due to permission restrictions.

## Software Installation Location

All software will be installed to: **C:\apps**

This requires administrator privileges to create and write to this directory.

## Supported Software

- Notepad++ 8.8.5
- Eclipse IDE 2023-09
- 7-Zip 23.01
- Git 2.42.0

## Troubleshooting

**Exit Code 5 Error**: This indicates permission issues. Make sure to run the application as Administrator using `run-as-admin.bat`.

**Installation Failed**: Ensure the installer files are present in the `installers/` directory. 