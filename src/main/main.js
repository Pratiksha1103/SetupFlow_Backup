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
            
            // Set up environment for specific applications
            if (name.toLowerCase().includes('gradle')) {
              await this.setupGradleEnvironment(defaultInstallPath, logPath);
            } else if (name.toLowerCase().includes('tomcat')) {
              await this.setupTomcatEnvironment(defaultInstallPath, logPath);
            } else if (name.toLowerCase().includes('apache') && name.toLowerCase().includes('http')) {
              await this.setupApacheHttpdEnvironment(defaultInstallPath, logPath);
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

  async setupTomcatEnvironment(installPath, logPath) {
    try {
      this.logToFile(logPath, `Setting up Apache Tomcat environment...`);
      
      // Find the actual Tomcat directory (it's usually apache-tomcat-x.x.x inside the extract)
      const extractedItems = await fs.readdir(installPath);
      const tomcatDir = extractedItems.find(item => item.startsWith('apache-tomcat-'));
      
      if (tomcatDir) {
        const tomcatPath = path.join(installPath, tomcatDir);
        const tomcatBinPath = path.join(tomcatPath, 'bin');
        const tomcatWebappsPath = path.join(tomcatPath, 'webapps');
        const tomcatConfPath = path.join(tomcatPath, 'conf');
        
        this.logToFile(logPath, `Tomcat installation directory: ${tomcatPath}`);
        this.logToFile(logPath, `Tomcat bin directory: ${tomcatBinPath}`);
        this.logToFile(logPath, `Tomcat webapps directory: ${tomcatWebappsPath}`);
        this.logToFile(logPath, `Tomcat configuration directory: ${tomcatConfPath}`);
        
        // Set CATALINA_HOME environment variable info
        this.logToFile(logPath, `CATALINA_HOME should be set to: ${tomcatPath}`);
        this.logToFile(logPath, `To start Tomcat: ${path.join(tomcatBinPath, 'startup.bat')}`);
        this.logToFile(logPath, `To stop Tomcat: ${path.join(tomcatBinPath, 'shutdown.bat')}`);
        this.logToFile(logPath, `Access Tomcat Manager at: http://localhost:8080/manager`);
        this.logToFile(logPath, `Deploy WAR files to: ${tomcatWebappsPath}`);
        
        // Check if important files exist
        const startupScript = path.join(tomcatBinPath, 'startup.bat');
        const serverXml = path.join(tomcatConfPath, 'server.xml');
        
        if (await fs.pathExists(startupScript)) {
          this.logToFile(logPath, `✓ Startup script found: ${startupScript}`);
        } else {
          this.logToFile(logPath, `⚠ Warning: Startup script not found at ${startupScript}`);
        }
        
        if (await fs.pathExists(serverXml)) {
          this.logToFile(logPath, `✓ Server configuration found: ${serverXml}`);
        } else {
          this.logToFile(logPath, `⚠ Warning: Server configuration not found at ${serverXml}`);
        }
        
        this.logToFile(logPath, `Tomcat installation completed successfully!`);
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
      
      // Apache httpd can have different directory structures, let's check common patterns
      const extractedItems = await fs.readdir(installPath);
      this.logToFile(logPath, `Available extracted items: ${extractedItems.join(', ')}`);
      
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
        httpdDir = directories[0]; // Use first directory found
      }
      
      const httpdPath = httpdDir ? path.join(installPath, httpdDir) : installPath;
      const httpdBinPath = path.join(httpdPath, 'bin');
      const httpdConfPath = path.join(httpdPath, 'conf');
      const httpdHtdocsPath = path.join(httpdPath, 'htdocs');
      const httpdLogsPath = path.join(httpdPath, 'logs');
      const httpdModulesPath = path.join(httpdPath, 'modules');
      
      this.logToFile(logPath, `Apache HTTP Server installation directory: ${httpdPath}`);
      this.logToFile(logPath, `Apache bin directory: ${httpdBinPath}`);
      this.logToFile(logPath, `Apache configuration directory: ${httpdConfPath}`);
      this.logToFile(logPath, `Apache document root: ${httpdHtdocsPath}`);
      this.logToFile(logPath, `Apache logs directory: ${httpdLogsPath}`);
      this.logToFile(logPath, `Apache modules directory: ${httpdModulesPath}`);
      
      // Check if important files and directories exist
      const httpdExe = path.join(httpdBinPath, 'httpd.exe');
      const httpdConf = path.join(httpdConfPath, 'httpd.conf');
      const indexHtml = path.join(httpdHtdocsPath, 'index.html');
      
      let validInstallation = true;
      
      if (await fs.pathExists(httpdExe)) {
        this.logToFile(logPath, `✓ Apache executable found: ${httpdExe}`);
      } else {
        this.logToFile(logPath, `⚠ Warning: Apache executable not found at ${httpdExe}`);
        validInstallation = false;
      }
      
      if (await fs.pathExists(httpdConf)) {
        this.logToFile(logPath, `✓ Apache configuration found: ${httpdConf}`);
        // Auto-fix ServerRoot path in configuration
        await this.fixApacheServerRoot(httpdConf, httpdPath, logPath);
      } else {
        this.logToFile(logPath, `⚠ Warning: Apache configuration not found at ${httpdConf}`);
        validInstallation = false;
      }
      
      if (await fs.pathExists(httpdHtdocsPath)) {
        this.logToFile(logPath, `✓ Document root directory found: ${httpdHtdocsPath}`);
      } else {
        this.logToFile(logPath, `⚠ Warning: Document root not found at ${httpdHtdocsPath}`);
      }
      
      if (await fs.pathExists(httpdModulesPath)) {
        this.logToFile(logPath, `✓ Modules directory found: ${httpdModulesPath}`);
      } else {
        this.logToFile(logPath, `⚠ Warning: Modules directory not found at ${httpdModulesPath}`);
      }
      
      // Provide usage instructions
      if (validInstallation) {
        this.logToFile(logPath, `Apache HTTP Server installation completed successfully!`);
        this.logToFile(logPath, `To start Apache: ${httpdExe}`);
        this.logToFile(logPath, `To test configuration: ${httpdExe} -t`);
        this.logToFile(logPath, `Configuration file: ${httpdConf}`);
        this.logToFile(logPath, `Default document root: ${httpdHtdocsPath}`);
        this.logToFile(logPath, `Access website at: http://localhost (default port 80)`);
        this.logToFile(logPath, `Log files location: ${httpdLogsPath}`);
        this.logToFile(logPath, `To stop Apache: Use Ctrl+C in the command window or Task Manager`);
        
        // Additional service installation instructions
        this.logToFile(logPath, `To install as Windows service: ${httpdExe} -k install`);
        this.logToFile(logPath, `To start service: ${httpdExe} -k start`);
        this.logToFile(logPath, `To stop service: ${httpdExe} -k stop`);
        this.logToFile(logPath, `To uninstall service: ${httpdExe} -k uninstall`);
        
        // Auto-start Apache HTTP Server
        await this.autoStartApacheHttpd(httpdExe, logPath);
      } else {
        this.logToFile(logPath, `⚠ Apache installation may be incomplete - some components missing`);
      }
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to setup Apache HTTP Server environment: ${error.message}`);
    }
  }

  async fixApacheServerRoot(httpdConfPath, actualRootPath, logPath) {
    try {
      this.logToFile(logPath, `Fixing Apache ServerRoot configuration...`);
      
      // Read the configuration file
      const configContent = await fs.readFile(httpdConfPath, 'utf8');
      
      // Convert Windows path to Apache format (forward slashes)
      const apacheRootPath = actualRootPath.replace(/\\/g, '/');
      
      // Replace ServerRoot definition
      const updatedConfig = configContent.replace(
        /Define SRVROOT ".*?"/,
        `Define SRVROOT "${apacheRootPath}"`
      );
      
      // Write the updated configuration back
      await fs.writeFile(httpdConfPath, updatedConfig, 'utf8');
      
      this.logToFile(logPath, `✓ ServerRoot automatically fixed to: ${apacheRootPath}`);
      
      // Validate the configuration
      const httpdExe = path.join(actualRootPath, 'bin', 'httpd.exe');
      if (await fs.pathExists(httpdExe)) {
        this.logToFile(logPath, `Validating Apache configuration...`);
        
        const testResult = await new Promise((resolve) => {
          const child = spawn(httpdExe, ['-t'], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.join(actualRootPath, 'bin')
          });
          
          let output = '';
          child.stdout.on('data', (data) => { output += data.toString(); });
          child.stderr.on('data', (data) => { output += data.toString(); });
          
          child.on('close', (code) => {
            resolve({ code, output: output.trim() });
          });
        });
        
        if (testResult.code === 0) {
          this.logToFile(logPath, `✓ Apache configuration is valid: ${testResult.output}`);
        } else {
          this.logToFile(logPath, `⚠ Warning: Configuration test failed: ${testResult.output}`);
        }
      }
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to fix ServerRoot configuration: ${error.message}`);
    }
  }

  async autoStartApacheHttpd(httpdExePath, logPath) {
    try {
      this.logToFile(logPath, `Auto-starting Apache HTTP Server...`);
      
      // Start Apache in background using PowerShell
      const startCommand = `powershell -Command "Start-Process -FilePath '${httpdExePath}' -WindowStyle Hidden"`;
      
      const startResult = await new Promise((resolve) => {
        const child = spawn('powershell', [
          '-Command', 
          `Start-Process -FilePath '${httpdExePath}' -WindowStyle Hidden`
        ], { 
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stderr = '';
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          resolve({ code, stderr: stderr.trim() });
        });
        
        child.on('error', (err) => {
          resolve({ code: -1, stderr: err.message });
        });
      });
      
      if (startResult.code === 0) {
        this.logToFile(logPath, `✓ Apache HTTP Server started successfully in background`);
        
        // Wait a moment and verify it's running
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test if server is responding
        try {
          this.logToFile(logPath, `Testing Apache HTTP Server response...`);
          
          const testResult = await new Promise((resolve) => {
            const child = spawn('powershell', [
              '-Command', 
              'Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 5'
            ], { 
              stdio: ['pipe', 'pipe', 'pipe'],
              shell: true
            });
            
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => { stdout += data.toString(); });
            child.stderr.on('data', (data) => { stderr += data.toString(); });
            
            child.on('close', (code) => {
              resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
            });
          });
          
          if (testResult.code === 0 && testResult.stdout.includes('StatusCode        : 200')) {
            this.logToFile(logPath, `✅ SUCCESS: Apache HTTP Server is running and responding!`);
            this.logToFile(logPath, `🌐 Website accessible at: http://localhost`);
            this.logToFile(logPath, `📊 Server Status: HTTP 200 OK - "It works!" page served`);
          } else {
            this.logToFile(logPath, `⚠ Apache started but may not be fully ready yet. Try accessing http://localhost in a few moments.`);
          }
          
        } catch (testError) {
          this.logToFile(logPath, `Apache started but connection test failed: ${testError.message}`);
        }
        
      } else {
        this.logToFile(logPath, `⚠ Warning: Failed to start Apache HTTP Server automatically (exit code: ${startResult.code})`);
        if (startResult.stderr) {
          this.logToFile(logPath, `Error details: ${startResult.stderr}`);
        }
        this.logToFile(logPath, `You can start Apache manually by running: ${httpdExePath}`);
      }
      
    } catch (error) {
      this.logToFile(logPath, `Warning: Failed to auto-start Apache HTTP Server: ${error.message}`);
      this.logToFile(logPath, `You can start Apache manually by running: ${httpdExePath}`);
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