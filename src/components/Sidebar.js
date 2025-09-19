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
  ButtonGroup,
  Tooltip
} from '@mui/material';
import {
  Apps as AppsIcon,
  Check as SelectAllIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
  const { 
    availableSoftware, 
    selectedSoftware, 
    handleSoftwareSelection,
    handleSelectAll,
    handleDeselectAll,
    handleRefreshList,
    getSoftwareInfo,
    isRefreshing
  } = useAppContext();

  // State for category expansion
  const [expandedCategories, setExpandedCategories] = useState({
    '3DExperience': true,
    'Prerequisites': true,
    'Web': true,
    'DB': true,
    'Other': true
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const isSelected = (software) => {
    return selectedSoftware.some(item => item.name === software.name);
  };

  // Group software by category
  const groupedSoftware = availableSoftware.reduce((groups, filename) => {
    const software = getSoftwareInfo(filename);
    const category = software.category || 'Other';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(software);
    
    return groups;
  }, {});

  // Category configuration with icons and colors
  const categoryConfig = {
    '3DExperience': {
      icon: '🏢',
      color: '#1976d2',
      priority: 1
    },
    'Prerequisites': {
      icon: '⚙️',
      color: '#388e3c',
      priority: 2
    },
    'Web': {
      icon: '🌐',
      color: '#f57c00',
      priority: 3
    },
    'DB': {
      icon: '🗄️',
      color: '#7b1fa2',
      priority: 4
    },
    'Other': {
      icon: '📦',
      color: '#616161',
      priority: 5
    }
  };

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedSoftware).sort((a, b) => {
    const priorityA = categoryConfig[a]?.priority || 99;
    const priorityB = categoryConfig[b]?.priority || 99;
    return priorityA - priorityB;
  });

  return (
    <Box sx={{ 
      width: 400, 
      p: 2, 
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card sx={{ 
        mb: 2, 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppsIcon color="primary" />
          Applications
        </Typography>
        
        {/* Status Display */}
        {availableSoftware.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {selectedSoftware.length} of {availableSoftware.length} selected
          </Typography>
        )}

        {/* Select All / Deselect All Buttons */}
        {availableSoftware.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <ButtonGroup variant="outlined" size="small" fullWidth>
              <Tooltip title="Select All Software">
                <Button
                  onClick={handleSelectAll}
                  startIcon={<SelectAllIcon sx={{ color: selectedSoftware.length === availableSoftware.length ? '#4caf50' : '#1976d2' }} />}
                  disabled={selectedSoftware.length === availableSoftware.length}
                  variant={selectedSoftware.length === availableSoftware.length ? "contained" : "text"}
                  color={selectedSoftware.length === availableSoftware.length ? "success" : "primary"}
                  sx={{
                    backgroundColor: selectedSoftware.length === availableSoftware.length ? 'success.main' : 'transparent',
                    color: selectedSoftware.length === availableSoftware.length ? 'white' : 'text.primary',
                    border: 'none',
                    '&:hover': {
                      backgroundColor: selectedSoftware.length === availableSoftware.length ? 'success.dark' : 'action.hover'
                    }
                  }}
                >
                  All
                </Button>
              </Tooltip>
              <Tooltip title="Clear Selection">
                <Button
                  onClick={handleDeselectAll}
                  startIcon={<ClearIcon sx={{ color: selectedSoftware.length === 0 ? '#4caf50' : '#f44336' }} />}
                  disabled={selectedSoftware.length === 0}
                  variant={selectedSoftware.length === 0 ? "contained" : "text"}
                  color={selectedSoftware.length === 0 ? "success" : "error"}
                  sx={{
                    backgroundColor: selectedSoftware.length === 0 ? 'success.main' : 'transparent',
                    color: selectedSoftware.length === 0 ? 'white' : 'text.primary',
                    border: 'none',
                    '&:hover': {
                      backgroundColor: selectedSoftware.length === 0 ? 'success.dark' : 'action.hover'
                    }
                  }}
                >
                  Clear
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>
        )}

        <List 
          dense 
          sx={{ 
            flex: 1,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f0f0f0',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c0c0c0',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: '#a0a0a0',
              },
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#c0c0c0 #f0f0f0',
          }}
        >
          {sortedCategories.map((category) => {
            const categoryApps = groupedSoftware[category];
            const config = categoryConfig[category] || categoryConfig['Other'];
            const isExpanded = expandedCategories[category];
            
            return (
              <Box key={category} sx={{ mb: 1 }}>
                {/* Category Header */}
                <ListItemButton
                  onClick={() => toggleCategory(category)}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: `${config.color}15`,
                    '&:hover': {
                      backgroundColor: `${config.color}25`,
                    },
                    mb: 0.5
                  }}
                >
                  <ListItemIcon>
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
                      fontSize: '0.75rem',
                      color: 'text.secondary'
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
                              backgroundColor: 'transparent',
                              '&:hover': {
                                backgroundColor: 'action.hover'
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
                                color: selected ? '#4caf50' : 'text.primary'
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.7rem',
                                color: selected ? '#4caf50' : 'text.secondary'
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
          startIcon={<RefreshIcon />}
          onClick={handleRefreshList}
          disabled={isRefreshing}
          fullWidth
          size="small"
          sx={{ 
            mb: 1,
            '&:disabled': {
              opacity: 0.6
            }
          }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh List'}
        </Button>
      </Card>
    </Box>
  );
};

export default Sidebar;