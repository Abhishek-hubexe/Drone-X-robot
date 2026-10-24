// ============================================================
// AeroDrive Mission State Machine
// Deterministic validated state transitions for mission, devices,
// workflow stages, communications, and hazard verification.
// ============================================================

// ---- Mission States ----
export const MissionState = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  ERROR: 'ERROR'
};

// Valid mission state transitions
const MISSION_TRANSITIONS = {
  [MissionState.IDLE]:      [MissionState.PREPARING],
  [MissionState.PREPARING]: [MissionState.RUNNING, MissionState.ABORTED, MissionState.ERROR],
  [MissionState.RUNNING]:   [MissionState.PAUSED, MissionState.COMPLETED, MissionState.ABORTED, MissionState.ERROR],
  [MissionState.PAUSED]:    [MissionState.RUNNING, MissionState.ABORTED, MissionState.ERROR],
  [MissionState.COMPLETED]: [MissionState.IDLE],
  [MissionState.ABORTED]:   [MissionState.IDLE],
  [MissionState.ERROR]:     [MissionState.IDLE]
};

// ---- Device States ----
export const DeviceState = {
  OFFLINE: 'OFFLINE',
  STANDBY: 'STANDBY',
  PREFLIGHT: 'PREFLIGHT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  RETURNING: 'RETURNING',
  LANDING: 'LANDING',
  FAULT: 'FAULT',
  LOW_BATTERY: 'LOW_BATTERY',
  COMM_LOST: 'COMM_LOST',
  E_STOP: 'E_STOP'
};

const DEVICE_TRANSITIONS = {
  [DeviceState.OFFLINE]:      [DeviceState.STANDBY],
  [DeviceState.STANDBY]:      [DeviceState.PREFLIGHT, DeviceState.OFFLINE, DeviceState.FAULT],
  [DeviceState.PREFLIGHT]:    [DeviceState.ACTIVE, DeviceState.STANDBY, DeviceState.FAULT],
  [DeviceState.ACTIVE]:       [DeviceState.PAUSED, DeviceState.RETURNING, DeviceState.FAULT, DeviceState.LOW_BATTERY, DeviceState.COMM_LOST, DeviceState.E_STOP],
  [DeviceState.PAUSED]:       [DeviceState.ACTIVE, DeviceState.RETURNING, DeviceState.FAULT, DeviceState.COMM_LOST, DeviceState.E_STOP],
  [DeviceState.RETURNING]:    [DeviceState.LANDING, DeviceState.FAULT, DeviceState.COMM_LOST, DeviceState.E_STOP],
  [DeviceState.LANDING]:      [DeviceState.STANDBY, DeviceState.FAULT],
  [DeviceState.FAULT]:        [DeviceState.STANDBY, DeviceState.OFFLINE],
  [DeviceState.LOW_BATTERY]:  [DeviceState.RETURNING, DeviceState.FAULT, DeviceState.E_STOP],
  [DeviceState.COMM_LOST]:    [DeviceState.ACTIVE, DeviceState.FAULT, DeviceState.E_STOP, DeviceState.STANDBY],
  [DeviceState.E_STOP]:       [DeviceState.STANDBY, DeviceState.OFFLINE]
};

// ---- Workflow Stage States ----
export const StageState = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED'
};

const STAGE_TRANSITIONS = {
  [StageState.PENDING]:     [StageState.IN_PROGRESS, StageState.SKIPPED],
  [StageState.IN_PROGRESS]: [StageState.COMPLETED, StageState.FAILED],
  [StageState.COMPLETED]:   [],  // terminal
  [StageState.FAILED]:      [StageState.PENDING],  // can retry
  [StageState.SKIPPED]:     []   // terminal
};

// ---- Connection States ----
export const ConnState = {
  CONNECTED: 'CONNECTED',
  DEGRADED: 'DEGRADED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING'
};

const CONN_TRANSITIONS = {
  [ConnState.CONNECTED]:     [ConnState.DEGRADED, ConnState.DISCONNECTED],
  [ConnState.DEGRADED]:      [ConnState.CONNECTED, ConnState.DISCONNECTED],
  [ConnState.DISCONNECTED]:  [ConnState.RECONNECTING],
  [ConnState.RECONNECTING]:  [ConnState.CONNECTED, ConnState.DISCONNECTED]
};

