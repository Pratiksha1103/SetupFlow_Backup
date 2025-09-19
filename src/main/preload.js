const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Software management
  getAvailableSoftware: () => ipcRenderer.invoke('get-available-software'),
  
  // Profile management
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profileData) => ipcRenderer.invoke('save-profile', profileData),
  
  // Installation
  installSoftware: (installData) => ipcRenderer.invoke('install-software', installData),
  
  // Logging
  getLogs: () => ipcRenderer.invoke('get-logs'),
  readLog: (logId) => ipcRenderer.invoke('read-log', logId),
  deleteLogs: (logIds) => ipcRenderer.invoke('delete-logs', logIds),
  
  // Utility
  getAppVersion: () => process.env.npm_package_version || '0.1.0',
  getPlatform: () => process.platform,
  
  // Event listeners
  onSoftwareAlreadyInstalled: (callback) => {
    ipcRenderer.on('software-already-installed', callback);
    return () => ipcRenderer.removeAllListeners('software-already-installed');
  },
  onLogsUpdated: (callback) => {
    ipcRenderer.on('logs-updated', callback);
    return () => ipcRenderer.removeAllListeners('logs-updated');
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Security: Remove any global Node.js APIs that might be exposed
delete window.require;
delete window.exports;
delete window.module; 