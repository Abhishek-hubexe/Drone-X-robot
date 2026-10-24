// ============================================================
// AeroDrive API Service Layer
// Conceptual REST/WebSocket interface backed by the local
// simulation engine.  All UI code calls these methods, making
// it possible to swap in a real HTTP backend later without
// rewriting the frontend.
// ============================================================

import {
  MissionState, DeviceState, StageState, ConnState,
  HazardVerification, MissionStrategy,
  transitionMission, transitionDevice, transitionStage,
  transitionHazardVerification,
  generateCommandId, generateEntityId, registerCommandId,
  CommandResult, makeCommandResponse,
  createPreflightChecklist, runPreflightChecks, canStartMission,
  matchHazard, MatchConfidence
} from './stateMachine';

import {
  saveMissionRecord, getMissionRecords, getMissionById,
  saveActiveMissionState, getActiveMissionState, clearActiveMissionState,
  appendEvent, getEventsByMission,
  saveHazard, getHazards, getHazardsByMission, updateHazardVerification,
  saveVerificationDecision,
  saveReportSummary, getReportSummaries, getReportByMission,
  isStorageAvailable
} from './storage';

import { MISSION_PRESETS, INITIAL_HAZARDS, WORKFLOW_STAGES } from '../data/mockData';

// ============================================================
// Internal authoritative state (single source of truth)
// ============================================================

let _state = null;       // Will be initialised by initEngine()
let _tickTimer = null;
let _listeners = [];     // Subscribers for state changes
let _started = false;

function defaultState() {
  return {
    // Mission
    missionId: null,
    missionState: MissionState.IDLE,
    missionConfig: null,
    activePreset: MISSION_PRESETS[0],
    strategy: MissionStrategy.COORDINATED,
    progress: 0,                  // 0-100, derived from workflow
    elapsedMs: 0,
    startTimestamp: null,
    speedMultiplier: 1,

    // Devices
    ugv: {
      id: 'UGV-TITAN-01',
      name: 'Titan-01 Heavy Rover',
      state: DeviceState.STANDBY,
      connection: ConnState.CONNECTED,
      battery: 98,
      speedKmh: 0,
      headingDeg: 48,
      lidarPointsSec: 340000,
      temperatureC: 34.2,
      wheelRpm: 0,
      rssi: -52,
      lat: MISSION_PRESETS[0].waypoints[0].lat,
      lng: MISSION_PRESETS[0].waypoints[0].lng,
      canvasX: MISSION_PRESETS[0].waypoints[0].x,
      canvasY: MISSION_PRESETS[0].waypoints[0].y,
      lastTelemetryTs: null,
      faults: []
    },
    uav: {
      id: 'UAV-SKYEYE-04',
      name: 'SkyEye-04 Hexacopter',
      state: DeviceState.STANDBY,
      connection: ConnState.CONNECTED,
      battery: 95,
      altitudeM: 0,
      flightMode: 'Grounded',
      windSpeedMs: 2.8,
      gimbalAngleDeg: -30,
      rssi: -48,
      lat: MISSION_PRESETS[0].waypoints[0].lat + 0.0003,
      lng: MISSION_PRESETS[0].waypoints[0].lng + 0.0002,
      canvasX: MISSION_PRESETS[0].waypoints[0].x + 35,
      canvasY: MISSION_PRESETS[0].waypoints[0].y - 30,
      lastTelemetryTs: null,
      faults: [],
      lowBatteryThreshold: 20,
      returnTriggered: false
    },

    // Workflow stages
    stages: WORKFLOW_STAGES.map(s => ({
      ...s,
      status: StageState.PENDING
    })),
    currentStageIndex: 0,

    // Hazards
    hazardDefinitions: INITIAL_HAZARDS, // scenario definition
    detectedHazards: [],
    hazardReviewQueue: [],

    // Preflight
    preflightChecklist: null,
    preflightPassed: false,

    // Events
    events: [],

    // Alerts
    activeAlerts: [],

    // Diagnostics
    diagnostics: {
      backendHealth: true,
      storageHealth: true,
      detectionServiceHealth: true,
      appVersion: '1.0.0-sim',
      lastCheckTs: null
    },

    // Fault injection (dev mode)
    faultInjection: {
      enabled: false,
      activeScenarios: []
    },

    // Sound
    soundOn: true,

    // Toasts
    toasts: []
  };
}

// ============================================================
// Notify all subscribers
// ============================================================

function notify() {
  const snapshot = { ..._state };
  for (const fn of _listeners) {
    try { fn(snapshot); } catch (e) { console.error('[ApiService] Listener error:', e); }
  }
}

export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}

export function getState() {
  return _state ? { ..._state } : null;
}

// ============================================================
// Event & Alert helpers
// ============================================================

function addEvent(level, text, component = 'SYS') {
  const evt = {
    id: generateEntityId('EVT'),
    missionId: _state.missionId,
    time: new Date().toISOString(),
    localTime: new Date().toLocaleTimeString(),
    level,
    component,
    text
  };
  _state.events = [evt, ..._state.events.slice(0, 99)];
  appendEvent(evt);
  return evt;
}

function addAlert(severity, title, message) {
  const alert = {
    id: generateEntityId('ALR'),
    severity,
    title,
    message,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };
  _state.activeAlerts = [alert, ..._state.activeAlerts];
  return alert;
}

function addToast(title, message, type = 'info') {
  const id = Date.now() + Math.random();
  _state.toasts = [..._state.toasts.slice(-3), { id, title, message, type }];
  setTimeout(() => {
    _state.toasts = _state.toasts.filter(t => t.id !== id);
    notify();
  }, 4500);
}

// ============================================================
// Position helpers
// ============================================================