// ---- Hazard Verification States ----
export const HazardVerification = {
  UNVERIFIED: 'UNVERIFIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  DISMISSED: 'DISMISSED',
  ESCALATED: 'ESCALATED'
};

const HAZARD_TRANSITIONS = {
  [HazardVerification.UNVERIFIED]:    [HazardVerification.UNDER_REVIEW, HazardVerification.VERIFIED, HazardVerification.DISMISSED],
  [HazardVerification.UNDER_REVIEW]:  [HazardVerification.VERIFIED, HazardVerification.DISMISSED, HazardVerification.ESCALATED],
  [HazardVerification.VERIFIED]:      [],  // terminal
  [HazardVerification.DISMISSED]:     [HazardVerification.UNDER_REVIEW],  // can re-open
  [HazardVerification.ESCALATED]:     [HazardVerification.VERIFIED, HazardVerification.DISMISSED]
};

// ---- Alert Severity ----
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  EMERGENCY: 'EMERGENCY'
};

// ============================================================
// Transition Validator
// ============================================================

function validateTransition(currentState, targetState, transitionMap, entityName) {
  const allowed = transitionMap[currentState];
  if (!allowed) {
    return {
      valid: false,
      error: `[StateMachine] Unknown ${entityName} state: "${currentState}".`
    };
  }
  if (!allowed.includes(targetState)) {
    return {
      valid: false,
      error: `[StateMachine] Invalid ${entityName} transition: "${currentState}" → "${targetState}". Allowed: [${allowed.join(', ')}].`
    };
  }
  return { valid: true, error: null };
}

export function transitionMission(current, target) {
  return validateTransition(current, target, MISSION_TRANSITIONS, 'Mission');
}

export function transitionDevice(current, target) {
  return validateTransition(current, target, DEVICE_TRANSITIONS, 'Device');
}

export function transitionStage(current, target) {
  return validateTransition(current, target, STAGE_TRANSITIONS, 'WorkflowStage');
}

export function transitionConnection(current, target) {
  return validateTransition(current, target, CONN_TRANSITIONS, 'Connection');
}

export function transitionHazardVerification(current, target) {
  return validateTransition(current, target, HAZARD_TRANSITIONS, 'HazardVerification');
}

// ============================================================
// Command Validation
// ============================================================

let _commandCounter = 0;

export function generateCommandId() {
  _commandCounter++;
  return `CMD-${Date.now()}-${_commandCounter}`;
}

let _entityCounter = 0;
export function generateEntityId(prefix = 'ENT') {
  _entityCounter++;
  return `${prefix}-${Date.now()}-${_entityCounter}`;
}

// Idempotency guard: track recently issued command IDs to prevent duplicates
const _recentCommandIds = new Set();
const MAX_RECENT = 200;

export function registerCommandId(cmdId) {
  if (_recentCommandIds.has(cmdId)) {
    return { duplicate: true };
  }
  _recentCommandIds.add(cmdId);
  if (_recentCommandIds.size > MAX_RECENT) {
    const first = _recentCommandIds.values().next().value;
    _recentCommandIds.delete(first);
  }
  return { duplicate: false };
}

// ============================================================
// Command Result Types
// ============================================================

export const CommandResult = {
  SUCCESS: 'SUCCESS',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  DUPLICATE: 'DUPLICATE'
};

