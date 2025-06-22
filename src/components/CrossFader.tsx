import React from 'react';
import './CrossFader.css';

interface CrossFaderProps {
  position: number;
  onChange: (position: number) => void;
}

export function CrossFader({ position, onChange }: CrossFaderProps) {
  return (
    <div className="crossfader">
      <div className="crossfader-label">A</div>
      <div className="crossfader-track">
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => onChange(Number(e.target.value))}
          className="crossfader-slider"
        />
        <div className="crossfader-markers">
          <div className="marker" style={{ left: '0%' }} />
          <div className="marker" style={{ left: '25%' }} />
          <div className="marker center" style={{ left: '50%' }} />
          <div className="marker" style={{ left: '75%' }} />
          <div className="marker" style={{ left: '100%' }} />
        </div>
      </div>
      <div className="crossfader-label">B</div>
      <div className="crossfader-value">{position}%</div>
    </div>
  );
}