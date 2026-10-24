// ============================================================
// AeroDrive Persistent Storage Service
// Uses localStorage as a lightweight prototype store.
// Designed with the same interface so it can be swapped
// for IndexedDB, SQLite-via-API, or PostgreSQL later.
// ============================================================

const STORAGE_PREFIX = 'aerodrive_';

function key(name) {
  return `${STORAGE_PREFIX}${name}`;
}

function safeGet(name, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`[Storage] Failed to read "${name}":`, e);
    return fallback;
  }
}

function safeSet(name, value) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[Storage] Failed to write "${name}":`, e);
    return false;
  }
}

// ---- Mission Records ----

export function saveMissionRecord(mission) {
  const records = getMissionRecords();
  const existing = records.findIndex(r => r.id === mission.id);
  if (existing >= 0) {
    records[existing] = mission;
  } else {
    records.push(mission);
  }
  return safeSet('mission_records', records);
}

export function getMissionRecords() {
  return safeGet('mission_records', []);
}

export function getMissionById(missionId) {
  const records = getMissionRecords();
  return records.find(r => r.id === missionId) || null;
}

// ---- Active Mission State (survives refresh) ----

export function saveActiveMissionState(state) {
  return safeSet('active_mission', state);
}

export function getActiveMissionState() {
  return safeGet('active_mission', null);
}

export function clearActiveMissionState() {
  try {
    localStorage.removeItem(key('active_mission'));
  } catch (e) {
    console.error('[Storage] Failed to clear active mission:', e);
  }
}

// ---- Event Log ----

export function appendEvent(event) {
  const events = getEvents();
  events.push(event);
  // Keep last 500 events per session
  if (events.length > 500) events.splice(0, events.length - 500);
  return safeSet('events', events);
}

export function getEvents() {
  return safeGet('events', []);
}

export function getEventsByMission(missionId) {
  return getEvents().filter(e => e.missionId === missionId);
}

// ---- Hazard Records ----

export function saveHazard(hazard) {
  const hazards = getHazards();
  const existing = hazards.findIndex(h => h.id === hazard.id);
  if (existing >= 0) {
    // Preserve original observation, merge updated fields
    hazards[existing] = {
      ...hazards[existing],
      ...hazard,
      originalObservation: hazards[existing].originalObservation || hazards[existing]
    };
  } else {
    hazard.originalObservation = { ...hazard };
    hazards.push(hazard);
  }
  return safeSet('hazards', hazards);
}

export function getHazards() {
  return safeGet('hazards', []);
}

export function getHazardsByMission(missionId) {
  return getHazards().filter(h => h.missionId === missionId);
}

export function updateHazardVerification(hazardId, verificationStatus, operatorId = 'operator') {
  const hazards = getHazards();
  const idx = hazards.findIndex(h => h.id === hazardId);
  if (idx < 0) return false;

  // Record verification history
  if (!hazards[idx].verificationHistory) {
    hazards[idx].verificationHistory = [];
  }
  hazards[idx].verificationHistory.push({
    previousStatus: hazards[idx].verificationStatus || 'UNVERIFIED',
    newStatus: verificationStatus,
    changedBy: operatorId,
    timestamp: new Date().toISOString()
  });
  hazards[idx].verificationStatus = verificationStatus;
  return safeSet('hazards', hazards);
}

// ---- Verification Decisions ----

export function saveVerificationDecision(decision) {
  const decisions = safeGet('verification_decisions', []);
  decisions.push(decision);
  return safeSet('verification_decisions', decisions);
}

export function getVerificationDecisions(missionId) {
  return safeGet('verification_decisions', []).filter(d => d.missionId === missionId);
}

// ---- Report Summaries ----

export function saveReportSummary(report) {
  const reports = safeGet('report_summaries', []);
  const idx = reports.findIndex(r => r.missionId === report.missionId);
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    reports.push(report);
  }
  return safeSet('report_summaries', reports);
}

export function getReportSummaries() {
  return safeGet('report_summaries', []);
}

export function getReportByMission(missionId) {
  return safeGet('report_summaries', []).find(r => r.missionId === missionId) || null;
}

// ---- Storage Health ----

export function isStorageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const testKey = key('_health_check');
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ---- Duplicate Browser Tab Guard ----

const TAB_LOCK_KEY = key('active_tab_lock');
let _tabId = null;

export function acquireTabLock() {
  _tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(TAB_LOCK_KEY, _tabId);
  return _tabId;
}

export function isTabLockOwner() {
  if (!_tabId) return false;
  return localStorage.getItem(TAB_LOCK_KEY) === _tabId;
}

export function releaseTabLock() {
  if (isTabLockOwner()) {
    localStorage.removeItem(TAB_LOCK_KEY);
  }
  _tabId = null;
}

export function isAnotherTabActive() {
  const current = localStorage.getItem(TAB_LOCK_KEY);
  return current && current !== _tabId;
}
