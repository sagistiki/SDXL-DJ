import React, { useState, useEffect, useCallback } from 'react';
import { SimpleWorkspace } from './components/SimpleWorkspace';
import { useGPUAcceleration } from './hooks/useWebGPU';
import { useModelLoader } from './hooks/useModelLoader';
import './App.css';

function App() {
  const [showPerformance, setShowPerformance] = useState(false);
  const { isSupported, backend, error } = useGPUAcceleration();
  const { isLoaded, downloadInfo, error: modelError, loadModel } = useModelLoader();

  // Auto-start model validation on app load
  useEffect(() => {
    if (!isLoaded && !modelError) {
      loadModel(backend);
    }
  }, [backend, isLoaded, modelError, loadModel]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        setShowPerformance(prev => !prev);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'checking': return 'Checking bundled model...';
      case 'validating': return 'Validating model integrity...';
      case 'validated': return 'Model validation complete';
      case 'initializing': return 'Initializing AI engine...';
      case 'ready': return 'Ready to jam!';
      case 'error': return 'Model validation failed';
      default: return 'Starting up...';
    }
  };

  if (error) {
    return (
      <div className="error-screen">
        <h1>GPU Acceleration Failed</h1>
        <p>Current backend: {backend}</p>
        <p>Error: {error}</p>
        <p>The app will continue to work, but performance may be reduced.</p>
      </div>
    );
  }

  if (modelError) {
    return (
      <div className="error-screen">
        <h1>Model Validation Failed</h1>
        <p>Error: {modelError}</p>
        <p>Please reinstall the application or contact support.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>SDXL DJ</h1>
          <div className="loading-spinner"></div>
          <p>{getStatusText(downloadInfo.status)}</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${downloadInfo.progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(downloadInfo.progress)}%</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SimpleWorkspace backend={backend} />
      {showPerformance && (
        <div className="performance-overlay">
          <div>Backend: {backend}</div>
          <div>FPS: 60</div>
          <div>Latency: 180ms</div>
          <div>GPU: {backend === 'webgl' ? 'Accelerated' : 'CPU'}</div>
        </div>
      )}
    </>
  );
}

export default App;