function getPositionAlongRoute(percent) {
  const waypoints = _state.activePreset.waypoints;
  const totalSegments = waypoints.length - 1;
  const normalized = Math.max(0, Math.min(100, percent)) / 100;
  const segmentFloat = normalized * totalSegments;
  const segIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1);
  const segFraction = segmentFloat - segIndex;
  const pA = waypoints[segIndex];
  const pB = waypoints[segIndex + 1];
  return {
    x: pA.x + (pB.x - pA.x) * segFraction,
    y: pA.y + (pB.y - pA.y) * segFraction,
    lat: pA.lat + (pB.lat - pA.lat) * segFraction,
    lng: pA.lng + (pB.lng - pA.lng) * segFraction,
    angleDeg: Math.round(Math.atan2(pB.y - pA.y, pB.x - pA.x) * (180 / Math.PI))
  };
}

// ============================================================
// Derive progress from workflow stage completion
// ============================================================

function deriveProgress() {
  const total = _state.stages.length;
  let completed = 0;
  for (const s of _state.stages) {
    if (s.status === StageState.COMPLETED) completed++;
    if (s.status === StageState.IN_PROGRESS) completed += _state._stageInternalProgress || 0;
  }
  return Math.min(100, Math.round((completed / total) * 100 * 10) / 10);
}

// ============================================================
// SIMULATION TICK
// ============================================================

function simulationTick(dtMs) {
  if (_state.missionState !== MissionState.RUNNING) return;

  const dt = dtMs / 1000; // seconds
  _state.elapsedMs += dtMs;

  const stage = _state.stages[_state.currentStageIndex];
  if (!stage || stage.status === StageState.COMPLETED || stage.status === StageState.FAILED) {
    // Advance to next stage
    if (_state.currentStageIndex < _state.stages.length - 1) {
      const next = _state.currentStageIndex + 1;
      const t = transitionStage(_state.stages[next].status, StageState.IN_PROGRESS);
      if (t.valid) {
        _state.stages[next].status = StageState.IN_PROGRESS;
        _state.currentStageIndex = next;
        _state._stageInternalProgress = 0;
        addEvent('SYS', `Workflow stage ${next + 1}: "${_state.stages[next].title}" — IN PROGRESS.`);
      }
    } else {
      // All stages done → complete mission
      const t = transitionMission(_state.missionState, MissionState.COMPLETED);
      if (t.valid) {
        _state.missionState = MissionState.COMPLETED;
        _state.progress = 100;
        _state.ugv.state = DeviceState.STANDBY;
        _state.ugv.speedKmh = 0;
        _state.uav.state = DeviceState.STANDBY;
        _state.uav.altitudeM = 0;
        _state.uav.flightMode = 'Landed (RTH)';
        addEvent('SYS', 'Mission completed successfully. All stages finished.');
        addToast('Mission Accomplished', 'Road inspection complete. Report ready.', 'success');
        persistMissionRecord();
      }
      return;
    }
  }

  // Advance internal stage progress
  const stageSpeed = 0.012 * _state.speedMultiplier; // fraction per tick
  _state._stageInternalProgress = Math.min(1, (_state._stageInternalProgress || 0) + stageSpeed);

  // Complete current stage when internal progress reaches 1
  if (_state._stageInternalProgress >= 1) {
    const t = transitionStage(_state.stages[_state.currentStageIndex].status, StageState.COMPLETED);
    if (t.valid) {
      _state.stages[_state.currentStageIndex].status = StageState.COMPLETED;
      addEvent('SYS', `Stage ${_state.currentStageIndex + 1}: "${_state.stages[_state.currentStageIndex].title}" — COMPLETED.`);
    }
  }

  // Derive progress from stages
  _state.progress = deriveProgress();

  // ---- UGV Telemetry ----
  if (_state.ugv.state === DeviceState.ACTIVE) {
    const pos = getPositionAlongRoute(_state.progress);
    _state.ugv.canvasX = pos.x;
    _state.ugv.canvasY = pos.y;
    _state.ugv.lat = pos.lat;
    _state.ugv.lng = pos.lng;
    _state.ugv.headingDeg = pos.angleDeg;
    _state.ugv.speedKmh = Math.round(18 + Math.sin(_state.progress * 0.1) * 3);
    _state.ugv.wheelRpm = _state.ugv.speedKmh * 12;
    _state.ugv.battery = Math.max(10, Math.round(98 - (_state.progress * 0.28)));
    _state.ugv.lastTelemetryTs = new Date().toISOString();

    // Low battery check
    if (_state.ugv.battery <= 15 && !_state.ugv.faults.includes('low_battery')) {
      _state.ugv.faults.push('low_battery');
      addEvent('WARN', 'UGV battery critically low (≤15%). Return recommended.', 'UGV');
      addAlert('WARNING', 'UGV Low Battery', `Titan-01 battery at ${_state.ugv.battery}%. Consider aborting.`);
      addToast('Low Battery Warning', `UGV at ${_state.ugv.battery}%`, 'warning');
    }
  }

  // ---- UAV Telemetry ----
  if (_state.uav.state === DeviceState.ACTIVE) {
    const dronePos = getPositionAlongRoute(Math.min(100, _state.progress + 8));
    _state.uav.canvasX = dronePos.x;
    _state.uav.canvasY = dronePos.y;
    _state.uav.lat = dronePos.lat;
    _state.uav.lng = dronePos.lng;
    _state.uav.altitudeM = Math.round((28 + Math.cos(_state.progress * 0.05) * 3) * 10) / 10;
    _state.uav.flightMode = 'Forward Recon';
    _state.uav.battery = Math.max(8, Math.round(95 - (_state.progress * 0.44)));
    _state.uav.lastTelemetryTs = new Date().toISOString();

    // Low battery → auto return
    if (_state.uav.battery <= _state.uav.lowBatteryThreshold && !_state.uav.returnTriggered) {
      _state.uav.returnTriggered = true;
      const dt2 = transitionDevice(_state.uav.state, DeviceState.LOW_BATTERY);
      if (dt2.valid) _state.uav.state = DeviceState.LOW_BATTERY;
      addEvent('WARN', `UAV battery ≤ ${_state.uav.lowBatteryThreshold}%. Autonomous RTH triggered.`, 'UAV');
      addAlert('WARNING', 'UAV Low Battery RTH', `SkyEye-04 at ${_state.uav.battery}%, returning to home.`);
      addToast('UAV Return-to-Home', 'Low battery autonomous landing triggered.', 'warning');
    }
  }

  // ---- Handle fault injections ----
  if (_state.faultInjection.enabled) {
    for (const scenario of _state.faultInjection.activeScenarios) {
      if (!scenario.triggered && _state.progress >= (scenario.triggerAtProgress || 0)) {
        scenario.triggered = true;
        handleFaultScenario(scenario);
      }
    }
  }

  // ---- Hazard detection triggers ----
  for (const hazDef of _state.hazardDefinitions) {
    if (_state.progress >= hazDef.progressTrigger) {
      const alreadyDetected = _state.detectedHazards.some(h => h.definitionId === hazDef.id);
      if (!alreadyDetected) {
        const hazardId = generateEntityId('HAZ');
        const newHazard = {
          ...hazDef,
          id: hazardId,
          definitionId: hazDef.id,
          missionId: _state.missionId,
          detectedAt: new Date().toISOString(),
          verificationStatus: HazardVerification.UNVERIFIED,
          verificationHistory: [],
          repairAssigned: false,
          source: hazDef.detectedBy,
          matchResult: null
        };

        // Attempt matching against existing hazards
        const match = matchHazard(newHazard, _state.detectedHazards);
        if (match) {
          newHazard.matchResult = match;
          if (match.shouldCreateReview) {
            _state.hazardReviewQueue.push({
              newHazardId: hazardId,
              matchedHazardId: match.matchedHazardId,
              confidence: match.confidence,
              distance: match.distance,
              reviewed: false
            });
          }
        }

        _state.detectedHazards.push(newHazard);
        saveHazard(newHazard);
        addEvent('AI_ALERT', `[HAZARD] ${newHazard.title} (Conf: ${newHazard.confidence}%) at ${newHazard.lat.toFixed(4)}°N`, 'AI');
        addToast(`AI: ${newHazard.type}`, newHazard.title, 'warning');
      }
    }
  }

  // Persist state periodically
  saveActiveMissionState({
    missionId: _state.missionId,
    missionState: _state.missionState,
    progress: _state.progress,
    elapsedMs: _state.elapsedMs,
    currentStageIndex: _state.currentStageIndex,
    stageInternalProgress: _state._stageInternalProgress,
    stages: _state.stages.map(s => ({ stage: s.stage, status: s.status })),
    detectedHazardIds: _state.detectedHazards.map(h => h.id)
  });

  notify();
}

