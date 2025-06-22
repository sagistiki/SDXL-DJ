import React, { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Monitor, Activity } from 'lucide-react';
import type { SystemStats } from '../types/electron.d.ts';
import './SystemMonitor.css';

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: { usage: 0, cores: 0, speed: 0 },
    memory: { used: 0, usedGB: 0, totalGB: 0, available: 0 },
    gpu: []
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    const updateStats = async () => {
      try {
        const result = await window.electronAPI.getSystemStats();
        if (result.success && result.stats) {
          setStats(result.stats);
        }
      } catch (error) {
        console.error('Failed to get system stats:', error);
      }
    };

    // Update immediately
    updateStats();

    // Update every 2 seconds
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return null; // Don't show in browser mode
  }

  const getUsageColor = (usage: number) => {
    if (usage < 50) return '#00ff88'; // Green
    if (usage < 80) return '#ffaa00'; // Orange
    return '#ff4444'; // Red
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="system-monitor">
      {/* CPU */}
      <div className="stat-item">
        <div className="stat-icon">
          <Cpu size={12} />
        </div>
        <div className="stat-content">
          <div className="stat-label">CPU</div>
          <div className="stat-value" style={{ color: getUsageColor(stats.cpu.usage) }}>
            {stats.cpu.usage}%
          </div>
          <div className="stat-detail">{stats.cpu.cores} cores</div>
        </div>
        <div className="stat-bar">
          <div 
            className="stat-fill"
            style={{ 
              width: `${stats.cpu.usage}%`,
              backgroundColor: getUsageColor(stats.cpu.usage)
            }}
          />
        </div>
      </div>

      {/* Memory */}
      <div className="stat-item">
        <div className="stat-icon">
          <MemoryStick size={12} />
        </div>
        <div className="stat-content">
          <div className="stat-label">RAM</div>
          <div className="stat-value" style={{ color: getUsageColor(stats.memory.used) }}>
            {stats.memory.used}%
          </div>
          <div className="stat-detail">
            {stats.memory.usedGB} / {stats.memory.totalGB} GB
          </div>
        </div>
        <div className="stat-bar">
          <div 
            className="stat-fill"
            style={{ 
              width: `${stats.memory.used}%`,
              backgroundColor: getUsageColor(stats.memory.used)
            }}
          />
        </div>
      </div>

      {/* GPU */}
      {stats.gpu.map((gpu, index) => {
        const vramUsage = gpu.memoryTotal > 0 ? 
          Math.round((gpu.memoryUsed / gpu.memoryTotal) * 100) : 0;
        
        return (
          <div key={index} className="stat-item">
            <div className="stat-icon">
              <Monitor size={12} />
            </div>
            <div className="stat-content">
              <div className="stat-label">GPU</div>
              <div className="stat-value" style={{ color: getUsageColor(gpu.utilization || vramUsage) }}>
                {gpu.utilization || vramUsage}%
              </div>
              <div className="stat-detail">
                {gpu.model.substring(0, 20)}
                {gpu.memoryTotal > 0 && (
                  <span> - {formatBytes(gpu.memoryUsed)}/{formatBytes(gpu.memoryTotal)}</span>
                )}
              </div>
            </div>
            <div className="stat-bar">
              <div 
                className="stat-fill"
                style={{ 
                  width: `${gpu.utilization || vramUsage}%`,
                  backgroundColor: getUsageColor(gpu.utilization || vramUsage)
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Activity indicator */}
      <div className="activity-indicator">
        <Activity size={14} className="activity-icon" />
        <span className="activity-text">Live</span>
      </div>
    </div>
  );
}