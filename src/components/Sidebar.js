import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
  Button,
  Fab
} from '@mui/material';
import {
  Apps as AppsIcon,
  GetApp as DownloadIcon,
  CloudQueue as CloudIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
  const { 
    availableSoftware, 
    selectedSoftware, 
    handleSoftwareSelection 
  } = useAppContext();

  const [expandedSoftware, setExpandedSoftware] = useState(null);

  // Mock software data with installation commands
  const softwareDatabase = {
    'notepad++': {
      name: 'Notepad++',
      version: '8.5.7',
      description: 'Advanced text editor',
      installerPath: 'npp.8.5.7.Installer.x64.exe',
      command: 'start /wait "" "{path}" /S'
    },
    'eclipse': {
      name: 'Eclipse IDE',
      version: '2023-09',
      description: 'Integrated Development Environment',
      installerPath: 'eclipse-inst-jre-win64.exe',
      command: 'start /wait "" "{path}" -silent'
    },
    '7zip': {
      name: '7-Zip',
      version: '23.01',
      description: 'File archiver with high compression ratio',
      installerPath: '7z2301-x64.msi',
      command: 'msiexec /i "{path}" /quiet /norestart'
    },
    'git': {
      name: 'Git',
      version: '2.42.0',
      description: 'Distributed version control system',
      installerPath: 'Git-2.42.0.2-64-bit.exe',
      command: 'start /wait "" "{path}" /VERYSILENT /NORESTART'
    },
    'jdk': {
      name: 'Java Development Kit',
      version: '21',
      description: 'Oracle JDK 21 for Java development',
      installerPath: 'jdk-21_windows-x64_bin.exe',
      command: 'start /wait "" "{path}" /s INSTALL_SILENT=Enable STATIC=Disable AUTO_UPDATE=Disable WEB_JAVA=Disable'
    }
  };

  const getSoftwareInfo = (filename) => {
    const key = Object.keys(softwareDatabase).find(k => 
      filename.toLowerCase().includes(k) || 
      softwareDatabase[k].installerPath.toLowerCase() === filename.toLowerCase()
    );
    
    return key ? softwareDatabase[key] : {
      name: filename.replace(/\.[^/.]+$/, ""), // Remove extension
      version: 'Unknown',
      description: 'Software installer',
      installerPath: filename,
      command: `start /wait "" "{path}"`
    };
  };

  const isSelected = (software) => {
    return selectedSoftware.some(item => item.name === software.name);
  };

  const handleCreateServer = () => {
    // Future implementation for server creation (Terraform)
    console.log('Create Server clicked - Future Terraform feature');
  };

  return (
    <Box sx={{ width: 300, p: 2, backgroundColor: 'background.default' }}>
      <Card sx={{ mb: 2, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppsIcon color="primary" />
          Applications
        </Typography>
        
        <List dense>
          {availableSoftware.map((filename, index) => {
            const software = getSoftwareInfo(filename);
            const selected = isSelected(software);
            
            return (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => handleSoftwareSelection(software)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: selected ? 'primary.light' : 'transparent',
                    '&:hover': {
                      backgroundColor: selected ? 'primary.light' : 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={software.name}
                    secondary={`v${software.version}`}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: selected ? 600 : 400,
                      color: selected ? 'primary.contrastText' : 'text.primary'
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: selected ? 'primary.contrastText' : 'text.secondary'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
          
          {availableSoftware.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No installers found"
                secondary="Add installer files to the installers folder"
                primaryTypographyProps={{ fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </ListItem>
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
        >
          Refresh List
        </Button>
      </Card>

      {/* Create Server Button - Future Terraform Integration */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Fab
          color="warning"
          aria-label="create server"
          onClick={handleCreateServer}
          sx={{
            backgroundColor: '#ff9800',
            '&:hover': {
              backgroundColor: '#f57c00'
            }
          }}
        >
          <CloudIcon />
        </Fab>
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            mt: 8,
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          Create Server
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar; 