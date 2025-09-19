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


  // Software database - moved from Sidebar.js
  const softwareDatabase = {
    'notepad++': {
      name: 'Notepad++',
      version: '8.8.5',
      description: 'Advanced text editor',
      installerPath: 'npp.8.8.5.Installer.x64.exe',
      command: '"{path}" /S /NCRC /D={installPath}',
      defaultInstallPath: 'C:\\apps\\Notepad++',
      supportsCustomPath: true
    },
    'eclipse': {
      name: 'Eclipse IDE',
      version: '2023-09',
      description: 'Integrated Development Environment',
      installerPath: 'eclipse-inst-jre-win64.exe',
      command: '"{path}" -silent -nosplash -data "{installPath}\\workspace"',
      defaultInstallPath: 'C:\\apps',
      supportsCustomPath: true
    },
    '7zip': {
      name: '7-Zip',
      version: '23.01',
      description: 'File archiver with high compression ratio',
      installerPath: '7z2301-x64.msi',
      command: 'msiexec /i "{path}" /quiet /norestart /qn INSTALLDIR="{installPath}"',
      defaultInstallPath: 'C:\\apps',
      supportsCustomPath: true
    },
    'git': {
      name: 'Git',
      version: '2.42.0',
      description: 'Distributed version control system',
      installerPath: 'Git-2.42.0.2-64-bit.exe',
      command: '"{path}" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES /DIR="{installPath}"',
      defaultInstallPath: 'C:\\apps',
      supportsCustomPath: true
    }
  };

  const getSoftwareInfo = (filename) => {
    const key = Object.keys(softwareDatabase).find(k => 
      filename.toLowerCase().includes(k) || 
      softwareDatabase[k].installerPath.toLowerCase() === filename.toLowerCase()
    );
    
    return key ? softwareDatabase[key] : {
      name: filename.replace(/\.[^/.]+$/, ""),
      version: 'Unknown',
      description: 'Software installer',
      installerPath: filename,
      command: `"{path}" /S`,
      defaultInstallPath: 'C:\\apps',
      supportsCustomPath: true
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