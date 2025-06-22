import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { EffectsPanel } from './EffectsPanel';
import { SystemMonitor } from './SystemMonitor';
import './SimpleWorkspace.css';

interface Prompt {
  id: number;
  text: string;
  weight: number;
  active: boolean;
}

interface Effect {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  intensity: number;
  speed: number;
  target: 'seed' | 'prompt_weights' | 'selected_prompts';
  targetPrompts: number[];
  params: Record<string, any>;
}

interface ResolutionOption {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
}

// SDXL native resolutions (total pixels ~1M for optimal SDXL performance)
const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { name: "Test Small", width: 512, height: 512, aspectRatio: "1:1" }, // For testing
  { name: "SDXL Square", width: 1024, height: 1024, aspectRatio: "1:1" }, // 1.05M pixels - Native SDXL
  { name: "Portrait", width: 896, height: 1152, aspectRatio: "7:9" }, // 1.03M pixels
  { name: "Landscape", width: 1152, height: 896, aspectRatio: "9:7" }, // 1.03M pixels  
  { name: "Widescreen", width: 1344, height: 768, aspectRatio: "7:4" }, // 1.03M pixels
  { name: "Cinema", width: 1536, height: 640, aspectRatio: "12:5" }, // 0.98M pixels
  { name: "Standard 4:3", width: 1152, height: 896, aspectRatio: "4:3" }, // 1.03M pixels
  { name: "Mobile Vertical", width: 832, height: 1216, aspectRatio: "13:19" }, // 1.01M pixels
  { name: "Ultra Wide", width: 1728, height: 576, aspectRatio: "3:1" }, // 0.99M pixels
  { name: "Tall Portrait", width: 768, height: 1344, aspectRatio: "4:7" }, // 1.03M pixels
];

const STEPS_OPTIONS = [
  { value: 1, label: "1 Step", description: "Ultra Fast - Best for real-time", performance: "⚡⚡⚡" },
  { value: 2, label: "2 Steps", description: "Very Fast - Recommended", performance: "⚡⚡" },
  { value: 3, label: "3 Steps", description: "Fast - Good balance", performance: "⚡" },
  { value: 4, label: "4 Steps", description: "Balanced - More detail", performance: "⚖️" },
  { value: 5, label: "5 Steps", description: "Slow - Higher quality", performance: "🐌" },
  { value: 6, label: "6 Steps", description: "Very Slow - Premium quality", performance: "🐌🐌" },
  { value: 7, label: "7 Steps", description: "Ultra Slow - Maximum quality", performance: "🐌🐌🐌" },
];

