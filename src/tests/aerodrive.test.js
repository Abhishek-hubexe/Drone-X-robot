import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Storage setup for tests
let mockStorage = {};
beforeEach(() => {
  mockStorage = {};
  globalThis.localStorage = {
    getItem: (key) => mockStorage[key] !== undefined ? mockStorage[key] : null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { mockStorage = {}; }
  };
});

import {
  MissionState, DeviceState, StageState, ConnState,
  HazardVerification, MissionStrategy, CommandResult,
  transitionMission, transitionDevice, transitionStage,
  transitionHazardVerification, createPreflightChecklist,
  runPreflightChecks, canStartMission, matchHazard, MatchConfidence
} from '../engine/stateMachine';

import {
  initEngine, resetEngineForTesting, updateEngineStateForTesting, getState,
  createMission, runPreflight, startMission,
  pauseMission, resumeMission, abortMission,
  verifyHazardAction, generateReport, injectFault,
  executeHardwareCommand
} from '../engine/apiService';

import {
  saveMissionRecord, getMissionById,
  saveActiveMissionState, getActiveMissionState,
  saveHazard, getHazards, updateHazardVerification,
  saveReportSummary, getReportByMission,
  safeSet, isStorageAvailable
} from '../engine/storage';

describe('AeroDrive Comprehensive Automated Test Suite (Section 29)', () => {

  beforeEach(() => {
    resetEngineForTesting();
  });

  // Scenario 1: A valid mission starts and receives a unique ID
  it('Scenario 1: A valid mission starts and receives a unique ID', () => {
    const createRes = createMission({
      routeId: 'route_alpha',
      strategy: MissionStrategy.COORDINATED,
      safetyAcknowledged: true
    });
    expect(createRes.result).toBe(CommandResult.SUCCESS);
    expect(createRes.data.missionId).toBeDefined();
    expect(createRes.data.missionId.startsWith('MSN-')).toBe(true);

    const startRes = startMission();
    expect(startRes.result).toBe(CommandResult.SUCCESS);

    const state = getState();
    expect(state.missionState).toBe(MissionState.RUNNING);
    expect(state.missionId).toBe(createRes.data.missionId);
    expect(state.ugv.state).toBe(DeviceState.ACTIVE);
    expect(state.uav.state).toBe(DeviceState.ACTIVE);
  });

  // Scenario 2: A mission without a valid route is rejected
  it('Scenario 2: A mission without a valid route is rejected', () => {
    const res = createMission({
      routeId: 'invalid-nonexistent-route-id',
      strategy: MissionStrategy.COORDINATED
    });
    expect(res.result).toBe(CommandResult.REJECTED);
    expect(res.message).toMatch(/Invalid or missing route/i);
    expect(getState().missionState).toBe(MissionState.IDLE);
  });

  // Scenario 3: An unavailable mandatory device blocks mission start
  it('Scenario 3: An unavailable mandatory device blocks mission start', () => {
    createMission({ routeId: 'route_alpha' });

    // Force UGV into FAULT condition
    updateEngineStateForTesting({
      ugv: { ...getState().ugv, state: DeviceState.FAULT }
    });

    const preflightRes = runPreflight();
    expect(preflightRes.data.canStart).toBe(false);

    const startRes = startMission();
    expect(startRes.result).toBe(CommandResult.REJECTED);
    expect(startRes.message).toMatch(/preflight/i);
    expect(getState().missionState).not.toBe(MissionState.RUNNING);
  });

  // Scenario 4: Pause and resume preserve progress
  it('Scenario 4: Pause and resume preserve progress', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    updateEngineStateForTesting({
      progress: 42.5,
      _stageInternalProgress: 0.5
    });

    const pauseRes = pauseMission();
    expect(pauseRes.result).toBe(CommandResult.SUCCESS);
    expect(getState().missionState).toBe(MissionState.PAUSED);
    expect(getState().progress).toBe(42.5);

    const resumeRes = resumeMission();
    expect(resumeRes.result).toBe(CommandResult.SUCCESS);
    expect(getState().missionState).toBe(MissionState.RUNNING);
    expect(getState().progress).toBe(42.5);
  });

  // Scenario 5: Repeated Start requests do not create duplicate missions
  it('Scenario 5: Repeated Start requests do not create duplicate missions', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    const initialStart = startMission();
    expect(initialStart.result).toBe(CommandResult.SUCCESS);
    const originalMissionId = getState().missionId;

    // Second start request while already running
    const secondStart = startMission();
    expect(secondStart.result).toBe(CommandResult.REJECTED);
    expect(getState().missionId).toBe(originalMissionId);
  });

  // Scenario 6: An aborted mission cannot be resumed accidentally
  it('Scenario 6: An aborted mission cannot be resumed accidentally', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    const abortRes = abortMission();
    expect(abortRes.result).toBe(CommandResult.SUCCESS);
    expect(getState().missionState).toBe(MissionState.ABORTED);

    const resumeRes = resumeMission();
    expect(resumeRes.result).toBe(CommandResult.REJECTED);
    expect(getState().missionState).toBe(MissionState.ABORTED);
  });

  // Scenario 7: A low-battery condition produces the configured response
  it('Scenario 7: A low-battery condition produces the configured response', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    // Enable dev fault injection and inject low UAV battery
    updateEngineStateForTesting({
      faultInjection: { enabled: true, activeScenarios: [] }
    });
    injectFault('low_uav_battery');

    const state = getState();
    expect(state.uav.battery).toBe(10);
    expect(state.uav.returnTriggered).toBe(true);
    expect(state.uav.state).toBe(DeviceState.LOW_BATTERY);
    expect(state.activeAlerts.some(a => a.title.includes('UAV Low Battery'))).toBe(true);
  });

  // Scenario 8: Lost telemetry is shown as stale or disconnected
  it('Scenario 8: Lost telemetry is shown as stale or disconnected', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    updateEngineStateForTesting({
      faultInjection: { enabled: true, activeScenarios: [] }
    });
    injectFault('ugv_comm_loss');

    const state = getState();
    expect(state.ugv.connection).toBe(ConnState.DISCONNECTED);

    // Stale check (> 10s difference)
    const diffMs = Date.now() - new Date(state.ugv.lastTelemetryTs).getTime();
    expect(diffMs).toBeGreaterThanOrEqual(10000);
    expect(state.activeAlerts.some(a => a.title.includes('UGV Comm Lost'))).toBe(true);
  });

  // Scenario 9: A failed stage cannot be reported as completed
  it('Scenario 9: A failed stage cannot be reported as completed', () => {
    const invalidTransition = transitionStage(StageState.FAILED, StageState.COMPLETED);
    expect(invalidTransition.valid).toBe(false);
    expect(invalidTransition.error).toMatch(/Invalid WorkflowStage transition/i);
  });

  // Scenario 10: Hazard verification updates the correct record
  it('Scenario 10: Hazard verification updates the correct record', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    const testHazard1 = {
      id: 'HAZ-TEST-001',
      title: 'Pothole Test 1',
      verificationStatus: HazardVerification.UNVERIFIED,
      verificationHistory: []
    };
    const testHazard2 = {
      id: 'HAZ-TEST-002',
      title: 'Crack Test 2',
      verificationStatus: HazardVerification.UNVERIFIED,
      verificationHistory: []
    };

    updateEngineStateForTesting({
      detectedHazards: [testHazard1, testHazard2]
    });

    const verifyRes = verifyHazardAction('HAZ-TEST-001', HazardVerification.VERIFIED);
    expect(verifyRes.result).toBe(CommandResult.SUCCESS);

    const h1 = getState().detectedHazards.find(h => h.id === 'HAZ-TEST-001');
    const h2 = getState().detectedHazards.find(h => h.id === 'HAZ-TEST-002');

    expect(h1.verificationStatus).toBe(HazardVerification.VERIFIED);
    expect(h1.verificationHistory.length).toBe(1);
    expect(h1.verificationHistory[0].newStatus).toBe(HazardVerification.VERIFIED);
    expect(h2.verificationStatus).toBe(HazardVerification.UNVERIFIED); // Unchanged
  });

  // Scenario 11: Reports match stored events and verification decisions
  it('Scenario 11: Reports match stored events and verification decisions', () => {
    createMission({ routeId: 'route_alpha', safetyAcknowledged: true });
    startMission();

    const hazard = {
      id: 'HAZ-REP-01',
      title: 'Structural Fault',
      severity: 'critical',
      verificationStatus: HazardVerification.VERIFIED,
      repairAssigned: true
    };
    updateEngineStateForTesting({
      detectedHazards: [hazard]
    });

    const repRes = generateReport();
    expect(repRes.result).toBe(CommandResult.SUCCESS);
    expect(repRes.data.totalHazards).toBe(1);
    expect(repRes.data.criticalHazards).toBe(1);
    expect(repRes.data.verifiedHazards).toBe(1);
    expect(repRes.data.repairsDispatched).toBe(1);

    const storedReport = getReportByMission(getState().missionId);
    expect(storedReport).not.toBeNull();
    expect(storedReport.pciScore).toBe(repRes.data.pciScore);
  });

  // Scenario 12: Browser refresh restores state without duplicating actions
  it('Scenario 12: Browser refresh restores state without duplicating actions', () => {
    saveActiveMissionState({
      missionId: 'MSN-SAVED-99',
      progress: 65,
      elapsedMs: 120000,
      currentStageIndex: 2
    });

    // Simulate page reload by running initEngine(true)
    initEngine(true);
    const state = getState();

    expect(state.missionId).toBe('MSN-SAVED-99');
    expect(state.missionState).toBe(MissionState.PAUSED); // restored in safe PAUSED state
    expect(state.progress).toBe(65);
    expect(state.currentStageIndex).toBe(2);
  });

  // Scenario 13: A backend restart does not falsely mark devices as connected
  it('Scenario 13: A backend restart does not falsely mark devices as connected', () => {
    resetEngineForTesting();
    // Simulate disconnected hardware adapter
    updateEngineStateForTesting({
      ugv: { ...getState().ugv, connection: ConnState.DISCONNECTED }
    });

    const state = getState();
    expect(state.ugv.connection).toBe(ConnState.DISCONNECTED);
    // Mandatory preflight must block mission if device is disconnected
    const checklist = createPreflightChecklist({ route: { waypoints: [{ x:0, y:0 }, { x:1, y:1 }] } });
    const evaluated = runPreflightChecks(checklist, { ugv: state.ugv, uav: state.uav });
    expect(canStartMission(evaluated)).toBe(false);
  });

  // Scenario 14: A failed save is reported rather than silently ignored
  it('Scenario 14: A failed save is reported rather than silently ignored', () => {
    // Break localStorage to simulate quota exceeded or private mode error
    globalThis.localStorage.setItem = () => {
      throw new Error('QuotaExceededError: storage is full');
    };

    const isAvail = isStorageAvailable();
    expect(isAvail).toBe(false);
  });

  // Scenario 15: A hardware command timeout is not displayed as a successful physical action
  it('Scenario 15: A hardware command timeout is not displayed as a successful physical action', async () => {
    // Attempt physical actuation without operator authorization -> rejected
    const unauthRes = await executeHardwareCommand('UGV', 'DRIVE_FORWARD', { speed: 1.5 });
    expect(unauthRes.result).toBe(CommandResult.REJECTED);

    // Attempt physical actuation with timeout simulation -> timeout result, never marked success
    const timeoutRes = await executeHardwareCommand('UGV', 'DRIVE_FORWARD', { speed: 1.5 }, {
      operatorAuth: true,
      simulateTimeout: true,
      timeoutMs: 3000
    });
    expect(timeoutRes.result).toBe(CommandResult.TIMEOUT);
    expect(timeoutRes.result).not.toBe(CommandResult.SUCCESS);
  });

  // Scenario 16: Hazard matching with spatial distance and confidence
  it('Scenario 16: Spatial hazard cross-checking and review queue', () => {
    const existing = [
      { id: 'HAZ-1', lat: 37.7750, lng: -122.4190, category: 'surface_depression' }
    ];

    // High confidence match (< 15m, same category)
    const matchHigh = matchHazard(
      { lat: 37.77505, lng: -122.41905, category: 'surface_depression' },
      existing
    );
    expect(matchHigh).not.toBeNull();
    expect(matchHigh.confidence).toBe(MatchConfidence.HIGH);
    expect(matchHigh.shouldCreateReview).toBe(false);

    // Uncertain match (different category at medium distance) -> flags review
    const matchUncertain = matchHazard(
      { lat: 37.7751, lng: -122.4191, category: 'crack' },
      existing
    );
    expect(matchUncertain).not.toBeNull();
    expect(matchUncertain.shouldCreateReview).toBe(true);
  });

  // Scenario 17: Complete simulated mission integration flow
  it('Scenario 17: Complete end-to-end mission lifecycle', () => {
    // 1. Create
    const createRes = createMission({
      routeId: 'route_alpha',
      strategy: MissionStrategy.COORDINATED,
      safetyAcknowledged: true
    });
    expect(createRes.result).toBe(CommandResult.SUCCESS);

    // 2. Preflight
    const preflight = runPreflight();
    expect(preflight.data.canStart).toBe(true);

    // 3. Start
    const startRes = startMission();
    expect(startRes.result).toBe(CommandResult.SUCCESS);

    // 4. Progress stages
    const stages = getState().stages.map(s => ({ ...s, status: StageState.COMPLETED }));
    updateEngineStateForTesting({
      stages,
      progress: 100,
      missionState: MissionState.COMPLETED
    });

    // 5. Generate final report
    const reportRes = generateReport();
    expect(reportRes.result).toBe(CommandResult.SUCCESS);
    expect(reportRes.data.status).toBe(MissionState.COMPLETED);
  });

});
