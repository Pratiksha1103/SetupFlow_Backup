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
  Divider,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
  Badge,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as LogIcon,
  DragIndicator as DragIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const LogsPanel = () => {
  const { logs, loadInitialData } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [panelHeight, setPanelHeight] = useState(200); // Larger default height for better visibility
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
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
    const newHeight = Math.max(100, Math.min(800, startHeight.current + deltaY));
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

  // Filter logs based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLogs(logs);
    } else {
      const filtered = logs.filter(log => 
        log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(log.createdAt).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    }
  }, [logs, searchTerm]);

  // Listen for real-time log updates
  useEffect(() => {
    let cleanup;
    
    if (window.electronAPI && typeof window.electronAPI.onLogsUpdated === 'function') {
      cleanup = window.electronAPI.onLogsUpdated(() => {
        // Refresh logs when installation completes
        if (loadInitialData) {
          loadInitialData();
        }
      });
    }
    
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [loadInitialData]);

  // Handle select all functionality
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLogs(new Set());
      setSelectAll(false);
    } else {
      const allLogIds = new Set(filteredLogs.map(log => log.id));
      setSelectedLogs(allLogIds);
      setSelectAll(true);
    }
  };

  // Handle individual log selection
  const handleLogSelection = (logId, event) => {
    event.stopPropagation();
    const newSelectedLogs = new Set(selectedLogs);
    
    if (newSelectedLogs.has(logId)) {
      newSelectedLogs.delete(logId);
    } else {
      newSelectedLogs.add(logId);
    }
    
    setSelectedLogs(newSelectedLogs);
    setSelectAll(newSelectedLogs.size === filteredLogs.length);
  };

  // Handle delete selected logs
  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedLogs.size} log file${selectedLogs.size > 1 ? 's' : ''}?`);
    if (!confirmed) return;

    try {
      const logIdsArray = Array.from(selectedLogs);
      const result = await window.electronAPI.deleteLogs(logIdsArray);
      
      if (result.success) {
        // Clear selections
        setSelectedLogs(new Set());
        setSelectAll(false);
        
        // Clear selected log if it was deleted
        if (selectedLog && selectedLogs.has(selectedLog.id)) {
          setSelectedLog(null);
          setLogContent('');
        }
        
        // Refresh the logs list without reloading the page
        loadInitialData();
        
        alert(result.message);
      } else {
        alert(`Failed to delete logs: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to delete logs. Please try again.');
    }
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
    if (!expanded) {
      setPanelHeight(Math.max(panelHeight, 400)); // Ensure good height when expanding
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
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
            color: 'white',
            borderBottom: '1px solid #e0e0e0',
            '&:hover': {
              background: 'linear-gradient(135deg, #d81b60 0%, #ec407a 100%)',
            }
          }}
          onClick={handleExpandClick}
        >
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700 }}>
            <LogIcon sx={{ fontSize: 28 }} />
            Installation Logs
            {logs.length > 0 && (
              <Badge 
                badgeContent={logs.length} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ff4444',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              >
                <Box />
              </Badge>
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {expanded ? 'Click to collapse' : 'Click to expand • Drag to resize'}
            </Typography>
            <Box sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%', 
              p: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {expanded ? <ExpandLess sx={{ fontSize: 24 }} /> : <ExpandMore sx={{ fontSize: 24 }} />}
            </Box>
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {/* Search and Controls Bar */}
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#f8f9fa', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: 2,
            alignItems: 'center'
          }}>
            <TextField
              size="small"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking search field
              sx={{ 
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent collapse when clearing search
                        setSearchTerm('');
                      }}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  size="small"
                />
              }
              label="Select All"
              onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking checkbox
              sx={{ mr: 1 }}
            />
            
            <Tooltip title={`Delete ${selectedLogs.size} selected log${selectedLogs.size !== 1 ? 's' : ''}`}>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to parent
                  handleDeleteSelected();
                }}
                disabled={selectedLogs.size === 0}
              >
                Delete ({selectedLogs.size})
              </Button>
            </Tooltip>
            
            <Tooltip title="Refresh logs">
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to parent
                  loadInitialData(); // Refresh logs without collapsing panel
                }}
              >
                Refresh
              </Button>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', height: 'calc(100vh - 300px)', minHeight: 400 }}>
            {/* Logs List */}
            <Box sx={{ width: '45%', borderRight: '1px solid', borderColor: 'divider', backgroundColor: '#fafafa' }}>
              <List sx={{ 
                height: '100%', 
                overflow: 'auto',
                p: 1,
                // Custom scrollbar styles
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f3f4',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#dadce0',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: '#bdc1c6',
                  },
                },
              }}>
                {filteredLogs.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary={searchTerm ? "No matching logs found" : "No logs available"}
                      secondary={searchTerm ? "Try adjusting your search terms" : "Installation logs will appear here"}
                      primaryTypographyProps={{ fontSize: '1rem', textAlign: 'center' }}
                      secondaryTypographyProps={{ fontSize: '0.85rem', textAlign: 'center' }}
                    />
                  </ListItem>
                ) : (
                  filteredLogs.map((log) => (
                    <ListItem key={log.id} disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        onClick={() => handleLogClick(log)}
                        selected={selectedLog?.id === log.id}
                        sx={{ 
                          py: 1.5,
                          px: 2,
                          borderRadius: 2,
                          mx: 0.5,
                          backgroundColor: selectedLog?.id === log.id ? '#fce4ec' : 'white',
                          border: '1px solid',
                          borderColor: selectedLogs.has(log.id) ? '#e91e63' : 
                                     selectedLog?.id === log.id ? '#e91e63' : '#e0e0e0',
                          '&:hover': {
                            backgroundColor: selectedLog?.id === log.id ? '#fce4ec' : '#f5f5f5',
                            borderColor: '#e91e63',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                          <Checkbox
                            checked={selectedLogs.has(log.id)}
                            onChange={(e) => handleLogSelection(log.id, e)}
                            size="small"
                            sx={{
                              color: '#e91e63',
                              '&.Mui-checked': {
                                color: '#e91e63',
                              },
                            }}
                          />
                          <ViewIcon 
                            sx={{ 
                              fontSize: 20,
                              color: selectedLog?.id === log.id ? '#e91e63' : '#666'
                            }}
                          />
                        </Box>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: 600,
                                color: selectedLog?.id === log.id ? '#c2185b' : 'text.primary'
                              }}
                            >
                              {log.filename.replace('.log', '')}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(log.createdAt)}
                              </Typography>
                              <Chip 
                                label={formatFileSize(log.size)} 
                                size="small" 
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
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
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f8f9fa',
              overflow: 'hidden'
            }}>
              {/* Log Content Header */}
              {selectedLog && (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#fce4ec', 
                  borderBottom: '1px solid #f8bbd9'
                }}>
                  <Typography variant="subtitle1" sx={{ color: '#c2185b', fontWeight: 600 }}>
                    {selectedLog.filename.replace('.log', '')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {formatDate(selectedLog.createdAt)} • {formatFileSize(selectedLog.size)}
                  </Typography>
                </Box>
              )}
              
                            {/* Log Content Body */}
              <Box sx={{ 
                flex: 1,
                overflow: 'scroll', // Always show scrollbar
                backgroundColor: '#1a1a1a',
                // Custom pink scrollbar styles to match logo
                '&::-webkit-scrollbar': {
                  width: '14px', // Wider scrollbar for better visibility
                  height: '14px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#2d2d2d',
                  borderRadius: '7px',
                  border: '1px solid #404040',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#e91e63', // Pink color to match logo
                  borderRadius: '7px',
                  border: '2px solid #2d2d2d',
                  boxShadow: 'inset 0 0 4px rgba(255,255,255,0.2)',
                  '&:hover': {
                    backgroundColor: '#f06292', // Lighter pink on hover
                    boxShadow: 'inset 0 0 6px rgba(255,255,255,0.3)',
                  },
                  '&:active': {
                    backgroundColor: '#ff4081', // Bright pink when active
                    boxShadow: 'inset 0 0 8px rgba(255,255,255,0.4)',
                  },
                },
                '&::-webkit-scrollbar-corner': {
                  backgroundColor: '#2d2d2d',
                },
                // Firefox scrollbar with pink theme
                scrollbarWidth: 'auto',
                scrollbarColor: '#e91e63 #2d2d2d',
              }}>
                {selectedLog ? (
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      fontFamily: '"Courier New", "Consolas", "Monaco", monospace',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#e0e0e0',
                      backgroundColor: '#1a1a1a',
                      margin: 0,
                      padding: '20px',
                      minHeight: '100%',
                      display: 'block'
                    }}
                  >
                    {logContent || 'Loading log content...'}
                  </Typography>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <LogIcon sx={{ fontSize: 64, mb: 2, color: '#bbb' }} />
                    <Typography variant="h6" sx={{ color: '#666', mb: 1, fontWeight: 500 }}>
                      No Log Selected
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999' }}>
                      Click on a log file to view its contents
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Card>
    </Box>
  );
};

export default LogsPanel; 