export function makeCommandResponse(result, message, data = null) {
  return {
    result,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// Preflight Check Model
// ============================================================

export const PreflightStatus = {
  NOT_CHECKED: 'NOT_CHECKED',
  PASSED: 'PASSED',
  WARNING: 'WARNING',
  FAILED: 'FAILED'
};

export function createPreflightChecklist(config) {
  return [
    {
      id: 'route',
      label: 'Route Validity',
      description: 'Selected inspection route is loaded and has valid waypoints.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: () => config.route && config.route.waypoints && config.route.waypoints.length >= 2
    },
    {
      id: 'ugv_ready',
      label: 'UGV Titan-01 Readiness',
      description: 'Ground robot systems, LIDAR, and RTK GPS are online.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: config.requireUgv !== false,
      checkFn: (devices) => devices.ugv.state === DeviceState.STANDBY
    },
    {
      id: 'uav_ready',
      label: 'UAV SkyEye-04 Readiness',
      description: 'Aerial drone systems, gimbal, and compass are calibrated.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: config.strategy !== 'ground_only',
      checkFn: (devices) => devices.uav.state === DeviceState.STANDBY
    },
    {
      id: 'camera',
      label: 'Camera Availability',
      description: 'UGV forward 4K and UAV downward gimbal cameras are operational.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: (devices) => !devices.ugv.faults.includes('camera') && !devices.uav.faults.includes('camera')
    },
    {
      id: 'sensors',
      label: 'Sensor Availability',
      description: 'LIDAR, ultrasonic, and thermal sensors respond to pings.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: (devices) => !devices.ugv.faults.includes('sensor') && !devices.uav.faults.includes('sensor')
    },
    {
      id: 'comms',
      label: 'Communication Health',
      description: '5G NR mesh link established with < 50ms latency.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: (devices) => devices.ugv.connection === ConnState.CONNECTED && devices.uav.connection === ConnState.CONNECTED
    },
    {
      id: 'ugv_battery',
      label: 'UGV Battery Sufficiency',
      description: `Battery ≥ ${config.minBatteryUgv || 30}% for mission duration.`,
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: (devices) => devices.ugv.battery >= (config.minBatteryUgv || 30)
    },
    {
      id: 'uav_battery',
      label: 'UAV Battery Sufficiency',
      description: `Battery ≥ ${config.minBatteryUav || 40}% for flight duration.`,
      status: PreflightStatus.NOT_CHECKED,
      mandatory: config.strategy !== 'ground_only',
      checkFn: (devices) => devices.uav.battery >= (config.minBatteryUav || 40)
    },
    {
      id: 'detection_service',
      label: 'AI Detection Service',
      description: 'Edge YOLOv8 inference engine on Jetson is loaded and warmed up.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: true,
      checkFn: () => config.detectionServiceAvailable !== false
    },
    {
      id: 'safety',
      label: 'Safety & Regulatory Prerequisites',
      description: 'Operator has confirmed regulatory compliance and airspace clearance.',
      status: PreflightStatus.NOT_CHECKED,
      mandatory: false, // warning-only in simulation
      checkFn: () => config.safetyAcknowledged === true
    }
  ];
}

export function runPreflightChecks(checklist, devices) {
  return checklist.map(item => {
    let passed = false;
    try {
      passed = item.checkFn(devices);
    } catch {
      passed = false;
    }

    let status;
    if (passed) {
      status = PreflightStatus.PASSED;
    } else if (item.mandatory) {
      status = PreflightStatus.FAILED;
    } else {
      status = PreflightStatus.WARNING;
    }

    return { ...item, status };
  });
}

export function canStartMission(checklist) {
  const mandatoryFailed = checklist.some(
    item => item.mandatory && item.status === PreflightStatus.FAILED
  );
  return !mandatoryFailed;
}

// ============================================================
// Mission Strategy
// ============================================================

export const MissionStrategy = {
  SEQUENTIAL: 'sequential',
  COORDINATED: 'coordinated',
  GROUND_ONLY: 'ground_only'
};

// ============================================================
// Hazard Matching
// ============================================================

const DEFAULT_MATCH_RADIUS_M = 15; // meters

function haversineDistanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const MatchConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNCERTAIN: 'UNCERTAIN'
};

/**
 * Attempt to match a new detection against existing hazards.
 * Returns { matchedHazardId, confidence, shouldCreateReview } or null if no match.
 */
export function matchHazard(newDetection, existingHazards, thresholdM = DEFAULT_MATCH_RADIUS_M) {
  let bestMatch = null;
  let bestDist = Infinity;

  for (const existing of existingHazards) {
    const dist = haversineDistanceM(newDetection.lat, newDetection.lng, existing.lat, existing.lng);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = existing;
    }
  }

  if (!bestMatch || bestDist > thresholdM * 3) {
    return null; // No candidate
  }

  const sameCategory = bestMatch.category === newDetection.category;
  let confidence;
  let shouldCreateReview = false;

  if (bestDist <= thresholdM && sameCategory) {
    confidence = MatchConfidence.HIGH;
  } else if (bestDist <= thresholdM && !sameCategory) {
    confidence = MatchConfidence.MEDIUM;
    shouldCreateReview = true;
  } else if (bestDist <= thresholdM * 2 && sameCategory) {
    confidence = MatchConfidence.MEDIUM;
  } else {
    confidence = MatchConfidence.UNCERTAIN;
    shouldCreateReview = true;
  }

  return {
    matchedHazardId: bestMatch.id,
    distance: Math.round(bestDist * 100) / 100,
    confidence,
    shouldCreateReview
  };
}
