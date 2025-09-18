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
  Check as SelectAllIcon, // Changed from CheckBox to Check for a simple tick
  Clear as ClearIcon,
  Refresh as RefreshIcon
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

  const isSelected = (software) => {
    return selectedSoftware.some(item => item.name === software.name);
  };

  return (
    <Box sx={{ 
      width: 400, 
      p: 2, 
      backgroundColor: 'background.default',
      // Remove height: 100% since we now have fixed height content
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card sx={{ 
        mb: 2, 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        // Remove flex: 1 and height: 100% since we now have fixed height content
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
                  None
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>
        )}
        
        <List 
          dense 
          sx={{
            height: '180px', // Fixed height to show exactly 3 items (each item ~60px)
            minHeight: '180px', // Ensure minimum height
            maxHeight: '180px', // Ensure maximum height
            overflowY: 'scroll', // Always show scrollbar (not just 'auto')
            overflowX: 'hidden',
            backgroundColor: '#fafafa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '8px 4px',
            // Custom grey scrollbar styles for applications list
            '&::-webkit-scrollbar': {
              width: '12px', // Make scrollbar more visible
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
                    backgroundColor: 'transparent', // Removed blue background
                    '&:hover': {
                      backgroundColor: 'action.hover' // Same hover color for all items
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
                      color: selected ? '#4caf50' : 'text.primary' // Green color when selected
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: selected ? '#4caf50' : 'text.secondary' // Green color when selected
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
