import React, { useState, useEffect, useRef } from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Bot, 
  Plane, 
  Battery, 
  Gauge, 
  Radar, 
  Thermometer, 
  Compass, 
  Wifi, 
  Video, 
  ShieldAlert, 
  Maximize2, 
  Eye, 
  Flame, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export default function LiveDashboard({ onNavigateToHazards }) {
  const { 
    missionStatus, 
    progress, 
    roverState, 
    droneState, 
    activePreset, 
    detectedHazards, 
    eventLogs 
  } = useMission();

  // Camera HUD feed controls
  const [activeCameraFeed, setActiveCameraFeed] = useState('ugv'); // 'ugv' or 'uav'
  const [visionMode, setVisionMode] = useState('optical'); // 'optical' or 'thermal'
  const [detectionOverlayEnabled, setDetectionOverlayEnabled] = useState(true);

  const canvasRef = useRef(null);

  // Calculated metrics
  const distanceCoveredKm = ((progress / 100) * activePreset.totalDistanceKm).toFixed(2);
  const areaSurveyedSqm = Math.round((progress / 100) * activePreset.targetAreaSqm);
  const criticalHazardsCount = detectedHazards.filter(h => h.severity === 'critical').length;
  const pciHealthScore = Math.max(55, Math.round(92 - (detectedHazards.length * 6)));

  // Simulated Canvas Video Feed with Dynamic HUD & Hazard Bounding Boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let tick = 0;

    const renderFeed = () => {
      tick += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      // Base background gradient simulating road/sky
      ctx.clearRect(0, 0, w, h);

      if (visionMode === 'thermal') {
        // FLIR False Color Thermal Palette (Indigo to purple to amber/yellow)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#10002b');
        grad.addColorStop(0.5, '#240046');
        grad.addColorStop(1, '#3c096c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Thermal road heat bands
        ctx.strokeStyle = 'rgba(255, 154, 0, 0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
          const yPos = (h * 0.4) + (i * 20) + (Math.sin(tick + i) * 2);
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(w, yPos);
          ctx.stroke();
        }
      } else {
        // Optical RGB Mode
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (activeCameraFeed === 'ugv') {
          grad.addColorStop(0, '#091326');
          grad.addColorStop(0.45, '#152544');
          grad.addColorStop(0.5, '#1e293b');
          grad.addColorStop(1, '#0f172a');
        } else {
          // UAV high altitude perspective
          grad.addColorStop(0, '#0a1936');
          grad.addColorStop(0.6, '#0f244a');
          grad.addColorStop(1, '#1b325f');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Road Perspective lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);

        if (activeCameraFeed === 'ugv') {
          // Highway lane vanishing point
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.45);
          ctx.lineTo(w * 0.15, h);
          ctx.moveTo(w * 0.5, h * 0.45);
          ctx.lineTo(w * 0.85, h);
          ctx.stroke();

          // Center dashed divider
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.45);
          ctx.lineTo(w * 0.5, h);
          ctx.stroke();
        } else {
          // UAV Aerial Grid
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          const gridSize = 40;
          for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
      }

      // HUD Crosshair Reticle & Pitch Ladder
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 1.5;
      const cx = w / 2;
      const cy = h / 2;

      // Center crosshair
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 38, cy);
      ctx.lineTo(cx - 12, cy);
      ctx.moveTo(cx + 12, cy);
      ctx.lineTo(cx + 38, cy);
      ctx.moveTo(cx, cy - 38);
      ctx.lineTo(cx, cy - 12);
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx, cy + 38);
      ctx.stroke();

      // Simulated Artificial Horizon Ladder
      const rollOffset = Math.sin(tick * 0.5) * 4;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy + 30 + rollOffset);
      ctx.lineTo(cx - 20, cy + 30 + rollOffset);
      ctx.moveTo(cx + 20, cy + 30 - rollOffset);
      ctx.lineTo(cx + 60, cy + 30 - rollOffset);
      ctx.stroke();

      // Dynamic AI Bounding Boxes if hazard detected
      if (detectionOverlayEnabled && detectedHazards.length > 0) {
        detectedHazards.slice(-2).forEach((hazard, idx) => {
          const bx = w * (0.35 + (idx * 0.22));
          const by = h * (0.52 + (idx * 0.08));
          const bw = 110;
          const bh = 70;

          // Box color based on severity
          const color = hazard.severity === 'critical' ? '#ef4444' : '#f59e0b';
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);

          // Corner tech brackets
          ctx.fillStyle = color;
          ctx.fillRect(bx - 2, by - 2, 6, 6);
          ctx.fillRect(bx + bw - 4, by - 2, 6, 6);
          ctx.fillRect(bx - 2, by + bh - 4, 6, 6);
          ctx.fillRect(bx + bw - 4, by + bh - 4, 6, 6);

          // Label
          ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
          ctx.fillRect(bx, by - 22, bw, 20);
          ctx.fillStyle = color;
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`${hazard.type} ${hazard.confidence}%`, bx + 4, by - 8);
        });
      }

      // HUD Watermark & Timestamp
      ctx.fillStyle = '#00f0ff';
      ctx.font = '11px monospace';
      ctx.fillText(`CAM: ${activeCameraFeed.toUpperCase()}_4K_OPTICAL`, 16, 26);
      ctx.fillText(`FPS: 45.2 | LATENCY: 18ms`, 16, 44);
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`REC ● [SIMULATED FEED]`, w - 165, 26);

      animationFrameId = requestAnimationFrame(renderFeed);
    };

    renderFeed();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeCameraFeed, visionMode, detectionOverlayEnabled, detectedHazards]);

  return (
    <div className="dashboard-layout">
      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card hud-panel">
          <div className="kpi-icon-wrap cyan">
            <Gauge size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Distance Inspected</span>
            <div className="kpi-value font-hud">
              {distanceCoveredKm} <span className="kpi-unit">/ {activePreset.totalDistanceKm} km</span>
            </div>
            <div className="kpi-subtext font-mono text-cyan">
              {progress.toFixed(0)}% Route Completed
            </div>
          </div>
        </div>

        <div className="kpi-card hud-panel">
          <div className="kpi-icon-wrap blue">
            <Radar size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Asphalt Area Mapped</span>
            <div className="kpi-value font-hud">
              {areaSurveyedSqm.toLocaleString()} <span className="kpi-unit">m²</span>
            </div>
            <div className="kpi-subtext font-mono text-muted">
              LIDAR 3D Depth Point Cloud
            </div>
          </div>
        </div>

        <div 
          className="kpi-card hud-panel clickable" 
          onClick={onNavigateToHazards}
          title="Click to view AI Hazard Detections"
        >
          <div className="kpi-icon-wrap amber">
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Hazards Identified</span>
            <div className="kpi-value font-hud glow-text-amber">
              {detectedHazards.length} <span className="kpi-unit">({criticalHazardsCount} Critical)</span>
            </div>
            <div className="kpi-subtext font-mono text-amber">
              {detectedHazards.length > 0 ? 'Review & Triage Required' : 'Pavement Clean'}
            </div>
          </div>
        </div>

        <div className="kpi-card hud-panel">
          <div className="kpi-icon-wrap emerald">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pavement Health Index</span>
            <div className="kpi-value font-hud text-emerald">
              {pciHealthScore} <span className="kpi-unit">/ 100 PCI</span>
            </div>
            <div className="kpi-subtext font-mono text-emerald">
              {pciHealthScore > 75 ? 'Optimal Structural Integrity' : 'Maintenance Advised'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Vehicle Telemetry Section */}
      <div className="vehicles-grid">
        {/* Ground Robot UGV Card */}
        <div className="vehicle-card hud-panel hud-corner">
          <div className="vehicle-header">
            <div className="vehicle-title-group">
              <div className="vehicle-icon-pill ugv">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="vehicle-title">Titan-01 Heavy Rover</h3>
                <span className="vehicle-role">Unmanned Ground Vehicle (UGV)</span>
              </div>
            </div>
            <span className="badge badge-online font-mono">{roverState.status}</span>
          </div>

          <div className="vehicle-image-wrap">
            <img 
              src="/images/ugv_rover.jpg" 
              alt="Titan-01 Heavy Ground Inspection Rover with LIDAR"
              className="vehicle-photo"
            />
            <div className="image-scan-line"></div>
            <div className="image-telemetry-badge font-mono">
              <span>LIDAR: 32-BEAM</span>
              <span>FOV: 360°</span>
            </div>
          </div>

          <div className="telemetry-readings-grid">
            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Battery size={13} className="text-cyan" /> Battery Level:
              </span>
              <div className="telemetry-bar-wrap">
                <div className="telemetry-bar-fill" style={{ width: `${roverState.battery}%` }}></div>
              </div>
              <strong className="text-cyan">{roverState.battery}%</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Gauge size={13} className="text-cyan" /> Speed:
              </span>
              <strong>{roverState.speedKmh} km/h</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Radar size={13} className="text-cyan" /> Point Cloud:
              </span>
              <strong>{(roverState.lidarPoints / 1000).toFixed(0)}k pts/s</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Compass size={13} className="text-cyan" /> Heading:
              </span>
              <strong>{roverState.headingDeg}° NE</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Thermometer size={13} className="text-cyan" /> Motor Temp:
              </span>
              <strong>{roverState.temperatureC}°C</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Wifi size={13} className="text-emerald" /> RTK GPS:
              </span>
              <strong className="text-emerald">Fix (±1.4cm)</strong>
            </div>
          </div>
        </div>

        {/* Aerial Drone UAV Card */}
        <div className="vehicle-card hud-panel hud-corner">
          <div className="vehicle-header">
            <div className="vehicle-title-group">
              <div className="vehicle-icon-pill uav">
                <Plane size={18} />
              </div>
              <div>
                <h3 className="vehicle-title">SkyEye-04 Hexacopter</h3>
                <span className="vehicle-role">Unmanned Aerial Vehicle (UAV)</span>
              </div>
            </div>
            <span className="badge badge-active font-mono">{droneState.flightMode}</span>
          </div>

          <div className="vehicle-image-wrap">
            <img 
              src="/images/uav_drone.jpg" 
              alt="SkyEye-04 Hexacopter aerial scanning drone"
              className="vehicle-photo"
            />
            <div className="image-scan-line"></div>
            <div className="image-telemetry-badge font-mono">
              <span>GIMBAL: DUAL FLIR/RGB</span>
              <span>ALT: {droneState.altitudeM}m</span>
            </div>
          </div>

          <div className="telemetry-readings-grid">
            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Battery size={13} className="text-cyan" /> Battery Level:
              </span>
              <div className="telemetry-bar-wrap">
                <div 
                  className="telemetry-bar-fill" 
                  style={{ 
                    width: `${droneState.battery}%`,
                    background: droneState.battery < 25 ? 'var(--status-crimson)' : 'var(--neon-cyan)'
                  }}
                ></div>
              </div>
              <strong className={droneState.battery < 25 ? 'text-danger' : 'text-cyan'}>
                {droneState.battery}%
              </strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Gauge size={13} className="text-cyan" /> Altitude AGL:
              </span>
              <strong>{droneState.altitudeM} meters</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Video size={13} className="text-cyan" /> Gimbal Pitch:
              </span>
              <strong>{droneState.gimbalAngleDeg}° Downward</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Radar size={13} className="text-cyan" /> Wind Resistance:
              </span>
              <strong>{droneState.windSpeedMs} m/s (Nominal)</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <Wifi size={13} className="text-cyan" /> Swarm Sync:
              </span>
              <strong>Offset +38m Lead</strong>
            </div>

            <div className="telemetry-item font-mono">
              <span className="telemetry-name">
                <CheckCircle2 size={13} className="text-emerald" /> RTH Guard:
              </span>
              <strong className="text-emerald">Armed (Safe)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Live AI HUD Camera Feed & Swarm Activity Logs */}
      <div className="feed-and-logs-grid">
        {/* Live Camera Feed Canvas */}
        <div className="camera-feed-panel hud-panel">
          <div className="feed-header">
            <div className="feed-title-wrap">
              <Video size={16} className="text-cyan" />
              <h4 className="feed-title font-display">Live Sensor Video Stream</h4>
            </div>

            <div className="feed-controls-cluster">
              <div className="feed-pill-selector">
                <button 
                  onClick={() => setActiveCameraFeed('ugv')}
                  className={`feed-btn font-mono ${activeCameraFeed === 'ugv' ? 'active' : ''}`}
                >
                  UGV Forward 4K
                </button>
                <button 
                  onClick={() => setActiveCameraFeed('uav')}
                  className={`feed-btn font-mono ${activeCameraFeed === 'uav' ? 'active' : ''}`}
                >
                  UAV Aerial Gimbal
                </button>
              </div>

              <div className="feed-pill-selector">
                <button 
                  onClick={() => setVisionMode('optical')}
                  className={`feed-btn font-mono ${visionMode === 'optical' ? 'active' : ''}`}
                  title="Optical RGB High Resolution"
                >
                  <Eye size={12} /> RGB
                </button>
                <button 
                  onClick={() => setVisionMode('thermal')}
                  className={`feed-btn font-mono ${visionMode === 'thermal' ? 'active' : ''}`}
                  title="Thermal FLIR False Color"
                >
                  <Flame size={12} /> FLIR
                </button>
              </div>

              <button
                onClick={() => setDetectionOverlayEnabled(!detectionOverlayEnabled)}
                className={`feed-btn font-mono ${detectionOverlayEnabled ? 'active' : ''}`}
                title="Toggle AI YOLO Bounding Boxes"
              >
                AI HUD: {detectionOverlayEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="canvas-video-container">
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={360} 
              className="live-video-canvas"
            />
          </div>
        </div>

        {/* Live Swarm Event Log Console */}
        <div className="event-logs-panel hud-panel">
          <div className="logs-header">
            <div className="logs-title-wrap font-mono">
              <Terminal size={15} className="text-cyan" />
              <span>Swarm Telemetry Tele-Log</span>
            </div>
            <span className="badge badge-simulated font-mono">Real-Time Event Stream</span>
          </div>

          <div className="logs-scroll-area font-mono">
            {eventLogs.map((log) => {
              let badgeClass = 'text-cyan';
              if (log.level === 'AI_ALERT') badgeClass = 'glow-text-amber';
              if (log.level === 'CRITICAL') badgeClass = 'glow-text-crimson';
              if (log.level === 'DISPATCH') badgeClass = 'glow-text-emerald';

              return (
                <div key={log.id} className="log-row">
                  <span className="log-time">[{log.time}]</span>
                  <span className={`log-badge ${badgeClass}`}>[{log.level}]</span>
                  <span className="log-message">{log.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .kpi-card {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform var(--transition-fast), border-color var(--transition-fast);
        }
        .kpi-card.clickable {
          cursor: pointer;
        }
        .kpi-card.clickable:hover {
          transform: translateY(-2px);
          border-color: var(--status-amber);
        }
        .kpi-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kpi-icon-wrap.cyan {
          background: rgba(0, 240, 255, 0.12);
          border: 1px solid rgba(0, 240, 255, 0.3);
          color: var(--neon-cyan);
        }
        .kpi-icon-wrap.blue {
          background: rgba(0, 102, 255, 0.15);
          border: 1px solid rgba(0, 102, 255, 0.35);
          color: var(--sky-blue);
        }
        .kpi-icon-wrap.amber {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: var(--status-amber);
        }
        .kpi-icon-wrap.emerald {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: var(--status-emerald);
        }
        .kpi-info {
          display: flex;
          flex-direction: column;
        }
        .kpi-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .kpi-value {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin: 2px 0;
        }
        .kpi-unit {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .kpi-subtext {
          font-size: 0.75rem;
        }
        .vehicles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
          gap: 20px;
        }
        .vehicle-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .vehicle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .vehicle-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .vehicle-icon-pill {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vehicle-icon-pill.ugv {
          background: rgba(0, 240, 255, 0.15);
          border: 1px solid var(--neon-cyan);
          color: var(--neon-cyan);
        }
        .vehicle-icon-pill.uav {
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid var(--sky-blue);
          color: var(--sky-blue);
        }
        .vehicle-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
        }
        .vehicle-role {
          font-size: 0.74rem;
          color: var(--text-muted);
        }
        .vehicle-image-wrap {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }
        .vehicle-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }
        .vehicle-card:hover .vehicle-photo {
          transform: scale(1.03);
        }
        .image-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #00f0ff, transparent);
          box-shadow: 0 0 12px #00f0ff;
          animation: scanline 4s linear infinite;
        }
        .image-telemetry-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: rgba(5, 8, 17, 0.85);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(0, 240, 255, 0.3);
          font-size: 0.72rem;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
        }
        .telemetry-readings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .telemetry-item {
          background: rgba(8, 14, 30, 0.85);
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.12);
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.78rem;
        }
        .telemetry-name {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
        }
        .telemetry-bar-wrap {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
          margin: 3px 0;
        }
        .telemetry-bar-fill {
          height: 100%;
          background: var(--neon-cyan);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .feed-and-logs-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 20px;
        }
        .camera-feed-panel {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .feed-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feed-title {
          font-size: 1rem;
          color: #ffffff;
        }
        .feed-controls-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .feed-pill-selector {
          display: flex;
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 2px;
        }
        .feed-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 4px 10px;
          font-size: 0.75rem;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all var(--transition-fast);
        }
        .feed-btn.active {
          background: rgba(0, 240, 255, 0.15);
          color: var(--neon-cyan);
          border: 1px solid rgba(0, 240, 255, 0.4);
        }
        .canvas-video-container {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(0, 240, 255, 0.25);
          background: #000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
        }
        .live-video-canvas {
          width: 100%;
          height: auto;
          display: block;
        }
        .event-logs-panel {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 440px;
        }
        .logs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logs-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          color: #ffffff;
        }
        .logs-scroll-area {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 6px;
          height: 100%;
        }
        .log-row {
          font-size: 0.75rem;
          line-height: 1.4;
          display: flex;
          gap: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 6px;
        }
        .log-time {
          color: var(--text-dim);
          flex-shrink: 0;
        }
        .log-badge {
          font-weight: 700;
          flex-shrink: 0;
        }
        .log-message {
          color: var(--text-main);
          word-break: break-word;
        }
        @media (max-width: 960px) {
          .vehicles-grid {
            grid-template-columns: 1fr;
          }
          .feed-and-logs-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
