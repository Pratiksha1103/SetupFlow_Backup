import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import ConnectionPanel from './components/ConnectionPanel';
import LogAnalysis from './components/LogAnalysis';
import AIResponse from './components/AIResponse';
import ChatInterface from './components/ChatInterface';

const EchoTower = () => {
  // Local state for demo purposes - will be moved to context in Phase 2
  const [isConnected, setIsConnected] = React.useState(false);
  const [apiKey, setApiKey] = React.useState('');
  const [chatInput, setChatInput] = React.useState('');

  const handleConnect = () => {
    if (apiKey.trim()) {
      setIsConnected(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setApiKey('');
  };

  const handleChat = () => {
    if (chatInput.trim()) {
      // Will implement in Phase 2
      console.log('Chat:', chatInput);
      setChatInput('');
    }
  };

  const handleFix = () => {
    // Will implement in Phase 2
    console.log('Fix requested');
  };

  return (
    <Box sx={{ height: 400, m: 2 }}>
      <Card sx={{ height: '100%', p: 2 }}>
        {/* Header with Connection Controls */}
        <ConnectionPanel 
          apiKey={apiKey}
          isConnected={isConnected}
          onApiKeyChange={setApiKey}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          height: 'calc(100% - 60px)'
        }}>
          {/* Left Panel - Log Analysis */}
          <LogAnalysis />

          {/* Right Panel - AI Response & Chat */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AIResponse />
            <ChatInterface 
              value={chatInput}
              onChange={setChatInput}
              onChat={handleChat}
              onFix={handleFix}
              disabled={!isConnected}
            />
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default EchoTower;