export function SimpleWorkspace({ backend }: { backend: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeed, setCurrentSeed] = useState(42);
  const [baseSeed, setBaseSeed] = useState(42);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const debounceTimeoutRef = useRef<number>();
  
  // Generation settings
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption>(RESOLUTION_OPTIONS[0]);
  const [steps, setSteps] = useState(1);
  
  // Prompts system
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: 1, text: '', weight: 100, active: true },
    { id: 2, text: '', weight: 0, active: false },
    { id: 3, text: '', weight: 0, active: false },
    { id: 4, text: '', weight: 0, active: false },
  ]);

  // Effects
  const [effects, setEffects] = useState<Effect[]>([]);
  const [bpm, setBpm] = useState(120);
  const [beatSync, setBeatSync] = useState(false);
  const [lfoValues, setLfoValues] = useState<Record<string, number>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

  // Calculate effect values
  const calculateEffectValue = useCallback((effect: Effect, time: number): number => {
    const frequency = beatSync ? (bpm / 60) * effect.speed : effect.speed;
    const phase = (time * frequency * 2 * Math.PI) / 1000;
    
    let baseValue = 0;
    
    switch (effect.id) {
      case 'wave_rider':
        baseValue = Math.sin(phase);
        break;
      case 'pulse_storm':
        const pulseCount = effect.params.pulseCount || 3;
        baseValue = Math.sin(phase) * Math.sin(phase * pulseCount);
        break;
      case 'chaos_drift':
        const randomness = effect.params.randomness || 0.5;
        baseValue = (Math.random() - 0.5) * randomness + Math.sin(phase) * (1 - randomness);
        break;
      case 'rhythm_lock':
        baseValue = Math.sign(Math.sin(phase));
        break;
      case 'morph_flow':
        baseValue = Math.sin(phase) + Math.sin(phase * 2) / 2;
        break;
      case 'dream_shift':
        baseValue = Math.sin(phase + Math.sin(phase * 0.5));
        break;
      default:
        baseValue = Math.sin(phase);
    }
    
    return baseValue * (effect.intensity / 100);
  }, [bpm, beatSync]);

  // Generate combined prompt
  const getCombinedPrompt = useCallback((): string => {
    const activePrompts = prompts.filter(p => p.active && p.text.trim());
    if (activePrompts.length === 0) return '';
    
    const totalWeight = activePrompts.reduce((sum, p) => sum + p.weight, 0);
    
    return activePrompts
      .map(p => {
        const normalizedWeight = (p.weight / totalWeight) * 100;
        return `(${p.text}:${(normalizedWeight / 100).toFixed(2)})`;
      })
      .join(' ');
  }, [prompts]);

  // Real image generation using SDXL model
  const generateImage = useCallback(async () => {
    if (!canvasRef.current) return;
    
    const combinedPrompt = getCombinedPrompt();
    if (!combinedPrompt) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas size to match selected resolution
    canvas.width = selectedResolution.width;
    canvas.height = selectedResolution.height;

    try {
      setIsGenerating(true);
      setGenerationStatus('Starting generation...');
      
      // Check if we're in Electron environment
      if (window.electronAPI) {
        console.log('🎨 Generating image with SDXL...', {
          prompt: combinedPrompt,
          seed: currentSeed,
          resolution: selectedResolution,
          steps: steps
        });
        
        // First generation might need to load models
        if (!window.modelsLoaded) {
          setGenerationStatus('Loading AI models for the first time... This may take a minute.');
        } else {
          setGenerationStatus('Generating image...');
        }

        // Call Electron's image generation
        const result = await window.electronAPI.generateImage({
          prompt: combinedPrompt,
          width: selectedResolution.width,
          height: selectedResolution.height,
          steps: steps,
          seed: currentSeed,
          cfg_scale: 7.5,
          negative_prompt: "blurry, low quality, distorted"
        });

        if (result.success && result.imageData && result.metadata) {
          // Handle RGBA data directly
          if (result.metadata.format === 'rgba') {
            console.log('📊 Received RGBA data:', {
              size: result.imageData.byteLength,
              width: result.metadata.width,
              height: result.metadata.height
            });
            
            // Ensure canvas dimensions match the image data
            canvas.width = result.metadata.width;
            canvas.height = result.metadata.height;
            
            // Convert ArrayBuffer to Uint8ClampedArray for ImageData
            const uint8Array = new Uint8ClampedArray(result.imageData);
            
            // Debug: Check first few pixels to understand the data
            console.log('🔍 First 16 bytes (4 pixels RGBA):', Array.from(uint8Array.slice(0, 16)));
            
            // Calculate min/max without spread operator to avoid stack overflow
            let min = 255, max = 0;
            for (let i = 0; i < Math.min(1000, uint8Array.length); i++) {
              if (uint8Array[i] < min) min = uint8Array[i];
              if (uint8Array[i] > max) max = uint8Array[i];
            }
            
            console.log('🔍 Data statistics (first 1000 bytes):', {
              min,
              max,
              length: uint8Array.length,
              expectedLength: result.metadata.width * result.metadata.height * 4
            });
            
            // Simple direct approach - set canvas to match image size
            canvas.width = result.metadata.width;
            canvas.height = result.metadata.height;
            
            const imageData = new ImageData(uint8Array, result.metadata.width, result.metadata.height);
            
            // Clear canvas with black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, result.metadata.width, result.metadata.height);
            
            // Draw image data directly
            ctx.putImageData(imageData, 0, 0);
            
            console.log('✅ Image displayed directly with putImageData at', result.metadata.width, 'x', result.metadata.height);
            
            // If image is very small, scale it up for visibility
            if (result.metadata.width < 100 || result.metadata.height < 100) {
              console.log('⚠️ Image is very small, scaling up for visibility...');
              const scaleFactor = Math.max(64, Math.min(512 / result.metadata.width, 512 / result.metadata.height));
              const scaledWidth = result.metadata.width * scaleFactor;
              const scaledHeight = result.metadata.height * scaleFactor;
              
              // Create a temporary canvas for scaling
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = scaledWidth;
              tempCanvas.height = scaledHeight;
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                // Disable smoothing for crisp pixel art effect
                tempCtx.imageSmoothingEnabled = false;
                tempCtx.drawImage(canvas, 0, 0, result.metadata.width, result.metadata.height, 0, 0, scaledWidth, scaledHeight);
                
                // Update main canvas with scaled image
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                ctx.drawImage(tempCanvas, 0, 0);
                
                console.log(`🔍 Scaled ${result.metadata.width}x${result.metadata.height} to ${scaledWidth}x${scaledHeight} for visibility`);
              }
            }
            
            // Mark models as loaded after first successful generation
            window.modelsLoaded = true;
            
            // Force a repaint by triggering a style change
            canvas.style.border = '1px solid transparent';
            setTimeout(() => {
              canvas.style.border = '2px solid #333';
            }, 1);
            
            // Debug canvas state
            console.log('📺 Canvas info:', {
              width: canvas.width,
              height: canvas.height,
              style: {
                width: canvas.style.width,
                height: canvas.style.height,
                display: canvas.style.display,
                visibility: canvas.style.visibility
              },
              clientSize: {
                clientWidth: canvas.clientWidth,
                clientHeight: canvas.clientHeight
              }
            });
            
            console.log('✅ Image generated and displayed successfully!');
          } else {
            // Handle PNG/other formats (fallback)
            const blob = new Blob([result.imageData], { type: 'image/png' });
            const imageUrl = URL.createObjectURL(blob);
            
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, selectedResolution.width, selectedResolution.height);
              ctx.drawImage(img, 0, 0, selectedResolution.width, selectedResolution.height);
              URL.revokeObjectURL(imageUrl);
              console.log('✅ Image generated successfully!');
            };
            img.onerror = () => {
              console.error('❌ Failed to load generated image');
              drawFallbackImage(ctx, 'Failed to load image');
            };
            img.src = imageUrl;
          }
        } else {
          console.error('❌ Image generation failed:', result.error);
          drawFallbackImage(ctx, result.error || 'Generation failed');
        }
      } else {
        // Browser fallback - show placeholder
        console.warn('⚠️ Running in browser mode - using placeholder');
        drawFallbackImage(ctx, 'Electron required for SDXL generation');
      }
    } catch (error) {
      console.error('❌ Generation error:', error);
      setGenerationStatus('Error: ' + error.message);
      drawFallbackImage(ctx, `Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
      // Clear status after a short delay
      setTimeout(() => setGenerationStatus(''), 2000);
    }
  }, [currentSeed, getCombinedPrompt, prompts, selectedResolution, steps]);

  // Fallback image when generation fails or not available
  const drawFallbackImage = useCallback((ctx: CanvasRenderingContext2D, message: string) => {
    // Create gradient based on current seed
    const gradient = ctx.createLinearGradient(0, 0, selectedResolution.width, selectedResolution.height);
    const hue1 = (currentSeed * 137.508) % 360;
    const hue2 = (currentSeed * 237.508) % 360;
    
    gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
    gradient.addColorStop(1, `hsl(${hue2}, 70%, 30%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, selectedResolution.width, selectedResolution.height);
    
    // Add message overlay
    const overlayHeight = Math.min(120, selectedResolution.height * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, selectedResolution.width, overlayHeight);
    
    // Add text overlay
    const fontSize = Math.max(12, Math.min(18, selectedResolution.width / 60));
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `${fontSize}px 'Inter', sans-serif`;
    
    const lineHeight = fontSize + 4;
    ctx.fillText(`${selectedResolution.name} - ${selectedResolution.width}×${selectedResolution.height}`, 15, fontSize + 10);
    ctx.fillText(`${steps} Step${steps > 1 ? 's' : ''} | Seed: ${currentSeed}`, 15, fontSize + 10 + lineHeight);
    
    // Add status message
    ctx.fillStyle = 'rgba(255, 170, 0, 0.9)';
    ctx.font = `${Math.max(10, fontSize - 2)}px 'Inter', sans-serif`;
    ctx.fillText(message, 15, fontSize + 10 + lineHeight * 2.5);
    
    if (overlayHeight > 80) {
      ctx.fillText(`Prompt: ${getCombinedPrompt().substring(0, 50)}...`, 15, fontSize + 10 + lineHeight * 3.5);
    }
  }, [selectedResolution, currentSeed, steps, getCombinedPrompt]);

  // Track previous state for change detection
  const prevStateRef = useRef({
    seed: baseSeed,
    promptsHash: '',
    effectsHash: ''
  });

  // Helper to create hash of current state
  const createStateHash = useCallback((prompts: Prompt[], effects: Effect[], seed: number) => {
    const promptsData = prompts.map(p => `${p.text}:${p.weight}:${p.active}`).join('|');
    const effectsData = effects.map(e => `${e.id}:${e.enabled}:${e.intensity}:${e.speed}:${e.target}`).join('|');
    return `${promptsData}||${effectsData}||${seed}`;
  }, []);

  // Animation loop - only for effects visualization and change detection
  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      const currentTime = Date.now() - startTimeRef.current;
      const newLfoValues: Record<string, number> = {};
      
      // Apply effects
      let modifiedSeed = baseSeed;
      const modifiedPrompts = [...prompts];
      let hasChanges = false;
      
      effects.forEach(effect => {
        if (!effect.enabled) return;
        
        const effectValue = calculateEffectValue(effect, currentTime);
        newLfoValues[effect.id] = effectValue * 100; // Store for visualization
        
        switch (effect.target) {
          case 'seed':
            const newSeed = baseSeed + Math.round(effectValue * 1000);
            if (newSeed !== modifiedSeed) {
              modifiedSeed = newSeed;
              hasChanges = true;
            }
            break;
          case 'prompt_weights':
            modifiedPrompts.forEach((prompt, index) => {
              if (prompt.active) {
                const baseWeight = prompts[index].weight;
                const modulation = effectValue * 50; // ±50% modulation
                const newWeight = Math.max(0, Math.min(100, baseWeight + modulation));
                if (Math.abs(newWeight - modifiedPrompts[index].weight) > 1) { // Only if significant change
                  modifiedPrompts[index] = {
                    ...prompt,
                    weight: newWeight
                  };
                  hasChanges = true;
                }
              }
            });
            break;
          case 'selected_prompts':
            effect.targetPrompts?.forEach(promptIndex => {
              if (modifiedPrompts[promptIndex]?.active) {
                const baseWeight = prompts[promptIndex].weight;
                const modulation = effectValue * 50;
                const newWeight = Math.max(0, Math.min(100, baseWeight + modulation));
                if (Math.abs(newWeight - modifiedPrompts[promptIndex].weight) > 1) {
                  modifiedPrompts[promptIndex] = {
                    ...modifiedPrompts[promptIndex],
                    weight: newWeight
                  };
                  hasChanges = true;
                }
              }
            });
            break;
        }
      });
      
      // Update LFO values for visualization
      setLfoValues(newLfoValues);
      
      // Only generate new images when playing AND there are actual changes
      if (isPlaying) {
        const currentStateHash = createStateHash(modifiedPrompts, effects, modifiedSeed);
        const prevState = prevStateRef.current;
        
        if (currentStateHash !== prevState.promptsHash || 
            modifiedSeed !== prevState.seed ||
            hasChanges) {
          
          console.log('🔄 State changed during play, generating new image...');
          
          setCurrentSeed(modifiedSeed);
          
          // Update prompts if they were modified
          const promptsChanged = modifiedPrompts.some((p, i) => p.weight !== prompts[i].weight);
          if (promptsChanged) {
            setPrompts(modifiedPrompts);
          }
          
          generateImage();
          
          // Update previous state
          prevStateRef.current = {
            seed: modifiedSeed,
            promptsHash: currentStateHash,
            effectsHash: currentStateHash
          };
        }
      }
      
      // Continue animation loop for effects visualization ONLY during play
      if (isPlaying) {
        const interval = beatSync ? (60000 / bpm) / 8 : 100; // Faster refresh for smooth effects
        animationRef.current = setTimeout(animate, interval);
      }
    };

    startTimeRef.current = Date.now();
    animate();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, baseSeed, effects, calculateEffectValue, bpm, beatSync, prompts, createStateHash, generateImage]);

  // Debounced generation to prevent rapid firing
  const debouncedGenerate = useCallback((newSeed: number, newPrompts: Prompt[]) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      const now = Date.now();
      const timeSinceLastGeneration = now - lastGenerationTime;
      
      // Minimum 300ms between generations
      if (timeSinceLastGeneration < 300) {
        return;
      }
      
      console.log('🎨 Debounced generation trigger');
      setCurrentSeed(newSeed);
      setPrompts(newPrompts);
      generateImage();
      setLastGenerationTime(now);
    }, 500); // 500ms debounce
  }, [generateImage, lastGenerationTime]);

  // Only generate during play mode - no automatic generation when typing
  // Manual generation only when user explicitly starts play mode

  const handlePlay = async () => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);
    
    if (newPlayState && prompts.some(p => p.text.trim() !== '')) {
      // Load models if needed when play starts
      if (window.electronAPI && !window.modelsLoaded) {
        console.log('🔄 Loading models for generation...');
        setGenerationStatus('Loading AI models...');
        try {
          const result = await window.electronAPI.loadModel({ backend: 'cpu' });
          if (result.success) {
            window.modelsLoaded = true;
            setGenerationStatus('Models loaded successfully');
          } else {
            setGenerationStatus('Failed to load models: ' + result.error);
            setIsPlaying(false);
            return;
          }
        } catch (error) {
          console.error('Error loading models:', error);
          setGenerationStatus('Error loading models');
          setIsPlaying(false);
          return;
        }
      }
      
      // Generate immediately when play starts
      console.log('▶️ Play button pressed - starting generation');
      setCurrentSeed(baseSeed);
      generateImage();
    } else if (!newPlayState) {
      console.log('⏸️ Play paused - models remain loaded');
    }
  };

  const handleStop = async () => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Stop button unloads models to free memory
    if (window.electronAPI) {
      console.log('🗑️ Stop pressed - unloading models to free memory');
      try {
        await window.electronAPI.disposeModel();
        window.modelsLoaded = false;
        setGenerationStatus('Models unloaded - will reload on next play');
        setTimeout(() => setGenerationStatus(''), 2000);
      } catch (error) {
        console.error('Error disposing models:', error);
      }
    }
  };

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setBaseSeed(newSeed);
    setCurrentSeed(newSeed);
  };

  // Test function to verify canvas is working
  const testCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw simple test pattern
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Red background
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Blue square in center
    ctx.fillStyle = 'blue';
    ctx.fillRect(256, 256, 512, 512);
    
    // White text
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('TEST', 400, 500);
    
    console.log('🧪 Test pattern drawn on canvas');
  };

  const updatePrompt = (id: number, updates: Partial<Prompt>) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const handleEffectChange = useCallback((effectId: string, changes: Partial<Effect>) => {
    setEffects(prev => {
      const existingIndex = prev.findIndex(e => e.id === effectId);
      
      if (existingIndex >= 0) {
        // Update existing effect
        const newEffects = [...prev];
        newEffects[existingIndex] = { ...newEffects[existingIndex], ...changes };
        return newEffects;
      } else {
        // Add new effect
        return [...prev, changes as Effect];
      }
    });
  }, []);

  return (
    <div className="simple-workspace">
      <div className="header">
        <h1>AI Visual Generator</h1>
        <SystemMonitor />
        <div className="transport-controls">
          <button 
            className={`control-btn ${isPlaying ? 'active' : ''}`}
            onClick={handlePlay}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="control-btn" onClick={handleStop}>
            <Square size={24} />
          </button>
          <button className="control-btn" onClick={handleRandomSeed}>
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="left-panel">
          {/* Prompts Section */}
          <div className="section">
            <h3>Prompts</h3>
            {prompts.map((prompt) => (
              <div key={prompt.id} className="prompt-row">
                <div className="prompt-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={prompt.active}
                      onChange={(e) => updatePrompt(prompt.id, { active: e.target.checked })}
                    />
                    Prompt {prompt.id}
                  </label>
                  <span className="weight-display">{prompt.weight}%</span>
                </div>
                <textarea
                  value={prompt.text}
                  onChange={(e) => updatePrompt(prompt.id, { text: e.target.value })}
                  placeholder="Enter your prompt..."
                  rows={2}
                  disabled={!prompt.active}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prompt.weight}
                  onChange={(e) => updatePrompt(prompt.id, { weight: Number(e.target.value) })}
                  disabled={!prompt.active}
                  className="weight-slider"
                />
              </div>
            ))}
          </div>

          {/* Effects Section */}
          <EffectsPanel
            effects={effects}
            onEffectChange={handleEffectChange}
            currentValues={{
              seed: currentSeed,
              promptWeights: prompts.map(p => p.weight),
              lfoValues: lfoValues
            }}
            promptCount={prompts.length}
          />

          {/* Generation Settings */}
          <div className="section">
            <h3>Generation Settings</h3>
            
            <div className="settings-grid">
              <div className="setting-group">
                <label className="setting-label">Resolution</label>
                <select
                  value={selectedResolution.name}
                  onChange={(e) => {
                    const resolution = RESOLUTION_OPTIONS.find(r => r.name === e.target.value);
                    if (resolution) setSelectedResolution(resolution);
                  }}
                  className="resolution-select"
                >
                  {RESOLUTION_OPTIONS.map(option => (
                    <option key={option.name} value={option.name}>
                      {option.name} ({option.width}×{option.height}) - {option.aspectRatio}
                    </option>
                  ))}
                </select>
                <div className="setting-info">
                  Current: {selectedResolution.width}×{selectedResolution.height} 
                  ({(selectedResolution.width * selectedResolution.height / 1000000).toFixed(2)}M pixels)
                  {selectedResolution.width * selectedResolution.height > 1200000 && 
                    " ⚠️ High resolution - may be slower"
                  }
                </div>
              </div>

              <div className="setting-group">
                <label className="setting-label">Quality Steps</label>
                <select
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="steps-select"
                >
                  {STEPS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.performance}
                    </option>
                  ))}
                </select>
                <div className="setting-info">
                  {STEPS_OPTIONS.find(s => s.value === steps)?.description}
                </div>
              </div>
            </div>
          </div>

          {/* Global Controls */}
          <div className="section">
            <h3>Timing & Sync</h3>
            
            <div className="control-row">
              <label>BPM: {bpm}</label>
              <input
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
            </div>

            <label>
              <input
                type="checkbox"
                checked={beatSync}
                onChange={(e) => setBeatSync(e.target.checked)}
              />
              Beat Sync Effects
            </label>
          </div>

          <div className="section">
            <h3>Info</h3>
            <div className="info-display">
              <div>Status: {isPlaying ? '🎬 Playing' : '⏸️ Stopped'}</div>
              <div>Seed: {currentSeed} (Base: {baseSeed})</div>
              <div>Resolution: {selectedResolution.width}×{selectedResolution.height}</div>
              <div>Steps: {steps} | Backend: {backend}</div>
              <div>Active Effects: {effects.filter(e => e.enabled).length}</div>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="canvas-container"
              style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width={selectedResolution.width}
                height={selectedResolution.height}
                className="preview-canvas"
                style={{
                  maxWidth: '700px',
                  maxHeight: '500px',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: `${selectedResolution.width}/${selectedResolution.height}`
                }}
              />
              {(isPlaying || isGenerating) && (
                <div className="generation-indicator">
                  <div className="pulse"></div>
                  <span className="generation-text">
                    {isGenerating ? (generationStatus || 'Generating...') : 'Live'}
                  </span>
                </div>
              )}
              
              {/* Loading overlay for first generation */}
              {isGenerating && generationStatus.includes('Loading AI models') && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: '10px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '3px solid #00ff88',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <h3 style={{ color: '#00ff88', marginTop: '20px' }}>Loading AI Models</h3>
                  <p style={{ color: '#ccc', textAlign: 'center', maxWidth: '300px' }}>
                    First time loading SDXL models...<br/>
                    This may take up to a minute.<br/>
                    Future generations will be much faster!
                  </p>
                  <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
                    Loading: UNet, Text Encoder, VAE Decoder
                  </p>
                </div>
              )}
              <div className="canvas-info">
                <span className="resolution-badge">
                  {selectedResolution.name} - {selectedResolution.aspectRatio}
                </span>
                <span className="steps-badge">
                  {steps} Step{steps > 1 ? 's' : ''} {STEPS_OPTIONS.find(s => s.value === steps)?.performance}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}