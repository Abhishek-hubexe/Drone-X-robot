import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Zap, ToggleLeft, ToggleRight, AlertOctagon, 
  Wifi, WifiOff, Battery, BatteryWarning, 
  ShieldOff, Camera, CpuIcon, Crosshair, Play 
} from 'lucide-react';

export default function FaultInjectionPanel() {
  const { 
    faultInjection, enableFaultInjection, injectFault, 
    FAULT_SCENARIOS, missionStatus, progress, MissionState 
  } = useMission();

  const [triggerMode, setTriggerMode] = useState('immediate'); // 'immediate' or 'scheduled'
  const [scheduledPercent, setScheduledPercent] = useState(50);

  const handleInjectFault = (type) => {
    const trigger = triggerMode === 'immediate' ? null : scheduledPercent;
    injectFault(type, trigger);
  };

  return (
    <div className="fault-panel hud-panel hud-corner" role="region" aria-label="Fault Injection Simulator">
      <div className="fault-header">
        <div className="fault-title-group">
          <Zap size={18} className="text-amber" />
          <h3 className="font-display">Scenario Fault Injection Simulator</h3>
          <span className="badge badge-simulated font-mono">DEV ONLY</span>
        </div>

        <button
          onClick={() => enableFaultInjection(!faultInjection.enabled)}
          className={`toggle-btn font-mono ${faultInjection.enabled ? 'active' : ''}`}
          aria-label={faultInjection.enabled ? 'Disable fault injection' : 'Enable fault injection'}
        >
          {faultInjection.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          <span>{faultInjection.enabled ? 'ENABLED' : 'DISABLED'}</span>
        </button>
      </div>

      {!faultInjection.enabled && (
        <div className="fault-disabled-notice font-mono">
          <AlertOctagon size={16} />
          <span>Fault injection is disabled. Toggle the switch above to enable scenario testing.</span>
        </div>
      )}

      {faultInjection.enabled && (
        <>
          {/* Trigger Mode */}
          <div className="trigger-mode-section">
            <span className="trigger-label font-mono">Trigger Mode:</span>
            <div className="trigger-pills">
              <button
                onClick={() => setTriggerMode('immediate')}
                className={`trigger-pill font-mono ${triggerMode === 'immediate' ? 'active' : ''}`}
              >
                Immediate (Now)
              </button>
              <button
                onClick={() => setTriggerMode('scheduled')}
                className={`trigger-pill font-mono ${triggerMode === 'scheduled' ? 'active' : ''}`}
              >
                At Progress %
              </button>
            </div>
            {triggerMode === 'scheduled' && (
              <div className="scheduled-input-group">
                <input 
                  type="range" min={0} max={100} value={scheduledPercent}
                  onChange={(e) => setScheduledPercent(+e.target.value)}
                  className="progress-slider"
                  aria-label="Trigger at progress percent"
                />
                <span className="font-mono">{scheduledPercent}%</span>
              </div>
            )}
          </div>

          {/* Scenario Buttons Grid */}
          <div className="scenario-grid">
            {FAULT_SCENARIOS.map(scenario => {
              const isQueued = faultInjection.activeScenarios.some(s => s.type === scenario.type);
              return (
                <button
                  key={scenario.type}
                  onClick={() => handleInjectFault(scenario.type)}
                  className={`scenario-btn hud-panel font-mono ${isQueued ? 'queued' : ''}`}
                  disabled={isQueued || missionStatus === MissionState.IDLE}
                  title={isQueued ? 'Already injected' : `Inject: ${scenario.label}`}
                >
                  <Zap size={14} />
                  <span>{scenario.label}</span>
                  {isQueued && <span className="queued-badge">ACTIVE</span>}
                </button>
              );
            })}
          </div>

          {/* Active Scenarios List */}
          {faultInjection.activeScenarios.length > 0 && (
            <div className="active-scenarios-section">
              <h4 className="font-mono text-amber">Active Fault Scenarios ({faultInjection.activeScenarios.length})</h4>
              <div className="active-list font-mono">
                {faultInjection.activeScenarios.map((s, i) => (
                  <div key={i} className="active-scenario-row">
                    <span className={`scenario-status ${s.triggered ? 'triggered' : 'pending'}`}>
                      {s.triggered ? '● FIRED' : '○ QUEUED'}
                    </span>
                    <span>{s.type}</span>
                    <span className="text-muted">at {s.triggerAtProgress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .fault-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .fault-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .fault-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.82rem;
          transition: all var(--transition-fast);
        }
        .toggle-btn.active {
          background: rgba(245, 158, 11, 0.15);
          border-color: var(--status-amber);
          color: #fbbf24;
        }
        .fault-disabled-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px dashed rgba(100, 116, 139, 0.3);
          border-radius: 6px;
          font-size: 0.82rem;
          color: var(--text-dim);
        }
        .trigger-mode-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .trigger-label { font-size: 0.78rem; color: var(--text-muted); }
        .trigger-pills {
          display: flex;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 2px;
        }
        .trigger-pill {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 4px 12px;
          font-size: 0.78rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all var(--transition-fast);
        }
        .trigger-pill.active {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        .scheduled-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .progress-slider {
          width: 120px;
          accent-color: var(--status-amber);
        }
        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
        }
        .scenario-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          background: rgba(8, 14, 30, 0.85);
          color: var(--text-main);
          font-size: 0.78rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        .scenario-btn:hover:not(:disabled) {
          border-color: var(--status-amber);
          background: rgba(245, 158, 11, 0.1);
        }
        .scenario-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .scenario-btn.queued {
          border-color: var(--status-amber);
          background: rgba(245, 158, 11, 0.12);
        }
        .queued-badge {
          margin-left: auto;
          font-size: 0.65rem;
          background: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .active-scenarios-section {
          border-top: 1px solid rgba(245, 158, 11, 0.15);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .active-list { display: flex; flex-direction: column; gap: 4px; }
        .active-scenario-row {
          display: flex;
          gap: 8px;
          font-size: 0.76rem;
        }
        .scenario-status {
          font-weight: 700;
          flex-shrink: 0;
        }
        .scenario-status.triggered { color: var(--status-crimson); }
        .scenario-status.pending { color: var(--status-amber); }
      `}</style>
    </div>
  );
}
