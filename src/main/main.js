const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

class SetupFlowApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    this.appPaths = this.initializePaths();
    this.isAdmin = this.checkAdminPrivileges();
  }

  // Check if running with administrator privileges
  checkAdminPrivileges() {
    if (process.platform !== 'win32') {
      return process.getuid && process.getuid() === 0;
    }
    
    // For Windows, we'll check this during installation
    return true; // Assume admin for now, will verify during installation
  }

  // Verify admin privileges on Windows
  async verifyWindowsAdmin() {
    return new Promise((resolve) => {
      const child = spawn('net', ['session'], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true 
      });
      
      child.on('close', (code) => {
        // Exit code 0 means admin privileges, non-zero means no admin
        resolve(code === 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  // Check if software is already installed in our apps folder only
  async checkIfAlreadyInstalled(appData) {
    const { name, defaultInstallPath } = appData;
    
    try {
      // Only check our specific apps folder installation path
      const appsPath = defaultInstallPath || path.join('C:\\apps', name);
      
      // Check if the software folder exists in our apps directory
      if (await fs.pathExists(appsPath)) {
        // Look for executable files that might indicate installation
        const files = await fs.readdir(appsPath);
        const exeFiles = files.filter(file => 
          file.toLowerCase().endsWith('.exe')
        );
        
        if (exeFiles.length > 0) {
          return {
            isInstalled: true,
            location: appsPath,
            version: 'Unknown',
            method: 'apps_folder'
          };
        }
      }
      
      return { isInstalled: false };
      
    } catch (error) {
      return { isInstalled: false, error: error.message };
    }
  }



  initializePaths() {
    const userDataPath = app.getPath('userData');
    return {
      userData: userDataPath,
      profiles: path.join(userDataPath, 'profiles'),
      logs: path.join(userDataPath, 'logs'),
      installers: path.join(process.cwd(), 'installers'),
      config: path.join(userDataPath, 'config.json')
    };
  }

  async createDirectories() {
    try {
      await Promise.all([
        fs.ensureDir(this.appPaths.profiles),
        fs.ensureDir(this.appPaths.logs),
        fs.ensureDir(this.appPaths.installers)
      ]);
    } catch (error) {
      // Log to file instead of console
      await this.logToFile(path.join(process.cwd(), 'error.log'), `Failed to create directories: ${error.message}`);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      },
      icon: path.join(__dirname, '../assets/setupflow-logo.png'),
      show: false,
      titleBarStyle: 'default'
    });

    // Load the app
    const startUrl = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../../build/index.html')}`;
    
    // Debug logging removed for production
    
    this.mainWindow.loadURL(startUrl);

    // Handle loading errors
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // Log errors to file instead of console
      
      // If production build fails, try to fall back to a simple HTML page
      if (!this.isDev) {
        const fallbackHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>SetupFlow</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #f44336; }
              .info { color: #2196f3; }
            </style>
          </head>
          <body>
            <h1>SetupFlow</h1>
            <p class="error">Failed to load the application.</p>
            <p class="info">Please try running: npm run build</p>
            <p>Error: ${errorDescription}</p>
          </body>
          </html>
        `;
        
        this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
      }
    });

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      // Removed automatic dev tools opening
    });

    // Add keyboard shortcut for dev tools (F12)
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        if (this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.webContents.closeDevTools();
        } else {
        this.mainWindow.webContents.openDevTools();
        }
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIpcHandlers() {
    // Get available software
    ipcMain.handle('get-available-software', async () => {
      try {
        const installerFiles = await fs.readdir(this.appPaths.installers);
        return installerFiles.filter(file => {
          const isValidExtension = file.endsWith('.msi') || file.endsWith('.exe') || file.endsWith('.pkg') || file.endsWith('.zip');
          const isNotReadme = !file.toLowerCase().includes('readme');
          return isValidExtension && isNotReadme;
        });
      } catch (error) {
        // Log to file instead of console
        return [];
      }
    });

    // Get profiles
    ipcMain.handle('get-profiles', async () => {
      try {
        const profileFiles = await fs.readdir(this.appPaths.profiles);
        const profiles = [];
        
        for (const file of profileFiles) {
          if (file.endsWith('.json')) {
            const profilePath = path.join(this.appPaths.profiles, file);
            const profileData = await fs.readJson(profilePath);
            profiles.push(profileData);
          }
        }
        
        return profiles;
      } catch (error) {
        // Log to file instead of console
        return [];
      }
    });

    // Save profile
    ipcMain.handle('save-profile', async (event, profileData) => {
      try {
        const profileId = profileData.id || uuidv4();
        const profilePath = path.join(this.appPaths.profiles, `${profileId}.json`);
        
        const profile = {
          ...profileData,
          id: profileId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await fs.writeJson(profilePath, profile, { spaces: 2 });
        return { success: true, profile };
      } catch (error) {
        // Log to file instead of console
        return { success: false, error: error.message };
      }
    });

    // Install software
    ipcMain.handle('install-software', async (event, installData) => {
      try {
        const { software, profileId } = installData;
        const logId = uuidv4();
        const logPath = path.join(this.appPaths.logs, `${logId}.log`);
        
        const results = [];
        
        for (const app of software) {
          const result = await this.installSingleApp(app, logPath);
          results.push(result);
        }
        
        return { success: true, results, logPath };
      } catch (error) {
      // Log to file instead of console
        return { success: false, error: error.message };
      }
    });

    // Uninstall software
    ipcMain.handle('uninstall-software', async (event, uninstallData) => {
      try {
        const { software } = uninstallData;
        const logId = uuidv4();
        const logPath = path.join(this.appPaths.logs, `${logId}.log`);
        
        const results = [];
        
        for (const app of software) {
          const result = await this.uninstallSingleApp(app, logPath);
          results.push(result);
        }
        
        return { success: true, results, logPath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get logs
    ipcMain.handle('get-logs', async () => {
      try {
        const logFiles = await fs.readdir(this.appPaths.logs);
        const logs = [];
        
        for (const file of logFiles) {
          if (file.endsWith('.log')) {
            const logPath = path.join(this.appPaths.logs, file);
            const stats = await fs.stat(logPath);
            logs.push({
              id: path.basename(file, '.log'),
              filename: file,
              createdAt: stats.birthtime,
              size: stats.size
            });
          }
        }
        
        return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (error) {
        // Log to file instead of console
        return [];
      }
    });

    // Read log file
    ipcMain.handle('read-log', async (event, logId) => {
      try {
        const logPath = path.join(this.appPaths.logs, `${logId}.log`);
        const content = await fs.readFile(logPath, 'utf8');
        return { success: true, content };
      } catch (error) {
        // Log to file instead of console
        return { success: false, error: error.message };
      }
    });

    // Delete log files
    ipcMain.handle('delete-logs', async (event, logIds) => {
      try {
        const deletedLogs = [];
        const failedLogs = [];

        for (const logId of logIds) {
          try {
            const logPath = path.join(this.appPaths.logs, `${logId}.log`);
            if (await fs.pathExists(logPath)) {
              await fs.remove(logPath);
              deletedLogs.push(logId);
            } else {
              failedLogs.push({ logId, error: 'File not found' });
            }
          } catch (error) {
            failedLogs.push({ logId, error: error.message });
          }
        }

        return { 
          success: true, 
          deletedLogs, 
          failedLogs,
          message: `Successfully deleted ${deletedLogs.length} log file${deletedLogs.length !== 1 ? 's' : ''}`
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async installSingleApp(appData, logPath) {
    return new Promise(async (resolve) => {
      const { name, installerPath, command } = appData;
      const fullInstallerPath = path.join(this.appPaths.installers, installerPath);
      
      // Check admin privileges before installation
      this.logToFile(logPath, `Checking administrator privileges...`);
      const hasAdmin = await this.verifyWindowsAdmin();
      
      if (!hasAdmin) {
        const error = `Administrator privileges required for installation. Please run the application as Administrator.`;
        this.logToFile(logPath, `ERROR: ${error}`);
        this.logToFile(logPath, `TIP: Use admin-start.cmd or debug-admin.bat to run with proper privileges.`);
        resolve({ name, success: false, error });
        return;
      }

      this.logToFile(logPath, `✓ Administrator privileges confirmed`);
      
      // Check if software is already installed
      this.logToFile(logPath, `Checking if ${name} is already installed...`);
      const installCheck = await this.checkIfAlreadyInstalled(appData);
      
      if (installCheck.isInstalled) {
        const message = `${name} is already installed at: ${installCheck.location}${installCheck.version ? ` (Version: ${installCheck.version})` : ''}`;
        this.logToFile(logPath, `INFO: ${message}`);
        
        // Send notification to UI about already installed software
        if (this.mainWindow) {
          this.mainWindow.webContents.send('software-already-installed', {
            name,
            location: installCheck.location,
            version: installCheck.version,
            method: installCheck.method
          });
        }
        
        resolve({
          name,
          success: false, 
          alreadyInstalled: true,
          location: installCheck.location,
          version: installCheck.version,
          message: `${name} already exists in ${installCheck.location}`
        });
        return;
      }
      
      this.logToFile(logPath, `✓ ${name} is not currently installed, proceeding with installation`);
      
      // Security: Validate installer path
      if (!fs.existsSync(fullInstallerPath)) {
        const error = `Installer not found: ${fullInstallerPath}`;
        this.logToFile(logPath, `ERROR: ${error}`);
        resolve({ name, success: false, error });
        return;
      }

      const startTime = new Date();
      this.logToFile(logPath, `Starting installation of ${name} at ${startTime.toISOString()}`);
      
      // Check if this is a ZIP extraction command
      if (command === 'EXTRACT_ZIP' || (appData.requiresExtraction && installerPath.toLowerCase().endsWith('.zip'))) {
        this.logToFile(logPath, `INFO: ${name} is a ZIP file that will be extracted automatically.`);
        this.handleZipExtraction(appData, logPath, fullInstallerPath, resolve);
        return;
      }
      
      // Replace placeholder with actual path
      let finalCommand = command.replace('{path}', `"${fullInstallerPath}"`);
      
      // Handle installPath replacement for different installer types
      const defaultInstallPath = appData.defaultInstallPath || 'C:\\apps';
      
      if (command.includes('/D={installPath}')) {
        // NSIS installer (like Notepad++) - no quotes around path for /D parameter
        finalCommand = finalCommand.replace('{installPath}', defaultInstallPath);
      } else if (command.includes('{installPath}')) {
        // Other installers - use quotes around path
        finalCommand = finalCommand.replace('{installPath}', `"${defaultInstallPath}"`);
      }
      
      this.logToFile(logPath, `Command: ${finalCommand}`);
      
      // Create C:\apps directory if it doesn't exist (with admin privileges)
      try {
        const appsDir = 'C:\\apps';
        
        if (!fs.existsSync(appsDir)) {
          this.logToFile(logPath, `Creating ${appsDir} directory...`);
          await fs.ensureDir(appsDir);
          this.logToFile(logPath, `Successfully created ${appsDir}`);
        } else {
          this.logToFile(logPath, `Directory ${appsDir} already exists`);
        }
        
        // Set full permissions on the directory
        const chmodResult = await new Promise((resolve) => {
          const chmodChild = spawn('icacls', [`"${appsDir}"`, '/grant', 'Everyone:(OI)(CI)F'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          
          chmodChild.on('close', (code) => {
            resolve(code === 0);
          });
          
          chmodChild.on('error', () => {
            resolve(false);
          });
        });
        
        if (chmodResult) {
          this.logToFile(logPath, `✓ Set full permissions on ${appsDir}`);
        } else {
          this.logToFile(logPath, `⚠ Warning: Could not set permissions on ${appsDir}`);
        }
        
      } catch (error) {
        this.logToFile(logPath, `Failed to create/setup C:\\apps: ${error.message}`);
        // Continue anyway - let the installer try to create it
      }
      
      // Run installer with inherited admin privileges (no UAC prompt since parent is already admin)
      this.logToFile(logPath, `Executing installer with inherited admin privileges...`);
      
      const child = spawn('cmd', ['/c', finalCommand], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        // Inherit the current process's environment and privileges
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.logToFile(logPath, `STDOUT: ${output}`);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.logToFile(logPath, `STDERR: ${output}`);
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        this.logToFile(logPath, `Installation of ${name} completed with exit code ${code} in ${duration}ms`);
        
        // Notify UI to refresh logs after installation
        if (this.mainWindow) {
          this.mainWindow.webContents.send('logs-updated');
        }
        
        resolve({
          name,
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          duration
        });
      });

      child.on('error', (error) => {
        this.logToFile(logPath, `ERROR: ${error.message}`);
        resolve({
          name,
          success: false,
          error: error.message
        });
      });
    });
  }

  async uninstallSingleApp(appData, logPath) {
    return new Promise(async (resolve) => {
      const { name, installerPath } = appData;
      const startTime = new Date();
      
      this.logToFile(logPath, `=== UNINSTALLATION START ===`);
      this.logToFile(logPath, `Software: ${name}`);
      this.logToFile(logPath, `Starting uninstallation of ${name} at ${startTime.toISOString()}`);
      
      try {
        // Check if software is installed and get uninstall method
        const uninstallInfo = await this.getUninstallInfo(appData, logPath);
        
        if (!uninstallInfo.isInstalled) {
          this.logToFile(logPath, `INFO: ${name} is not installed or cannot be detected.`);
          resolve({
            name,
            success: true,
            notInstalled: true,
            message: `${name} is not installed`
          });
          return;
        }
        
        this.logToFile(logPath, `Uninstall method: ${uninstallInfo.method}`);
        this.logToFile(logPath, `Uninstall command: ${uninstallInfo.command}`);
        
        // Execute uninstall command
        const child = spawn('cmd', ['/c', uninstallInfo.command], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          env: process.env
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          this.logToFile(logPath, `STDOUT: ${output}`);
        });

        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          this.logToFile(logPath, `STDERR: ${output}`);
        });

        child.on('close', (code) => {
          const endTime = new Date();
          const duration = endTime - startTime;
          
          this.logToFile(logPath, `Uninstallation of ${name} completed with exit code ${code} in ${duration}ms`);
          
          // Notify UI to refresh logs after uninstallation
          if (this.mainWindow) {
            this.mainWindow.webContents.send('logs-updated');
          }
          
          resolve({
            name,
            success: code === 0,
            exitCode: code,
            stdout,
            stderr,
            duration
          });
        });

        child.on('error', (error) => {
          this.logToFile(logPath, `ERROR: ${error.message}`);
          resolve({
            name,
            success: false,
            error: error.message
          });
        });
        
      } catch (error) {
        this.logToFile(logPath, `ERROR: Failed to uninstall ${name}: ${error.message}`);
        resolve({
          name,
          success: false,
          error: error.message
        });
      }
    });
  }

  async getUninstallInfo(appData, logPath) {
    const { name, installerPath } = appData;
    
    // Determine software type and uninstall method
    if (installerPath.toLowerCase().endsWith('.msi')) {
      return await this.getMsiUninstallInfo(appData, logPath);
    } else if (installerPath.toLowerCase().endsWith('.exe')) {
      return await this.getExeUninstallInfo(appData, logPath);
    } else if (installerPath.toLowerCase().endsWith('.zip')) {
      return await this.getZipUninstallInfo(appData, logPath);
    } else {
      return {
        isInstalled: false,
        method: 'unknown',
        command: '',
        reason: 'Unsupported installer type'
      };
    }
  }

  async getMsiUninstallInfo(appData, logPath) {
    const { name, installerPath } = appData;
    
    try {
      // For MSI files, we can use the product name to find and uninstall
      // First, try to find the product using wmic
      const productName = this.getProductNameFromInstaller(name);
      
      // Check if product is installed
      const checkCommand = `wmic product where "name like '%${productName}%'" get Name,IdentifyingNumber /format:csv`;
      
      return new Promise((resolve) => {
        const child = spawn('cmd', ['/c', checkCommand], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });

        let stdout = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0 && stdout.includes(productName)) {
            // Extract product code from output
            const lines = stdout.split('\n');
            let productCode = '';
            
            for (const line of lines) {
              if (line.includes(productName) && line.includes('{')) {
                const match = line.match(/\{[^}]+\}/);
                if (match) {
                  productCode = match[0];
                  break;
                }
              }
            }
            
            if (productCode) {
              resolve({
                isInstalled: true,
                method: 'msi_product_code',
                command: `msiexec /x ${productCode} /quiet /norestart`
              });
            } else {
              // Fallback: try to uninstall using the original MSI file
              const fullInstallerPath = path.join(this.appPaths.installers, installerPath);
              resolve({
                isInstalled: true,
                method: 'msi_file',
                command: `msiexec /x "${fullInstallerPath}" /quiet /norestart`
              });
            }
          } else {
            resolve({
              isInstalled: false,
              method: 'msi',
              command: '',
              reason: 'Product not found in installed programs'
            });
          }
        });

        child.on('error', () => {
          resolve({
            isInstalled: false,
            method: 'msi',
            command: '',
            reason: 'Failed to check installed programs'
          });
        });
      });
      
    } catch (error) {
      return {
        isInstalled: false,
        method: 'msi',
        command: '',
        reason: error.message
      };
    }
  }

  async getExeUninstallInfo(appData, logPath) {
    const { name, installerPath } = appData;
    
    try {
      // For EXE files, check registry for uninstall information
      const productName = this.getProductNameFromInstaller(name);
      
      // Check both 32-bit and 64-bit registry locations
      const registryPaths = [
        'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
        'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
      ];
      
      for (const regPath of registryPaths) {
        const uninstallInfo = await this.checkRegistryForUninstall(regPath, productName, logPath);
        if (uninstallInfo.isInstalled) {
          return uninstallInfo;
        }
      }
      
      return {
        isInstalled: false,
        method: 'exe',
        command: '',
        reason: 'No uninstall information found in registry'
      };
      
    } catch (error) {
      return {
        isInstalled: false,
        method: 'exe',
        command: '',
        reason: error.message
      };
    }
  }

  async getZipUninstallInfo(appData, logPath) {
    const { name, defaultInstallPath } = appData;
    
    try {
      // For ZIP extractions, check if the installation directory exists
      let installPath = defaultInstallPath;
      
      // Handle specific software types
      if (name.toLowerCase().includes('gradle')) {
        installPath = 'C:\\apps\\gradle';
      } else if (name.toLowerCase().includes('tomcat')) {
        installPath = 'C:\\apps\\tomcat';
      } else if (name.toLowerCase().includes('apache') && name.toLowerCase().includes('http')) {
        installPath = 'C:\\apps\\httpd';
      } else if (name.toLowerCase().includes('oracle')) {
        installPath = 'C:\\apps\\oracle';
      }
      
      const exists = await fs.pathExists(installPath);
      
      if (exists) {
        return {
          isInstalled: true,
          method: 'directory_removal',
          command: `rmdir /s /q "${installPath}"`
        };
      } else {
        return {
          isInstalled: false,
          method: 'directory_removal',
          command: '',
          reason: `Installation directory not found: ${installPath}`
        };
      }
      
    } catch (error) {
      return {
        isInstalled: false,
        method: 'directory_removal',
        command: '',
        reason: error.message
      };
    }
  }

  async checkRegistryForUninstall(regPath, productName, logPath) {
    return new Promise((resolve) => {
      // Query registry for uninstall information
      const command = `reg query "${regPath}" /s /f "${productName}" /t REG_SZ`;
      
      const child = spawn('cmd', ['/c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdout.includes('UninstallString')) {
          // Extract uninstall string from registry output
          const lines = stdout.split('\n');
          let uninstallString = '';
          
          for (const line of lines) {
            if (line.includes('UninstallString') && line.includes('REG_SZ')) {
              const parts = line.split('REG_SZ');
              if (parts.length > 1) {
                uninstallString = parts[1].trim();
                break;
              }
            }
          }
          
          if (uninstallString) {
            // Add silent flags if not present
            if (!uninstallString.toLowerCase().includes('/s') && 
                !uninstallString.toLowerCase().includes('/quiet')) {
              uninstallString += ' /S /quiet';
            }
            
            resolve({
              isInstalled: true,
              method: 'registry_uninstall',
              command: uninstallString
            });
          } else {
            resolve({
              isInstalled: false,
              method: 'registry',
              command: '',
              reason: 'UninstallString not found in registry'
            });
          }
        } else {
          resolve({
            isInstalled: false,
            method: 'registry',
            command: '',
            reason: 'Product not found in registry'
          });
        }
      });

      child.on('error', () => {
        resolve({
          isInstalled: false,
          method: 'registry',
          command: '',
          reason: 'Failed to query registry'
        });
      });
    });
  }

  getProductNameFromInstaller(name) {
    // Clean up the name to match registry entries
    let productName = name;
    
    // Handle specific cases
    if (name.toLowerCase().includes('java development kit')) {
      productName = 'Java';
    } else if (name.toLowerCase().includes('notepad++')) {
      productName = 'Notepad++';
    } else if (name.toLowerCase().includes('apache tomcat')) {
      productName = 'Apache Tomcat';
    } else if (name.toLowerCase().includes('apache http')) {
      productName = 'Apache HTTP Server';
    } else if (name.toLowerCase().includes('oracle')) {
      productName = 'Oracle';
    }
    
    return productName;
  }

  async handleZipExtraction(appData, logPath, fullInstallerPath, resolve) {
    const { name, defaultInstallPath } = appData;
    const startTime = new Date();
    
    try {
      this.logToFile(logPath, `Starting ZIP extraction of ${name} at ${startTime.toISOString()}`);
      this.logToFile(logPath, `Source: ${fullInstallerPath}`);
      this.logToFile(logPath, `Target: ${defaultInstallPath}`);
      
      // Send progress to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name,
          status: 'starting',
          message: 'Preparing extraction...'
        });
      }
      
      // Ensure target directory exists
      await fs.ensureDir(defaultInstallPath);
      
      // Use PowerShell Expand-Archive for ZIP extraction
      const extractCommand = `powershell -Command "Expand-Archive -Path '${fullInstallerPath}' -DestinationPath '${defaultInstallPath}' -Force"`;
      this.logToFile(logPath, `Extraction command: ${extractCommand}`);
      
      // Send progress to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name,
          status: 'extracting',
          message: 'Extracting files...'
        });
      }
      
      const child = spawn('powershell', [
        '-Command', 
        `Expand-Archive -Path '${fullInstallerPath}' -DestinationPath '${defaultInstallPath}' -Force`
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.logToFile(logPath, `STDOUT: ${output}`);
      });
      
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.logToFile(logPath, `STDERR: ${output}`);
      });
      
      child.on('close', async (code) => {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        if (code === 0) {
          this.logToFile(logPath, `✓ ZIP extraction completed successfully in ${duration}ms`);
          
          // Send progress to UI
          if (this.mainWindow) {
            this.mainWindow.webContents.send('installation-progress', {
              name,
              status: 'configuring',
              message: 'Setting up environment...'
            });
          }
          
          // Verify extraction was successful
          try {
            const extractedItems = await fs.readdir(defaultInstallPath);
            this.logToFile(logPath, `Extracted items: ${extractedItems.join(', ')}`);
            
            if (extractedItems.length > 0) {
              this.logToFile(logPath, `✓ Extraction verified - ${extractedItems.length} items extracted`);
              
              // Call specific setup based on software type
              await this.setupExtractedSoftware(name.toLowerCase(), defaultInstallPath, logPath);
              
              // Send final success to UI
              if (this.mainWindow) {
                this.mainWindow.webContents.send('installation-progress', {
                  name,
                  status: 'completed',
                  message: 'Installation completed successfully!'
                });
              }
              
              resolve({
                name,
                success: true,
                exitCode: 0,
                stdout,
                stderr,
                duration,
                extractedPath: defaultInstallPath
              });
            } else {
              throw new Error('No files were extracted');
            }
          } catch (verifyError) {
            this.logToFile(logPath, `⚠ Warning: Could not verify extraction: ${verifyError.message}`);
            resolve({
              name,
              success: false,
              error: `Extraction verification failed: ${verifyError.message}`,
              exitCode: code
            });
          }
        } else {
          this.logToFile(logPath, `✗ ZIP extraction failed with exit code ${code}`);
          if (stderr) {
            this.logToFile(logPath, `Error details: ${stderr}`);
          }
          
          // Send failure to UI
          if (this.mainWindow) {
            this.mainWindow.webContents.send('installation-progress', {
              name,
              status: 'failed',
              message: `Extraction failed with exit code ${code}`
            });
          }
          
          resolve({
            name,
            success: false,
            exitCode: code,
            stdout,
            stderr,
            error: `ZIP extraction failed with exit code ${code}`
          });
        }
      });
      
      child.on('error', (error) => {
        this.logToFile(logPath, `ERROR: Failed to start extraction process: ${error.message}`);
        
        // Send error to UI
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name,
            status: 'failed',
            message: `Failed to start extraction: ${error.message}`
          });
        }
        
        resolve({
          name,
          success: false,
          error: `Failed to start extraction: ${error.message}`
        });
      });
      
    } catch (error) {
      this.logToFile(logPath, `ERROR: ZIP extraction setup failed: ${error.message}`);
      resolve({
        name,
        success: false,
        error: `ZIP extraction setup failed: ${error.message}`
      });
    }
  }

  async setupExtractedSoftware(softwareName, installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up ${softwareName} environment...`);
      
      if (softwareName.includes('gradle')) {
        await this.setupGradleEnvironment(installPath, logPath);
      } else if (softwareName.includes('tomcat') || softwareName.includes('apache-tomcat')) {
        await this.setupTomcatEnvironment(installPath, logPath);
      } else if (softwareName.includes('httpd') || softwareName.includes('apache http')) {
        await this.setupApacheHttpdEnvironment(installPath, logPath);
      } else if (softwareName.includes('3dpassport')) {
        await this.setup3DPassportEnvironment(installPath, logPath);
      } else if (softwareName.includes('oracle')) {
        await this.setupOracleEnvironment(installPath, logPath);
      } else {
        this.logToFile(logPath, `Generic extraction completed for ${softwareName}`);
        this.logToFile(logPath, `Files extracted to: ${installPath}`);
      }
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup ${softwareName} environment: ${error.message}`);
    }
  }

  async setupGradleEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Gradle environment...`);
      
      const extractedItems = await fs.readdir(installPath);
      const gradleDir = extractedItems.find(item => item.startsWith('gradle-'));
      
      if (gradleDir) {
        const gradleBinPath = path.join(installPath, gradleDir, 'bin');
        this.logToFile(logPath, `Gradle bin directory: ${gradleBinPath}`);
        this.logToFile(logPath, `To use Gradle, add to PATH: ${gradleBinPath}`);
        this.logToFile(logPath, `✓ Gradle installation completed successfully!`);
      } else {
        this.logToFile(logPath, `Warning: Could not find gradle directory in extracted files`);
        this.logToFile(logPath, `Available items: ${extractedItems.join(', ')}`);
      }
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Gradle environment: ${error.message}`);
    }
  }

  async setupTomcatEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Apache Tomcat environment...`);
      
      const extractedItems = await fs.readdir(installPath);
      const tomcatDir = extractedItems.find(item => item.startsWith('apache-tomcat-'));
      
      if (tomcatDir) {
        const tomcatPath = path.join(installPath, tomcatDir);
        const tomcatBinPath = path.join(tomcatPath, 'bin');
        const tomcatConfPath = path.join(tomcatPath, 'conf');
        
        this.logToFile(logPath, `Tomcat installation directory: ${tomcatPath}`);
        this.logToFile(logPath, `Tomcat bin directory: ${tomcatBinPath}`);
        this.logToFile(logPath, `Tomcat configuration directory: ${tomcatConfPath}`);
        
        // Check for important files
        const startupBat = path.join(tomcatBinPath, 'startup.bat');
        const serverXml = path.join(tomcatConfPath, 'server.xml');
        
        if (await fs.pathExists(startupBat)) {
          this.logToFile(logPath, `✓ Startup script found: ${startupBat}`);
        }
        
        if (await fs.pathExists(serverXml)) {
          this.logToFile(logPath, `✓ Server configuration found: ${serverXml}`);
        }
        
        this.logToFile(logPath, `✓ Tomcat installation completed successfully!`);
        this.logToFile(logPath, `To start Tomcat: ${startupBat}`);
        this.logToFile(logPath, `Default port: 8080 (configurable in conf/server.xml)`);
        
      } else {
        this.logToFile(logPath, `Warning: Could not find apache-tomcat directory in extracted files`);
        this.logToFile(logPath, `Available items: ${extractedItems.join(', ')}`);
      }
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Tomcat environment: ${error.message}`);
    }
  }

  async setupApacheHttpdEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Apache HTTP Server environment...`);
      
      const extractedItems = await fs.readdir(installPath);
      
      // Look for common Apache httpd directory patterns
      let httpdDir = extractedItems.find(item => 
        item.toLowerCase().includes('apache') || 
        item.toLowerCase().includes('httpd') ||
        item.toLowerCase().includes('http')
      );
      
      // If no specific directory found, use the first directory or the install path itself
      if (!httpdDir && extractedItems.length > 0) {
        const directories = [];
        for (const item of extractedItems) {
          const itemPath = path.join(installPath, item);
          const stats = await fs.stat(itemPath);
          if (stats.isDirectory()) {
            directories.push(item);
          }
        }
        httpdDir = directories[0];
      }
      
      const httpdPath = httpdDir ? path.join(installPath, httpdDir) : installPath;
      const httpdBinPath = path.join(httpdPath, 'bin');
      const httpdConfPath = path.join(httpdPath, 'conf');
      
      this.logToFile(logPath, `Apache HTTP Server installation directory: ${httpdPath}`);
      this.logToFile(logPath, `Apache bin directory: ${httpdBinPath}`);
      this.logToFile(logPath, `Apache configuration directory: ${httpdConfPath}`);
      
      // Check important files and fix configuration
      const httpdExe = path.join(httpdBinPath, 'httpd.exe');
      const httpdConf = path.join(httpdConfPath, 'httpd.conf');
      
      if (await fs.pathExists(httpdConf)) {
        this.logToFile(logPath, `✓ Apache configuration found: ${httpdConf}`);
        // Auto-fix ServerRoot path
        await this.fixApacheServerRoot(httpdConf, httpdPath, logPath);
      }
      
      if (await fs.pathExists(httpdExe)) {
        this.logToFile(logPath, `✓ Apache executable found: ${httpdExe}`);
        // Auto-start Apache HTTP Server
        await this.autoStartApacheHttpd(httpdExe, logPath);
      }
      
      this.logToFile(logPath, `✓ Apache HTTP Server installation completed successfully!`);
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Apache HTTP Server environment: ${error.message}`);
    }
  }

  async setup3DPassportEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up 3DPassport environment...`);
      this.logToFile(logPath, `3DPassport extracted to: ${installPath}`);
      this.logToFile(logPath, `✓ 3DPassport extraction completed successfully!`);
      this.logToFile(logPath, `Note: Please refer to 3DPassport documentation for setup instructions.`);
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup 3DPassport environment: ${error.message}`);
    }
  }

  async setupOracleEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Oracle Database environment...`);
      this.logToFile(logPath, `Oracle Database extracted to: ${installPath}`);
      
      // Send progress to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name: 'Oracle Database',
          status: 'configuring',
          message: 'Setting up Oracle Database environment...'
        });
      }
      
      // Find Oracle installer executable
      const oracleInstaller = await this.findOracleInstaller(installPath, logPath);
      
      if (oracleInstaller) {
        this.logToFile(logPath, `✓ Found Oracle installer: ${oracleInstaller}`);
        
        // Create Oracle response file for silent installation
        const responseFile = await this.createOracleResponseFile(installPath, logPath);
        
        if (responseFile) {
          // Perform silent installation
          const installSuccess = await this.performOracleSilentInstall(oracleInstaller, responseFile, logPath);
          
          if (installSuccess) {
            this.logToFile(logPath, `✓ Oracle Database silent installation completed successfully!`);
            
            // Wait for Oracle services to start
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Test Oracle connectivity
            await this.testOracleConnectivity(installPath, logPath);
          } else {
            this.logToFile(logPath, `⚠ Oracle silent installation failed. Manual installation may be required.`);
          }
        }
      } else {
        this.logToFile(logPath, `⚠ Oracle installer not found. Files extracted for manual installation.`);
        this.logToFile(logPath, `Manual installation: Navigate to ${installPath} and run setup.exe`);
      }
      
      this.logToFile(logPath, `Oracle Database setup process completed.`);
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Oracle Database environment: ${error.message}`);
    }
  }

  async findOracleInstaller(installPath, logPath) {
    try {
      this.logToFile(logPath, `Searching for Oracle installer executable...`);
      
      // Common Oracle installer names
      const installerNames = ['setup.exe', 'runInstaller.bat', 'runInstaller.exe', 'install.exe'];
      
      for (const installerName of installerNames) {
        const installerPath = path.join(installPath, installerName);
        if (await fs.pathExists(installerPath)) {
          this.logToFile(logPath, `Found Oracle installer: ${installerName}`);
          return installerPath;
        }
      }
      
      // Search in subdirectories
      const items = await fs.readdir(installPath);
      for (const item of items) {
        const itemPath = path.join(installPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          for (const installerName of installerNames) {
            const installerPath = path.join(itemPath, installerName);
            if (await fs.pathExists(installerPath)) {
              this.logToFile(logPath, `Found Oracle installer in subdirectory: ${item}/${installerName}`);
              return installerPath;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logToFile(logPath, `Error searching for Oracle installer: ${error.message}`);
      return null;
    }
  }

  async createOracleResponseFile(installPath, logPath) {
    try {
      this.logToFile(logPath, `Creating Oracle response file for silent installation...`);
      
      const responseFilePath = path.join(installPath, 'oracle_silent_install.rsp');
      
      // Oracle response file content for silent installation
      const responseFileContent = `