// ============================================================
// Fault Injection Handler
// ============================================================

function handleFaultScenario(scenario) {
  switch (scenario.type) {
    case 'ugv_comm_loss': {
      _state.ugv.connection = ConnState.DISCONNECTED;
      _state.ugv.lastTelemetryTs = new Date(Date.now() - 30000).toISOString(); // stale
      addEvent('CRITICAL', 'UGV communication lost. Telemetry stale. Entering safe hold.', 'UGV');
      addAlert('CRITICAL', 'UGV Comm Lost', 'Titan-01 telemetry link severed. Manual recovery required.');
      addToast('COMM LOSS', 'UGV link disconnected!', 'danger');
      break;
    }
    case 'uav_comm_loss': {
      _state.uav.connection = ConnState.DISCONNECTED;
      _state.uav.lastTelemetryTs = new Date(Date.now() - 30000).toISOString();
      addEvent('CRITICAL', 'UAV communication lost. Drone in autonomous RTH failsafe.', 'UAV');
      addAlert('CRITICAL', 'UAV Comm Lost', 'SkyEye-04 link severed. Autonomous landing expected.');
      addToast('COMM LOSS', 'UAV link disconnected!', 'danger');
      break;
    }
    case 'low_ugv_battery': {
      _state.ugv.battery = 12;
      _state.ugv.faults.push('low_battery');
      addEvent('WARN', 'FAULT INJECTED: UGV battery forced to 12%.', 'FAULT');
      addAlert('WARNING', 'Injected: UGV Low Battery', 'Battery forced to critical level for testing.');
      addToast('Fault: Low UGV Battery', 'Battery forced to 12%', 'warning');
      break;
    }
    case 'low_uav_battery': {
      _state.uav.battery = 10;
      _state.uav.returnTriggered = true;
      const dt2 = transitionDevice(_state.uav.state, DeviceState.LOW_BATTERY);
      if (dt2.valid) _state.uav.state = DeviceState.LOW_BATTERY;
      addEvent('WARN', 'FAULT INJECTED: UAV battery forced to 10%. RTH triggered.', 'FAULT');
      addAlert('WARNING', 'Injected: UAV Low Battery', 'Battery forced to critical. RTH initiated.');
      addToast('Fault: Low UAV Battery', 'Battery forced to 10%', 'warning');
      break;
    }
    case 'obstacle_encountered': {
      _state.ugv.speedKmh = 0;
      _state.ugv.wheelRpm = 0;
      addEvent('WARN', 'FAULT INJECTED: Blocking obstacle in path. UGV halted.', 'FAULT');
      addAlert('WARNING', 'Obstacle Blocking Path', 'UGV stopped. Operator must approve bypass or reroute.');
      addToast('Obstacle Ahead', 'UGV halted by obstruction.', 'warning');
      break;
    }
    case 'camera_failure': {
      _state.ugv.faults.push('camera');
      addEvent('CRITICAL', 'FAULT INJECTED: UGV forward camera offline. Vision degraded.', 'FAULT');
      addAlert('CRITICAL', 'Camera Failure', 'UGV 4K camera not responding. Detection accuracy reduced.');
      addToast('Camera Offline', 'UGV forward vision lost.', 'danger');
      break;
    }
    case 'sensor_failure': {
      _state.ugv.faults.push('sensor');
      _state.ugv.lidarPointsSec = 0;
      addEvent('CRITICAL', 'FAULT INJECTED: LIDAR sensor offline.', 'FAULT');
      addAlert('CRITICAL', 'LIDAR Sensor Failure', 'LIDAR scan rate dropped to 0. 3D profiling unavailable.');
      addToast('Sensor Offline', 'LIDAR unresponsive.', 'danger');
      break;
    }
    case 'detection_service_unavailable': {
      _state.diagnostics.detectionServiceHealth = false;
      addEvent('CRITICAL', 'FAULT INJECTED: AI detection service unreachable. No new hazards will be flagged.', 'FAULT');
      addAlert('CRITICAL', 'Detection Service Down', 'Edge YOLOv8 inference engine is unavailable.');
      addToast('AI Service Offline', 'No hazard detection.', 'danger');
      break;
    }
    default:
      addEvent('WARN', `Unknown fault scenario: ${scenario.type}`, 'FAULT');
  }
}

