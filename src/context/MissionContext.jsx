import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initEngine, subscribe, getState,
  createMission, runPreflight, startMission, pauseMission, resumeMission,
  abortMission, emergencyStop, resetToIdle,
  verifyHazardAction, dispatchRepairAction, injectHazardAction,
  setSpeed, selectRoute, toggleSound, acknowledgeAlert,
  enableFaultInjection, injectFault, FAULT_SCENARIOS,
  getDiagnostics, generateReport
} from '../engine/apiService';
import {
  MissionState, DeviceState, StageState, ConnState,
  HazardVerification, MissionStrategy, PreflightStatus,
  CommandResult
} from '../engine/stateMachine';
import { MISSION_PRESETS, WORKFLOW_STAGES, HISTORICAL_MISSIONS } from '../data/mockData';
import { setSoundEnabled } from '../utils/audio';
import { playUiClick, playMissionStart, playHazardAlert } from '../utils/audio';

const MissionContext = createContext();

export function MissionProvider({ children }) {
  const [state, setState] = useState(null);
  const [commandFeedback, setCommandFeedback] = useState(null); // { result, message }

  // Initialise engine once
  useEffect(() => {
    initEngine();
    setState(getState());
    const unsub = subscribe((snapshot) => {
      setState({ ...snapshot });
    });
    return unsub;
  }, []);

  // Clear command feedback after a delay
  useEffect(() => {
    if (!commandFeedback) return;
    const t = setTimeout(() => setCommandFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [commandFeedback]);

  // Sound sync
  useEffect(() => {
    if (state) setSoundEnabled(state.soundOn);
  }, [state?.soundOn]);

  // ---- Command wrappers with feedback ----

  const handleCommand = useCallback((label, fn) => {
    const res = fn();
    if (res && res.result) {
      setCommandFeedback(res);
      if (res.result === CommandResult.REJECTED || res.result === CommandResult.FAILED) {
        console.warn(`[${label}] ${res.message}`);
      }
    }
    return res;
  }, []);

  const doCreateMission = useCallback((config) => {
    playUiClick();
    return handleCommand('CreateMission', () => createMission(config));
  }, [handleCommand]);

  const doRunPreflight = useCallback(() => {
    playUiClick();
    return handleCommand('Preflight', () => runPreflight());
  }, [handleCommand]);

  const doStartMission = useCallback(() => {
    playMissionStart();
    return handleCommand('StartMission', () => startMission());
  }, [handleCommand]);

  const doPauseMission = useCallback(() => {
    playUiClick();
    return handleCommand('Pause', () => pauseMission());
  }, [handleCommand]);

  const doResumeMission = useCallback(() => {
    playMissionStart();
    return handleCommand('Resume', () => resumeMission());
  }, [handleCommand]);

  const doAbortMission = useCallback(() => {
    playUiClick();
    return handleCommand('Abort', () => abortMission());
  }, [handleCommand]);

  const doEmergencyStop = useCallback(() => {
    emergencyStop();
  }, []);

  const doResetToIdle = useCallback(() => {
    playUiClick();
    return handleCommand('Reset', () => resetToIdle());
  }, [handleCommand]);

  const doVerifyHazard = useCallback((hazardId, status) => {
    playUiClick();
    return handleCommand('Verify', () => verifyHazardAction(hazardId, status));
  }, [handleCommand]);

  const doDispatchRepair = useCallback((hazardId) => {
    playUiClick();
    return handleCommand('Dispatch', () => dispatchRepairAction(hazardId));
  }, [handleCommand]);

  const doInjectHazard = useCallback(() => {
    playHazardAlert();
    return handleCommand('InjectHazard', () => injectHazardAction());
  }, [handleCommand]);

  const doSetSpeed = useCallback((mult) => {
    playUiClick();
    setSpeed(mult);
  }, []);

  const doSelectRoute = useCallback((routeId) => {
    playUiClick();
    return handleCommand('SelectRoute', () => selectRoute(routeId));
  }, [handleCommand]);

  const doToggleSound = useCallback((on) => {
    toggleSound(on);
    setSoundEnabled(on);
  }, []);

  const doAcknowledgeAlert = useCallback((alertId) => {
    acknowledgeAlert(alertId);
  }, []);

  const doEnableFaultInjection = useCallback((enabled) => {
    enableFaultInjection(enabled);
  }, []);

  const doInjectFault = useCallback((scenarioType, triggerAt) => {
    return handleCommand('InjectFault', () => injectFault(scenarioType, triggerAt));
  }, [handleCommand]);

  const doGetDiagnostics = useCallback(() => getDiagnostics(), []);

  const doGenerateReport = useCallback(() => {
    return handleCommand('Report', () => generateReport());
  }, [handleCommand]);

  // ---- Derived accessors (for backward compatibility with existing components) ----

  const value = {
    // Raw engine state
    engineState: state,

    // Mission
    missionId: state?.missionId,
    missionStatus: state?.missionState || MissionState.IDLE,
    missionConfig: state?.missionConfig,
    progress: state?.progress || 0,
    elapsedSeconds: state ? Math.floor(state.elapsedMs / 1000) : 0,
    speedMultiplier: state?.speedMultiplier || 1,
    soundOn: state?.soundOn ?? true,
    strategy: state?.strategy || MissionStrategy.COORDINATED,

    // Preset
    activePreset: state?.activePreset || MISSION_PRESETS[0],

    // Devices
    roverState: state?.ugv || {},
    droneState: state?.uav || {},

    // Workflow
    stages: state?.stages || [],
    currentStageIndex: state?.currentStageIndex || 0,
    currentStageNumber: state ? (state.currentStageIndex + 1) : 1,
    currentStage: state?.stages?.[state?.currentStageIndex] || WORKFLOW_STAGES[0],

    // Hazards
    detectedHazards: state?.detectedHazards || [],
    hazardReviewQueue: state?.hazardReviewQueue || [],
    allHazards: state?.hazardDefinitions || [],

    // Preflight
    preflightChecklist: state?.preflightChecklist,
    preflightPassed: state?.preflightPassed || false,

    // Events & Alerts
    eventLogs: state?.events || [],
    activeAlerts: state?.activeAlerts || [],
    toasts: state?.toasts || [],

    // Diagnostics
    diagnostics: state?.diagnostics || {},

    // Fault injection
    faultInjection: state?.faultInjection || { enabled: false, activeScenarios: [] },
    FAULT_SCENARIOS,

    // Command feedback
    commandFeedback,

    // Enums
    MissionState, DeviceState, StageState, ConnState,
    HazardVerification, MissionStrategy, PreflightStatus, CommandResult,

    // Historical
    historicalMissions: HISTORICAL_MISSIONS,

    // Actions
    createMission: doCreateMission,
    runPreflight: doRunPreflight,
    startMission: doStartMission,
    pauseMission: doPauseMission,
    resumeMission: doResumeMission,
    abortMission: doAbortMission,
    emergencyStop: doEmergencyStop,
    resetToIdle: doResetToIdle,
    verifyHazard: doVerifyHazard,
    dispatchRepair: doDispatchRepair,
    injectCustomHazard: doInjectHazard,
    setSpeedMultiplier: doSetSpeed,
    selectPreset: doSelectRoute,
    setSoundOn: doToggleSound,
    acknowledgeAlert: doAcknowledgeAlert,
    enableFaultInjection: doEnableFaultInjection,
    injectFault: doInjectFault,
    getDiagnostics: doGetDiagnostics,
    generateReport: doGenerateReport
  };

  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050811', color: '#00f0ff', fontFamily: 'Orbitron, monospace' }}>
        <span>Initializing AeroDrive Swarm Engine…</span>
      </div>
    );
  }

  return (
    <MissionContext.Provider value={value}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}
