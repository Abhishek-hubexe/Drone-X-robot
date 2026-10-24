import React from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Activity, Server, Wifi, WifiOff, Cpu, Database, 
  Bot, Plane, ShieldAlert, CheckCircle2, XCircle, 
  AlertTriangle, Clock, RefreshCw, Zap
} from 'lucide-react';

export default function DiagnosticsPanel() {
  const { getDiagnostics, roverState, droneState, missionStatus, missionId, DeviceState, ConnState } = useMission();
  const diag = getDiagnostics();

  const formatTs = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      const diff = Date.now() - d.getTime();
      if (diff < 5000) return 'Just now';
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      return d.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  const isTelemetryStale = (ts) => {
    if (!ts) return true;
    return Date.now() - new Date(ts).getTime() > 10000;
  };

  const components = [
    {
      name: 'Backend Health',
      icon: Server,
      status: diag.backendHealth ? 'healthy' : 'down',
      detail: diag.backendHealth ? 'Simulation engine active' : 'Engine not responding'
    },
    {
      name: 'Persistent Storage',
      icon: Database,
      status: diag.storageHealth ? 'healthy' : 'degraded',
      detail: diag.storageHealth ? 'localStorage operational' : 'Storage unavailable — data may be lost'
    },
    {
      name: 'AI Detection Service',
      icon: Cpu,
      status: diag.detectionServiceHealth ? 'healthy' : 'down',
      detail: diag.detectionServiceHealth ? 'YOLOv8 TensorRT ready' : 'Edge inference engine unreachable'
    },
    {
      name: 'UGV Titan-01 Adapter',
      icon: Bot,
      status: diag.ugvConnection === ConnState.CONNECTED ? 'healthy' :
              diag.ugvConnection === ConnState.DEGRADED ? 'degraded' : 'down',
      detail: `Connection: ${diag.ugvConnection} | State: ${roverState.state} | Last telemetry: ${formatTs(diag.ugvLastTelemetry)}`,
      stale: isTelemetryStale(diag.ugvLastTelemetry) && missionStatus === 'RUNNING'
    },
    {
      name: 'UAV SkyEye-04 Adapter',
      icon: Plane,
      status: diag.uavConnection === ConnState.CONNECTED ? 'healthy' :
              diag.uavConnection === ConnState.DEGRADED ? 'degraded' : 'down',
      detail: `Connection: ${diag.uavConnection} | State: ${droneState.state} | Last telemetry: ${formatTs(diag.uavLastTelemetry)}`,
      stale: isTelemetryStale(diag.uavLastTelemetry) && missionStatus === 'RUNNING'
    }
  ];

  return (
    <div className="diagnostics-panel hud-panel hud-corner" role="region" aria-label="System Diagnostics">
      <div className="diag-header">
        <div className="diag-title-group">
          <Activity size={18} className="text-cyan" />
          <h3 className="font-display">System Diagnostics & Observability</h3>
        </div>
        <div className="diag-meta font-mono">
          <span>Version: <strong>{diag.appVersion}</strong></span>
          <span>Active Mission: <strong className="text-cyan">{diag.activeMissionId || 'None'}</strong></span>
          <span>Last Check: <strong>{formatTs(diag.lastCheckTs)}</strong></span>
        </div>
      </div>

      <div className="component-status-grid">
        {components.map(comp => {
          const Icon = comp.icon;
          return (
            <div key={comp.name} className={`comp-card hud-panel ${comp.status}`} role="listitem">
              <div className="comp-icon-wrap">
                {comp.status === 'healthy' && <CheckCircle2 size={20} className="icon-healthy" />}
                {comp.status === 'degraded' && <AlertTriangle size={20} className="icon-degraded" />}
                {comp.status === 'down' && <XCircle size={20} className="icon-down" />}
              </div>
              <div className="comp-info">
                <div className="comp-name-row">
                  <Icon size={14} />
                  <strong>{comp.name}</strong>
                </div>
                <span className="comp-detail">{comp.detail}</span>
                {comp.stale && (
                  <span className="stale-warning font-mono">
                    <AlertTriangle size={12} /> STALE TELEMETRY — Data may be outdated
                  </span>
                )}
              </div>
              <span className={`status-dot ${comp.status}`} aria-label={comp.status}></span>
            </div>
          );
        })}
      </div>

      {/* Recent Errors */}
      {diag.recentErrors && diag.recentErrors.length > 0 && (
        <div className="recent-errors-section">
          <h4 className="font-mono text-amber">Recent Errors & Warnings ({diag.recentErrors.length})</h4>
          <div className="errors-list font-mono">
            {diag.recentErrors.map(err => (
              <div key={err.id} className="error-row">
                <span className="error-time">{formatTs(err.time)}</span>
                <span className={`error-level ${err.level === 'CRITICAL' ? 'text-danger' : 'text-amber'}`}>[{err.level}]</span>
                <span className="error-text">{err.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .diagnostics-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .diag-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 14px;
        }
        .diag-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .diag-meta {
          display: flex;
          gap: 18px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .component-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 14px;
        }
        .comp-card {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-radius: 8px;
        }
        .comp-card.healthy { border-left: 3px solid var(--status-emerald); }
        .comp-card.degraded { border-left: 3px solid var(--status-amber); }
        .comp-card.down { border-left: 3px solid var(--status-crimson); }
        .comp-icon-wrap { flex-shrink: 0; }
        .icon-healthy { color: var(--status-emerald); }
        .icon-degraded { color: var(--status-amber); }
        .icon-down { color: var(--status-crimson); }
        .comp-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .comp-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          color: #ffffff;
        }
        .comp-detail { font-size: 0.75rem; color: var(--text-muted); }
        .stale-warning {
          font-size: 0.72rem;
          color: var(--status-amber);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-dot.healthy { background: var(--status-emerald); box-shadow: 0 0 8px var(--status-emerald); }
        .status-dot.degraded { background: var(--status-amber); box-shadow: 0 0 8px var(--status-amber); }
        .status-dot.down { background: var(--status-crimson); box-shadow: 0 0 8px var(--status-crimson); animation: blink-fast 1s infinite; }
        .recent-errors-section {
          border-top: 1px solid rgba(56, 189, 248, 0.1);
          padding-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .errors-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .error-row {
          display: flex;
          gap: 8px;
          font-size: 0.75rem;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .error-time { color: var(--text-dim); flex-shrink: 0; }
        .error-level { font-weight: 700; flex-shrink: 0; }
        .error-text { color: var(--text-main); }
      `}</style>
    </div>
  );
}