// ============================================================
// PUBLIC API — mirrors REST endpoints
// ============================================================

// POST /api/missions — Create a mission
export function createMission(config) {
  const cmdId = generateCommandId();
  const dup = registerCommandId(cmdId);
  if (dup.duplicate) return makeCommandResponse(CommandResult.DUPLICATE, 'Duplicate command.');

  if (_state.missionState !== MissionState.IDLE) {
    return makeCommandResponse(CommandResult.REJECTED, `Cannot create mission: current state is ${_state.missionState}. Must be IDLE.`);
  }

  const preset = MISSION_PRESETS.find(p => p.id === config.routeId);
  if (!preset || !preset.waypoints || preset.waypoints.length < 2) {
    return makeCommandResponse(CommandResult.REJECTED, 'Invalid or missing route. Select a valid inspection sector.');
  }

  const missionId = generateEntityId('MSN');
  _state.missionId = missionId;
  _state.activePreset = preset;
  _state.strategy = config.strategy || MissionStrategy.COORDINATED;
  _state.missionConfig = {
    ...config,
    missionId,
    minBatteryUgv: config.minBatteryUgv || 30,
    minBatteryUav: config.minBatteryUav || 40,
    maxDurationMin: config.maxDurationMin || 60,
    hazardCategories: config.hazardCategories || ['pothole', 'crack', 'debris'],
    requireHumanVerification: config.requireHumanVerification !== false,
    detectionServiceAvailable: true,
    safetyAcknowledged: config.safetyAcknowledged || false,
    requireUgv: true,
    route: preset
  };

  // Reset stages
  _state.stages = WORKFLOW_STAGES.map(s => ({ ...s, status: StageState.PENDING }));
  _state.currentStageIndex = 0;
  _state._stageInternalProgress = 0;
  _state.progress = 0;
  _state.elapsedMs = 0;
  _state.detectedHazards = [];
  _state.hazardReviewQueue = [];
  _state.activeAlerts = [];

  // Reset device positions
  const startWp = preset.waypoints[0];
  _state.ugv.canvasX = startWp.x;
  _state.ugv.canvasY = startWp.y;
  _state.ugv.lat = startWp.lat;
  _state.ugv.lng = startWp.lng;
  _state.ugv.battery = 98;
  _state.ugv.speedKmh = 0;
  _state.ugv.faults = [];
  _state.ugv.state = DeviceState.STANDBY;
  _state.ugv.connection = ConnState.CONNECTED;
  _state.ugv.lastTelemetryTs = new Date().toISOString();

  _state.uav.canvasX = startWp.x + 35;
  _state.uav.canvasY = startWp.y - 30;
  _state.uav.lat = startWp.lat + 0.0003;
  _state.uav.lng = startWp.lng + 0.0002;
  _state.uav.battery = 95;
  _state.uav.altitudeM = 0;
  _state.uav.flightMode = 'Grounded';
  _state.uav.faults = [];
  _state.uav.state = DeviceState.STANDBY;
  _state.uav.connection = ConnState.CONNECTED;
  _state.uav.returnTriggered = false;
  _state.uav.lastTelemetryTs = new Date().toISOString();

  addEvent('SYS', `Mission ${missionId} created. Route: ${preset.name}. Strategy: ${_state.strategy}.`);
  notify();

  return makeCommandResponse(CommandResult.SUCCESS, 'Mission created.', { missionId });
}

// Run preflight checks
export function runPreflight() {
  if (!_state.missionConfig) {
    return makeCommandResponse(CommandResult.REJECTED, 'No mission configured. Create a mission first.');
  }

  const checklist = createPreflightChecklist(_state.missionConfig);
  const devices = { ugv: _state.ugv, uav: _state.uav };
  _state.preflightChecklist = runPreflightChecks(checklist, devices);
  _state.preflightPassed = canStartMission(_state.preflightChecklist);

  addEvent('SYS', `Preflight checks completed. Result: ${_state.preflightPassed ? 'PASSED' : 'BLOCKED'}.`);
  notify();

  return makeCommandResponse(CommandResult.SUCCESS, _state.preflightPassed ? 'All mandatory checks passed.' : 'One or more mandatory checks failed.', {
    checklist: _state.preflightChecklist,
    canStart: _state.preflightPassed
  });
}

