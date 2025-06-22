import { useState, useCallback } from 'react';
// Use onnxruntime-web but with proper configuration for Electron
import * as ort from 'onnxruntime-web';
import '../types/electron.d.ts';

interface DownloadProgress {
  progress: number;
  downloadedMB: number;
  totalMB: number;
  speedMBps: number;
  timeRemaining: number;
  status: string;
}

export function useModelLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<DownloadProgress>({
    progress: 0,
    downloadedMB: 0,
    totalMB: 0,
    speedMBps: 0,
    timeRemaining: 0,
    status: 'checking'
  });
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ort.InferenceSession | null>(null);

  const checkModelExists = useCallback(async (): Promise<boolean> => {
    try {
      const modelPath = '/models/model.onnx';
      const response = await fetch(modelPath, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const loadModel = useCallback(async (backend: string = 'webgl') => {
    try {
      setDownloadInfo(prev => ({ ...prev, status: 'checking' }));
      
      // Validate that bundled model exists and is valid
      const modelExists = await checkModelExists();
      
      if (!modelExists) {
        throw new Error('Bundled model not found. Please reinstall the application.');
      }

      setDownloadInfo(prev => ({ ...prev, status: 'validating', progress: 25 }));
      
      // Load and validate the bundled model
      const response = await fetch('/models/model.onnx');
      if (!response.ok) {
        throw new Error('Failed to load bundled model');
      }
      
      const modelArrayBuffer = await response.arrayBuffer();
      const sizeMB = modelArrayBuffer.byteLength / (1024 * 1024);
      
      // Basic validation - check if file size is reasonable (> 0.5MB for .onnx file)
      if (sizeMB < 0.5) {
        throw new Error('Model file appears to be corrupted (too small)');
      }
      
      // For split ONNX models, also check if data file exists
      try {
        const dataResponse = await fetch('/models/model.onnx_data', { method: 'HEAD' });
        if (dataResponse.ok) {
          console.log('✓ Found model data file');
        }
      } catch (e) {
        console.log('ℹ No separate data file found (single file model)');
      }
      
      setDownloadInfo(prev => ({ 
        ...prev, 
        status: 'validated', 
        progress: 75,
        totalMB: sizeMB,
        downloadedMB: sizeMB 
      }));

      // Initialize model session
      setDownloadInfo(prev => ({ ...prev, status: 'initializing', progress: 85 }));
      
      // Check if we're in Electron environment  
      const isElectron = window.electronAPI !== undefined || (window as any).process?.type === 'renderer';
      
      console.log('Environment check:', { 
        hasElectronAPI: !!window.electronAPI, 
        processType: (window as any).process?.type,
        isElectron 
      });
      
      if (isElectron && window.electronAPI) {
        // Use Electron's model loading service
        console.log('Using Electron model loading service...');
        const result = await window.electronAPI.loadModel({
          backend: backend,
          modelPath: '/models/model.onnx'
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to initialize model in Electron');
        }
        
        // Create a mock session for consistency
        setSession({ run: () => Promise.resolve({}) } as any);
      } else {
        // Browser fallback - external data models don't work well in browser
        console.warn('Running in browser mode - external data models not supported');
        console.log('Please use Electron for full model support');
        
        throw new Error('This model requires Electron to run properly. Browser mode does not support external data files.');
      }
      
      setIsLoaded(true);
      setDownloadInfo(prev => ({ 
        ...prev, 
        status: 'ready', 
        progress: 100 
      }));
      
      console.log(`✓ Model validated and ready with ${backend} backend`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setDownloadInfo(prev => ({ ...prev, status: 'error' }));
      console.error('Model loading failed:', err);
    }
  }, [checkModelExists]);

  const generateImage = useCallback(async (prompt: string, steps: number = 1) => {
    if (!session) {
      throw new Error('Model not loaded');
    }

    try {
      // This is a simplified version - you'd need proper tokenization and noise generation
      const feeds = {
        sample: new ort.Tensor('', [], []),
        timestep: new ort.Tensor('int64', [BigInt(1)], [1]),
        encoder_hidden_states: new ort.Tensor('', [], [])
      };

      const results = await session.run(feeds);
      return results;
    } catch (err) {
      console.error('Image generation failed:', err);
      throw err;
    }
  }, [session]);

  return { isLoaded, downloadInfo, error, session, loadModel, generateImage, checkModelExists };
}