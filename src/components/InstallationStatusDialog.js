import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

const InstallationStatusDialog = ({ open, onClose, results }) => {
  if (!results || results.length === 0) return null;

  const successfulInstalls = results.filter(r => r.success && !r.alreadyInstalled);
  const alreadyInstalled = results.filter(r => r.alreadyInstalled);
  const failedInstalls = results.filter(r => !r.success && !r.alreadyInstalled);

  const getStatusIcon = (result) => {
    if (result.alreadyInstalled) {
      return <InfoIcon color="info" />;
    } else if (result.success) {
      return <SuccessIcon color="success" />;
    } else {
      return <ErrorIcon color="error" />;
    }
  };

  const getStatusColor = (result) => {
    if (result.alreadyInstalled) return 'info';
    if (result.success) return 'success';
    return 'error';
  };

  const getStatusText = (result) => {
    if (result.alreadyInstalled) {
      return `Already installed at: ${result.location}`;
    } else if (result.success) {
      return 'Successfully installed';
    } else {
      return `Failed: ${result.error || 'Unknown error'}`;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">
          Installation Results
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {successfulInstalls.length > 0 && (
            <Chip 
              label={`${successfulInstalls.length} Installed`} 
              color="success" 
              size="small" 
            />
          )}
          {alreadyInstalled.length > 0 && (
            <Chip 
              label={`${alreadyInstalled.length} Already Installed`} 
              color="info" 
              size="small" 
            />
          )}
          {failedInstalls.length > 0 && (
            <Chip 
              label={`${failedInstalls.length} Failed`} 
              color="error" 
              size="small" 
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <List dense>
          {results.map((result, index) => (
            <ListItem 
              key={index}
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1, 
                mb: 1,
                backgroundColor: result.alreadyInstalled ? 'info.light' : 
                               result.success ? 'success.light' : 'error.light',
                '&:hover': {
                  backgroundColor: result.alreadyInstalled ? 'info.main' : 
                                 result.success ? 'success.main' : 'error.main',
                  '& .MuiListItemText-primary': { color: 'white' },
                  '& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.8)' }
                }
              }}
            >
              <ListItemIcon>
                {getStatusIcon(result)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {result.name}
                    </Typography>
                    <Chip 
                      label={result.alreadyInstalled ? 'Already Installed' : 
                             result.success ? 'Installed' : 'Failed'} 
                      color={getStatusColor(result)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {getStatusText(result)}
                    </Typography>
                    {result.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <FolderIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {result.location}
                        </Typography>
                      </Box>
                    )}
                    {result.version && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Version: {result.version}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallationStatusDialog; 