// POST /api/missions/{id}/start
export function startMission() {
  const cmdId = generateCommandId();
  const dup = registerCommandId(cmdId);
  if (dup.duplicate) return makeCommandResponse(CommandResult.DUPLICATE, 'Duplicate start request blocked.');

  if (!_state.missionId) {
    return makeCommandResponse(CommandResult.REJECTED, 'No mission created. Configure a mission first.');
  }

  // Must go through PREPARING first
  if (_state.missionState === MissionState.IDLE) {
    const t1 = transitionMission(_state.missionState, MissionState.PREPARING);
    if (!t1.valid) return makeCommandResponse(CommandResult.REJECTED, t1.error);
    _state.missionState = MissionState.PREPARING;
  }

  if (_state.missionState !== MissionState.PREPARING) {
    return makeCommandResponse(CommandResult.REJECTED, `Cannot start from state "${_state.missionState}". Must be PREPARING.`);
  }

  // Run preflight if not done
  if (!_state.preflightChecklist) {
    runPreflight();
  }

  if (!_state.preflightPassed) {
    return makeCommandResponse(CommandResult.REJECTED, 'Cannot start: mandatory preflight checks have not passed.');
  }

  // Transition to RUNNING
  const t2 = transitionMission(_state.missionState, MissionState.RUNNING);
  if (!t2.valid) return makeCommandResponse(CommandResult.REJECTED, t2.error);

  _state.missionState = MissionState.RUNNING;
  _state.startTimestamp = new Date().toISOString();

  // Activate devices
  const dt1 = transitionDevice(_state.ugv.state, DeviceState.PREFLIGHT);
  if (dt1.valid) _state.ugv.state = DeviceState.PREFLIGHT;
  const dt1b = transitionDevice(_state.ugv.state, DeviceState.ACTIVE);
  if (dt1b.valid) _state.ugv.state = DeviceState.ACTIVE;

  if (_state.strategy !== MissionStrategy.GROUND_ONLY) {
    const dt2 = transitionDevice(_state.uav.state, DeviceState.PREFLIGHT);
    if (dt2.valid) _state.uav.state = DeviceState.PREFLIGHT;
    const dt2b = transitionDevice(_state.uav.state, DeviceState.ACTIVE);
    if (dt2b.valid) _state.uav.state = DeviceState.ACTIVE;
  }

  // Start first workflow stage
  const st = transitionStage(_state.stages[0].status, StageState.IN_PROGRESS);
  if (st.valid) _state.stages[0].status = StageState.IN_PROGRESS;

  addEvent('SYS', `Mission ${_state.missionId} STARTED. Vehicles deployed.`);
  addToast('Mission Started', 'Swarm patrol initiated.', 'info');

  // Start simulation tick
  startSimulationLoop();

  saveMissionRecord({
    id: _state.missionId,
    name: _state.activePreset.name,
    strategy: _state.strategy,
    config: _state.missionConfig,
    startTimestamp: _state.startTimestamp,
    status: MissionState.RUNNING
  });

  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Mission started.', { missionId: _state.missionId });
}

// POST /api/missions/{id}/pause
export function pauseMission() {
  const t = transitionMission(_state.missionState, MissionState.PAUSED);
  if (!t.valid) return makeCommandResponse(CommandResult.REJECTED, t.error);

  _state.missionState = MissionState.PAUSED;
  stopSimulationLoop();

  // Pause devices
  if (_state.ugv.state === DeviceState.ACTIVE) {
    const dp = transitionDevice(_state.ugv.state, DeviceState.PAUSED);
    if (dp.valid) _state.ugv.state = DeviceState.PAUSED;
    _state.ugv.speedKmh = 0;
    _state.ugv.wheelRpm = 0;
  }
  if (_state.uav.state === DeviceState.ACTIVE) {
    const dp = transitionDevice(_state.uav.state, DeviceState.PAUSED);
    if (dp.valid) _state.uav.state = DeviceState.PAUSED;
    _state.uav.flightMode = 'Stationary Loiter';
  }

  addEvent('SYS', 'Mission PAUSED. Vehicles holding position. Stage preserved.');
  addToast('Mission Paused', 'Vehicles loitering in place.', 'info');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Mission paused. Stage preserved.');
}

// POST /api/missions/{id}/resume
export function resumeMission() {
  const t = transitionMission(_state.missionState, MissionState.RUNNING);
  if (!t.valid) return makeCommandResponse(CommandResult.REJECTED, t.error);

  _state.missionState = MissionState.RUNNING;

  // Resume devices
  if (_state.ugv.state === DeviceState.PAUSED) {
    const dr = transitionDevice(_state.ugv.state, DeviceState.ACTIVE);
    if (dr.valid) _state.ugv.state = DeviceState.ACTIVE;
  }
  if (_state.uav.state === DeviceState.PAUSED) {
    const dr = transitionDevice(_state.uav.state, DeviceState.ACTIVE);
    if (dr.valid) _state.uav.state = DeviceState.ACTIVE;
  }

  startSimulationLoop();
  addEvent('SYS', 'Mission RESUMED from pause.');
  addToast('Mission Resumed', 'Route traversal continues.', 'info');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Mission resumed.');
}

// POST /api/missions/{id}/abort
export function abortMission() {
  const t = transitionMission(_state.missionState, MissionState.ABORTED);
  if (!t.valid) return makeCommandResponse(CommandResult.REJECTED, t.error);

  _state.missionState = MissionState.ABORTED;
  stopSimulationLoop();

  _state.ugv.speedKmh = 0;
  _state.ugv.wheelRpm = 0;
  _state.ugv.state = DeviceState.STANDBY;
  _state.uav.flightMode = 'Emergency Land';
  _state.uav.state = DeviceState.STANDBY;
  _state.uav.altitudeM = 0;

  addEvent('WARN', 'Mission ABORTED by operator. Vehicles returning to dock.');
  addAlert('WARNING', 'Mission Aborted', 'Operator has manually aborted the active mission.');
  addToast('Mission Aborted', 'Vehicles ordered to return.', 'danger');

  persistMissionRecord();
  clearActiveMissionState();
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Mission aborted.');
}

