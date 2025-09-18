import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Snackbar, Alert } from '@mui/material';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import LogsPanel from './components/LogsPanel';
import EchoTower from './components/ai/EchoTower';
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
    handleSoftwareSelection,
    handleInstallation,
    loadInitialData,
    setProfiles,
    setLogs
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider value={appContextValue}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <Header />
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Sidebar />
            <MainContent />
          </Box>
          <LogsPanel />
          <EchoTower />
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