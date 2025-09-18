import React from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { RadioButtonChecked as StatusIcon } from '@mui/icons-material';

const ConnectionPanel = ({ 
  apiKey, 
  isConnected, 
  onApiKeyChange, 
  onConnect, 
  onDisconnect 
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      mb: 2 
    }}>
      <Typography variant="h6">Echo Tower</Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Enter API Key"
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          sx={{ width: 300 }}
          disabled={isConnected}
        />
        <Button 
          variant="contained" 
          color={isConnected ? "error" : "primary"}
          onClick={isConnected ? onDisconnect : onConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
        {isConnected && (
          <StatusIcon 
            sx={{ 
              color: 'success.main',
              animation: 'pulse 2s infinite'
            }} 
          />
        )}
      </Box>
    </Box>
  );
};

export default ConnectionPanel;