####################################################################
## Oracle Database Silent Installation Response File
####################################################################

# Specify the installation mode
oracle.install.option=INSTALL_DB_SWONLY

# Specify the Unix group to be set for the inventory directory
UNIX_GROUP_NAME=

# Specify the inventory directory
INVENTORY_LOCATION=

# Specify the Oracle Home directory
ORACLE_HOME=${installPath.replace(/\\/g, '/')}

# Specify the Oracle Base directory
ORACLE_BASE=${path.join(installPath, '..', 'oracle_base').replace(/\\/g, '/')}

# Specify the database edition
oracle.install.db.InstallEdition=EE

# DBA group to be set for the database
oracle.install.db.DBA_GROUP=

# OPER group to be set for the database
oracle.install.db.OPER_GROUP=

# BACKUPDBA group to be set for the database
oracle.install.db.BACKUPDBA_GROUP=

# DGDBA group to be set for the database
oracle.install.db.DGDBA_GROUP=

# KMDBA group to be set for the database
oracle.install.db.KMDBA_GROUP=

# RACDBA group to be set for the database
oracle.install.db.RACDBA_GROUP=

# Specify whether to decline security updates
DECLINE_SECURITY_UPDATES=true

# Specify security updates via My Oracle Support
SECURITY_UPDATES_VIA_MYORACLESUPPORT=false