// E-STOP
export function emergencyStop() {
  stopSimulationLoop();

  _state.ugv.state = DeviceState.E_STOP;
  _state.ugv.speedKmh = 0;
  _state.ugv.wheelRpm = 0;
  _state.uav.state = DeviceState.E_STOP;
  _state.uav.flightMode = 'EMERGENCY LAND';

  if (_state.missionState === MissionState.RUNNING || _state.missionState === MissionState.PAUSED) {
    _state.missionState = MissionState.ABORTED;
  }

  addEvent('CRITICAL', 'EMERGENCY E-STOP ACTIVATED. All actuators disengaged.');
  addAlert('EMERGENCY', 'E-STOP', 'Immediate safety shutdown of all vehicle actuators.');
  addToast('E-STOP ACTIVATED', 'All motors halted.', 'danger');

  persistMissionRecord();
  clearActiveMissionState();
  notify();
}

// Reset to IDLE
export function resetToIdle() {
  if (_state.missionState !== MissionState.COMPLETED &&
      _state.missionState !== MissionState.ABORTED &&
      _state.missionState !== MissionState.ERROR) {
    return makeCommandResponse(CommandResult.REJECTED, `Cannot reset from state "${_state.missionState}". Must be COMPLETED, ABORTED, or ERROR.`);
  }

  _state.missionState = MissionState.IDLE;
  _state.missionId = null;
  _state.missionConfig = null;
  _state.preflightChecklist = null;
  _state.preflightPassed = false;
  _state.progress = 0;
  _state.elapsedMs = 0;
  _state._stageInternalProgress = 0;
  _state.stages = WORKFLOW_STAGES.map(s => ({ ...s, status: StageState.PENDING }));
  _state.currentStageIndex = 0;
  _state.detectedHazards = [];
  _state.hazardReviewQueue = [];
  _state.activeAlerts = [];
  _state.faultInjection.activeScenarios = [];

  const startWp = _state.activePreset.waypoints[0];
  _state.ugv = { ..._state.ugv, state: DeviceState.STANDBY, battery: 98, speedKmh: 0, faults: [], canvasX: startWp.x, canvasY: startWp.y, lat: startWp.lat, lng: startWp.lng, connection: ConnState.CONNECTED, returnTriggered: false };
  _state.uav = { ..._state.uav, state: DeviceState.STANDBY, battery: 95, altitudeM: 0, flightMode: 'Grounded', faults: [], canvasX: startWp.x + 35, canvasY: startWp.y - 30, lat: startWp.lat + 0.0003, lng: startWp.lng + 0.0002, connection: ConnState.CONNECTED, returnTriggered: false };

  _state.diagnostics.detectionServiceHealth = true;

  clearActiveMissionState();
  addEvent('SYS', 'System reset to IDLE. Ready for new mission.');
  addToast('System Reset', 'Ready for new mission.', 'info');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Reset to IDLE.');
}

// Hazard verification
export function verifyHazardAction(hazardId, newStatus) {
  const hazard = _state.detectedHazards.find(h => h.id === hazardId);
  if (!hazard) return makeCommandResponse(CommandResult.REJECTED, 'Hazard not found.');

  const t = transitionHazardVerification(hazard.verificationStatus, newStatus);
  if (!t.valid) return makeCommandResponse(CommandResult.REJECTED, t.error);

  hazard.verificationStatus = newStatus;
  if (!hazard.verificationHistory) hazard.verificationHistory = [];
  hazard.verificationHistory.push({
    previousStatus: t.valid ? hazard.verificationStatus : 'unknown',
    newStatus,
    changedBy: 'operator',
    timestamp: new Date().toISOString()
  });

  updateHazardVerification(hazardId, newStatus);
  saveVerificationDecision({
    hazardId,
    missionId: _state.missionId,
    decision: newStatus,
    timestamp: new Date().toISOString(),
    operator: 'operator'
  });

  addEvent('OPERATOR', `Hazard ${hazardId} → ${newStatus.toUpperCase()}.`);
  addToast('Verification Updated', `${hazardId}: ${newStatus}`, 'info');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, `Hazard ${hazardId} updated to ${newStatus}.`);
}

// Dispatch repair
export function dispatchRepairAction(hazardId) {
  const hazard = _state.detectedHazards.find(h => h.id === hazardId);
  if (!hazard) return makeCommandResponse(CommandResult.REJECTED, 'Hazard not found.');
  if (hazard.repairAssigned) return makeCommandResponse(CommandResult.REJECTED, 'Repair already dispatched.');

  hazard.repairAssigned = true;
  if (hazard.verificationStatus === HazardVerification.UNVERIFIED) {
    hazard.verificationStatus = HazardVerification.VERIFIED;
  }

  saveHazard(hazard);
  addEvent('DISPATCH', `Work-order for ${hazardId} dispatched.`);
  addToast('Repair Dispatched', `Crew assigned for ${hazardId}.`, 'success');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Repair dispatched.');
}

