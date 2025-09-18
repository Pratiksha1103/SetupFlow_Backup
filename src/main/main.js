const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');



const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

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
    this.isDev = process.env.NODE_ENV === 'development';
    this.appPaths = this.initializePaths();
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
      // console.error('Failed to create directories:', error);
      // Log to file instead of console
      await this.logToFile(path.join(process.cwd(), 'error.log'), `Failed to create directories: ${error.message}`);
      throw error;
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        devTools: false  // Add this line to disable developer tools
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false
    });

    // Load the app
    const startUrl = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../../build/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
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
        return installerFiles.filter(file => 
          file.endsWith('.msi') || file.endsWith('.exe') || file.endsWith('.pkg') || file.endsWith('.zip')
        );
      } catch (error) {
        // console.error('Error reading installers directory:', error);
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
        // console.error('Error reading profiles:', error);
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
        // console.error('Error saving profile:', error);
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
        // console.error('Installation error:', error);
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
        // console.error('Error reading logs:', error);
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
        // console.error('Error reading log:', error);
        return { success: false, error: error.message };
      }
    });
  }

  async installSingleApp(appData, logPath) {
    return new Promise((resolve) => {
      const { name, installerPath, command, requiresExtraction } = appData;
      const fullInstallerPath = path.join(this.appPaths.installers, installerPath);
      
      // Enhanced logging for debugging
      this.logToFile(logPath, `=== INSTALLATION START ===`);
      this.logToFile(logPath, `Software: ${name}`);
      this.logToFile(logPath, `Installer Path: ${installerPath}`);
      this.logToFile(logPath, `Full Path: ${fullInstallerPath}`);
      this.logToFile(logPath, `Command Template: ${command}`);
      
      // Security: Validate installer path
      if (!fs.existsSync(fullInstallerPath)) {
        const error = `Installer not found: ${fullInstallerPath}`;
        this.logToFile(logPath, `ERROR: ${error}`);
        console.error(`Installation failed: ${error}`);
        resolve({ name, success: false, error });
        return;
      }

      // Check file size for progress estimation
      const stats = fs.statSync(fullInstallerPath);
      this.logToFile(logPath, `Installer size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Handle ZIP files that require extraction
      if (command === 'EXTRACT_ZIP' || (requiresExtraction && installerPath.toLowerCase().endsWith('.zip'))) {
        this.logToFile(logPath, `INFO: ${name} is a ZIP file that will be extracted automatically.`);
        this.handleZipExtraction(appData, logPath, fullInstallerPath, resolve);
        return;
      }
      
      // Handle other ZIP files that require manual extraction
      if (installerPath.toLowerCase().endsWith('.zip')) {
        this.logToFile(logPath, `INFO: ${name} is a ZIP file that requires manual extraction.`);
        this.logToFile(logPath, `INFO: Please extract ${installerPath} manually and run the contained installer.`);
        this.logToFile(logPath, `INFO: Location: ${fullInstallerPath}`);
        
        const endTime = new Date();
        this.logToFile(logPath, `Processing of ${name} completed - Manual extraction required`);
        
        resolve({
          name,
          success: true, // Mark as "successful" since the file was found and identified
          message: 'ZIP file requires manual extraction',
          requiresManualAction: true,
          duration: 1000
        });
        return;
      }

      const startTime = new Date();
      this.logToFile(logPath, `Starting installation of ${name} at ${startTime.toISOString()}`);
      
      // Replace placeholder with actual path
      const finalCommand = command.replace('{path}', `"${fullInstallerPath}"`);
      
      this.logToFile(logPath, `Final Command: ${finalCommand}`);
      this.logToFile(logPath, `Attempting to execute installer...`);
      
      // Send real-time progress update to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name,
          status: 'starting',
          message: 'Launching installer...'
        });
      }
      
      const child = spawn('cmd', ['/c', finalCommand], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';
      let progressCounter = 0;

      child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          stdout += output;
          this.logToFile(logPath, `STDOUT: ${output}`);
          console.log(`[${name}] STDOUT:`, output);
          
          // Send progress update
          progressCounter++;
          if (this.mainWindow && progressCounter % 5 === 0) {
            this.mainWindow.webContents.send('installation-progress', {
              name,
              status: 'installing',
              message: 'Installation in progress...',
              progress: Math.min(50 + (progressCounter * 2), 90)
            });
          }
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          stderr += output;
          this.logToFile(logPath, `STDERR: ${output}`);
          console.warn(`[${name}] STDERR:`, output);
        }
      });

      child.on('close', (code) => {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        this.logToFile(logPath, `Installation of ${name} completed with exit code ${code} in ${duration}ms`);
        this.logToFile(logPath, `=== INSTALLATION END ===`);
        
        const success = code === 0;
        console.log(`[${name}] Installation ${success ? 'SUCCESS' : 'FAILED'} (exit code: ${code})`);
        
        // Send final progress update
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name,
            status: success ? 'completed' : 'failed',
            message: success ? 'Installation completed successfully!' : `Installation failed (exit code: ${code})`,
            progress: success ? 100 : 0
          });
        }
        
        resolve({
          name,
          success,
          exitCode: code,
          stdout,
          stderr,
          duration
        });
      });

      child.on('error', (error) => {
        this.logToFile(logPath, `ERROR: ${error.message}`);
        this.logToFile(logPath, `=== INSTALLATION ERROR ===`);
        console.error(`[${name}] Installation error:`, error.message);
        
        // Send error update
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name,
            status: 'error',
            message: `Error: ${error.message}`,
            progress: 0
          });
        }
        
        resolve({
          name,
          success: false,
          error: error.message
        });
      });
    });
  }

  async logToFile(logPath, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      // console.error('Failed to write to log file:', error);
      // Silent fail for logging errors to avoid infinite loops
    }
  }

  async handleZipExtraction(appData, logPath, fullInstallerPath, resolve) {
    const { name, defaultInstallPath } = appData;
    const startTime = new Date();
    
    try {
      this.logToFile(logPath, `Starting ZIP extraction of ${name} at ${startTime.toISOString()}`);
      this.logToFile(logPath, `Source: ${fullInstallerPath}`);
      this.logToFile(logPath, `Target: ${defaultInstallPath}`);
      
      // Send real-time progress update to UI
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name,
          status: 'starting',
          message: 'Preparing extraction...'
        });
      }

      // Ensure target directory exists
      await fs.ensureDir(defaultInstallPath);
      this.logToFile(logPath, `Created target directory: ${defaultInstallPath}`);

      // Extract ZIP using PowerShell (built into Windows)
      const extractCommand = `powershell -Command "Expand-Archive -Path '${fullInstallerPath}' -DestinationPath '${defaultInstallPath}' -Force"`;
      this.logToFile(logPath, `Extraction command: ${extractCommand}`);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('installation-progress', {
          name,
          status: 'installing',
          message: 'Extracting files...',
          progress: 30
        });
      }

      const child = spawn('powershell', [
        '-Command', 
        `Expand-Archive -Path '${fullInstallerPath}' -DestinationPath '${defaultInstallPath}' -Force`
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          stdout += output;
          this.logToFile(logPath, `EXTRACT STDOUT: ${output}`);
          console.log(`[${name}] EXTRACT:`, output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          stderr += output;
          this.logToFile(logPath, `EXTRACT STDERR: ${output}`);
          console.warn(`[${name}] EXTRACT ERROR:`, output);
        }
      });

      child.on('close', async (code) => {
        const endTime = new Date();
        const duration = endTime - startTime;
        
        this.logToFile(logPath, `ZIP extraction completed with exit code ${code} in ${duration}ms`);
        
        if (code === 0) {
          // Check if extraction was successful by looking for extracted content
          try {
            const extractedFiles = await fs.readdir(defaultInstallPath);
            this.logToFile(logPath, `Extracted ${extractedFiles.length} items to ${defaultInstallPath}`);
            this.logToFile(logPath, `Contents: ${extractedFiles.join(', ')}`);
            
            // For Gradle, we need to set up the environment
            if (name.toLowerCase().includes('gradle')) {
              await this.setupGradleEnvironment(defaultInstallPath, logPath);
            }
            
            this.logToFile(logPath, `=== EXTRACTION SUCCESS ===`);
            console.log(`[${name}] Extraction SUCCESS`);
            
            if (this.mainWindow) {
              this.mainWindow.webContents.send('installation-progress', {
                name,
                status: 'completed',
                message: 'Installation completed successfully!',
                progress: 100
              });
            }
            
            resolve({
              name,
              success: true,
              message: `Successfully extracted to ${defaultInstallPath}`,
              installPath: defaultInstallPath,
              duration
            });
          } catch (dirError) {
            this.logToFile(logPath, `ERROR: Failed to verify extraction: ${dirError.message}`);
            resolve({
              name,
              success: false,
              error: `Extraction verification failed: ${dirError.message}`
            });
          }
        } else {
          this.logToFile(logPath, `=== EXTRACTION FAILED ===`);
          console.error(`[${name}] Extraction FAILED (exit code: ${code})`);
          
          if (this.mainWindow) {
            this.mainWindow.webContents.send('installation-progress', {
              name,
              status: 'failed',
              message: `Extraction failed (exit code: ${code})`,
              progress: 0
            });
          }
          
          resolve({
            name,
            success: false,
            error: `Extraction failed with exit code ${code}`,
            stderr,
            duration
          });
        }
      });

      child.on('error', (error) => {
        this.logToFile(logPath, `EXTRACTION ERROR: ${error.message}`);
        this.logToFile(logPath, `=== EXTRACTION ERROR ===`);
        console.error(`[${name}] Extraction error:`, error.message);
        
        if (this.mainWindow) {
          this.mainWindow.webContents.send('installation-progress', {
            name,
            status: 'error',
            message: `Error: ${error.message}`,
            progress: 0
          });
        }
        
        resolve({
          name,
          success: false,
          error: error.message
        });
      });

    } catch (error) {
      this.logToFile(logPath, `SETUP ERROR: ${error.message}`);
      console.error(`[${name}] Setup error:`, error.message);
      resolve({
        name,
        success: false,
        error: error.message
      });
    }
  }

  async setupGradleEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Gradle environment...`);
      
      // Find the actual Gradle directory (it's usually gradle-x.x.x inside the extract)
      const extractedItems = await fs.readdir(installPath);
      const gradleDir = extractedItems.find(item => item.startsWith('gradle-'));
      
      if (gradleDir) {
        const gradleBinPath = path.join(installPath, gradleDir, 'bin');
        this.logToFile(logPath, `Gradle bin directory: ${gradleBinPath}`);
        this.logToFile(logPath, `To use Gradle, add to PATH: ${gradleBinPath}`);
        this.logToFile(logPath, `Or use directly: ${path.join(gradleBinPath, 'gradle.bat')}`);
      } else {
        this.logToFile(logPath, `Warning: Could not find gradle directory in extracted files`);
      }
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Gradle environment: ${error.message}`);
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