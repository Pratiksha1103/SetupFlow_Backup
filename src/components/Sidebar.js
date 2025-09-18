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
  GetApp as DownloadIcon,
  CheckBox as SelectAllIcon,
  CheckBoxOutlineBlank as DeselectAllIcon,
  SelectAll as SelectIcon,
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
    getSoftwareInfo,    // Get this from context (App.js)
    isRefreshing
  } = useAppContext();

  const [expandedSoftware, setExpandedSoftware] = useState(null);

  // Remove the duplicate softwareDatabase and getSoftwareInfo definitions
  // They are now in App.js and accessed through context

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
                  startIcon={<SelectAllIcon />}
                  disabled={selectedSoftware.length === availableSoftware.length}
                  color={selectedSoftware.length === availableSoftware.length ? "success" : "primary"}
                >
                  All
                </Button>
              </Tooltip>
              <Tooltip title="Clear Selection">
                <Button
                  onClick={handleDeselectAll}
                  startIcon={<ClearIcon />}
                  disabled={selectedSoftware.length === 0}
                  color={selectedSoftware.length === 0 ? "secondary" : "error"}
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
            height: '230px',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#fafafa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '8px 4px',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#6c757d',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: '#5a6268',
              },
              '&:active': {
                backgroundColor: '#495057',
              },
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#6c757d #f1f1f1',
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