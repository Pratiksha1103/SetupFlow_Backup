import React, { useState, useRef, useEffect } from 'react';
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
  Description as LogIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const LogsPanel = () => {
  const { logs } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [panelHeight, setPanelHeight] = useState(80); // Increased default height
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY; // Inverted for upward drag
    const newHeight = Math.max(60, Math.min(400, startHeight.current + deltaY));
    setPanelHeight(newHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleExpandClick = () => {
    setExpanded(!expanded);
    if (!expanded) {
      setPanelHeight(Math.max(panelHeight, 200)); // Ensure good height when expanding
    }
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
      // console.error('Failed to read log:', error);
      setLogContent('Failed to load log content.');
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
    <Box sx={{ 
      height: panelHeight, // Use dynamic height
      transition: isDragging ? 'none' : 'height 0.3s ease',
      flexShrink: 0, // Prevent shrinking
      position: 'relative'
    }}>
      {/* Drag Handle */}
      <Box
        ref={dragRef}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          cursor: 'ns-resize',
          backgroundColor: isDragging ? 'primary.main' : 'transparent',
          borderTop: '2px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          '&:hover': {
            backgroundColor: 'primary.light',
            borderTop: '2px solid #1976d2',
          },
          transition: 'all 0.2s ease'
        }}
      >
        <DragIcon 
          sx={{ 
            fontSize: 16, 
            color: isDragging ? 'white' : 'text.secondary',
            transform: 'rotate(90deg)',
            opacity: 0.7
          }} 
        />
      </Box>

      <Card sx={{ 
        mx: 2, 
        mb: 1,
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        mt: 1, // Add margin top for drag handle
        boxShadow: 3, // More prominent shadow
        border: '1px solid #e0e0e0' // Add border for visibility
      }}>
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            backgroundColor: 'grey.50', // Light background to make it more visible
            borderBottom: '1px solid #e0e0e0'
          }}
          onClick={handleExpandClick}
        >
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <LogIcon color="primary" />
            Success / Failure Logs
            {logs.length > 0 && (
              <Chip 
                label={logs.length} 
                size="small" 
                color="primary" 
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {expanded ? 'Click to collapse' : 'Click to expand • Drag top edge to resize'}
            </Typography>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />
          <Box sx={{ display: 'flex', height: 220 }}>
            {/* Logs List */}
            <Box sx={{ width: '40%', borderRight: '1px solid', borderColor: 'divider' }}>
              <List dense sx={{ 
                height: '100%', 
                overflow: 'auto',
                // Custom grey scrollbar styles for logs list
                '&::-webkit-scrollbar': {
                  width: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f8f9fa',
                  borderRadius: '5px',
                  border: '1px solid #dee2e6',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#6c757d', // Grey color
                  borderRadius: '5px',
                  border: '1px solid #f8f9fa',
                  '&:hover': {
                    backgroundColor: '#5a6268', // Darker grey on hover
                  },
                  '&:active': {
                    backgroundColor: '#495057', // Darkest grey when active
                  },
                },
              }}>
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
            <Box sx={{ 
              flex: 1, 
              p: 2, 
              backgroundColor: 'grey.900', 
              color: 'white',
              overflow: 'auto',
              // Custom grey scrollbar styles for log content
              '&::-webkit-scrollbar': {
                width: '10px',
                height: '10px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#2d3748',
                borderRadius: '5px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#6c757d', // Grey color
                borderRadius: '5px',
                border: '1px solid #2d3748',
                '&:hover': {
                  backgroundColor: '#5a6268', // Darker grey on hover
                },
                '&:active': {
                  backgroundColor: '#495057', // Darkest grey when active
                },
              },
              '&::-webkit-scrollbar-corner': {
                backgroundColor: '#2d3748',
              },
            }}>
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