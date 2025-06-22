import React, { useState, useCallback } from 'react';
import { Save, Folder } from 'lucide-react';
import './PresetBank.css';

interface Preset {
  id: string;
  name: string;
  prompt: string;
  seed: number;
  speedFader: number;
  seedJitter: number;
}

interface PresetBankProps {
  onPresetLoad: (preset: Partial<Preset>) => void;
}

export function PresetBank({ onPresetLoad }: PresetBankProps) {
  const [presets, setPresets] = useState<(Preset | null)[]>(
    Array(64).fill(null)
  );
  const [selectedBank, setSelectedBank] = useState(0);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePresetClick = useCallback((index: number) => {
    const preset = presets[index];
    
    if (isShiftPressed) {
      // Save current state to preset
      const newPreset: Preset = {
        id: `preset-${index}`,
        name: `Preset ${index + 1}`,
        prompt: 'Current prompt...', // Would get from active deck
        seed: Math.floor(Math.random() * 1000000),
        speedFader: 50,
        seedJitter: 0
      };
      
      const newPresets = [...presets];
      newPresets[index] = newPreset;
      setPresets(newPresets);
      
      // Save to localStorage
      localStorage.setItem('sdxl-dj-presets', JSON.stringify(newPresets));
    } else if (preset) {
      // Load preset
      onPresetLoad(preset);
    }
  }, [presets, isShiftPressed, onPresetLoad]);

  const startIndex = selectedBank * 64;
  const bankPresets = presets.slice(startIndex, startIndex + 64);

  return (
    <div className="preset-bank">
      <div className="preset-bank-header">
        <h3>Preset Bank</h3>
        <div className="bank-selector">
          {[0, 1, 2, 3].map(bank => (
            <button
              key={bank}
              className={`bank-btn ${selectedBank === bank ? 'active' : ''}`}
              onClick={() => setSelectedBank(bank)}
            >
              {bank + 1}
            </button>
          ))}
        </div>
        <div className="preset-hint">
          {isShiftPressed ? (
            <>
              <Save size={14} /> Click to save
            </>
          ) : (
            <>
              <Folder size={14} /> Click to load
            </>
          )}
        </div>
      </div>
      
      <div className="preset-grid">
        {bankPresets.map((preset, index) => (
          <button
            key={index}
            className={`preset-pad ${preset ? 'filled' : ''} ${isShiftPressed ? 'save-mode' : ''}`}
            onClick={() => handlePresetClick(startIndex + index)}
          >
            {preset ? (
              <span className="preset-number">{startIndex + index + 1}</span>
            ) : (
              <span className="preset-empty">-</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}