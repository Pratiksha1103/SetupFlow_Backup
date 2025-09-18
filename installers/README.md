# Installers Directory

Place your software installer files in this directory for SetupFlow to detect and install them.

## Supported File Types

- **`.msi`** - Windows Installer packages
- **`.exe`** - Executable installers
- **`.pkg`** - Package files

## Example Files

You can download these common software installers:

### Development Tools
- **Git**: `Git-2.42.0.2-64-bit.exe` from [git-scm.com](https://git-scm.com/)
- **Node.js**: `node-v18.17.0-x64.msi` from [nodejs.org](https://nodejs.org/)
- **Visual Studio Code**: `VSCodeUserSetup-x64-1.82.0.exe` from [code.visualstudio.com](https://code.visualstudio.com/)

### Utilities
- **7-Zip**: `7z2301-x64.msi` from [7-zip.org](https://www.7-zip.org/)
- **Notepad++**: `npp.8.5.7.Installer.x64.exe` from [notepad-plus-plus.org](https://notepad-plus-plus.org/)
- **Chrome**: `ChromeSetup.exe` from [google.com/chrome](https://www.google.com/chrome/)

### Enterprise Software
- **Oracle Database**: Place Oracle installer files here
- **Eclipse IDE**: `eclipse-inst-jre-win64.exe` from [eclipse.org](https://www.eclipse.org/)
- **JDK**: `jdk-21_windows-x64_bin.msi` from [oracle.com](https://www.oracle.com/java/)

## File Naming

- Use descriptive names that include version numbers
- Avoid spaces and special characters in filenames
- Examples:
  - ✅ `notepad-plus-plus-8.5.7-x64.exe`
  - ✅ `git-2.42.0-64bit.exe`
  - ❌ `installer (1).exe`
  - ❌ `setup file.msi`

## Installation Commands

SetupFlow automatically detects common software and uses appropriate silent installation commands:

- **MSI files**: `msiexec /i "{path}" /quiet /norestart`
- **Notepad++**: `start /wait "" "{path}" /S`
- **Git**: `start /wait "" "{path}" /VERYSILENT /NORESTART`
- **7-Zip**: `msiexec /i "{path}" /quiet /norestart`

## Security Note

- Only place trusted installer files in this directory
- SetupFlow validates file paths before execution
- Run SetupFlow as Administrator for best compatibility

## Troubleshooting

If an installer is not detected:
1. Check the file extension (must be .msi, .exe, or .pkg)
2. Ensure the file is not corrupted
3. Refresh the application or restart SetupFlow
4. Check the logs panel for error messages 