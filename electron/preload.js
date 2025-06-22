const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Model operations
  loadModel: (config) => ipcRenderer.invoke('load-model', config),
  generateImage: (config) => ipcRenderer.invoke('generate-image', config),
  disposeModel: () => ipcRenderer.invoke('dispose-model'),
  
  // File operations
  selectModelFile: () => ipcRenderer.invoke('dialog:openFile'),
  
  // App operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  
  // System monitoring
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  
  // Events
  onModelProgress: (callback) => {
    ipcRenderer.on('model-progress', callback);
  },
  onModelLoaded: (callback) => {
    ipcRenderer.on('model-loaded', callback);
  },
  onModelError: (callback) => {
    ipcRenderer.on('model-error', callback);
  }
});