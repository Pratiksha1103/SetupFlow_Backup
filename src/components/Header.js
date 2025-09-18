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
import setupFlowLogo from '../assets/setupflow-logo.png';

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
          {/* Instagram-style Logo with Curved Border */}
          <Box
            component="img"
            src={setupFlowLogo}
            alt="SetupFlow"
            sx={{
              height: 44,
              width: 44,
              objectFit: 'cover',
              // Instagram-style border radius (approximately 22% of the size)
              borderRadius: '10px', // Instagram uses about 22% border radius
              // Enhanced shadow and styling
              boxShadow: '0 2px 12px rgba(236, 72, 153, 0.3)',
              border: '2px solid transparent',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #e91e63, #ff6b35) border-box',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.08)',
                boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)',
                // Subtle rotation on hover like Instagram
                rotate: '2deg',
              }
            }}
          />
          {/* Keep the SetupFlow text */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              fontSize: '1.5rem',
              display: { xs: 'none', sm: 'block' }
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