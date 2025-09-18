import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip
} from '@mui/material';
import {
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const Header = () => {
  const { availableSoftware, selectedSoftware } = useAppContext();

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              fontSize: '1.5rem'
            }}
          >
            SetupFlow
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {selectedSoftware.length > 0 && (
            <Chip
              label={`${selectedSoftware.length} selected`}
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
          
          <Chip
            label={`${availableSoftware.length} available`}
            color="default"
            size="small"
            variant="outlined"
          />

          <Button
            variant="text"
            startIcon={<SettingsIcon />}
            sx={{ color: 'text.secondary' }}
          >
            Settings
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 