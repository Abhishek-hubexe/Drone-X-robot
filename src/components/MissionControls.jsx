import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Play, Pause, Square, RotateCcw, FastForward, PlusCircle, 
  Clock, Navigation, AlertTriangle, CheckCircle2, XCircle, 
  AlertCircle, Settings2, ShieldCheck, ChevronDown, ChevronUp,
  Loader2
} from 'lucide-react';
import { MISSION_PRESETS } from '../data/mockData';

export default function MissionControls() {
  const { 
    activePreset, selectPreset, missionStatus, progress, elapsedSeconds, 
    speedMultiplier, setSpeedMultiplier, createMission, runPreflight,
    startMission, pauseMission, resumeMission, abortMission, 
    resetToIdle, injectCustomHazard, currentStage, 
    preflightChecklist, preflightPassed, commandFeedback, strategy,
    missionConfig, missionId, MissionState, PreflightStatus, MissionStrategy
  } = useMission();

  const [showPreflight, setShowPreflight] = useState(false);
  const [showMissionConfig, setShowMissionConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    routeId: activePreset.id,
    strategy: 'coordinated',
    minBatteryUgv: 30,
    minBatteryUav: 40,
    maxDurationMin: 60,
    hazardCategories: ['pothole', 'crack', 'debris'],
    requireHumanVerification: true,
    safetyAcknowledged: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const distanceCoveredKm = ((progress / 100) * activePreset.totalDistanceKm).toFixed(2);

  // ---- Mission Config & Preflight Flow ----
  const handleCreateAndPreflight = () => {
    setIsSubmitting(true);
    const res = createMission(configForm);
    if (res.result === 'SUCCESS') {
      const pfRes = runPreflight();
      setShowPreflight(true);
      setShowMissionConfig(false);
    }
    setIsSubmitting(false);
  };

  const handleStartAfterPreflight = () => {
    setIsSubmitting(true);
    const res = startMission();
    if (res.result === 'SUCCESS') {
      setShowPreflight(false);
    }
    setIsSubmitting(false);
  };

  const handleAbort = () => {
    if (window.confirm('Are you sure you want to abort the active mission? This action cannot be undone.')) {
      abortMission();
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset mission state? This will clear the current mission and return to standby.')) {
      resetToIdle();
      setShowMissionConfig(false);
      setShowPreflight(false);
    }
  };

  const statusLabels = {
    [MissionState.IDLE]: { text: 'Standby', cls: 'badge-simulated' },
    [MissionState.PREPARING]: { text: 'Configuring…', cls: 'badge-active' },
    [MissionState.RUNNING]: { text: 'Active Patrol', cls: 'badge-active' },
    [MissionState.PAUSED]: { text: 'Stationary Loiter', cls: 'badge-warning' },
    [MissionState.COMPLETED]: { text: 'Completed', cls: 'badge-online' },
    [MissionState.ABORTED]: { text: 'Aborted', cls: 'badge-danger' },
    [MissionState.ERROR]: { text: 'Error', cls: 'badge-danger' }
  };
  const statusInfo = statusLabels[missionStatus] || statusLabels[MissionState.IDLE];

  return (
    <div className="mission-controls-panel hud-panel hud-corner" role="region" aria-label="Mission Controls">
      {/* Command Feedback Banner */}
      {commandFeedback && commandFeedback.result !== 'SUCCESS' && (
        <div className={`cmd-feedback-banner ${commandFeedback.result === 'REJECTED' ? 'rejected' : 'error'}`} role="alert">
          <AlertCircle size={16} />
          <span>{commandFeedback.message}</span>
        </div>
      )}

      <div className="controls-top-row">
        {/* Status Badge */}
        <div className="status-indicator-group">
          <span className="control-label">Status:</span>
          <span className={`badge ${statusInfo.cls} font-mono`}>
            {missionStatus === MissionState.RUNNING && <span className="pulse-dot active"></span>}
            {missionStatus === MissionState.COMPLETED && <CheckCircle2 size={13} />}
            {statusInfo.text}
          </span>
          {missionId && (
            <span className="mission-id-pill font-mono" title="Active Mission ID">
              {missionId}
            </span>
          )}
        </div>

        {/* Current Stage */}
        <div className="stage-badge-container hide-on-mobile">
          <span className="control-label">Current Pipeline:</span>
          <span className="current-stage-pill font-mono">
            Stage {(useMission().currentStageNumber)}: {currentStage.title}
          </span>
        </div>

        {/* MET Clock */}
        <div className="met-counter-group font-mono" aria-label="Mission Elapsed Time">
          <Clock size={15} className="text-cyan" />
          <span className="met-label">MET:</span>
          <span className="met-value">{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="controls-action-row">
        <div className="btn-action-cluster">
          {/* IDLE → Show mission config */}
          {missionStatus === MissionState.IDLE && !showMissionConfig && !showPreflight && (
            <button 
              onClick={() => setShowMissionConfig(true)} 
              className="btn btn-primary"
              id="btn-configure-mission"
              aria-label="Configure new mission"
            >
              <Settings2 size={16} />
              <span>Configure Mission</span>
            </button>
          )}

          {/* RUNNING → Pause */}
          {missionStatus === MissionState.RUNNING && (
            <button 
              onClick={pauseMission} 
              className="btn btn-secondary"
              id="btn-pause-mission"
              aria-label="Pause mission"
            >
              <Pause size={16} fill="currentColor" />
              <span>Pause Mission</span>
            </button>
          )}

          {/* PAUSED → Resume */}
          {missionStatus === MissionState.PAUSED && (
            <button 
              onClick={resumeMission} 
              className="btn btn-primary"
              id="btn-resume-mission"
              aria-label="Resume mission"
            >
              <Play size={16} fill="currentColor" />
              <span>Resume Mission</span>
            </button>
          )}

          {/* RUNNING or PAUSED → Abort (with confirmation) */}
          {(missionStatus === MissionState.RUNNING || missionStatus === MissionState.PAUSED) && (
            <button 
              onClick={handleAbort} 
              className="btn btn-danger"
              id="btn-abort-mission"
              aria-label="Abort mission"
            >
              <Square size={16} fill="currentColor" />
              <span>Abort Patrol</span>
            </button>
          )}

          {/* COMPLETED / ABORTED / ERROR → Reset */}
          {(missionStatus === MissionState.COMPLETED || missionStatus === MissionState.ABORTED || missionStatus === MissionState.ERROR) && (
            <button 
              onClick={handleReset} 
              className="btn btn-secondary"
              id="btn-reset-mission"
              aria-label="Reset to standby"
            >
              <RotateCcw size={15} />
              <span>New Mission</span>
            </button>
          )}

          {/* Simulate Anomaly (always available during RUNNING) */}
          {missionStatus === MissionState.RUNNING && (
            <button 
              onClick={injectCustomHazard}
              className="btn btn-outline-cyan inject-btn"
              title="Inject obstacle at current vehicle position"
              id="btn-inject-hazard"
              aria-label="Simulate anomaly"
            >
              <PlusCircle size={15} />
              <span>Simulate Anomaly</span>
            </button>
          )}
        </div>

        {/* Speed Controls */}
        <div className="speed-control-group">
          <span className="speed-label font-mono">Sim Rate:</span>
          <div className="speed-pills" role="radiogroup" aria-label="Simulation speed">
            {[1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setSpeedMultiplier(speed)}
                className={`speed-pill-btn font-mono ${speedMultiplier === speed ? 'active' : ''}`}
                role="radio"
                aria-checked={speedMultiplier === speed}
                aria-label={`${speed}x speed`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============= MISSION CONFIGURATION PANEL ============= */}
      {showMissionConfig && missionStatus === MissionState.IDLE && (
        <div className="config-panel hud-panel" role="form" aria-label="Mission Configuration">
          <div className="config-header">
            <h4 className="config-title font-display">
              <Settings2 size={18} className="text-cyan" />
              Mission Planning & Configuration
            </h4>
            <button onClick={() => setShowMissionConfig(false)} className="close-config-btn" aria-label="Close configuration">×</button>
          </div>

          <div className="config-grid">
            {/* Route */}
            <div className="config-field">
              <label className="config-label font-mono">
                <Navigation size={13} /> Inspection Route
              </label>
              <select 
                value={configForm.routeId}
                onChange={(e) => setConfigForm(prev => ({ ...prev, routeId: e.target.value }))}
                className="config-select font-display"
              >
                {MISSION_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.totalDistanceKm} km)</option>
                ))}
              </select>
            </div>

            {/* Strategy */}
            <div className="config-field">
              <label className="config-label font-mono">
                <Settings2 size={13} /> Coordination Strategy
              </label>
              <select 
                value={configForm.strategy}
                onChange={(e) => setConfigForm(prev => ({ ...prev, strategy: e.target.value }))}
                className="config-select font-display"
              >
                <option value="coordinated">Strategy B: Coordinated (UGV + UAV Parallel)</option>
                <option value="sequential">Strategy A: Sequential (UGV → UAV)</option>
                <option value="ground_only">Strategy C: Ground-Only Fallback</option>
              </select>
            </div>

            {/* Min Battery UGV */}
            <div className="config-field">
              <label className="config-label font-mono">Min UGV Battery (%)</label>
              <input type="number" min={10} max={90} value={configForm.minBatteryUgv}
                onChange={(e) => setConfigForm(prev => ({ ...prev, minBatteryUgv: +e.target.value }))}
                className="config-input font-mono" />
            </div>

            {/* Min Battery UAV */}
            <div className="config-field">
              <label className="config-label font-mono">Min UAV Battery (%)</label>
              <input type="number" min={10} max={90} value={configForm.minBatteryUav}
                onChange={(e) => setConfigForm(prev => ({ ...prev, minBatteryUav: +e.target.value }))}
                className="config-input font-mono" />
            </div>

            {/* Max Duration */}
            <div className="config-field">
              <label className="config-label font-mono">Max Duration (min)</label>
              <input type="number" min={5} max={120} value={configForm.maxDurationMin}
                onChange={(e) => setConfigForm(prev => ({ ...prev, maxDurationMin: +e.target.value }))}
                className="config-input font-mono" />
            </div>

            {/* Human Verification */}
            <div className="config-field">
              <label className="config-label font-mono checkbox-label">
                <input type="checkbox" checked={configForm.requireHumanVerification}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, requireHumanVerification: e.target.checked }))}
                />
                Require Human Verification for Hazards
              </label>
            </div>

            {/* Safety Acknowledgment */}
            <div className="config-field">
              <label className="config-label font-mono checkbox-label">
                <input type="checkbox" checked={configForm.safetyAcknowledged}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, safetyAcknowledged: e.target.checked }))}
                />
                Operator Confirms Regulatory Compliance & Airspace Clearance
              </label>
            </div>
          </div>

          <div className="config-actions">
            <button 
              onClick={handleCreateAndPreflight}
              className="btn btn-primary"
              disabled={isSubmitting}
              id="btn-run-preflight"
            >
              {isSubmitting ? <Loader2 size={16} className="spin-icon" /> : <ShieldCheck size={16} />}
              <span>Run Preflight Checks</span>
            </button>
          </div>
        </div>
      )}

      {/* ============= PREFLIGHT CHECKLIST PANEL ============= */}
      {showPreflight && preflightChecklist && (
        <div className="preflight-panel hud-panel" role="region" aria-label="Preflight Checklist">
          <div className="preflight-header">
            <h4 className="preflight-title font-display">
              <ShieldCheck size={18} className={preflightPassed ? 'text-emerald' : 'text-danger'} />
              Preflight Readiness Assessment
            </h4>
            <span className={`badge ${preflightPassed ? 'badge-online' : 'badge-danger'} font-mono`}>
              {preflightPassed ? 'ALL CHECKS PASSED' : 'BLOCKED — FIX FAILURES'}
            </span>
          </div>

          <div className="checklist-grid">
            {preflightChecklist.map(item => {
              let Icon = AlertCircle;
              let cls = 'not-checked';
              if (item.status === PreflightStatus.PASSED) { Icon = CheckCircle2; cls = 'passed'; }
              else if (item.status === PreflightStatus.FAILED) { Icon = XCircle; cls = 'failed'; }
              else if (item.status === PreflightStatus.WARNING) { Icon = AlertTriangle; cls = 'warning'; }

              return (
                <div key={item.id} className={`checklist-item ${cls}`} role="listitem">
                  <Icon size={18} className={`checklist-icon ${cls}`} />
                  <div className="checklist-info">
                    <strong className="checklist-label">{item.label}</strong>
                    <span className="checklist-desc">{item.description}</span>
                    {item.mandatory && <span className="mandatory-tag font-mono">MANDATORY</span>}
                  </div>
                  <span className={`checklist-status-badge font-mono ${cls}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="preflight-actions">
            <button 
              onClick={handleStartAfterPreflight}
              className="btn btn-primary"
              disabled={!preflightPassed || isSubmitting}
              id="btn-start-mission"
              title={!preflightPassed ? 'Fix failed mandatory checks before starting' : 'Start the autonomous mission'}
            >
              {isSubmitting ? <Loader2 size={16} className="spin-icon" /> : <Play size={16} fill="currentColor" />}
              <span>Start Autonomous Mission</span>
            </button>
            <button 
              onClick={() => { setShowPreflight(false); setShowMissionConfig(true); }}
              className="btn btn-secondary"
            >
              <RotateCcw size={15} />
              <span>Back to Config</span>
            </button>
          </div>
        </div>
      )}

      {/* ============= PROGRESS BAR ============= */}
      {missionStatus !== MissionState.IDLE && (
        <div className="progress-section">
          <div className="progress-header font-mono">
            <div className="progress-detail">
              <span>Route Traversal:</span>
              <strong className="glow-text-cyan">{progress.toFixed(1)}%</strong>
            </div>
            <div className="progress-detail">
              <span>Distance:</span>
              <strong>{distanceCoveredKm} / {activePreset.totalDistanceKm} km</strong>
            </div>
            <div className="progress-detail hide-on-mobile">
              <span>Strategy:</span>
              <strong className="text-cyan">{strategy}</strong>
            </div>
          </div>

          <div className="progress-bar-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              {missionStatus === MissionState.RUNNING && <div className="progress-glow-head"></div>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mission-controls-panel {
          padding: 18px 24px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cmd-feedback-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-family: var(--font-mono);
          animation: slideIn 0.2s ease-out;
        }
        .cmd-feedback-banner.rejected {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fbbf24;
        }
        .cmd-feedback-banner.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .controls-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 14px;
        }
        .status-indicator-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .control-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .mission-id-pill {
          font-size: 0.68rem;
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-dim);
        }
        .stage-badge-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .current-stage-pill {
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.25);
          color: var(--neon-cyan);
          font-size: 0.76rem;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .met-counter-group {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(5, 8, 17, 0.7);
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }
        .met-label { color: var(--text-muted); font-size: 0.76rem; }
        .met-value { color: var(--neon-cyan); font-size: 0.95rem; font-weight: 700; }
        .controls-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .btn-action-cluster {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .inject-btn { border-style: dashed; }
        .speed-control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .speed-label { font-size: 0.75rem; color: var(--text-muted); }
        .speed-pills {
          display: flex;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 2px;
        }
        .speed-pill-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 4px 10px;
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all var(--transition-fast);
        }
        .speed-pill-btn.active {
          background: var(--electric-blue);
          color: #ffffff;
          box-shadow: 0 0 10px rgba(0, 136, 255, 0.5);
        }
        /* Config Panel */
        .config-panel, .preflight-panel {
          padding: 20px;
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 8px;
          background: rgba(8, 14, 30, 0.95);
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 0.2s ease-out;
        }
        .config-header, .preflight-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 10px;
        }
        .config-title, .preflight-title {
          font-size: 1.05rem;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .close-config-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.3rem;
          cursor: pointer;
        }
        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .config-field { display: flex; flex-direction: column; gap: 4px; }
        .config-label {
          font-size: 0.76rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .checkbox-label {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .config-select, .config-input {
          background: rgba(5, 8, 17, 0.9);
          border: 1px solid var(--border-subtle);
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          outline: none;
        }
        .config-select:focus, .config-input:focus {
          border-color: var(--neon-cyan);
          box-shadow: 0 0 8px rgba(0, 240, 255, 0.25);
        }
        .config-actions, .preflight-actions {
          display: flex;
          gap: 10px;
          border-top: 1px solid rgba(56, 189, 248, 0.1);
          padding-top: 14px;
        }
        /* Preflight Checklist */
        .checklist-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 6px;
          background: rgba(5, 8, 17, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: border-color var(--transition-fast);
        }
        .checklist-item.passed { border-left: 3px solid var(--status-emerald); }
        .checklist-item.failed { border-left: 3px solid var(--status-crimson); background: rgba(239, 68, 68, 0.05); }
        .checklist-item.warning { border-left: 3px solid var(--status-amber); }
        .checklist-icon.passed { color: var(--status-emerald); }
        .checklist-icon.failed { color: var(--status-crimson); }
        .checklist-icon.warning { color: var(--status-amber); }
        .checklist-icon.not-checked { color: var(--text-dim); }
        .checklist-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .checklist-label { font-size: 0.88rem; color: #ffffff; }
        .checklist-desc { font-size: 0.76rem; color: var(--text-muted); }
        .mandatory-tag {
          font-size: 0.65rem;
          color: var(--status-amber);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .checklist-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .checklist-status-badge.passed { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .checklist-status-badge.failed { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .checklist-status-badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .checklist-status-badge.not-checked { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
        /* Progress Bar */
        .progress-section { display: flex; flex-direction: column; gap: 6px; }
        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .progress-detail { display: flex; align-items: center; gap: 6px; }
        .progress-bar-track {
          width: 100%;
          height: 8px;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #0077ff, #00f0ff);
          position: relative;
          transition: width 0.3s ease-out;
        }
        .progress-glow-head {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 12px;
          background: #ffffff;
          box-shadow: 0 0 12px #00f0ff, 0 0 20px #00f0ff;
        }
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