// Inject custom hazard
export function injectHazardAction() {
  const pos = getPositionAlongRoute(_state.progress);
  const hazardId = generateEntityId('HAZ');
  const newHazard = {
    id: hazardId,
    definitionId: 'user-injected',
    missionId: _state.missionId,
    type: 'Obstacle Debris',
    category: 'foreign_object',
    title: 'Injected: Fallen Cargo Barrier',
    severity: 'critical',
    confidence: 97.4,
    lat: pos.lat + 0.0004,
    lng: pos.lng + 0.0004,
    detectedBy: 'Real-Time Edge Fusion (Manual Inject)',
    estimatedDimensions: '120cm x 60cm x 45cm',
    waterPresent: false,
    speedImpact: 'Immediate blockage by forward LIDAR cone',
    timestamp: new Date().toLocaleTimeString(),
    detectedAt: new Date().toISOString(),
    image: '/images/hazard_debris.jpg',
    verificationStatus: HazardVerification.UNVERIFIED,
    verificationHistory: [],
    repairAssigned: false,
    source: 'Manual Injection',
    matchResult: null
  };

  const match = matchHazard(newHazard, _state.detectedHazards);
  if (match) {
    newHazard.matchResult = match;
    if (match.shouldCreateReview) {
      _state.hazardReviewQueue.push({
        newHazardId: hazardId,
        matchedHazardId: match.matchedHazardId,
        confidence: match.confidence,
        distance: match.distance,
        reviewed: false
      });
    }
  }

  _state.detectedHazards.push(newHazard);
  saveHazard(newHazard);
  addEvent('AI_ALERT', `[INJECTED] ${hazardId} at current coords.`);
  addToast('Anomaly Injected', `Hazard ${hazardId} spawned.`, 'warning');
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Hazard injected.', { hazardId });
}

// Change speed multiplier
export function setSpeed(mult) {
  _state.speedMultiplier = mult;
  notify();
}

// Select route preset
export function selectRoute(routeId) {
  if (_state.missionState !== MissionState.IDLE) {
    return makeCommandResponse(CommandResult.REJECTED, 'Cannot change route during active mission.');
  }
  const preset = MISSION_PRESETS.find(p => p.id === routeId);
  if (!preset) return makeCommandResponse(CommandResult.REJECTED, 'Invalid route ID.');
  _state.activePreset = preset;
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, 'Route updated.');
}

// Sound toggle
export function toggleSound(on) {
  _state.soundOn = on;
  notify();
}

// Acknowledge an alert
export function acknowledgeAlert(alertId) {
  const alert = _state.activeAlerts.find(a => a.id === alertId);
  if (alert) alert.acknowledged = true;
  notify();
}

// ============================================================
// Fault injection API (dev only)
// ============================================================

export function enableFaultInjection(enabled) {
  _state.faultInjection.enabled = enabled;
  if (!enabled) _state.faultInjection.activeScenarios = [];
  addEvent('DEV', `Fault injection ${enabled ? 'ENABLED' : 'DISABLED'}.`);
  notify();
}

export function injectFault(scenarioType, triggerAtProgress = null) {
  if (!_state.faultInjection.enabled) {
    return makeCommandResponse(CommandResult.REJECTED, 'Fault injection is disabled.');
  }
  const scenario = {
    type: scenarioType,
    triggerAtProgress: triggerAtProgress || _state.progress,
    triggered: triggerAtProgress === null || triggerAtProgress <= _state.progress,
    addedAt: new Date().toISOString()
  };
  _state.faultInjection.activeScenarios.push(scenario);
  if (scenario.triggered) {
    handleFaultScenario(scenario);
  }
  addEvent('DEV', `Fault "${scenarioType}" queued (trigger at ${scenario.triggerAtProgress}%).`);
  notify();
  return makeCommandResponse(CommandResult.SUCCESS, `Fault "${scenarioType}" injected.`);
}

export const FAULT_SCENARIOS = [
  { type: 'ugv_comm_loss', label: 'UGV Communication Loss' },
  { type: 'uav_comm_loss', label: 'UAV Communication Loss' },
  { type: 'low_ugv_battery', label: 'UGV Low Battery (12%)' },
  { type: 'low_uav_battery', label: 'UAV Low Battery RTH (10%)' },
  { type: 'obstacle_encountered', label: 'Path Obstruction' },
  { type: 'camera_failure', label: 'UGV Camera Failure' },
  { type: 'sensor_failure', label: 'LIDAR Sensor Failure' },
  { type: 'detection_service_unavailable', label: 'AI Detection Service Down' }
];

// ============================================================
// Diagnostics
// ============================================================

export function getDiagnostics() {
  _state.diagnostics.lastCheckTs = new Date().toISOString();
  _state.diagnostics.storageHealth = isStorageAvailable();
  return {
    ..._state.diagnostics,
    ugvConnection: _state.ugv.connection,
    uavConnection: _state.uav.connection,
    ugvLastTelemetry: _state.ugv.lastTelemetryTs,
    uavLastTelemetry: _state.uav.lastTelemetryTs,
    activeMissionId: _state.missionId,
    missionState: _state.missionState,
    recentErrors: _state.events.filter(e => e.level === 'CRITICAL' || e.level === 'WARN').slice(0, 10)
  };
}

// ============================================================
// Report generation
// ============================================================

export function generateReport() {
  if (!_state.missionId) {
    return makeCommandResponse(CommandResult.REJECTED, 'No mission data.');
  }

  const pci = Math.max(55, Math.round(92 - (_state.detectedHazards.length * 6)));
  const report = {
    missionId: _state.missionId,
    routeName: _state.activePreset.name,
    strategy: _state.strategy,
    distanceKm: _state.activePreset.totalDistanceKm,
    areaSqm: _state.activePreset.targetAreaSqm,
    durationMs: _state.elapsedMs,
    pciScore: pci,
    totalHazards: _state.detectedHazards.length,
    criticalHazards: _state.detectedHazards.filter(h => h.severity === 'critical').length,
    verifiedHazards: _state.detectedHazards.filter(h => h.verificationStatus === 'VERIFIED').length,
    dismissedHazards: _state.detectedHazards.filter(h => h.verificationStatus === 'DISMISSED').length,
    repairsDispatched: _state.detectedHazards.filter(h => h.repairAssigned).length,
    ugvBatteryConsumed: `${98 - _state.ugv.battery}%`,
    uavBatteryConsumed: `${95 - _state.uav.battery}%`,
    hazards: _state.detectedHazards,
    stages: _state.stages.map(s => ({ title: s.title, status: s.status })),
    generatedAt: new Date().toISOString(),
    status: _state.missionState
  };

  saveReportSummary(report);
  return makeCommandResponse(CommandResult.SUCCESS, 'Report generated.', report);
}

