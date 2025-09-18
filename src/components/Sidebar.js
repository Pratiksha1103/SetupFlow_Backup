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
  Button
} from '@mui/material';
import {
  Apps as AppsIcon,
  GetApp as DownloadIcon
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
      defaultInstallPath: 'C:\\apps\\Eclipse',
      supportsCustomPath: true
    },
    '7zip': {
      name: '7-Zip',
      version: '23.01',
      description: 'File archiver with high compression ratio',
      installerPath: '7z2301-x64.msi',
      command: 'msiexec /i "{path}" /quiet /norestart /qn INSTALLDIR="{installPath}"',
      defaultInstallPath: 'C:\\apps\\7-Zip',
      supportsCustomPath: true
    },
    'git': {
      name: 'Git',
      version: '2.42.0',
      description: 'Distributed version control system',
      installerPath: 'Git-2.42.0.2-64-bit.exe',
      command: '"{path}" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES /DIR="{installPath}"',
      defaultInstallPath: 'C:\\apps\\Git',
      supportsCustomPath: true
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
      command: `"{path}" /S`,
      defaultInstallPath: `C:\\apps\\${filename.replace(/\.[^/.]+$/, "")}`,
      supportsCustomPath: true
    };
  };

  const isSelected = (software) => {
    return selectedSoftware.some(item => item.name === software.name);
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


    </Box>
  );
};

export default Sidebar; 