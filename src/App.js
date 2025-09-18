import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
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
      console.error('Failed to load initial data:', error);
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
          installPath: customInstallPath + '\\' + sw.name.replace(/[^a-zA-Z0-9]/g, '')
        })),
        profileId: null
      });

      if (result.success) {
        // Refresh logs after installation
        const updatedLogs = await window.electronAPI.getLogs();
        setLogs(updatedLogs);
        setSelectedSoftware([]);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
      setInstallationProgress(null);
    }
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
        </Box>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App; 