// ============================================================
// Simulation Loop Control
// ============================================================

const TICK_INTERVAL_MS = 500;

function startSimulationLoop() {
  stopSimulationLoop();
  _tickTimer = setInterval(() => {
    simulationTick(TICK_INTERVAL_MS * _state.speedMultiplier);
  }, TICK_INTERVAL_MS);
}

function stopSimulationLoop() {
  if (_tickTimer) {
    clearInterval(_tickTimer);
    _tickTimer = null;
  }
}

// ============================================================
// Persist completed/aborted mission record
// ============================================================

function persistMissionRecord() {
  if (!_state.missionId) return;
  saveMissionRecord({
    id: _state.missionId,
    name: _state.activePreset.name,
    strategy: _state.strategy,
    config: _state.missionConfig,
    startTimestamp: _state.startTimestamp,
    endTimestamp: new Date().toISOString(),
    durationMs: _state.elapsedMs,
    distanceKm: ((_state.progress / 100) * _state.activePreset.totalDistanceKm).toFixed(2),
    hazardsFound: _state.detectedHazards.length,
    pciScore: Math.max(55, Math.round(92 - (_state.detectedHazards.length * 6))),
    status: _state.missionState
  });
}

// ============================================================
// Init / Restore
// ============================================================

export function initEngine(force = false) {
  if (_started && !force) return;
  _started = true;
  _state = defaultState();

  // Diagnostics check
  _state.diagnostics.storageHealth = isStorageAvailable();
  _state.diagnostics.lastCheckTs = new Date().toISOString();

  // Check for active mission after refresh
  const saved = getActiveMissionState();
  if (saved && saved.missionId) {
    // Restore to the state it was in, but DON'T auto-resume
    addEvent('SYS', `Recovered mission ${saved.missionId} after page refresh. Status restored to PAUSED for safety.`);
    _state.missionId = saved.missionId;
    _state.missionState = MissionState.PAUSED;
    _state.progress = saved.progress || 0;
    _state.elapsedMs = saved.elapsedMs || 0;
    _state.currentStageIndex = saved.currentStageIndex || 0;
    _state._stageInternalProgress = saved.stageInternalProgress || 0;
    if (saved.stages) {
      saved.stages.forEach(s => {
        const idx = _state.stages.findIndex(st => st.stage === s.stage);
        if (idx >= 0) _state.stages[idx].status = s.status;
      });
    }
    // Restore hazards from storage
    const storedHazards = getHazardsByMission(saved.missionId);
    if (storedHazards.length > 0) {
      _state.detectedHazards = storedHazards;
    }
    _state.ugv.state = DeviceState.PAUSED;
    _state.uav.state = DeviceState.PAUSED;
    addToast('Mission Recovered', `Mission ${saved.missionId} paused after refresh. Resume when ready.`, 'info');
  }

  addEvent('SYS', 'AeroDrive Swarm Control Hub initialized.');
  addEvent('NET', '5G NR Encrypted Swarm Mesh synchronized (Ping: 4.2ms).');
  addEvent('UGV', 'Titan-01 32-beam LIDAR & RTK-GPS locked (HDOP: 0.8).');
  addEvent('UAV', 'SkyEye-04 4K Optical/Thermal gimbal self-test passed.');

  notify();
}

// ============================================================
// Physical Hardware Command Interface (Safety Boundary)
// ============================================================

export async function executeHardwareCommand(deviceId, action, params = {}, options = {}) {
  const timeoutMs = options.timeoutMs || 3000;
  const isSimulatedTimeout = options.simulateTimeout || false;

  // Validate hardware connection
  const device = deviceId === 'UGV' ? _state.ugv : _state.uav;
  if (!device || device.connection !== ConnState.CONNECTED) {
    return makeCommandResponse(CommandResult.FAILED, `Physical device ${deviceId} is not connected or adapter unreachable.`);
  }

  // Safety constraint: require authenticated operator
  if (!options.operatorAuth) {
    return makeCommandResponse(CommandResult.REJECTED, 'Hardware execution rejected: Operator authorization required for physical actuators.');
  }

  // If testing timeout simulation
  if (isSimulatedTimeout) {
    addEvent('CRITICAL', `Hardware command "${action}" to ${deviceId} TIMED OUT after ${timeoutMs}ms. Physical action NOT confirmed.`, 'HARDWARE');
    return makeCommandResponse(CommandResult.TIMEOUT, `Command timed out waiting for ${deviceId} controller ACK.`);
  }

  addEvent('HARDWARE', `Hardware command "${action}" acknowledged by ${deviceId}.`, 'HARDWARE');
  return makeCommandResponse(CommandResult.SUCCESS, `Hardware command "${action}" acknowledged by ${deviceId}.`, {
    deviceId,
    action,
    confirmedState: 'ACKNOWLEDGED'
  });
}

// Reset engine state (used for testing and full session reset)
export function resetEngineForTesting(initialOverrides = {}) {
  stopSimulationLoop();
  _started = false;
  _state = { ...defaultState(), ...initialOverrides };
  _state.diagnostics.storageHealth = isStorageAvailable();
  _state.diagnostics.lastCheckTs = new Date().toISOString();
  notify();
  return _state;
}

export function updateEngineStateForTesting(updates = {}) {
  if (!_state) _state = defaultState();
  Object.assign(_state, updates);
  notify();
  return _state;
}

// Cleanup on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopSimulationLoop();
  });
}
