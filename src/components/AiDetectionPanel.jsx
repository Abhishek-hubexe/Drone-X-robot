import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Download, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Ruler, 
  Cpu, 
  Filter, 
  Eye, 
  Layers 
} from 'lucide-react';

export default function AiDetectionPanel() {
  const { 
    detectedHazards, 
    allHazards, 
    verifyHazard, 
    dispatchRepair, 
    injectCustomHazard 
  } = useMission();

  const [filterType, setFilterType] = useState('all'); // all, critical, pothole, crack, debris, unverified
  const [modalHazard, setModalHazard] = useState(null);

  // Filter hazards
  const filteredHazards = detectedHazards.filter(h => {
    if (filterType === 'all') return true;
    if (filterType === 'critical') return h.severity === 'critical';
    if (filterType === 'pothole') return h.type.toLowerCase().includes('pothole');
    if (filterType === 'crack') return h.type.toLowerCase().includes('crack');
    if (filterType === 'debris') return h.type.toLowerCase().includes('obstacle') || h.type.toLowerCase().includes('debris');
    if (filterType === 'unverified') return h.status === 'unverified';
    return true;
  });

  const exportGeoJson = (hazard) => {
    const geoJson = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [hazard.lng, hazard.lat]
      },
      properties: {
        id: hazard.id,
        hazard_type: hazard.type,
        severity: hazard.severity,
        confidence_percent: hazard.confidence,
        dimensions: hazard.estimatedDimensions,
        detection_timestamp: hazard.timestamp,
        inspected_by_platform: 'AeroDrive Swarm System'
      }
    };

    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerodrive_${hazard.id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-detection-section hud-panel hud-corner">
      {/* Panel Header */}
      <div className="panel-header">
        <div>
          <div className="title-with-badge">
            <h3 className="section-title font-display">AI Hazard & Obstacle Detection Engine</h3>
            <span className="badge badge-active font-mono">Edge Neural YOLOv8</span>
          </div>
          <p className="section-desc">
            Dual-stream vision and 3D LIDAR point-cloud anomaly detection with real-time confidence rating, geo-tagging, and automated dispatch triage.
          </p>
        </div>

        <button 
          onClick={injectCustomHazard} 
          className="btn btn-outline-cyan font-mono"
          title="Trigger a new real-time simulated hazard"
        >
          + Simulate Live Detection
        </button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="filters-bar">
        <div className="filter-pills">
          <button 
            onClick={() => setFilterType('all')}
            className={`filter-btn font-mono ${filterType === 'all' ? 'active' : ''}`}
          >
            All Flagged ({detectedHazards.length})
          </button>
          <button 
            onClick={() => setFilterType('critical')}
            className={`filter-btn font-mono ${filterType === 'critical' ? 'active' : ''}`}
          >
            Critical Only
          </button>
          <button 
            onClick={() => setFilterType('pothole')}
            className={`filter-btn font-mono ${filterType === 'pothole' ? 'active' : ''}`}
          >
            Potholes
          </button>
          <button 
            onClick={() => setFilterType('crack')}
            className={`filter-btn font-mono ${filterType === 'crack' ? 'active' : ''}`}
          >
            Structural Cracks
          </button>
          <button 
            onClick={() => setFilterType('debris')}
            className={`filter-btn font-mono ${filterType === 'debris' ? 'active' : ''}`}
          >
            Obstacles & Debris
          </button>
          <button 
            onClick={() => setFilterType('unverified')}
            className={`filter-btn font-mono ${filterType === 'unverified' ? 'active' : ''}`}
          >
            Needs Verification
          </button>
        </div>
      </div>

      {/* Hazards Grid */}
      {detectedHazards.length === 0 ? (
        <div className="empty-state-box font-mono">
          <ShieldAlert size={42} className="text-dim" />
          <p className="empty-text">No road hazards detected yet on the active route.</p>
          <span className="empty-sub">
            Start the mission or click <strong>"Simulate Live Detection"</strong> to test edge detection.
          </span>
        </div>
      ) : (
        <div className="hazards-grid">
          {filteredHazards.map((hazard) => {
            const isCritical = hazard.severity === 'critical';
            return (
              <div key={hazard.id} className="hazard-card hud-panel">
                {/* Photo & Overlays */}
                <div className="hazard-image-container">
                  <img 
                    src={hazard.image} 
                    alt={hazard.title} 
                    className="hazard-photo"
                  />
                  <div className="hazard-overlay-badges">
                    <span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'} font-mono`}>
                      {hazard.severity.toUpperCase()}
                    </span>
                    <span className="badge badge-online font-mono">
                      Conf: {hazard.confidence}%
                    </span>
                  </div>
                  <button 
                    onClick={() => setModalHazard(hazard)}
                    className="inspect-zoom-btn"
                    title="Inspect High-Res & Contours"
                  >
                    <Eye size={15} />
                  </button>
                </div>

                {/* Card Content */}
                <div className="hazard-content">
                  <div className="hazard-header-line">
                    <span className="hazard-id font-mono">{hazard.id}</span>
                    <span className="hazard-time font-mono">
                      <Clock size={12} /> {hazard.timestamp}
                    </span>
                  </div>

                  <h4 className="hazard-card-title">{hazard.title}</h4>

                  {/* Metadata Specs */}
                  <div className="hazard-specs-grid font-mono">
                    <div className="spec-row">
                      <Ruler size={13} className="text-cyan" />
                      <span className="spec-label">Dimensions:</span>
                      <strong className="spec-val">{hazard.estimatedDimensions}</strong>
                    </div>

                    <div className="spec-row">
                      <MapPin size={13} className="text-cyan" />
                      <span className="spec-label">GPS Coords:</span>
                      <strong className="spec-val">{hazard.lat.toFixed(4)}°N, {hazard.lng.toFixed(4)}°W</strong>
                    </div>

                    <div className="spec-row">
                      <Cpu size={13} className="text-cyan" />
                      <span className="spec-label">Platform:</span>
                      <span className="spec-val text-muted">{hazard.detectedBy}</span>
                    </div>
                  </div>

                  {/* Impact Safety Analysis */}
                  <div className="impact-box">
                    <AlertTriangle size={14} className={isCritical ? 'text-danger' : 'text-amber'} />
                    <span className="impact-text">{hazard.speedImpact}</span>
                  </div>

                  {/* Human Verification & Triage Actions */}
                  <div className="hazard-actions-cluster">
                    {hazard.status === 'unverified' ? (
                      <div className="verify-buttons-group">
                        <button 
                          onClick={() => verifyHazard(hazard.id, 'verified')}
                          className="btn-tiny verify font-mono"
                          title="Verify as true road hazard"
                        >
                          <CheckCircle2 size={13} /> Verify
                        </button>
                        <button 
                          onClick={() => verifyHazard(hazard.id, 'dismissed')}
                          className="btn-tiny dismiss font-mono"
                          title="Dismiss as false positive"
                        >
                          <XCircle size={13} /> Dismiss
                        </button>
                      </div>
                    ) : (
                      <div className="verification-status-pill font-mono">
                        {hazard.status === 'verified' ? (
                          <span className="badge badge-online">
                            <CheckCircle2 size={12} /> Human-Verified
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <XCircle size={12} /> Dismissed
                          </span>
                        )}
                      </div>
                    )}

                    <div className="secondary-actions-group">
                      <button 
                        onClick={() => dispatchRepair(hazard.id)}
                        disabled={hazard.repairAssigned}
                        className={`btn-tiny dispatch font-mono ${hazard.repairAssigned ? 'assigned' : ''}`}
                        title="Dispatch road works repair crew"
                      >
                        <Truck size={13} />
                        <span>{hazard.repairAssigned ? 'Crew Dispatched' : 'Dispatch Repair'}</span>
                      </button>

                      <button 
                        onClick={() => exportGeoJson(hazard)}
                        className="btn-tiny export font-mono"
                        title="Download GeoJSON data point"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* High-Res Inspection Modal */}
      {modalHazard && (
        <div className="modal-backdrop" onClick={() => setModalHazard(null)}>
          <div className="modal-content-card hud-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <ShieldAlert size={20} className="text-cyan" />
                <h3 className="modal-title font-display">{modalHazard.title} ({modalHazard.id})</h3>
              </div>
              <button onClick={() => setModalHazard(null)} className="modal-close-btn">×</button>
            </div>

            <div className="modal-body-grid">
              <div className="modal-image-col">
                <img src={modalHazard.image} alt={modalHazard.title} className="modal-full-img" />
                <div className="modal-img-meta font-mono">
                  <span>Neural Segmentation Overlay</span>
                  <span>Confidence: {modalHazard.confidence}%</span>
                </div>
              </div>

              <div className="modal-info-col font-sans">
                <div className="info-section">
                  <h4 className="info-heading font-mono text-cyan">Geometric Depth Analysis</h4>
                  <p className="info-detail">Estimated Surface Area: <strong>{modalHazard.estimatedDimensions}</strong></p>
                  <p className="info-detail">Water Ingress / Pooling: <strong>{modalHazard.waterPresent ? 'Detected (High Freeze-Thaw Risk)' : 'Dry'}</strong></p>
                </div>

                <div className="info-section">
                  <h4 className="info-heading font-mono text-cyan">Coordinates & Telemetry</h4>
                  <p className="info-detail font-mono">Latitude: {modalHazard.lat.toFixed(6)}° N</p>
                  <p className="info-detail font-mono">Longitude: {modalHazard.lng.toFixed(6)}° W</p>
                  <p className="info-detail font-mono">Detected By: {modalHazard.detectedBy}</p>
                  <p className="info-detail font-mono">Time Flagged: {modalHazard.timestamp}</p>
                </div>

                <div className="info-section">
                  <h4 className="info-heading font-mono text-cyan">Traffic Safety Impact</h4>
                  <p className="info-detail">{modalHazard.speedImpact}</p>
                </div>

                <div className="modal-actions-bar">
                  <button 
                    onClick={() => { dispatchRepair(modalHazard.id); setModalHazard(null); }}
                    className="btn btn-primary"
                  >
                    <Truck size={15} /> Dispatch Road Maintenance Crew
                  </button>
                  <button 
                    onClick={() => exportGeoJson(modalHazard)}
                    className="btn btn-secondary font-mono"
                  >
                    <Download size={15} /> Export GeoJSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ai-detection-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 16px;
        }
        .title-with-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-title {
          font-size: 1.25rem;
          color: #ffffff;
        }
        .section-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .filters-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow-x: auto;
        }
        .filter-pills {
          display: flex;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 3px;
          gap: 4px;
        }
        .filter-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .filter-btn.active {
          background: rgba(0, 240, 255, 0.15);
          color: var(--neon-cyan);
          border: 1px solid rgba(0, 240, 255, 0.35);
        }
        .empty-state-box {
          padding: 60px 20px;
          border: 1px dashed rgba(56, 189, 248, 0.25);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
        }
        .empty-text {
          font-size: 1rem;
          color: #ffffff;
        }
        .empty-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .hazards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
        .hazard-card {
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: rgba(10, 18, 38, 0.85);
          transition: transform var(--transition-fast), border-color var(--transition-fast);
        }
        .hazard-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-glow);
        }
        .hazard-image-container {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #000;
        }
        .hazard-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hazard-overlay-badges {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          gap: 6px;
        }
        .inspect-zoom-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(5, 8, 17, 0.85);
          border: 1px solid rgba(0, 240, 255, 0.4);
          color: var(--neon-cyan);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .hazard-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hazard-header-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
        }
        .hazard-id {
          color: var(--neon-cyan);
          font-weight: 700;
        }
        .hazard-time {
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .hazard-card-title {
          font-size: 1rem;
          color: #ffffff;
          line-height: 1.3;
        }
        .hazard-specs-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(5, 8, 17, 0.7);
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.1);
        }
        .spec-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
        }
        .spec-label {
          color: var(--text-muted);
        }
        .spec-val {
          color: #ffffff;
          margin-left: auto;
        }
        .impact-box {
          background: rgba(239, 68, 68, 0.08);
          border-left: 3px solid #ef4444;
          padding: 6px 10px;
          border-radius: 0 4px 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .impact-text {
          font-size: 0.76rem;
          color: #ffffff;
        }
        .hazard-actions-cluster {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
          gap: 8px;
        }
        .verify-buttons-group {
          display: flex;
          gap: 6px;
        }
        .btn-tiny {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
        }
        .btn-tiny.verify {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          color: #34d399;
        }
        .btn-tiny.verify:hover {
          background: rgba(16, 185, 129, 0.3);
        }
        .btn-tiny.dismiss {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }
        .btn-tiny.dismiss:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        .secondary-actions-group {
          display: flex;
          gap: 6px;
          margin-left: auto;
        }
        .btn-tiny.dispatch {
          background: rgba(0, 136, 255, 0.18);
          border-color: rgba(0, 136, 255, 0.4);
          color: var(--sky-blue);
        }
        .btn-tiny.dispatch.assigned {
          background: rgba(16, 185, 129, 0.2);
          border-color: #10b981;
          color: #34d399;
        }
        .btn-tiny.export {
          background: rgba(8, 14, 30, 0.9);
          border-color: var(--border-subtle);
          color: var(--text-muted);
        }
        .btn-tiny.export:hover {
          color: #ffffff;
          border-color: var(--neon-cyan);
        }

        /* High-Res Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content-card {
          width: 100%;
          max-width: 900px;
          background: #090f20;
          border: 1px solid var(--neon-cyan);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
          padding-bottom: 12px;
        }
        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-title {
          font-size: 1.2rem;
          color: #ffffff;
        }
        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }
        .modal-image-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .modal-full-img {
          width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(0, 240, 255, 0.3);
        }
        .modal-img-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .modal-info-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .info-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-heading {
          font-size: 0.8rem;
          margin-bottom: 2px;
        }
        .info-detail {
          font-size: 0.85rem;
          color: var(--text-main);
        }
        .modal-actions-bar {
          margin-top: auto;
          display: flex;
          gap: 10px;
        }
        @media (max-width: 800px) {
          .modal-body-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
