import React, { useState, useCallback } from 'react';
import { Deck } from './Deck';
import { CrossFader } from './CrossFader';
import { PresetBank } from './PresetBank';
import { MIDIController } from './MIDIController';
import './DJWorkspace.css';

interface DJWorkspaceProps {
  backend: string;
}

export function DJWorkspace({ backend }: DJWorkspaceProps) {
  const [activeDeck, setActiveDeck] = useState(0);
  const [crossfaderPosition, setCrossfaderPosition] = useState(50);
  const [decks, setDecks] = useState([
    { id: 0, prompt: '', seed: 42, active: true },
    { id: 1, prompt: '', seed: 123, active: false },
    { id: 2, prompt: '', seed: 456, active: false },
    { id: 3, prompt: '', seed: 789, active: false }
  ]);

  const handleDeckUpdate = useCallback((deckId: number, updates: any) => {
    setDecks(prev => prev.map(deck => 
      deck.id === deckId ? { ...deck, ...updates } : deck
    ));
  }, []);

  const handlePresetLoad = useCallback((preset: any) => {
    if (activeDeck !== null) {
      handleDeckUpdate(activeDeck, preset);
    }
  }, [activeDeck, handleDeckUpdate]);

  return (
    <div className="dj-workspace">
      <div className="workspace-header">
        <h1>SDXL DJ</h1>
        <div className="header-controls">
          <button className="settings-btn">Settings</button>
          <MIDIController />
        </div>
      </div>

      <div className="decks-container">
        {decks.map((deck, index) => (
          <Deck
            key={deck.id}
            id={deck.id}
            prompt={deck.prompt}
            seed={deck.seed}
            active={activeDeck === index}
            onActivate={() => setActiveDeck(index)}
            onUpdate={(updates) => handleDeckUpdate(deck.id, updates)}
            backend={backend}
          />
        ))}
      </div>

      <div className="mixer-section">
        <CrossFader
          position={crossfaderPosition}
          onChange={setCrossfaderPosition}
        />
      </div>

      <PresetBank onPresetLoad={handlePresetLoad} />
    </div>
  );
}