import React, { useState, useEffect, useRef } from 'react';
import { useMission } from '../context/MissionContext';
import { HISTORICAL_MISSIONS } from '../data/mockData';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Clock, 
  Award, 
  AlertTriangle, 
  ShieldCheck, 
  Truck 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function InspectionReports() {
  const { 
    activePreset, 
    progress, 
    elapsedSeconds, 
    detectedHazards, 
    roverState, 
    droneState 
  } = useMission();

  const [filterSearch, setFilterSearch] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const chartCanvasRef = useRef(null);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const distanceCoveredKm = ((progress / 100) * activePreset.totalDistanceKm).toFixed(2);
  const pciHealthScore = Math.max(55, Math.round(92 - (detectedHazards.length * 6)));

  // Render Canvas Charts (IRI Roughness Index Profile)
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.fillStyle = '#080e1e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 30; y < h - 30; y += 30) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    // Y Axis Labels (IRI m/km)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('5.0', 14, 40);
    ctx.fillText('3.0', 14, 85);
    ctx.fillText('1.0', 14, 130);

    // IRI Curve
    const pointsCount = 30;
    const dx = (w - 70) / (pointsCount - 1);
    ctx.beginPath();

    for (let i = 0; i < pointsCount; i++) {
      const x = 50 + (i * dx);
      // Roughness profile with spikes corresponding to detected hazards
      let bump = Math.sin(i * 0.4) * 12;
      if (i === 8) bump += 45; // Pothole 1
      if (i === 17) bump += 35; // Crack
      if (i === 24) bump += 40; // Obstacle
      const y = (h - 45) - bump - 20;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Gradient fill under curve
    const areaGrad = ctx.createLinearGradient(0, 0, 0, h);
    areaGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    areaGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    ctx.lineTo(w - 20, h - 35);
    ctx.lineTo(50, h - 35);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    for (let i = 0; i < pointsCount; i++) {
      const x = 50 + (i * dx);
      let bump = Math.sin(i * 0.4) * 12;
      if (i === 8) bump += 45;
      if (i === 17) bump += 35;
      if (i === 24) bump += 40;
      const y = (h - 45) - bump - 20;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hazard markers on chart
    const hazardIdxs = [8, 17, 24];
    hazardIdxs.forEach((idx, i) => {
      const x = 50 + (idx * dx);
      let bump = 12;
      if (idx === 8) bump = 45;
      if (idx === 17) bump = 35;
      if (idx === 24) bump = 40;
      const y = (h - 45) - bump - 20;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`HAZ-${i + 1}`, x - 12, y - 10);
    });

  }, []);

  const handleOpenReportModal = () => {
    setReportModalOpen(true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const exportCsv = () => {
    const headers = ['Mission ID', 'Route Name', 'Date', 'Duration (Min)', 'Distance (Km)', 'Hazards Found', 'PCI Score', 'Status'];
    const rows = HISTORICAL_MISSIONS.map(m => [
      m.id,
      `"${m.name}"`,
      m.date,
      m.durationMinutes,
      m.distanceKm,
      m.hazardsFound,
      m.pciScore,
      m.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AeroDrive_Inspection_Summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredHistory = HISTORICAL_MISSIONS.filter(m => 
    m.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="reports-section hud-panel hud-corner">
      {/* Reports Header */}
      <div className="reports-header">
        <div>
          <div className="title-with-badge">
            <h3 className="section-title font-display">System Inspection Reports & Analytics</h3>
            <span className="badge badge-online font-mono">Certified Telemetry Audit</span>
          </div>
          <p className="section-desc">
            Aggregated pavement health indexes, roughness profiles, battery efficiency curves, and official municipal work-order archives.
          </p>
        </div>

        <div className="report-action-buttons">
          <button 
            onClick={handleOpenReportModal}
            className="btn btn-primary"
            id="btn-gen-formal-report"
          >
            <Award size={16} />
            <span>Generate Official Certificate</span>
          </button>

          <button 
            onClick={exportCsv}
            className="btn btn-secondary font-mono"
            id="btn-export-csv"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Row */}
      <div className="analytics-kpi-grid">
        <div className="stat-card hud-panel">
          <div className="stat-icon-wrap cyan">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="stat-label">Total Audited Route</span>
            <div className="stat-value font-hud">14.6 <span className="stat-unit">km</span></div>
            <span className="stat-sub font-mono text-cyan">4 Missions Completed</span>
          </div>
        </div>

        <div className="stat-card hud-panel">
          <div className="stat-icon-wrap emerald">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="stat-label">Average Pavement Health</span>
            <div className="stat-value font-hud text-emerald">79.2 <span className="stat-unit">/ 100 PCI</span></div>
            <span className="stat-sub font-mono text-emerald">Good Highway Condition</span>
          </div>
        </div>

        <div className="stat-card hud-panel">
          <div className="stat-icon-wrap amber">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="stat-label">Remediation Dispatch Rate</span>
            <div className="stat-value font-hud glow-text-amber">94.8%</div>
            <span className="stat-sub font-mono text-amber">Avg Dispatch Triage: &lt; 4 min</span>
          </div>
        </div>

        <div className="stat-card hud-panel">
          <div className="stat-icon-wrap blue">
            <Clock size={18} />
          </div>
          <div>
            <span className="stat-label">Swarm Operational Flight</span>
            <div className="stat-value font-hud text-cyan">18.4 <span className="stat-unit">hrs</span></div>
            <span className="stat-sub font-mono text-muted">Zero Actuator Incidents</span>
          </div>
        </div>
      </div>

      {/* Road Roughness & Hazard Distribution Charts */}
      <div className="charts-split-grid">
        {/* Left Chart: IRI Roughness Profile */}
        <div className="chart-panel hud-panel">
          <div className="chart-header">
            <div className="chart-title-wrap font-mono">
              <BarChart3 size={16} className="text-cyan" />
              <span>Pavement Roughness Profile (IRI m/km vs Route Distance)</span>
            </div>
            <span className="badge badge-simulated font-mono">LIDAR Elevation Derivation</span>
          </div>
          <div className="chart-canvas-wrap">
            <canvas ref={chartCanvasRef} width={620} height={180} className="chart-canvas" />
          </div>
        </div>

        {/* Right Chart: Hazard Category Breakdown */}
        <div className="chart-panel hud-panel">
          <div className="chart-header">
            <div className="chart-title-wrap font-mono">
              <PieChart size={16} className="text-cyan" />
              <span>Hazard Classification Breakdown</span>
            </div>
            <span className="badge badge-active font-mono">YOLOv8 Edge Classes</span>
          </div>

          <div className="hazard-breakdown-list font-mono">
            <div className="breakdown-item">
              <div className="breakdown-name">
                <span className="color-dot pothole"></span>
                <span>Asphalt Potholes & Cavities:</span>
              </div>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar-fill pothole" style={{ width: '45%' }}></div>
              </div>
              <strong className="text-danger">45%</strong>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-name">
                <span className="color-dot crack"></span>
                <span>Structural Alligator Cracks:</span>
              </div>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar-fill crack" style={{ width: '35%' }}></div>
              </div>
              <strong className="text-amber">35%</strong>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-name">
                <span className="color-dot debris"></span>
                <span>Foreign Object Road Debris:</span>
              </div>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar-fill debris" style={{ width: '20%' }}></div>
              </div>
              <strong className="text-cyan">20%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Missions Table */}
      <div className="history-table-panel hud-panel">
        <div className="table-header-row">
          <h4 className="table-title font-display">Completed Inspection Missions Archive</h4>
          <input 
            type="text" 
            placeholder="Search missions by route or ID..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="table-search-input font-mono"
          />
        </div>

        <div className="table-responsive">
          <table className="reports-table font-mono">
            <thead>
              <tr>
                <th>Mission ID</th>
                <th>Route / Sector</th>
                <th>Date</th>
                <th>Duration</th>
                <th>Distance</th>
                <th>Hazards</th>
                <th>PCI Score</th>
                <th>Battery Used (UGV/UAV)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(mission => (
                <tr key={mission.id}>
                  <td className="text-cyan font-bold">{mission.id}</td>
                  <td>{mission.name}</td>
                  <td className="text-muted">{mission.date}</td>
                  <td>{mission.durationMinutes} min</td>
                  <td>{mission.distanceKm} km</td>
                  <td>
                    <span className="badge badge-warning">{mission.hazardsFound} Flagged</span>
                  </td>
                  <td>
                    <strong className={mission.pciScore > 75 ? 'text-emerald' : 'text-amber'}>
                      {mission.pciScore} / 100
                    </strong>
                  </td>
                  <td className="text-muted">
                    {mission.batteryConsumedUgv} / {mission.batteryConsumedUav}
                  </td>
                  <td>
                    <span className="badge badge-online">
                      <CheckCircle2 size={12} /> {mission.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Municipal Road Inspection Report Modal */}
      {reportModalOpen && (
        <div className="modal-backdrop" onClick={() => setReportModalOpen(false)}>
          <div className="formal-report-paper" onClick={e => e.stopPropagation()}>
            <div className="paper-toolbar">
              <span className="paper-tag font-mono">AeroDrive Autonomous Road Audit Certificate</span>
              <div className="paper-actions">
                <button 
                  onClick={() => window.print()}
                  className="btn btn-secondary font-mono"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button 
                  onClick={() => setReportModalOpen(false)}
                  className="modal-close-btn"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="paper-body">
              {/* Official Header */}
              <div className="official-header">
                <div>
                  <h2 className="city-title">DEPARTMENT OF TRANSPORTATION & INFRASTRUCTURE</h2>
                  <h3 className="agency-sub">Autonomous Swarm Road Inspection & Defect Audit</h3>
                </div>
                <div className="cert-id font-mono">
                  <span>AUDIT REF: AD-2026-9921</span>
                  <span>DATE: 2026-10-23</span>
                </div>
              </div>

              <hr className="paper-divider" />

              {/* Summary Spec Grid */}
              <div className="summary-specs font-mono">
                <div><strong>Inspected Corridor:</strong> {activePreset.name}</div>
                <div><strong>Corridor Length:</strong> {activePreset.totalDistanceKm} km</div>
                <div><strong>Surface Area Evaluated:</strong> {activePreset.targetAreaSqm.toLocaleString()} m²</div>
                <div><strong>Inspection Time:</strong> {formatTime(elapsedSeconds)}</div>
                <div><strong>Pavement Condition Index (PCI):</strong> {pciHealthScore} / 100</div>
                <div><strong>Sensor Fusion Platforms:</strong> UGV Titan-01 & UAV SkyEye-04</div>
              </div>

              <h4 className="findings-title">CERTIFIED DEFECT & HAZARD SCHEDULE:</h4>

              <table className="formal-findings-table font-mono">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    <th>Coordinates</th>
                    <th>Work Order Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedHazards.map(h => (
                    <tr key={h.id}>
                      <td><strong>{h.id}</strong></td>
                      <td>{h.title}</td>
                      <td>{h.severity.toUpperCase()}</td>
                      <td>{h.confidence}%</td>
                      <td>{h.lat.toFixed(4)}°N, {h.lng.toFixed(4)}°W</td>
                      <td>{h.repairAssigned ? 'DISPATCHED' : 'TRIAGE PENDING'}</td>
                    </tr>
                  ))}
                  {detectedHazards.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '16px' }}>
                        No defects flagged along scanned trajectory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="paper-footer font-mono">
                <div><strong>Verification Protocol:</strong> Dual Neural YOLOv8 + Tele-Operator Human In The Loop</div>
                <div><strong>AeroDrive Swarm Engine:</strong> Firmware v3.4.1 RTK Authenticated</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reports-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .reports-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 16px;
        }
        .report-action-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .analytics-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .stat-card {
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-wrap.cyan {
          background: rgba(0, 240, 255, 0.12);
          border: 1px solid rgba(0, 240, 255, 0.3);
          color: var(--neon-cyan);
        }
        .stat-icon-wrap.emerald {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: var(--status-emerald);
        }
        .stat-icon-wrap.amber {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: var(--status-amber);
        }
        .stat-icon-wrap.blue {
          background: rgba(0, 102, 255, 0.15);
          border: 1px solid rgba(0, 102, 255, 0.35);
          color: var(--sky-blue);
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin: 2px 0;
        }
        .stat-unit {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .stat-sub {
          font-size: 0.72rem;
        }
        .charts-split-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 20px;
        }
        .chart-panel {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chart-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #ffffff;
        }
        .chart-canvas-wrap {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          background: #080e1e;
          border: 1px solid rgba(56, 189, 248, 0.15);
        }
        .chart-canvas {
          width: 100%;
          height: auto;
          display: block;
        }
        .hazard-breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          justify-content: center;
          height: 100%;
          padding: 10px 0;
        }
        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.78rem;
        }
        .breakdown-name {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-main);
        }
        .color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .color-dot.pothole { background: #ef4444; }
        .color-dot.crack { background: #f59e0b; }
        .color-dot.debris { background: #00f0ff; }
        .breakdown-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .breakdown-bar-fill {
          height: 100%;
          border-radius: 4px;
        }
        .breakdown-bar-fill.pothole { background: #ef4444; }
        .breakdown-bar-fill.crack { background: #f59e0b; }
        .breakdown-bar-fill.debris { background: #00f0ff; }
        .history-table-panel {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .table-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .table-title {
          font-size: 1.05rem;
          color: #ffffff;
        }
        .table-search-input {
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.8rem;
          outline: none;
          min-width: 260px;
        }
        .table-search-input:focus {
          border-color: var(--neon-cyan);
        }
        .table-responsive {
          overflow-x: auto;
        }
        .reports-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
        }
        .reports-table th {
          text-align: left;
          padding: 10px 12px;
          color: var(--text-muted);
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
          font-weight: 600;
        }
        .reports-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .reports-table tr:hover td {
          background: rgba(0, 240, 255, 0.04);
        }

        /* Printable Formal Paper Document Modal */
        .formal-report-paper {
          width: 100%;
          max-width: 850px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9);
        }
        .paper-toolbar {
          background: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .paper-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .paper-body {
          padding: 36px 40px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .official-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .city-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }
        .agency-sub {
          font-size: 0.85rem;
          font-weight: 500;
          color: #475569;
        }
        .cert-id {
          display: flex;
          flex-direction: column;
          text-align: right;
          font-size: 0.75rem;
          color: #64748b;
        }
        .paper-divider {
          border: none;
          height: 2px;
          background: #0f172a;
          margin: 6px 0;
        }
        .summary-specs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          background: #f8fafc;
          padding: 14px;
          border-radius: 6px;
          font-size: 0.82rem;
          border: 1px solid #e2e8f0;
        }
        .findings-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 6px;
        }
        .formal-findings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          border: 1px solid #cbd5e1;
        }
        .formal-findings-table th {
          background: #f1f5f9;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
        }
        .formal-findings-table td {
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
        }
        .paper-footer {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #64748b;
        }
        @media (max-width: 850px) {
          .charts-split-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