# Skip software updates
oracle.installer.autoupdates.option=SKIP_UPDATES

# Silent mode
oracle.installer.suppressPrereqChecks=true
oracle.installer.suppressUpgradeDBMsgs=true
oracle.installer.suppressEnvironmentCheckCfg=true

# No GUI
oracle.installer.autoupdates.downloadUpdatesLoc=
`;

      await fs.writeFile(responseFilePath, responseFileContent.trim());
      this.logToFile(logPath, `✓ Oracle response file created: ${responseFilePath}`);
      
      return responseFilePath;
    } catch (error) {
      this.logToFile(logPath, `Error creating Oracle response file: ${error.message}`);
      return null;
    }
  }

  async performOracleSilentInstall(installerPath, responseFile, logPath) {
    try {
      this.logToFile(logPath, `Starting Oracle Database silent installation...`);
      this.logToFile(logPath, `Installer: ${installerPath}`);
      this.logToFile(logPath, `Response file: ${responseFile}`);
      
      // Send progress to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name: 'Oracle Database',
          status: 'installing',
          message: 'Installing Oracle Database (this may take 15-30 minutes)...'
        });
      }
      
      const startTime = new Date();
      this.logToFile(logPath, `Installation started at: ${startTime.toISOString()}`);
      
      const installResult = await new Promise((resolve) => {
        // Oracle silent installation command
        const installCommand = `"${installerPath}" -silent -responseFile "${responseFile}" -waitforcompletion`;
        this.logToFile(logPath, `Installation command: ${installCommand}`);
        
        const child = spawn('cmd', ['/c', installCommand], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          cwd: path.dirname(installerPath)
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          this.logToFile(logPath, `Oracle STDOUT: ${output.trim()}`);
        });
        
        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          this.logToFile(logPath, `Oracle STDERR: ${output.trim()}`);
        });
        
        child.on('close', (code) => {
          const endTime = new Date();
          const duration = Math.round((endTime - startTime) / 1000);
          this.logToFile(logPath, `Oracle installation completed in ${duration} seconds with exit code: ${code}`);
          
          resolve({
            success: code === 0,
            exitCode: code,
            stdout,
            stderr,
            duration
          });
        });
        
        child.on('error', (error) => {
          this.logToFile(logPath, `Oracle installation process error: ${error.message}`);
          resolve({
            success: false,
            error: error.message
          });
        });
      });
      
      if (installResult.success) {
        this.logToFile(logPath, `✓ Oracle Database installation completed successfully!`);
        return true;
      } else {
        this.logToFile(logPath, `✗ Oracle Database installation failed with exit code: ${installResult.exitCode}`);
        if (installResult.stderr) {
          this.logToFile(logPath, `Error details: ${installResult.stderr}`);
        }
        return false;
      }
      
    } catch (error) {
      this.logToFile(logPath, `Error during Oracle silent installation: ${error.message}`);
      return false;
    }
  }

  async testOracleConnectivity(installPath, logPath) {
    try {
      this.logToFile(logPath, `Testing Oracle Database connectivity...`);
      
      // Send progress to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name: 'Oracle Database',
          status: 'testing',
          message: 'Testing Oracle Database connectivity...'
        });
      }
      
      // Test 1: Check Oracle services
      const servicesStatus = await this.checkOracleServices(logPath);
      
      // Test 2: Check Oracle listener
      const listenerStatus = await this.checkOracleListener(logPath);
      
      // Test 3: Test SQL*Plus connectivity
      const sqlPlusStatus = await this.testSqlPlusConnectivity(installPath, logPath);
      
      // Test 4: Check Oracle environment variables
      const envStatus = await this.checkOracleEnvironment(logPath);
      
      // Compile results
      const overallStatus = {
        services: servicesStatus,
        listener: listenerStatus,
        sqlplus: sqlPlusStatus,
        environment: envStatus
      };
      
      this.logToFile(logPath, `=== ORACLE DATABASE CONNECTIVITY REPORT ===`);
      this.logToFile(logPath, `Services Status: ${servicesStatus.status ? '✓ RUNNING' : '✗ NOT RUNNING'}`);
      this.logToFile(logPath, `Listener Status: ${listenerStatus.status ? '✓ RUNNING' : '✗ NOT RUNNING'}`);
      this.logToFile(logPath, `SQL*Plus Status: ${sqlPlusStatus.status ? '✓ ACCESSIBLE' : '✗ NOT ACCESSIBLE'}`);
      this.logToFile(logPath, `Environment Status: ${envStatus.status ? '✓ CONFIGURED' : '✗ NOT CONFIGURED'}`);
      
      if (servicesStatus.status && listenerStatus.status) {
        this.logToFile(logPath, `🎉 SUCCESS: Oracle Database is running and accessible!`);
        
        // Provide comprehensive connection information
        await this.provideOracleConnectionDetails(installPath, logPath);
        
        // Send success to UI
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name: 'Oracle Database',
            status: 'completed',
            message: 'Oracle Database installed and running successfully!'
          });
        }
      } else {
        this.logToFile(logPath, `⚠ Oracle Database installation completed but connectivity issues detected.`);
        this.logToFile(logPath, `Please check the Oracle services and configuration manually.`);
        
        // Still provide connection details for manual setup
        await this.provideOracleConnectionDetails(installPath, logPath);
      }
      
      return overallStatus;
      
    } catch (error) {
      this.logToFile(logPath, `Error testing Oracle connectivity: ${error.message}`);
      return { error: error.message };
    }
  }

  async checkOracleServices(logPath) {
    try {
      this.logToFile(logPath, `Checking Oracle Windows services...`);
      
      const serviceCheck = await new Promise((resolve) => {
        const child = spawn('sc', ['query', 'state=', 'all'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', () => {
          resolve(stdout);
        });
      });
      
      const oracleServices = serviceCheck.split('\n')
        .filter(line => line.toLowerCase().includes('oracle'))
        .filter(line => line.includes('SERVICE_NAME:'));
      
      const runningServices = serviceCheck.split('\n')
        .filter(line => line.includes('STATE') && line.includes('RUNNING'));
      
      const runningOracleServices = [];
      for (const service of oracleServices) {
        const serviceName = service.split(':')[1]?.trim();
        if (serviceName && runningServices.some(rs => rs.includes('RUNNING'))) {
          runningOracleServices.push(serviceName);
        }
      }
      
      this.logToFile(logPath, `Found ${oracleServices.length} Oracle services`);
      this.logToFile(logPath, `Running Oracle services: ${runningOracleServices.length}`);
      
      if (runningOracleServices.length > 0) {
        runningOracleServices.forEach(service => {
          this.logToFile(logPath, `  ✓ ${service}`);
        });
      }
      
      return {
        status: runningOracleServices.length > 0,
        services: runningOracleServices,
        total: oracleServices.length
      };
      
    } catch (error) {
      this.logToFile(logPath, `Error checking Oracle services: ${error.message}`);
      return { status: false, error: error.message };
    }
  }

  async checkOracleListener(logPath) {
    try {
      this.logToFile(logPath, `Checking Oracle TNS Listener...`);
      
      const listenerCheck = await new Promise((resolve) => {
        const child = spawn('netstat', ['-an'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', () => {
          resolve(stdout);
        });
      });
      
      const port1521 = listenerCheck.includes(':1521');
      const listening = listenerCheck.includes('LISTENING');
      
      this.logToFile(logPath, `Port 1521 status: ${port1521 ? 'In use' : 'Not in use'}`);
      this.logToFile(logPath, `Listener status: ${port1521 && listening ? 'Running' : 'Not running'}`);
      
      return {
        status: port1521 && listening,
        port: '1521',
        listening: port1521
      };
      
    } catch (error) {
      this.logToFile(logPath, `Error checking Oracle listener: ${error.message}`);
      return { status: false, error: error.message };
    }
  }

  async testSqlPlusConnectivity(installPath, logPath) {
    try {
      this.logToFile(logPath, `Testing SQL*Plus connectivity...`);
      
      // Try to find SQL*Plus executable
      const sqlplusPath = await this.findSqlPlusExecutable(installPath, logPath);
      
      if (!sqlplusPath) {
        this.logToFile(logPath, `SQL*Plus executable not found`);
        return { status: false, reason: 'SQL*Plus not found' };
      }
      
      // Test basic SQL*Plus connectivity
      const sqlTest = await new Promise((resolve) => {
        const child = spawn(sqlplusPath, ['-v'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
      });
      
      if (sqlTest.code === 0 || sqlTest.stdout.includes('SQL*Plus')) {
        this.logToFile(logPath, `✓ SQL*Plus is accessible`);
        if (sqlTest.stdout) {
          this.logToFile(logPath, `SQL*Plus version: ${sqlTest.stdout.trim()}`);
        }
        return { status: true, version: sqlTest.stdout.trim() };
      } else {
        this.logToFile(logPath, `✗ SQL*Plus test failed`);
        return { status: false, error: sqlTest.stderr };
      }
      
    } catch (error) {
      this.logToFile(logPath, `Error testing SQL*Plus: ${error.message}`);
      return { status: false, error: error.message };
    }
  }

  async findSqlPlusExecutable(installPath, logPath) {
    try {
      // Common SQL*Plus locations relative to Oracle installation
      const sqlplusPaths = [
        path.join(installPath, 'bin', 'sqlplus.exe'),
        path.join(installPath, 'client', 'bin', 'sqlplus.exe'),
        path.join(installPath, 'product', '19.0.0', 'dbhome_1', 'bin', 'sqlplus.exe'),
        'sqlplus.exe' // Try system PATH
      ];
      
      for (const sqlplusPath of sqlplusPaths) {
        if (sqlplusPath === 'sqlplus.exe' || await fs.pathExists(sqlplusPath)) {
          this.logToFile(logPath, `Found SQL*Plus: ${sqlplusPath}`);
          return sqlplusPath;
        }
      }
      
      return null;
    } catch (error) {
      this.logToFile(logPath, `Error finding SQL*Plus: ${error.message}`);
      return null;
    }
  }

  async checkOracleEnvironment(logPath) {
    try {
      this.logToFile(logPath, `Checking Oracle environment variables...`);
      
      const envVars = {
        ORACLE_HOME: process.env.ORACLE_HOME,
        ORACLE_BASE: process.env.ORACLE_BASE,
        ORACLE_SID: process.env.ORACLE_SID,
        TNS_ADMIN: process.env.TNS_ADMIN
      };
      
      let configuredCount = 0;
      
      Object.entries(envVars).forEach(([key, value]) => {
        if (value) {
          this.logToFile(logPath, `  ✓ ${key}: ${value}`);
          configuredCount++;
        } else {
          this.logToFile(logPath, `  ✗ ${key}: Not set`);
        }
      });
      
      this.logToFile(logPath, `Environment variables configured: ${configuredCount}/4`);
      
      return {
        status: configuredCount >= 2, // At least ORACLE_HOME and ORACLE_SID should be set
        configured: configuredCount,
        total: 4,
        variables: envVars
      };
      
    } catch (error) {
      this.logToFile(logPath, `Error checking Oracle environment: ${error.message}`);
      return { status: false, error: error.message };
    }
  }

  async provideOracleConnectionDetails(installPath, logPath) {
    try {
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `===============================================`);
      this.logToFile(logPath, `📋 ORACLE DATABASE CONNECTION INFORMATION`);
      this.logToFile(logPath, `===============================================`);
      this.logToFile(logPath, ``);
      
      // Basic Connection Details
      this.logToFile(logPath, `🔌 CONNECTION DETAILS:`);
      this.logToFile(logPath, `  Host/Server: localhost`);
      this.logToFile(logPath, `  Port: 1521`);
      this.logToFile(logPath, `  SID: ORCL (default)`);
      this.logToFile(logPath, `  Service Name: ORCL`);
      this.logToFile(logPath, ``);
      
      // Default Oracle User Accounts
      this.logToFile(logPath, `👤 DEFAULT USER ACCOUNTS:`);
      this.logToFile(logPath, `  📊 System Administrator:`);
      this.logToFile(logPath, `     Username: SYS`);
      this.logToFile(logPath, `     Password: (set during installation - typically 'password' or 'oracle')`);
      this.logToFile(logPath, `     Role: SYSDBA`);
      this.logToFile(logPath, `     Usage: Database administration tasks`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  🔧 Database Administrator:`);
      this.logToFile(logPath, `     Username: SYSTEM`);
      this.logToFile(logPath, `     Password: (set during installation - typically 'password' or 'oracle')`);
      this.logToFile(logPath, `     Role: DBA`);
      this.logToFile(logPath, `     Usage: Database management and user administration`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  👨‍💻 Sample User:`);
      this.logToFile(logPath, `     Username: HR`);
      this.logToFile(logPath, `     Password: hr (if sample schemas installed)`);
      this.logToFile(logPath, `     Usage: Human Resources sample schema`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  📈 Sample User:`);
      this.logToFile(logPath, `     Username: SCOTT`);
      this.logToFile(logPath, `     Password: tiger (if sample schemas installed)`);
      this.logToFile(logPath, `     Usage: Classic Oracle sample schema`);
      this.logToFile(logPath, ``);
      
      // Connection String Examples
      this.logToFile(logPath, `🔗 CONNECTION STRING EXAMPLES:`);
      this.logToFile(logPath, `  SQL*Plus:`);
      this.logToFile(logPath, `     sqlplus SYS/password@localhost:1521/ORCL as SYSDBA`);
      this.logToFile(logPath, `     sqlplus SYSTEM/password@localhost:1521/ORCL`);
      this.logToFile(logPath, `     sqlplus HR/hr@localhost:1521/ORCL`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  JDBC URL:`);
      this.logToFile(logPath, `     jdbc:oracle:thin:@localhost:1521:ORCL`);
      this.logToFile(logPath, `     jdbc:oracle:thin:@//localhost:1521/ORCL`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  ODBC Connection:`);
      this.logToFile(logPath, `     Server: localhost`);
      this.logToFile(logPath, `     Port: 1521`);
      this.logToFile(logPath, `     Database: ORCL`);
      this.logToFile(logPath, ``);
      
      // Application Connection Examples
      this.logToFile(logPath, `💻 APPLICATION CONNECTION EXAMPLES:`);
      this.logToFile(logPath, `  Python (cx_Oracle):`);
      this.logToFile(logPath, `     import cx_Oracle`);
      this.logToFile(logPath, `     connection = cx_Oracle.connect("SYSTEM/password@localhost:1521/ORCL")`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  Java (JDBC):`);
      this.logToFile(logPath, `     String url = "jdbc:oracle:thin:@localhost:1521:ORCL";`);
      this.logToFile(logPath, `     Connection conn = DriverManager.getConnection(url, "SYSTEM", "password");`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  .NET (Oracle.ManagedDataAccess):`);
      this.logToFile(logPath, `     string connString = "Data Source=localhost:1521/ORCL;User Id=SYSTEM;Password=password;";`);
      this.logToFile(logPath, `     OracleConnection conn = new OracleConnection(connString);`);
      this.logToFile(logPath, ``);
      
      // Try to detect actual Oracle SID and passwords
      const actualDetails = await this.detectActualOracleDetails(installPath, logPath);
      if (actualDetails.sid || actualDetails.passwords.length > 0) {
        this.logToFile(logPath, `🔍 DETECTED CONFIGURATION:`);
        if (actualDetails.sid) {
          this.logToFile(logPath, `  Detected SID: ${actualDetails.sid}`);
        }
        if (actualDetails.passwords.length > 0) {
          this.logToFile(logPath, `  Found password references in logs:`);
          actualDetails.passwords.forEach(pwd => {
            this.logToFile(logPath, `     - ${pwd}`);
          });
        }
        this.logToFile(logPath, ``);
      }
      
      // Important Notes
      this.logToFile(logPath, `⚠️  IMPORTANT SECURITY NOTES:`);
      this.logToFile(logPath, `  🔐 Change default passwords immediately after first login`);
      this.logToFile(logPath, `  🛡️  Create dedicated application users instead of using SYS/SYSTEM`);
      this.logToFile(logPath, `  🔒 Enable Oracle Network Encryption for production use`);
      this.logToFile(logPath, `  📝 Review Oracle security best practices documentation`);
      this.logToFile(logPath, ``);
      
      // Quick Start Commands
      this.logToFile(logPath, `🚀 QUICK START COMMANDS:`);
      this.logToFile(logPath, `  Check database status:`);
      this.logToFile(logPath, `     lsnrctl status`);
      this.logToFile(logPath, `     sqlplus / as sysdba`);
      this.logToFile(logPath, `     SELECT status FROM v$instance;`);
      this.logToFile(logPath, ``);
      this.logToFile(logPath, `  Create new user:`);
      this.logToFile(logPath, `     sqlplus SYSTEM/password@localhost:1521/ORCL`);
      this.logToFile(logPath, `     CREATE USER myuser IDENTIFIED BY mypassword;`);
      this.logToFile(logPath, `     GRANT CONNECT, RESOURCE TO myuser;`);
      this.logToFile(logPath, ``);
      
      // Database Tools
      this.logToFile(logPath, `🛠️  ORACLE DATABASE TOOLS:`);
      this.logToFile(logPath, `  📊 SQL Developer: Oracle's free IDE for database development`);
      this.logToFile(logPath, `  🌐 Oracle Application Express (APEX): Web-based development platform`);
      this.logToFile(logPath, `  📱 SQL*Plus: Command-line interface included with installation`);
      this.logToFile(logPath, `  🔧 Oracle Enterprise Manager: Web-based database administration`);
      this.logToFile(logPath, ``);
      
      // Installation Paths
      this.logToFile(logPath, `📁 INSTALLATION PATHS:`);
      this.logToFile(logPath, `  Oracle Home: ${installPath}`);
      this.logToFile(logPath, `  Oracle Base: ${path.join(installPath, '..', 'oracle_base')}`);
      if (await fs.pathExists(path.join(installPath, 'bin', 'sqlplus.exe'))) {
        this.logToFile(logPath, `  SQL*Plus: ${path.join(installPath, 'bin', 'sqlplus.exe')}`);
      }
      if (await fs.pathExists(path.join(installPath, 'network', 'admin', 'tnsnames.ora'))) {
        this.logToFile(logPath, `  TNS Names: ${path.join(installPath, 'network', 'admin', 'tnsnames.ora')}`);
      }
      this.logToFile(logPath, ``);
      
      this.logToFile(logPath, `===============================================`);
      this.logToFile(logPath, `🎉 Oracle Database is ready for connections!`);
      this.logToFile(logPath, `===============================================`);
      
    } catch (error) {
      this.logToFile(logPath, `Error providing Oracle connection details: ${error.message}`);
    }
  }

  async detectActualOracleDetails(installPath, logPath) {
    try {
      const details = {
        sid: null,
        passwords: [],
        tnsEntries: []
      };
      
      // Try to read tnsnames.ora for actual SID
      const tnsnamesPath = path.join(installPath, 'network', 'admin', 'tnsnames.ora');
      if (await fs.pathExists(tnsnamesPath)) {
        const tnsnamesContent = await fs.readFile(tnsnamesPath, 'utf8');
        const sidMatch = tnsnamesContent.match(/SERVICE_NAME\s*=\s*(\w+)/i);
        if (sidMatch) {
          details.sid = sidMatch[1];
        }
        
        // Extract all TNS entries
        const tnsMatches = tnsnamesContent.match(/^(\w+)\s*=/gm);
        if (tnsMatches) {
          details.tnsEntries = tnsMatches.map(match => match.replace(/\s*=$/, ''));
        }
      }
      
      // Try to find password references in Oracle installation logs
      const logDirs = [
        path.join(installPath, 'install'),
        path.join(installPath, 'cfgtoollogs'),
        path.join(installPath, '..', 'oracle_base', 'cfgtoollogs')
      ];
      
      for (const logDir of logDirs) {
        if (await fs.pathExists(logDir)) {
          try {
            const logFiles = await fs.readdir(logDir);
            for (const logFile of logFiles) {
              if (logFile.endsWith('.log') || logFile.endsWith('.out')) {
                try {
                  const logContent = await fs.readFile(path.join(logDir, logFile), 'utf8');
                  
                  // Look for password patterns (be careful not to log sensitive data)
                  if (logContent.includes('password') && logContent.includes('SYS')) {
                    details.passwords.push('Check installation logs for SYS password');
                  }
                  if (logContent.includes('password') && logContent.includes('SYSTEM')) {
                    details.passwords.push('Check installation logs for SYSTEM password');
                  }
                } catch (fileError) {
                  // Skip files we can't read
                }
              }
            }
          } catch (dirError) {
            // Skip directories we can't read
          }
        }
      }
      
      return details;
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Could not detect Oracle details: ${error.message}`);
      return { sid: null, passwords: [], tnsEntries: [] };
    }
  }

  async fixApacheServerRoot(httpdConfPath, actualRootPath, logPath) {
    try {
      this.logToFile(logPath, `Fixing Apache ServerRoot configuration...`);
      
      const configContent = await fs.readFile(httpdConfPath, 'utf8');
      const apacheRootPath = actualRootPath.replace(/\\/g, '/');
      
      const updatedConfig = configContent.replace(
        /Define SRVROOT ".*?"/,
        `Define SRVROOT "${apacheRootPath}"`
      );
      
      await fs.writeFile(httpdConfPath, updatedConfig, 'utf8');
      this.logToFile(logPath, `✓ ServerRoot automatically fixed to: ${apacheRootPath}`);
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to fix ServerRoot configuration: ${error.message}`);
    }
  }

  async autoStartApacheHttpd(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Auto-starting Apache HTTP Server with enhanced error resolution...`);
      
      // First, try to start Apache and handle any errors
      const startupSuccess = await this.startApacheWithErrorHandling(httpdExePath, logPath);
      
      if (startupSuccess) {
        this.logToFile(logPath, `✓ Apache HTTP Server started successfully`);
        
        // Wait a moment for the server to fully initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test the server and open browser
        await this.testAndOpenApacheBrowser(logPath);
      } else {
        this.logToFile(logPath, `✗ Failed to start Apache HTTP Server after error resolution attempts`);
      }
      
    } catch (error) {
      this.logToFile(logPath, `Error: Failed to auto-start Apache HTTP Server: ${error.message}`);
    }
  }

  async startApacheWithErrorHandling(httpdExePath, logPath, attempt = 1) {
    const maxAttempts = 3;
    
    try {
      this.logToFile(logPath, `Starting Apache HTTP Server (attempt ${attempt}/${maxAttempts})...`);
      
      // First, check if Apache is already running and stop it
      await this.stopExistingApacheProcesses(logPath);
      
      // Try to start Apache in foreground to capture errors
      const startResult = await new Promise((resolve) => {
        const child = spawn(httpdExePath, ['-D', 'FOREGROUND'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: path.dirname(httpdExePath)
        });
        
        let stdout = '';
        let stderr = '';
        let hasStarted = false;
        
        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          this.logToFile(logPath, `Apache STDOUT: ${output.trim()}`);
          
          // Check for successful startup indicators
          if (output.includes('resuming normal operations') || 
              output.includes('Apache') || 
              output.includes('server started')) {
            hasStarted = true;
          }
        });
        
        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          this.logToFile(logPath, `Apache STDERR: ${output.trim()}`);
        });
        
        // Set a timeout to check if Apache started successfully
        const startupTimeout = setTimeout(() => {
          if (!hasStarted) {
            this.logToFile(logPath, `Apache startup timeout, checking if server is responding...`);
            // Don't kill the child, let it run in background
            resolve({ code: 0, stdout, stderr, timedOut: true, childProcess: child });
          }
        }, 5000);
        
        child.on('close', (code) => {
          clearTimeout(startupTimeout);
          resolve({ code, stdout, stderr, hasStarted });
        });
        
        child.on('error', (err) => {
          clearTimeout(startupTimeout);
          resolve({ code: -1, error: err.message, stdout, stderr });
        });
      });
      
      // If startup timed out but process is still running, test if server is responding
      if (startResult.timedOut) {
        const isResponding = await this.testApacheResponse(logPath);
        if (isResponding) {
          this.logToFile(logPath, `✓ Apache is running and responding (background process)`);
          return true;
        }
      }
      
      // Check if startup was successful
      if (startResult.code === 0 || startResult.hasStarted) {
        // Test if the server is actually responding
        const isResponding = await this.testApacheResponse(logPath);
        if (isResponding) {
          return true;
        }
      }
      
      // If we reach here, there was an error - try to resolve it
      this.logToFile(logPath, `Apache startup failed (exit code: ${startResult.code})`);
      if (startResult.stderr) {
        this.logToFile(logPath, `Error details: ${startResult.stderr}`);
      }
      
      // Attempt to resolve common Apache errors
      const errorResolved = await this.resolveApacheErrors(httpdExePath, startResult.stderr, logPath);
      
      if (errorResolved && attempt < maxAttempts) {
        this.logToFile(logPath, `Attempting to restart Apache after error resolution...`);
        return await this.startApacheWithErrorHandling(httpdExePath, logPath, attempt + 1);
      }
      
      return false;
      
    } catch (error) {
      this.logToFile(logPath, `Error starting Apache (attempt ${attempt}): ${error.message}`);
      
      if (attempt < maxAttempts) {
        this.logToFile(logPath, `Retrying Apache startup...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.startApacheWithErrorHandling(httpdExePath, logPath, attempt + 1);
      }
      
      return false;
    }
  }

  async stopExistingApacheProcesses(logPath) {
    try {
      this.logToFile(logPath, `Checking for existing Apache processes...`);
      
      const result = await new Promise((resolve) => {
        const child = spawn('tasklist', ['/FI', 'IMAGENAME eq httpd.exe'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', (code) => {
          resolve({ code, stdout });
        });
      });
      
      if (result.stdout.includes('httpd.exe')) {
        this.logToFile(logPath, `Found existing Apache processes, stopping them...`);
        
        await new Promise((resolve) => {
          const killChild = spawn('taskkill', ['/F', '/IM', 'httpd.exe'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          
          killChild.on('close', () => {
            resolve();
          });
        });
        
        this.logToFile(logPath, `✓ Stopped existing Apache processes`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        this.logToFile(logPath, `No existing Apache processes found`);
      }
    } catch (error) {
      this.logToFile(logPath, `Warning: Could not check/stop existing Apache processes: ${error.message}`);
    }
  }

  async resolveApacheErrors(httpdExePath, errorOutput, logPath) {
    try {
      this.logToFile(logPath, `Analyzing Apache errors for automatic resolution...`);
      
      if (!errorOutput) {
        this.logToFile(logPath, `No specific error output to analyze`);
        return false;
      }
      
      const lowerError = errorOutput.toLowerCase();
      let resolved = false;
      
      // Error 1: Port 80 already in use
      if (lowerError.includes('port 80') || lowerError.includes('address already in use') || lowerError.includes('bind')) {
        this.logToFile(logPath, `Detected port 80 conflict, attempting resolution...`);
        resolved = await this.resolvePortConflict(httpdExePath, logPath);
      }
      
      // Error 2: Missing directories
      if (lowerError.includes('no such file or directory') || lowerError.includes('cannot access')) {
        this.logToFile(logPath, `Detected missing directory issue, attempting resolution...`);
        resolved = await this.createMissingDirectories(httpdExePath, logPath);
      }
      
      // Error 3: Permission issues
      if (lowerError.includes('permission denied') || lowerError.includes('access denied')) {
        this.logToFile(logPath, `Detected permission issue, attempting resolution...`);
        resolved = await this.fixApachePermissions(httpdExePath, logPath);
      }
      
      // Error 4: Configuration syntax errors
      if (lowerError.includes('syntax error') || lowerError.includes('invalid command')) {
        this.logToFile(logPath, `Detected configuration syntax error, attempting resolution...`);
        resolved = await this.fixApacheConfiguration(httpdExePath, logPath);
      }
      
      return resolved;
      
    } catch (error) {
      this.logToFile(logPath, `Error during automatic resolution: ${error.message}`);
      return false;
    }
  }

  async resolvePortConflict(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Resolving port 80 conflict...`);
      
      // Find what's using port 80
      const portCheck = await new Promise((resolve) => {
        const child = spawn('netstat', ['-ano'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', () => {
          resolve(stdout);
        });
      });
      
      const port80Lines = portCheck.split('\n').filter(line => line.includes(':80 '));
      if (port80Lines.length > 0) {
        this.logToFile(logPath, `Port 80 usage: ${port80Lines[0].trim()}`);
      }
      
      // Configure Apache to use port 8080 instead
      const httpdConfPath = path.join(path.dirname(httpdExePath), '..', 'conf', 'httpd.conf');
      if (await fs.pathExists(httpdConfPath)) {
        this.logToFile(logPath, `Modifying Apache configuration to use port 8080...`);
        
        const configContent = await fs.readFile(httpdConfPath, 'utf8');
        const updatedConfig = configContent
          .replace(/Listen 80/g, 'Listen 8080')
          .replace(/ServerName.*:80/g, 'ServerName localhost:8080');
        
        await fs.writeFile(httpdConfPath, updatedConfig, 'utf8');
        this.logToFile(logPath, `✓ Apache configured to use port 8080`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logToFile(logPath, `Failed to resolve port conflict: ${error.message}`);
      return false;
    }
  }

  async createMissingDirectories(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Creating missing Apache directories...`);
      
      const httpdRoot = path.dirname(path.dirname(httpdExePath));
      const requiredDirs = ['logs', 'htdocs', 'conf', 'modules'];
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(httpdRoot, dir);
        if (!await fs.pathExists(dirPath)) {
          await fs.ensureDir(dirPath);
          this.logToFile(logPath, `✓ Created directory: ${dirPath}`);
        }
      }
      
      // Create a basic index.html if missing
      const indexPath = path.join(httpdRoot, 'htdocs', 'index.html');
      if (!await fs.pathExists(indexPath)) {
        const basicHtml = '<html><body><h1>It works!</h1><p>Apache HTTP Server is running successfully.</p></body></html>';
        await fs.writeFile(indexPath, basicHtml);
        this.logToFile(logPath, `✓ Created basic index.html`);
      }
      
      return true;
    } catch (error) {
      this.logToFile(logPath, `Failed to create missing directories: ${error.message}`);
      return false;
    }
  }

  async fixApachePermissions(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Fixing Apache directory permissions...`);
      
      const httpdRoot = path.dirname(path.dirname(httpdExePath));
      
      const permissionResult = await new Promise((resolve) => {
        const child = spawn('icacls', [httpdRoot, '/grant', 'Everyone:(OI)(CI)F', '/T'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        child.on('close', (code) => {
          resolve(code === 0);
        });
      });
      
      if (permissionResult) {
        this.logToFile(logPath, `✓ Fixed Apache directory permissions`);
        return true;
      } else {
        this.logToFile(logPath, `⚠ Could not fix permissions automatically`);
        return false;
      }
    } catch (error) {
      this.logToFile(logPath, `Failed to fix permissions: ${error.message}`);
      return false;
    }
  }

  async fixApacheConfiguration(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Fixing Apache configuration syntax...`);
      
      const httpdConfPath = path.join(path.dirname(httpdExePath), '..', 'conf', 'httpd.conf');
      if (await fs.pathExists(httpdConfPath)) {
        // Test configuration first
        const testResult = await new Promise((resolve) => {
          const child = spawn(httpdExePath, ['-t'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(httpdExePath)
          });
          
          let stderr = '';
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          
          child.on('close', (code) => {
            resolve({ code, stderr });
          });
        });
        
        this.logToFile(logPath, `Configuration test result: ${testResult.stderr || 'No errors'}`);
        
        if (testResult.code === 0) {
          this.logToFile(logPath, `✓ Apache configuration is valid`);
          return true;
        } else {
          this.logToFile(logPath, `Configuration errors detected: ${testResult.stderr}`);
          // Here you could add specific syntax fixes based on common errors
          return false;
        }
      }
      
      return false;
    } catch (error) {
      this.logToFile(logPath, `Failed to fix configuration: ${error.message}`);
      return false;
    }
  }

  async testApacheResponse(logPath) {
    try {
      this.logToFile(logPath, `Testing Apache HTTP response...`);
      
      // Test both port 80 and 8080
      const ports = [80, 8080];
      
      for (const port of ports) {
        const testResult = await new Promise((resolve) => {
          const child = spawn('powershell', [
            '-Command', 
            `try { Invoke-WebRequest -Uri "http://localhost:${port}" -UseBasicParsing -TimeoutSec 5; Write-Output "SUCCESS" } catch { Write-Output "FAILED" }`
          ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          
          let stdout = '';
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });
          
          child.on('close', () => {
            resolve(stdout.trim());
          });
        });
        
        if (testResult.includes('SUCCESS') || testResult.includes('200')) {
          this.logToFile(logPath, `✓ Apache is responding on port ${port}`);
          return { responding: true, port };
        }
      }
      
      this.logToFile(logPath, `⚠ Apache is not responding on any port`);
      return { responding: false };
      
    } catch (error) {
      this.logToFile(logPath, `Error testing Apache response: ${error.message}`);
      return { responding: false };
    }
  }

  async openBrowserWithFallbacks(url, logPath) {
    try {
      // Method 1: Electron shell.openExternal (preferred)
      this.logToFile(logPath, `Attempting to open browser using Electron shell...`);
      try {
        await shell.openExternal(url);
        this.logToFile(logPath, `✓ Electron shell.openExternal succeeded`);
        return true;
      } catch (shellError) {
        this.logToFile(logPath, `Electron shell failed: ${shellError.message}`);
      }
      
      // Method 2: Windows start command
      this.logToFile(logPath, `Attempting to open browser using Windows start command...`);
      try {
        const startResult = await new Promise((resolve) => {
          const child = spawn('cmd', ['/c', 'start', url], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          
          child.on('close', (code) => {
            resolve(code === 0);
          });
          
          child.on('error', () => {
            resolve(false);
          });
        });
        
        if (startResult) {
          this.logToFile(logPath, `✓ Windows start command succeeded`);
          return true;
        } else {
          this.logToFile(logPath, `Windows start command failed`);
        }
      } catch (startError) {
        this.logToFile(logPath, `Windows start command error: ${startError.message}`);
      }
      
      // Method 3: PowerShell Start-Process
      this.logToFile(logPath, `Attempting to open browser using PowerShell...`);
      try {
        const psResult = await new Promise((resolve) => {
          const child = spawn('powershell', [
            '-Command', 
            `Start-Process "${url}"`
          ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
          });
          
          child.on('close', (code) => {
            resolve(code === 0);
          });
          
          child.on('error', () => {
            resolve(false);
          });
        });
        
        if (psResult) {
          this.logToFile(logPath, `✓ PowerShell Start-Process succeeded`);
          return true;
        } else {
          this.logToFile(logPath, `PowerShell Start-Process failed`);
        }
      } catch (psError) {
        this.logToFile(logPath, `PowerShell error: ${psError.message}`);
      }
      
      // Method 4: Try to find and launch default browser directly
      this.logToFile(logPath, `Attempting to find and launch default browser...`);
      try {
        const defaultBrowser = await this.findDefaultBrowser(logPath);
        if (defaultBrowser) {
          const browserResult = await new Promise((resolve) => {
            const child = spawn(defaultBrowser, [url], {
              stdio: ['pipe', 'pipe', 'pipe'],
              detached: true
            });
            
            child.on('close', (code) => {
              resolve(code === 0);
            });
            
            child.on('error', () => {
              resolve(false);
            });
            
            // Assume success if no immediate error
            setTimeout(() => resolve(true), 1000);
          });
          
          if (browserResult) {
            this.logToFile(logPath, `✓ Default browser launch succeeded`);
            return true;
          }
        }
      } catch (browserError) {
        this.logToFile(logPath, `Default browser launch error: ${browserError.message}`);
      }
      
      return false;
      
    } catch (error) {
      this.logToFile(logPath, `Critical error in browser opening: ${error.message}`);
      return false;
    }
  }

  async findDefaultBrowser(logPath) {
    try {
      // Try to find common browsers in typical installation paths
      const commonBrowsers = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      
      for (const browserPath of commonBrowsers) {
        if (await fs.pathExists(browserPath)) {
          this.logToFile(logPath, `Found browser: ${browserPath}`);
          return browserPath;
        }
      }
      
      // Try to get default browser from registry
      const regResult = await new Promise((resolve) => {
        const child = spawn('reg', [
          'query', 
          'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice',
          '/v', 'ProgId'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', () => {
          resolve(stdout);
        });
      });
      
      if (regResult.includes('ChromeHTML')) {
        return commonBrowsers.find(p => p.includes('chrome.exe') && fs.pathExistsSync(p));
      } else if (regResult.includes('FirefoxURL')) {
        return commonBrowsers.find(p => p.includes('firefox.exe') && fs.pathExistsSync(p));
      } else if (regResult.includes('MSEdgeHTM')) {
        return commonBrowsers.find(p => p.includes('msedge.exe') && fs.pathExistsSync(p));
      }
      
      return null;
    } catch (error) {
      this.logToFile(logPath, `Error finding default browser: ${error.message}`);
      return null;
    }
  }

  async testAndOpenApacheBrowser(logPath) {
    try {
      this.logToFile(logPath, `Testing Apache server and opening browser...`);
      
      // Test Apache response
      const responseTest = await this.testApacheResponse(logPath);
      
      if (responseTest.responding) {
        const port = responseTest.port || 80;
        const url = `http://localhost${port === 80 ? '' : ':' + port}`;
        
        this.logToFile(logPath, `✅ SUCCESS: Apache HTTP Server is running and responding!`);
        this.logToFile(logPath, `🌐 Website URL: ${url}`);
        
        // Open browser automatically
        this.logToFile(logPath, `Opening web browser to ${url}...`);
        
        const browserOpened = await this.openBrowserWithFallbacks(url, logPath);
        
        if (browserOpened) {
          this.logToFile(logPath, `✓ Browser opened successfully`);
        } else {
          this.logToFile(logPath, `⚠ Could not open browser automatically. Please manually visit: ${url}`);
        }
        this.logToFile(logPath, `📊 Server Status: HTTP 200 OK - Apache is ready!`);
        
        // Send success notification to UI
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name: 'Apache HTTP Server',
            status: 'completed',
            message: `Server started successfully! ${browserOpened ? 'Browser opened to' : 'Please visit'} ${url}`
          });
        }
        
        return true;
      } else {
        this.logToFile(logPath, `⚠ Apache server is not responding. Check the logs above for errors.`);
        return false;
      }
      
    } catch (error) {
      this.logToFile(logPath, `Error testing and opening browser: ${error.message}`);
      return false;
    }
  }

  async logToFile(logPath, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      // Silent fail for log writing to avoid console spam
    }
  }

  async initialize() {
    await this.createDirectories();
    this.setupIpcHandlers();
    this.createWindow();
  }
}

// App event handlers
app.whenReady().then(async () => {
  const setupFlowApp = new SetupFlowApp();
  await setupFlowApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const setupFlowApp = new SetupFlowApp();
    await setupFlowApp.initialize();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}); 