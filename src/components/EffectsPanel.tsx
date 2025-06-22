import React, { useState, useEffect, useRef } from 'react';
import { Zap, Waves, RotateCcw, Shuffle, Target, TrendingUp, Activity, Wind } from 'lucide-react';
import './EffectsPanel.css';

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

interface EffectsPanelProps {
  effects: Effect[];
  onEffectChange: (effectId: string, changes: Partial<Effect>) => void;
  currentValues: {
    seed: number;
    promptWeights: number[];
    lfoValues: Record<string, number>;
  };
  promptCount: number;
}

export function EffectsPanel({ effects, onEffectChange, currentValues, promptCount }: EffectsPanelProps) {
  const waveformRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // Animation frames for waveforms
  useEffect(() => {
    const animateWaveforms = () => {
      effects.forEach(effect => {
        if (!effect.enabled) return;
        
        const canvas = waveformRefs.current[effect.id];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        const time = Date.now() * 0.001;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw waveform based on effect type
        ctx.strokeStyle = getEffectColor(effect.id);
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const amplitude = (height / 2) * (effect.intensity / 100);
        const frequency = effect.speed;
        
        for (let x = 0; x < width; x++) {
          const t = (x / width) * 4 * Math.PI + time * frequency;
          let y;
          
          switch (effect.id) {
            case 'wave_rider':
              y = height / 2 + amplitude * Math.sin(t);
              break;
            case 'pulse_storm':
              y = height / 2 + amplitude * Math.sin(t) * Math.sin(t * 3);
              break;
            case 'chaos_drift':
              y = height / 2 + amplitude * (Math.random() - 0.5) * Math.sin(t);
              break;
            case 'rhythm_lock':
              y = height / 2 + amplitude * Math.sign(Math.sin(t));
              break;
            case 'morph_flow':
              y = height / 2 + amplitude * (Math.sin(t) + Math.sin(t * 2) / 2);
              break;
            case 'dream_shift':
              y = height / 2 + amplitude * Math.sin(t + Math.sin(t * 0.5));
              break;
            default:
              y = height / 2;
          }
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
        
        // Add current value indicator
        const currentValue = currentValues.lfoValues[effect.id] || 0;
        const indicatorY = height / 2 - (currentValue / 100) * amplitude;
        
        ctx.fillStyle = getEffectColor(effect.id);
        ctx.beginPath();
        ctx.arc(width - 10, indicatorY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      requestAnimationFrame(animateWaveforms);
    };
    
    const animationId = requestAnimationFrame(animateWaveforms);
    return () => cancelAnimationFrame(animationId);
  }, [effects, currentValues]);

  const getEffectColor = (effectId: string): string => {
    const colors = {
      'wave_rider': '#00ff88',
      'pulse_storm': '#ff6b6b',
      'chaos_drift': '#4ecdc4',
      'rhythm_lock': '#ffe66d',
      'morph_flow': '#a8e6cf',
      'dream_shift': '#ff8b94'
    };
    return colors[effectId as keyof typeof colors] || '#888';
  };

  const effectTypes = [
    {
      id: 'wave_rider',
      name: 'Wave Rider',
      icon: <Waves size={20} />,
      description: 'Smooth sine wave modulation',
      defaultParams: { waveType: 'sine' }
    },
    {
      id: 'pulse_storm',
      name: 'Pulse Storm',
      icon: <Zap size={20} />,
      description: 'Rhythmic pulses with harmonics',
      defaultParams: { pulseCount: 3 }
    },
    {
      id: 'chaos_drift',
      name: 'Chaos Drift',
      icon: <Shuffle size={20} />,
      description: 'Random organic movements',
      defaultParams: { randomness: 0.5 }
    },
    {
      id: 'rhythm_lock',
      name: 'Rhythm Lock',
      icon: <Activity size={20} />,
      description: 'Hard beats and cuts',
      defaultParams: { beatDivision: 4 }
    },
    {
      id: 'morph_flow',
      name: 'Morph Flow',
      icon: <TrendingUp size={20} />,
      description: 'Gradual transformations',
      defaultParams: { morphSpeed: 1 }
    },
    {
      id: 'dream_shift',
      name: 'Dream Shift',
      icon: <Wind size={20} />,
      description: 'Ethereal drifting changes',
      defaultParams: { dreaminess: 0.7 }
    }
  ];

  const addEffect = (effectType: any) => {
    const newEffect: Effect = {
      id: effectType.id,
      name: effectType.name,
      icon: effectType.icon,
      description: effectType.description,
      enabled: true,
      intensity: 50,
      speed: 1,
      target: 'seed',
      targetPrompts: [],
      params: effectType.defaultParams
    };
    
    onEffectChange(effectType.id, newEffect);
  };

  const removeEffect = (effectId: string) => {
    onEffectChange(effectId, { enabled: false });
  };

  const togglePromptTarget = (effectId: string, promptIndex: number) => {
    const effect = effects.find(e => e.id === effectId);
    if (!effect) return;
    
    const currentTargets = effect.targetPrompts || [];
    const newTargets = currentTargets.includes(promptIndex)
      ? currentTargets.filter(i => i !== promptIndex)
      : [...currentTargets, promptIndex];
    
    onEffectChange(effectId, { targetPrompts: newTargets });
  };

  return (
    <div className="effects-panel">
      <div className="effects-header">
        <h3>
          <Zap size={18} />
          Effects Studio
        </h3>
        <div className="effects-add">
          <select 
            onChange={(e) => {
              if (e.target.value) {
                const effectType = effectTypes.find(t => t.id === e.target.value);
                if (effectType) addEffect(effectType);
                e.target.value = '';
              }
            }}
            value=""
          >
            <option value="">+ Add Effect</option>
            {effectTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="effects-list">
        {effects.filter(e => e.enabled).map(effect => (
          <div key={effect.id} className={`effect-card ${effect.enabled ? 'active' : ''}`}>
            <div className="effect-header">
              <div className="effect-title">
                <div className="effect-icon" style={{ color: getEffectColor(effect.id) }}>
                  {effect.icon}
                </div>
                <div>
                  <h4>{effect.name}</h4>
                  <p>{effect.description}</p>
                </div>
              </div>
              <div className="effect-controls">
                <button
                  className={`toggle-btn ${effect.enabled ? 'on' : 'off'}`}
                  onClick={() => onEffectChange(effect.id, { enabled: !effect.enabled })}
                >
                  {effect.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  className="remove-btn"
                  onClick={() => removeEffect(effect.id)}
                >
                  ×
                </button>
              </div>
            </div>

            {effect.enabled && (
              <div className="effect-body">
                {/* Waveform Visualization */}
                <div className="waveform-container">
                  <canvas
                    ref={ref => waveformRefs.current[effect.id] = ref}
                    width={200}
                    height={60}
                    className="waveform-canvas"
                  />
                  <div className="waveform-overlay">
                    <span className="current-value">
                      {Math.round(currentValues.lfoValues[effect.id] || 0)}
                    </span>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="effect-main-controls">
                  <div className="control-group">
                    <label>
                      <span>Intensity</span>
                      <div className="intensity-display">{effect.intensity}%</div>
                    </label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={effect.intensity}
                        onChange={(e) => onEffectChange(effect.id, { intensity: Number(e.target.value) })}
                        className="intensity-slider"
                        style={{ '--color': getEffectColor(effect.id) } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div className="control-group">
                    <label>
                      <span>Speed</span>
                      <div className="speed-display">{effect.speed.toFixed(1)}x</div>
                    </label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0.1"
                        max="4"
                        step="0.1"
                        value={effect.speed}
                        onChange={(e) => onEffectChange(effect.id, { speed: Number(e.target.value) })}
                        className="speed-slider"
                        style={{ '--color': getEffectColor(effect.id) } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>

                {/* Target Selection */}
                <div className="target-section">
                  <label className="target-label">
                    <Target size={16} />
                    Effect Target:
                  </label>
                  
                  <div className="target-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`target-${effect.id}`}
                        checked={effect.target === 'seed'}
                        onChange={() => onEffectChange(effect.id, { target: 'seed' })}
                      />
                      <span>Seed</span>
                    </label>
                    
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`target-${effect.id}`}
                        checked={effect.target === 'prompt_weights'}
                        onChange={() => onEffectChange(effect.id, { target: 'prompt_weights' })}
                      />
                      <span>All Prompts</span>
                    </label>
                    
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`target-${effect.id}`}
                        checked={effect.target === 'selected_prompts'}
                        onChange={() => onEffectChange(effect.id, { target: 'selected_prompts' })}
                      />
                      <span>Selected</span>
                    </label>
                  </div>

                  {effect.target === 'selected_prompts' && (
                    <div className="prompt-targets">
                      {Array.from({ length: promptCount }, (_, i) => (
                        <button
                          key={i}
                          className={`prompt-target ${(effect.targetPrompts || []).includes(i) ? 'selected' : ''}`}
                          onClick={() => togglePromptTarget(effect.id, i)}
                        >
                          P{i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Effect-specific parameters */}
                {effect.id === 'chaos_drift' && (
                  <div className="effect-params">
                    <label>
                      <span>Randomness: {Math.round((effect.params.randomness || 0.5) * 100)}%</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={effect.params.randomness || 0.5}
                        onChange={(e) => onEffectChange(effect.id, { 
                          params: { ...effect.params, randomness: Number(e.target.value) }
                        })}
                      />
                    </label>
                  </div>
                )}

                {effect.id === 'pulse_storm' && (
                  <div className="effect-params">
                    <label>
                      <span>Pulse Count: {effect.params.pulseCount || 3}</span>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={effect.params.pulseCount || 3}
                        onChange={(e) => onEffectChange(effect.id, { 
                          params: { ...effect.params, pulseCount: Number(e.target.value) }
                        })}
                      />
                    </label>
                  </div>
                )}

                {effect.id === 'rhythm_lock' && (
                  <div className="effect-params">
                    <label>
                      <span>Beat Division: 1/{effect.params.beatDivision || 4}</span>
                      <select
                        value={effect.params.beatDivision || 4}
                        onChange={(e) => onEffectChange(effect.id, { 
                          params: { ...effect.params, beatDivision: Number(e.target.value) }
                        })}
                      >
                        <option value={1}>1/1</option>
                        <option value={2}>1/2</option>
                        <option value={4}>1/4</option>
                        <option value={8}>1/8</option>
                        <option value={16}>1/16</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {effects.filter(e => e.enabled).length === 0 && (
        <div className="no-effects">
          <Zap size={48} className="no-effects-icon" />
          <h4>No Effects Active</h4>
          <p>Add effects to modulate your generation in real-time</p>
        </div>
      )}
    </div>
  );
}