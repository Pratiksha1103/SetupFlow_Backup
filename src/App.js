import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Snackbar, Alert } from '@mui/material';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import LogsPanel from './components/LogsPanel';

import { AppProvider } from './context/AppContext';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#e91e63',
      light: '#f06292',
      dark: '#c2185b',
    },
    secondary: {
      main: '#ff4081',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [availableSoftware, setAvailableSoftware] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationProgress, setInstallationProgress] = useState(null);
  const [customInstallPath, setCustomInstallPath] = useState('C:\\apps');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });


  // Software database with categories
const softwareDatabase = {
    'notepad++': {
      name: 'Notepad++',
      version: '8.8.5',
      description: 'Advanced text editor',
      installerPath: 'npp.8.8.5.Installer.x64.exe',
      command: '"{path}" /S /NCRC /D={installPath}',
      defaultInstallPath: 'C:\\apps\\Notepad++',
      supportsCustomPath: true,
      category: 'Prerequisites'
    },
    'jdk': {
      name: 'Java Development Kit',
      version: '21',
      description: 'Oracle JDK 21 for Java development',
      installerPath: 'jdk-21_windows-x64_bin.exe',
      command: 'start /wait "" "{path}" /s INSTALL_SILENT=Enable STATIC=Disable AUTO_UPDATE=Disable WEB_JAVA=Disable',
      category: 'Prerequisites'
    },
    'gradle': {
      name: 'Gradle Build Tool',
      version: '9.0.0',
      description: 'Gradle Build Automation Tool',
      installerPath: 'gradle-9.0.0-bin.zip',
      command: 'EXTRACT_ZIP',
      defaultInstallPath: 'C:\\apps\\gradle',
      supportsCustomPath: true,
      requiresExtraction: true,
      type: 'zip',
      category: 'Prerequisites'
    },
    '3dpassport': {
      name: '3DPassport',
      version: 'V6R2025x.HF4',
      description: 'Dassault Systèmes 3DPassport Authentication',
      installerPath: 'n/a', // Placeholder, as it's a ZIP
      command: 'EXTRACT_ZIP',
      defaultInstallPath: 'C:\\apps\\3DPassport',
      supportsCustomPath: true,
      requiresExtraction: true,
      type: 'zip',
      category: '3DExperience'
    },
    'tomcat': {
      name: 'Apache Tomcat',
      version: '10.1.46',
      description: 'Apache Tomcat Web Server',
      installerPath: 'apache-tomcat-10.1.46-windows-x64.zip',
      command: 'EXTRACT_ZIP',
      defaultInstallPath: 'C:\\apps\\tomcat',
      supportsCustomPath: true,
      requiresExtraction: true,
      type: 'zip',
      category: 'Prerequisites'
    },
    'httpd': {
      name: 'Apache HTTP Server',
      version: '2.4.65',
      description: 'Apache Web Server',
      installerPath: 'httpd-2.4.65-250724-Win64-VS17.zip',
      command: 'EXTRACT_ZIP',
      defaultInstallPath: 'C:\\apps\\httpd',
      supportsCustomPath: true,
      requiresExtraction: true,
      type: 'zip',
      category: 'Web'
    },
    'oracle': {
      name: 'Oracle Database',
      version: '19.3.0',
      description: 'Oracle Database Server',
      installerPath: 'WINDOWS.X64_193000_db_home.zip',
      command: 'EXTRACT_ZIP',
      defaultInstallPath: 'C:\\apps\\oracle',
      supportsCustomPath: true,
      requiresExtraction: true,
      type: 'zip',
      category: 'DB'
    }
  };

  const getSoftwareInfo = (filename) => {
    const key = Object.keys(softwareDatabase).find(k => 
      filename.toLowerCase().includes(k) || 
      softwareDatabase[k].installerPath.toLowerCase() === filename.toLowerCase()
    );
    
    if (key) {
      return softwareDatabase[key];
    }
    
    // For files not in database, detect category based on filename patterns
    const isZipFile = filename.toLowerCase().endsWith('.zip');
    let category = 'Other';
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('3dpassport')) {
      category = '3DExperience';
    } else if (lowerFilename.includes('tomcat') || lowerFilename.includes('java') || lowerFilename.includes('gradle') || lowerFilename.includes('notepad') || lowerFilename.includes('npp')) {
      category = 'Prerequisites';
    } else if (lowerFilename.includes('httpd') || lowerFilename.includes('apache')) {
      category = 'Web';
    } else if (lowerFilename.includes('oracle') || lowerFilename.includes('db_home')) {
      category = 'DB';
    }
    
    return {
      name: filename.replace(/\.[^/.]+$/, ""),
      version: 'Unknown',
      description: isZipFile ? 'Compressed installer package' : 'Software installer',
      installerPath: filename,
      command: isZipFile ? 'EXTRACT_ZIP' : `"{path}" /S`,
      defaultInstallPath: `C:\\apps\\${filename.replace(/\.[^/.]+$/, "")}`,
      supportsCustomPath: true,
      requiresExtraction: isZipFile,
      category: category
    };
  };

  useEffect(() => {
    loadInitialData();
    
    // Set up event listener for already installed software notifications
    let cleanup;
    
    // Wait for electronAPI to be available
    const setupEventListener = () => {
      if (window.electronAPI && typeof window.electronAPI.onSoftwareAlreadyInstalled === 'function') {
        cleanup = window.electronAPI.onSoftwareAlreadyInstalled((event, data) => {
          setNotification({
            open: true,
            message: `${data.name} already exists in the apps folder`,
            severity: 'warning'
          });
        });
      } else {
        // Retry after a short delay if electronAPI is not ready
        setTimeout(setupEventListener, 100);
      }
    };
    
    setupEventListener();
    
    // Cleanup event listeners on unmount
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      if (window.electronAPI) {
        const [software, profilesData, logsData] = await Promise.all([
          window.electronAPI.getAvailableSoftware(),
          window.electronAPI.getProfiles(),
          window.electronAPI.getLogs(),
        ]);
        
        setAvailableSoftware(software);
        setProfiles(profilesData);
        setLogs(logsData);
      }
    } catch (error) {
      // console.error('Failed to load initial data:', error);
      setNotification({
        open: true,
        message: 'Failed to load application data. Please restart the application.',
        severity: 'error'
      });
    }
  };

  const handleSoftwareSelection = (software) => {
    setSelectedSoftware(prev => {
      const isSelected = prev.some(item => item.name === software.name);
      if (isSelected) {
        return prev.filter(item => item.name !== software.name);
      } else {
        return [...prev, software];
      }
    });
  };

  // Add these new functions
  const handleSelectAll = () => {
    // Use getSoftwareInfo to get proper software objects for all available software
    const allSoftware = availableSoftware.map(filename => getSoftwareInfo(filename));
    setSelectedSoftware(allSoftware);
  };

  const handleDeselectAll = () => {
    setSelectedSoftware([]);
  };

  // Add refresh functionality
  const handleRefreshList = () => {
    loadInitialData(); // This will reload the available software list
  };

  const handleInstallation = async () => {
    if (selectedSoftware.length === 0) return;

    setIsInstalling(true);
    setInstallationProgress({
      current: 0,
      total: selectedSoftware.length,
      currentApp: selectedSoftware[0]?.name || '',
      logs: []
    });

    try {
      const result = await window.electronAPI.installSoftware({
        software: selectedSoftware.map(sw => ({
          ...sw,
          defaultInstallPath: sw.defaultInstallPath || customInstallPath
        })),
        profileId: null
      });

      if (result.success) {
        // Check individual installation results
        const actualFailures = result.results.filter(r => !r.success && !r.alreadyInstalled);
        const successfulInstalls = result.results.filter(r => r.success && !r.alreadyInstalled);
        const alreadyInstalled = result.results.filter(r => r.alreadyInstalled);
        
        // Only show success notification for actually installed software
        if (successfulInstalls.length > 0) {
          setNotification({
            open: true,
            message: `Successfully installed ${successfulInstalls.length} software package${successfulInstalls.length > 1 ? 's' : ''}!`,
            severity: 'success'
          });
        }
        
        // Handle actual failures (not already installed)
        if (actualFailures.length > 0) {
          const adminErrors = actualFailures.filter(f => f.error && f.error.includes('Administrator privileges required'));
          
          if (adminErrors.length > 0) {
            setNotification({
              open: true,
              message: `Installation failed: Administrator privileges required. Please restart the application using admin-start.cmd or debug-admin.bat`,
              severity: 'error'
            });
          } else {
            const errorMessages = actualFailures.map(f => `${f.name}: ${f.error || `Exit code ${f.exitCode}`}`).join(', ');
            setNotification({
              open: true,
              message: `Installation failed: ${errorMessages}`,
              severity: 'error'
            });
          }
        }

        // Refresh logs after installation
        const updatedLogs = await window.electronAPI.getLogs();
        setLogs(updatedLogs);
        setSelectedSoftware([]);
      } else {
        // Overall installation process failed
        setNotification({
          open: true,
          message: `Installation process failed: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      // console.error('Installation failed:', error);
      setNotification({
        open: true,
        message: `Installation failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsInstalling(false);
      setInstallationProgress(null);
    }
  };

  const handleUninstallation = async () => {
    if (selectedSoftware.length === 0) return;

    setIsInstalling(true);
    setInstallationProgress({
      current: 0,
      total: selectedSoftware.length,
      currentApp: selectedSoftware[0]?.name || '',
      logs: []
    });

    try {
      const result = await window.electronAPI.uninstallSoftware({
        software: selectedSoftware
      });

      if (result.success) {
        // Check individual uninstallation results
        const actualFailures = result.results.filter(r => !r.success && !r.notInstalled);
        const successfulUninstalls = result.results.filter(r => r.success && !r.notInstalled);
        const notInstalled = result.results.filter(r => r.notInstalled);
        
        // Only show success notification for actually uninstalled software
        if (successfulUninstalls.length > 0) {
          setNotification({
            open: true,
            message: `Successfully uninstalled ${successfulUninstalls.length} software package${successfulUninstalls.length > 1 ? 's' : ''}!`,
            severity: 'success'
          });
        }
        
        // Handle actual failures (not "not installed")
        if (actualFailures.length > 0) {
          const adminErrors = actualFailures.filter(f => f.error && f.error.includes('Administrator privileges required'));
          
          if (adminErrors.length > 0) {
            setNotification({
              open: true,
              message: `Uninstallation failed: Administrator privileges required. Please restart the application using admin-start.cmd or debug-admin.bat`,
              severity: 'error'
            });
          } else {
            const errorMessages = actualFailures.map(f => `${f.name}: ${f.error || `Exit code ${f.exitCode}`}`).join(', ');
            setNotification({
              open: true,
              message: `Uninstallation failed: ${errorMessages}`,
              severity: 'error'
            });
          }
        }

        // Show info for software that wasn't installed
        if (notInstalled.length > 0) {
          setNotification({
            open: true,
            message: `${notInstalled.length} software package${notInstalled.length > 1 ? 's were' : ' was'} not installed and cannot be uninstalled.`,
            severity: 'info'
          });
        }

        // Refresh logs after uninstallation
        const updatedLogs = await window.electronAPI.getLogs();
        setLogs(updatedLogs);
        setSelectedSoftware([]);
      } else {
        // Overall uninstallation process failed
        setNotification({
          open: true,
          message: `Uninstallation process failed: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: `Uninstallation failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsInstalling(false);
      setInstallationProgress(null);
    }
  };

  const handleNotificationClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const appContextValue = {
    selectedSoftware,
    availableSoftware,
    profiles,
    logs,
    isInstalling,
    installationProgress,
    customInstallPath,
    setCustomInstallPath,
    notification,
    setNotification,
    softwareDatabase,
    getSoftwareInfo,
    handleSoftwareSelection,
    handleSelectAll,
    handleDeselectAll,
    handleRefreshList,        // Add this
    handleInstallation,
    handleUninstallation,
    loadInitialData,
    setProfiles,
    setLogs
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider value={appContextValue}>
        {/* Main scrollable container for whole screen */}
        <Box sx={{ 
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          // Custom grey scrollbar styles for whole screen
          '&::-webkit-scrollbar': {
            width: '14px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f8f9fa',
            borderRadius: '7px',
            border: '1px solid #dee2e6',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#6c757d', // Grey color
            borderRadius: '7px',
            border: '2px solid #f8f9fa',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: '#5a6268', // Darker grey on hover
              boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)',
            },
            '&:active': {
              backgroundColor: '#495057', // Darkest grey when active
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)',
            },
          },
          '&::-webkit-scrollbar-corner': {
            backgroundColor: '#f8f9fa',
          },
        }}>
          {/* Content container - now scrollable */}
          <Box sx={{ 
            minHeight: '100vh', // Minimum height to ensure content fills screen
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <Header />
            <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <Sidebar />
              <MainContent />
            </Box>
            <LogsPanel />
          </Box>
        </Box>
        
        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleNotificationClose} 
            severity={notification.severity} 
            sx={{ width: '100%' }}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>


      </AppProvider>
    </ThemeProvider>
  );
}

export default App; 