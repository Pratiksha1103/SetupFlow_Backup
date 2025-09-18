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
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
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
      defaultInstallPath: 'C:\\apps',
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
          installPath: customInstallPath
        })),
        profileId: null
      });

      if (result.success) {
        // Check individual installation results
        const failedInstalls = result.results.filter(r => !r.success);
        const successfulInstalls = result.results.filter(r => r.success);
        
        if (failedInstalls.length === 0) {
          // All installations successful
          setNotification({
            open: true,
            message: `Successfully installed ${successfulInstalls.length} software package${successfulInstalls.length > 1 ? 's' : ''}!`,
            severity: 'success'
          });
        } else if (successfulInstalls.length === 0) {
          // All installations failed
          const errorMessages = failedInstalls.map(f => `${f.name}: ${f.error || `Exit code ${f.exitCode}`}`).join(', ');
          setNotification({
            open: true,
            message: `Installation failed for all software. Errors: ${errorMessages}`,
            severity: 'error'
          });
        } else {
          // Mixed results
          const errorMessages = failedInstalls.map(f => `${f.name}: ${f.error || `Exit code ${f.exitCode}`}`).join(', ');
          setNotification({
            open: true,
            message: `${successfulInstalls.length} installed successfully, ${failedInstalls.length} failed. Errors: ${errorMessages}`,
            severity: 'warning'
          });
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