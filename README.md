# SetupFlow

A modern desktop application for automated software installation and configuration on Windows.

## Features

- **Automated Installation**: Silent installation of multiple software packages
- **Modern UI**: Clean, intuitive interface built with React and Material-UI
- **Real-time Logging**: Comprehensive installation logs with success/failure tracking
- **Secure Architecture**: Built with Electron security best practices
- **File-based Configuration**: No database required - uses JSON files for profiles
- **Extensible**: Easy to add new software installers

## Screenshots

The application features a modern interface with:
- **Header**: Application title, Fast API button, and status indicators
- **Sidebar**: Available applications list with selection checkboxes
- **Main Panel**: Selected software details and installation information
- **Install Panel**: Large install button with progress indicators
- **Logs Panel**: Expandable success/failure logs viewer

## Prerequisites

- **Node.js** (v16.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (usually comes with Node.js)
- **Windows 10/11** (Primary target platform)

## Quick Start

1. **Clone or download** this repository
2. **Double-click** `start.bat` to launch the application
3. The startup script will:
   - Check dependencies
   - Install npm packages if needed
   - Create necessary directories
   - Start the application

## Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Start the application
npm start
```

## Directory Structure

```
SetupFlow/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # Main Electron application
│   │   └── preload.js  # Secure IPC bridge
│   ├── components/     # React UI components
│   ├── context/        # React context for state management
│   └── App.js          # Main React application
├── installers/         # Place your installer files here
├── profiles/           # JSON profile files (auto-created)
├── logs/              # Installation logs (auto-created)
├── public/            # Static assets
├── start.bat          # Windows startup script
└── package.json       # Project configuration
```

## Adding Software Installers

1. Place installer files (`.msi`, `.exe`, `.pkg`) in the `installers/` folder
2. The application will automatically detect them
3. Supported installer types:
   - **MSI files**: Windows Installer packages
   - **EXE files**: Executable installers
   - **PKG files**: Package files

### Pre-configured Software

The application includes installation commands for:
- **Notepad++**: Advanced text editor
- **Eclipse IDE**: Integrated Development Environment
- **7-Zip**: File archiver
- **Git**: Version control system

## Installation Commands

The application uses silent installation commands:

- **MSI files**: `msiexec /i "{path}" /quiet /norestart`
- **EXE files**: `start /wait "" "{path}" /S` (varies by installer)
- **Custom commands**: Configurable per software

## Security Features

- **Context Isolation**: Renderer process is sandboxed
- **No Node Integration**: Frontend cannot access Node.js APIs directly
- **Secure IPC**: All communication through controlled channels
- **Path Validation**: Installer paths are validated before execution
- **No Hardcoded Values**: All paths and commands are configurable

## Development

### Project Structure

- **Frontend**: React with Material-UI components
- **Backend**: Electron main process with Node.js
- **State Management**: React Context API
- **Styling**: Material-UI theme system
- **Build System**: Create React App + Electron Builder

### Available Scripts

```bash
npm start          # Start development mode
npm run build      # Build for production
npm run dist       # Create distributable package
npm test           # Run tests
```

### Development Mode

In development mode:
- React dev server runs on `http://localhost:3000`
- Electron opens automatically
- Hot reloading enabled
- DevTools available

## Building for Production

```bash
# Build the React app
npm run react-build

# Create Windows installer
npm run dist
```

## Logging

All installation activities are logged:
- **Location**: `logs/` directory
- **Format**: Timestamped entries with stdout/stderr
- **Retention**: Logs are kept indefinitely (manual cleanup)
- **Viewing**: Built-in log viewer in the application

## Troubleshooting

### Common Issues

1. **"Node.js not found"**
   - Install Node.js from [nodejs.org](https://nodejs.org/)
   - Restart command prompt/terminal

2. **"Permission denied during installation"**
   - Run `start.bat` as Administrator
   - Some installers require elevated privileges

3. **"Installer not found"**
   - Verify installer files are in the `installers/` folder
   - Check file extensions (`.msi`, `.exe`, `.pkg`)

4. **"Installation failed"**
   - Check logs panel for detailed error messages
   - Verify installer is compatible with your system

### Debug Mode

To enable debug logging:
1. Set `NODE_ENV=development` in environment
2. Open DevTools in Electron (Ctrl+Shift+I)
3. Check console for detailed logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Create an issue with detailed information

## Roadmap

Future features planned:
- **Profile Management**: Save and load installation profiles
- **Terraform Integration**: Infrastructure provisioning
- **Cross-platform Support**: macOS and Linux compatibility
- **Remote Installers**: Download installers from URLs
- **Scheduled Installations**: Automated installation scheduling
- **Update Management**: Software update detection and installation

---

**SetupFlow v0.1.0** - Automated Software Installation Made Easy 