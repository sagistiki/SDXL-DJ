export interface ElectronAPI {
  // Model operations
  loadModel: (config: { backend: string; modelPath: string }) => Promise<{ success: boolean; error?: string }>;
  generateImage: (config: GenerationConfig) => Promise<{ success: boolean; imageData?: ArrayBuffer; metadata?: any; error?: string }>;
  disposeModel: () => Promise<{ success: boolean; error?: string }>;
  
  // File operations
  selectModelFile: () => Promise<{ success: boolean; filePath?: string }>;
  
  // Window operations
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  
  // System monitoring
  getSystemStats: () => Promise<{ success: boolean; stats?: SystemStats; error?: string }>;
  
  // Event listeners
  onModelProgress: (callback: (event: any, data: any) => void) => void;
  onModelLoaded: (callback: (event: any, data: any) => void) => void;
  onModelError: (callback: (event: any, data: any) => void) => void;
}

export interface GenerationConfig {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
}

export interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    speed: number;
  };
  memory: {
    used: number;
    usedGB: number;
    totalGB: number;
    available: number;
  };
  gpu: Array<{
    model: string;
    vendor: string;
    vram: number;
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    modelsLoaded?: boolean;
  }
}