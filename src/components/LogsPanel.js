import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as LogIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const LogsPanel = () => {
  const { logs } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logContent, setLogContent] = useState('');

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleLogClick = async (log) => {
    if (selectedLog?.id === log.id) {
      setSelectedLog(null);
      setLogContent('');
      return;
    }

    try {
      const result = await window.electronAPI.readLog(log.id);
      if (result.success) {
        setSelectedLog(log);
        setLogContent(result.content);
      }
    } catch (error) {
      console.error('Failed to read log:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box sx={{ height: expanded ? 300 : 60, transition: 'height 0.3s ease' }}>
      <Card sx={{ m: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={handleExpandClick}
        >
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogIcon color="primary" />
            Success / Failure Logs
            {logs.length > 0 && (
              <Chip 
                label={logs.length} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
          </Typography>
          <IconButton>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />
          <Box sx={{ display: 'flex', height: 220 }}>
            {/* Logs List */}
            <Box sx={{ width: '40%', borderRight: '1px solid', borderColor: 'divider' }}>
              <List dense sx={{ height: '100%', overflow: 'auto' }}>
                {logs.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No logs available"
                      secondary="Installation logs will appear here"
                      primaryTypographyProps={{ fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                ) : (
                  logs.map((log) => (
                    <ListItem key={log.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleLogClick(log)}
                        selected={selectedLog?.id === log.id}
                        sx={{ py: 1 }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {log.filename}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(log.createdAt)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(log.size)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>

            {/* Log Content */}
            <Box sx={{ flex: 1, p: 2 }}>
              {selectedLog ? (
                <Paper 
                  sx={{ 
                    p: 2, 
                    height: '100%', 
                    backgroundColor: 'grey.900',
                    color: 'common.white',
                    overflow: 'auto'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {logContent || 'Loading log content...'}
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a log file to view its contents
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Collapse>
      </Card>
    </Box>
  );
};

export default LogsPanel; 