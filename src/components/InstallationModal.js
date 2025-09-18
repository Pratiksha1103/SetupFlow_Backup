import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const InstallationModal = () => {
  const { isInstalling, installationProgress } = useAppContext();

  if (!isInstalling || !installationProgress) {
    return null;
  }

  const { current, total, currentApp, logs } = installationProgress;
  const progress = (current / total) * 100;

  return (
    <Dialog
      open={isInstalling}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">
          Installing Software
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while the software is being installed...
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress: {current} of {total} completed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Currently Installing:
          </Typography>
          <Paper sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6">
              {currentApp}
            </Typography>
          </Paper>
        </Box>

        {logs && logs.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Installation Status:
            </Typography>
            <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
              <List dense>
                {logs.map((log, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {log.status === 'success' && <SuccessIcon color="success" />}
                      {log.status === 'error' && <ErrorIcon color="error" />}
                      {log.status === 'pending' && <PendingIcon color="action" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={log.message}
                      secondary={log.timestamp}
                      primaryTypographyProps={{ fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstallationModal; 