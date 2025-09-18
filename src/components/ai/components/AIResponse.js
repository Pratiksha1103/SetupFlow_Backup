import React from 'react';
import { Paper, Typography } from '@mui/material';

const AIResponse = () => {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        flex: 1,
        p: 2,
        overflow: 'auto'
      }}
    >
      <Typography variant="subtitle2" gutterBottom>AI Analysis</Typography>
      <Typography variant="body2" color="text.secondary">
        Connect to AI to start receiving analysis...
      </Typography>
    </Paper>
  );
};

export default AIResponse;
