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
  GetApp as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
  const { 
    availableSoftware, 
    selectedSoftware, 
    handleSoftwareSelection 
  } = useAppContext();

  const [expandedSoftware, setExpandedSoftware] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    '3DExperience': true,
    'Prerequisites': true,
    'Web': true,
    'DB': true,
    'Development': false,
    'Tools': false,
    'Other': false
  });

  // Software data with installation commands and categories
  const softwareDatabase = {
    'notepad++': {
      name: 'Notepad++',
      version: '8.8.5',
      description: 'Advanced text editor',
      installerPath: 'npp.8.8.5.Installer.x64.exe',
      command: '"{path}" /S /NCRC /D={installPath}',
      defaultInstallPath: 'C:\\apps\\Notepad++',
      supportsCustomPath: true,
      category: 'Tools'
    },
    'eclipse': {
      name: 'Eclipse IDE',
      version: '2023-09',
      description: 'Integrated Development Environment',
      installerPath: 'eclipse-inst-jre-win64.exe',
      command: '"{path}" -silent -nosplash -data "{installPath}\\workspace"',
      defaultInstallPath: 'C:\\apps\\Eclipse',
      supportsCustomPath: true,
      category: 'Development'
    },
    '7zip': {
      name: '7-Zip',
      version: '23.01',
      description: 'File archiver with high compression ratio',
      installerPath: '7z2301-x64.msi',
      command: 'msiexec /i "{path}" /quiet /norestart /qn INSTALLDIR="{installPath}"',
      defaultInstallPath: 'C:\\apps\\7-Zip',
      supportsCustomPath: true,
      category: 'Tools'
    },
    'git': {
      name: 'Git',
      version: '2.42.0',
      description: 'Distributed version control system',
      installerPath: 'Git-2.42.0.2-64-bit.exe',
      command: '"{path}" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES /DIR="{installPath}"',
      defaultInstallPath: 'C:\\apps\\Git',
      supportsCustomPath: true,
      category: 'Development'
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
      installerPath: 'n/a',
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
    
    // Default handling for unknown files with category detection
    const isZipFile = filename.toLowerCase().endsWith('.zip');
    let category = 'Other';
    
    // Auto-categorize based on filename patterns
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('3dpassport')) {
      category = '3DExperience';
    } else if (lowerFilename.includes('tomcat') || lowerFilename.includes('java') || lowerFilename.includes('gradle')) {
      category = 'Prerequisites';
    } else if (lowerFilename.includes('httpd') || lowerFilename.includes('apache')) {
      category = 'Web';
    } else if (lowerFilename.includes('oracle') || lowerFilename.includes('db_home')) {
      category = 'DB';
    }
    
    return {
      name: filename.replace(/\.[^/.]+$/, ""), // Remove extension
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

  const isSelected = (software) => {
    return selectedSoftware.some(item => item.name === software.name);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group software by categories
  const groupedSoftware = availableSoftware.reduce((groups, filename) => {
    const software = getSoftwareInfo(filename);
    const category = software.category || 'Other';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(software);
    
    return groups;
  }, {});

  // Define category order and icons
  const categoryConfig = {
    '3DExperience': { icon: '🎯', color: '#1976d2', priority: 1 },
    'Prerequisites': { icon: '⚙️', color: '#388e3c', priority: 2 },
    'Web': { icon: '🌐', color: '#f57c00', priority: 3 },
    'DB': { icon: '🗃️', color: '#7b1fa2', priority: 4 },
    'Development': { icon: '💻', color: '#d32f2f', priority: 5 },
    'Tools': { icon: '🔧', color: '#5d4037', priority: 6 },
    'Other': { icon: '📦', color: '#616161', priority: 7 }
  };

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedSoftware).sort((a, b) => {
    const priorityA = categoryConfig[a]?.priority || 999;
    const priorityB = categoryConfig[b]?.priority || 999;
    return priorityA - priorityB;
  });

  return (
    <Box sx={{ width: 300, p: 2, backgroundColor: 'background.default' }}>
      <Card sx={{ mb: 2, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppsIcon color="primary" />
          Applications
        </Typography>
        
        <List dense>
          {sortedCategories.map((category) => {
            const categoryApps = groupedSoftware[category];
            const isExpanded = expandedCategories[category];
            const config = categoryConfig[category] || categoryConfig.Other;
            
            return (
              <Box key={category}>
                {/* Category Header */}
                <ListItemButton
                  onClick={() => toggleCategory(category)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      {config.icon}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={category}
                    secondary={`${categoryApps.length} application${categoryApps.length !== 1 ? 's' : ''}`}
                    primaryTypographyProps={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: config.color
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.7rem'
                    }}
                  />
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>

                {/* Category Applications */}
                {isExpanded && (
                  <Box sx={{ ml: 2, mb: 1 }}>
                    {categoryApps.map((software, index) => {
                      const selected = isSelected(software);
                      
                      return (
                        <ListItem key={`${category}-${index}`} disablePadding>
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
                                fontSize: '0.85rem',
                                fontWeight: selected ? 600 : 400,
                                color: selected ? 'primary.contrastText' : 'text.primary'
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.7rem',
                                color: selected ? 'primary.contrastText' : 'text.secondary'
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </Box>
                )}
              </Box>
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