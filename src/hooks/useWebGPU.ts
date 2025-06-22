import { useState, useEffect } from 'react';

export function useGPUAcceleration() {
  const [isSupported, setIsSupported] = useState(false);
  const [backend, setBackend] = useState<string>('cpu');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGPU = async () => {
      try {
        // For Electron, we'll use CPU backend for maximum compatibility
        // This ensures stable operation across all systems
        setBackend('cpu');
        setIsSupported(true);
        console.log('✓ CPU backend enabled (optimized for Electron)');
        
        // Check if WebGL is available for future use
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          console.log('✓ WebGL detected (available but not used in this version)');
        }
      } catch (err) {
        console.error('Backend initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBackend('cpu');
        setIsSupported(true);
      }
    };

    initGPU();
  }, []);

  return { isSupported, backend, error };
}