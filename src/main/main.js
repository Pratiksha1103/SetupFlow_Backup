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
      this.logToFile(logPath, `✓ Oracle Database extraction completed successfully!`);
      this.logToFile(logPath, `Note: Please refer to Oracle Database documentation for installation instructions.`);
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Oracle Database environment: ${error.message}`);
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
      this.logToFile(logPath, `Auto-starting Apache HTTP Server...`);
      
      const startResult = await new Promise((resolve) => {
        const child = spawn('powershell', [
          '-Command', 
          `Start-Process -FilePath '${httpdExePath}' -WindowStyle Hidden`
        ], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        child.on('close', (code) => {
          resolve({ code });
        });
        
        child.on('error', (err) => {
          resolve({ code: -1, error: err.message });
        });
      });
      
      if (startResult.code === 0) {
        this.logToFile(logPath, `✓ Apache HTTP Server started successfully`);
        this.logToFile(logPath, `🌐 Website accessible at: http://localhost`);
      } else {
        this.logToFile(logPath, `⚠ Warning: Failed to start Apache HTTP Server automatically`);
      }
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to auto-start Apache HTTP Server: ${error.message}`);
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