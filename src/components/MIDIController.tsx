import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import './MIDIController.css';

export function MIDIController() {
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    const initMIDI = async () => {
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        
        const updateDevices = () => {
          const connectedDevices: string[] = [];
          midiAccess.inputs.forEach((input) => {
            connectedDevices.push(input.name || 'Unknown Device');
            
            input.onmidimessage = (event) => {
              const [status, note, velocity] = event.data;
              console.log('MIDI:', { status, note, velocity });
              
              // Handle MIDI messages
              if (status === 144 && velocity > 0) { // Note On
                // Map to deck selection, preset triggers, etc.
              } else if (status === 176) { // CC
                // Map to faders and knobs
              }
            };
          });
          
          setDevices(connectedDevices);
          setIsConnected(connectedDevices.length > 0);
        };

        updateDevices();
        midiAccess.onstatechange = updateDevices;
      } catch (error) {
        console.error('MIDI initialization failed:', error);
      }
    };

    if ('requestMIDIAccess' in navigator) {
      initMIDI();
    }
  }, []);

  return (
    <div className="midi-controller">
      <button 
        className={`midi-status ${isConnected ? 'connected' : ''}`}
        title={devices.length > 0 ? devices.join(', ') : 'No MIDI devices'}
      >
        <Music size={16} />
        <span>{isConnected ? 'MIDI' : 'No MIDI'}</span>
      </button>
    </div>
  );
}