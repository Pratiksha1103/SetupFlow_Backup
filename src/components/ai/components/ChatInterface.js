import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import { Send as SendIcon, Build as FixIcon } from '@mui/icons-material';

const ChatInterface = ({ 
  value, 
  onChange, 
  onChat, 
  onFix,
  disabled 
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onChat();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        size="small"
        placeholder={disabled ? "Connect to AI to start chatting..." : "Type your message..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        multiline
        maxRows={3}
        disabled={disabled}
      />
      <Button 
        variant="contained" 
        color="primary"
        endIcon={<SendIcon />}
        onClick={onChat}
        disabled={disabled || !value.trim()}
      >
        Chat
      </Button>
      <Button
        variant="contained"
        color="secondary"
        endIcon={<FixIcon />}
        onClick={onFix}
        disabled={disabled}
      >
        Fix Issues
      </Button>
    </Box>
  );
};

export default ChatInterface;
