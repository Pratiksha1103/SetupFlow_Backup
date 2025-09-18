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
    <Box sx={{ 
      flex: 1, 
      p: 2, 
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0 // Allow flex to work properly
    }}>
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Main Software Details Panel */}
        <Grid item xs={8}>
          <Card sx={{ 
            p: 3, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Add scrollable container */}
            <Box sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1, // Add padding for scrollbar
              // Custom grey scrollbar styles
              '&::-webkit-scrollbar': {
                width: '12px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#6c757d', // Grey color
                borderRadius: '6px',
                border: '2px solid #f1f1f1',
                '&:hover': {
                  backgroundColor: '#5a6268', // Darker grey on hover
                },
                '&:active': {
                  backgroundColor: '#495057', // Darkest grey when active
                },
              },
              '&::-webkit-scrollbar-corner': {
                backgroundColor: '#f1f1f1',
              },
            }}>
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
                      <List 
                        dense 
                        sx={{
                          height: '180px', // Fixed height to show exactly 3 items (each item ~60px)
                          minHeight: '180px', // Ensure minimum height
                          maxHeight: '180px', // Ensure maximum height
                          overflowY: 'scroll', // Always show scrollbar
                          overflowX: 'hidden',
                          backgroundColor: '#fafafa',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '8px 4px',
                          // Custom grey scrollbar styles for additional software list
                          '&::-webkit-scrollbar': {
                            width: '12px', // Make scrollbar visible
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#6c757d', // Grey color
                            borderRadius: '6px',
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
                          // Firefox scrollbar
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#6c757d #f8f9fa',
                        }}
                      >
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
            </Box>
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