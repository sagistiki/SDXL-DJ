import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw, Zap } from 'lucide-react';
import './Deck.css';

interface DeckProps {
  id: number;
  prompt: string;
  seed: number;
  active: boolean;
  onActivate: () => void;
  onUpdate: (updates: any) => void;
  backend: string;
}

export function Deck({ id, prompt, seed, active, onActivate, onUpdate, backend }: DeckProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedFader, setSpeedFader] = useState(50);
  const [seedJitter, setSeedJitter] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const handleGenerate = useCallback(async () => {
    if (!backend || !canvasRef.current) return;
    
    setIsGenerating(true);
    // Simulate generation for now
    setTimeout(() => {
      setIsGenerating(false);
      // Draw placeholder
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
        ctx.fillRect(0, 0, 512, 512);
      }
    }, 200);
  }, [backend]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ prompt: e.target.value });
  }, [onUpdate]);

  const handleRandomizeSeed = useCallback(() => {
    onUpdate({ seed: Math.floor(Math.random() * 1000000) });
  }, [onUpdate]);

  useEffect(() => {
    if (!isPaused && prompt && backend) {
      const interval = 1000 / (speedFader / 10);
      
      const animate = () => {
        if (seedJitter > 0) {
          const jitteredSeed = seed + Math.floor(Math.random() * seedJitter * 10);
          onUpdate({ seed: jitteredSeed });
        }
        handleGenerate();
        
        animationRef.current = setTimeout(animate, interval);
      };
      
      animate();
      
      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [isPaused, speedFader, seedJitter, seed, prompt, backend, handleGenerate, onUpdate]);

  return (
    <div 
      className={`deck ${active ? 'active' : ''}`}
      onClick={onActivate}
    >
      <div className="deck-header">
        <span className="deck-number">{id + 1}</span>
        <div className="deck-controls">
          <button 
            className="control-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(!isPaused);
            }}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button 
            className="control-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleRandomizeSeed();
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="deck-canvas-container">
        <canvas 
          ref={canvasRef}
          width={512}
          height={512}
          className="deck-canvas"
        />
        {isGenerating && (
          <div className="generating-overlay">
            <Zap size={24} />
          </div>
        )}
      </div>

      <div className="deck-controls-panel">
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Enter your prompt..."
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="fader-group">
          <label>
            <span>Speed</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speedFader}
              onChange={(e) => setSpeedFader(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="fader-value">{speedFader}%</span>
          </label>

          <label>
            <span>Seed Jitter</span>
            <input
              type="range"
              min="0"
              max="100"
              value={seedJitter}
              onChange={(e) => setSeedJitter(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="fader-value">{seedJitter}%</span>
          </label>
        </div>

        <div className="seed-display">
          Seed: {seed}
        </div>
      </div>
    </div>
  );
}