import React from 'react';
import { Paper, Typography } from '@mui/material';

const LogAnalysis = () => {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        height: '100%',
        p: 2,
        overflow: 'auto'
      }}
    >
      <Typography variant="subtitle2" gutterBottom>Log Analysis</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
        Waiting for log data...
      </Typography>
    </Paper>
  );
};

export default LogAnalysis;
