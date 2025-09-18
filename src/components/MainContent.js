import React from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Paper,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  PlayArrow as InstallIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const MainContent = () => {
  const { 
    selectedSoftware, 
    handleInstallation, 
    isInstalling,
    customInstallPath,
    setCustomInstallPath,
    setNotification
  } = useAppContext();

  const selectedApp = selectedSoftware.length > 0 ? selectedSoftware[0] : null;

  return (
    <Box sx={{ flex: 1, p: 2, backgroundColor: 'background.default' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Main Software Details Panel */}
        <Grid item xs={8}>
          <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedApp ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {selectedApp.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={`Version ${selectedApp.version}`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label="Ready to Install" 
                      color="success" 
                      icon={<CheckIcon />}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedApp.description}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon color="primary" />
                    Installation Details
                  </Typography>
                  
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Installer File:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedApp.installerPath}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Install Command:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {selectedApp.command}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>

                {selectedSoftware.length > 1 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Additional Software ({selectedSoftware.length - 1})
                    </Typography>
                    <List dense>
                      {selectedSoftware.slice(1).map((software, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={software.name}
                            secondary={`v${software.version}`}
                            primaryTypographyProps={{ fontSize: '0.9rem' }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center'
              }}>
                <InfoIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                  No Software Selected
                </Typography>
                <Typography variant="body1" color="text.disabled">
                  Select software from the Applications panel to view details and install
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Install Panel */}
        <Grid item xs={4}>
          <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
              Installation
            </Typography>

            {selectedSoftware.length > 0 ? (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  {selectedSoftware.length} software package{selectedSoftware.length > 1 ? 's' : ''} selected for installation
                </Alert>

                {/* Custom Installation Path */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Installation Base Path"
                    value={customInstallPath}
                    onChange={(e) => setCustomInstallPath(e.target.value)}
                    placeholder="C:\apps"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FolderIcon />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Software will be installed in subfolders under this path"
                    variant="outlined"
                    size="small"
                  />
                </Box>

                {/* Show installation paths preview */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Installation Path:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      <strong>All software will be installed to:</strong> {customInstallPath}
                    </Typography>
                  </Paper>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<InstallIcon />}
                    onClick={handleInstallation}
                    disabled={isInstalling}
                    sx={{
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      backgroundColor: '#dc004e',
                      '&:hover': {
                        backgroundColor: '#b8003e'
                      }
                    }}
                    fullWidth
                  >
                    {isInstalling ? 'Installing...' : 'Install'}
                  </Button>

                  <Typography variant="caption" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    Installation will run silently in the background
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center'
              }}>
                <InstallIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.disabled">
                  Select software to enable installation
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainContent; 