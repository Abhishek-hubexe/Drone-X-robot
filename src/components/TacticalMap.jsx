import React, { useRef, useEffect, useState } from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Compass, 
  Layers, 
  MapPin, 
  Crosshair, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Bot, 
  Plane 
} from 'lucide-react';

export default function TacticalMap({ onSelectHazard }) {
  const { 
    activePreset, 
    progress, 
    roverState, 
    droneState, 
    detectedHazards, 
    allHazards,
    missionStatus 
  } = useMission();

  const canvasRef = useRef(null);
  const [activeLayers, setActiveLayers] = useState({
    lidarScan: true,
    droneCorridor: true,
    grid: true,
    hazards: true
  });

  const [hoveredHazard, setHoveredHazard] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [cameraCenter, setCameraCenter] = useState('auto'); // 'auto', 'rover', 'drone'

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Canvas Tactical Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let tick = 0;

    const render = () => {
      tick += 0.03;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Deep Navy Tactical Background
      ctx.fillStyle = '#070c18';
      ctx.fillRect(0, 0, w, h);

      // 1. Tactical Grid & Lat/Lng Crosshairs
      if (activeLayers.grid) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 1;
        const step = 50;

        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Tactical Corner Markers & Distance Scales
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeRect(20, 20, w - 40, h - 40);

        // Grid Coordinates text
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.font = '9px monospace';
        ctx.fillText('N 37°46\'38.4"', 28, 36);
        ctx.fillText('W 122°24\'52.8"', w - 110, 36);
        ctx.fillText('SCALE: 1:5000 (HIGH-RES RTK)', 28, h - 28);
      }

      const waypoints = activePreset.waypoints;

      // 2. Road Geometry (Double-Lane Road Ribbon)
      ctx.beginPath();
      waypoints.forEach((wp, i) => {
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
      });
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Road Borders (Pavement Edges)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 38;
      ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 34;
      ctx.stroke();

      // 3. Drone Flight Corridor Overlay
      if (activeLayers.droneCorridor) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 56;
        ctx.stroke();
      }

      // 4. Completed Inspected Route Glow (Scanned Path)
      const totalPoints = waypoints.length;
      const progressFraction = progress / 100;
      const completedSegments = (totalPoints - 1) * progressFraction;
      const fullSegs = Math.floor(completedSegments);
      const rem = completedSegments - fullSegs;

      ctx.beginPath();
      ctx.moveTo(waypoints[0].x, waypoints[0].y);
      for (let i = 1; i <= fullSegs; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
      }
      if (fullSegs < totalPoints - 1 && rem > 0) {
        const p1 = waypoints[fullSegs];
        const p2 = waypoints[fullSegs + 1];
        ctx.lineTo(p1.x + (p2.x - p1.x) * rem, p1.y + (p2.y - p1.y) * rem);
      }
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Upcoming Unscanned Path (Dashed)
      ctx.beginPath();
      if (fullSegs < totalPoints - 1) {
        const p1 = waypoints[fullSegs];
        const p2 = waypoints[fullSegs + 1];
        ctx.moveTo(p1.x + (p2.x - p1.x) * rem, p1.y + (p2.y - p1.y) * rem);
        for (let i = fullSegs + 1; i < totalPoints; i++) {
          ctx.lineTo(waypoints[i].x, waypoints[i].y);
        }
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Waypoints Pins
      waypoints.forEach((wp, index) => {
        const isReached = (progress / 100) >= (index / (waypoints.length - 1));
        
        // Waypoint ring
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isReached ? '#10b981' : '#0e1d38';
        ctx.fill();
        ctx.strokeStyle = isReached ? '#34d399' : 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = isReached ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText(`WP-${index + 1}`, wp.x - 14, wp.y - 12);
      });

      // 6. Hazard Markers on the Map
      if (activeLayers.hazards) {
        allHazards.forEach(hazard => {
          // Calculate approx position along route for this hazard's progressTrigger
          const norm = hazard.progressTrigger / 100;
          const segs = waypoints.length - 1;
          const sIndex = Math.min(Math.floor(norm * segs), segs - 1);
          const sFrac = (norm * segs) - sIndex;
          const pA = waypoints[sIndex];
          const pB = waypoints[sIndex + 1];
          const hx = pA.x + (pB.x - pA.x) * sFrac;
          const hy = pA.y + (pB.y - pA.y) * sFrac;

          const isDiscovered = detectedHazards.some(d => d.id === hazard.id);

          if (isDiscovered) {
            // Hazard Color
            const col = hazard.severity === 'critical' ? '#ef4444' : '#f59e0b';

            // Pulsing circle
            const pulse = (Math.sin(tick * 3) + 1) * 3;
            ctx.beginPath();
            ctx.arc(hx, hy, 10 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Core pin
            ctx.beginPath();
            ctx.arc(hx, hy, 6, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();

            // Label tag
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(hazard.type, hx + 12, hy + 3);
          }
        });
      }

      // 7. Ground Robot (UGV Titan-01) with Dynamic LIDAR Fan
      const rx = roverState.canvasX || waypoints[0].x;
      const ry = roverState.canvasY || waypoints[0].y;
      const rAngle = (roverState.headingDeg * Math.PI) / 180;

      if (activeLayers.lidarScan && missionStatus === 'RUNNING') {
        // Rotating LIDAR Fan Beam
        const scanAngle = Math.sin(tick * 4) * 0.45;
        const sweepAngle = rAngle + scanAngle;
        const lidarRadius = 65;

        const grad = ctx.createRadialGradient(rx, ry, 5, rx, ry, lidarRadius);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, lidarRadius, sweepAngle - 0.5, sweepAngle + 0.5);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Rover Body
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(rAngle);

      // Rover chassis
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -8, 24, 16);

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, -11, 8, 4);
      ctx.fillRect(6, -11, 8, 4);
      ctx.fillRect(-14, 7, 8, 4);
      ctx.fillRect(6, 7, 8, 4);

      // Heading arrow
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      ctx.restore();

      // Rover Label
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`UGV: TITAN-01 (${roverState.speedKmh} km/h)`, rx - 35, ry + 24);

      // 8. Aerial Drone (UAV SkyEye-04) with Radar Sweep
      const dx = droneState.canvasX || (waypoints[0].x + 35);
      const dy = droneState.canvasY || (waypoints[0].y - 30);

      // Drone Altitude shadow line connecting drone to ground
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx, dy + 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Drone Radar Sweep Ring
      const radarRadius = 38 + ((tick * 15) % 25);
      ctx.beginPath();
      ctx.arc(dx, dy, radarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 - (radarRadius - 38) / 35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Drone Body (X-shape quadcopter)
      ctx.save();
      ctx.translate(dx, dy);
      const droneSpin = tick * 8;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, 10);
      ctx.moveTo(10, -10);
      ctx.lineTo(-10, 10);
      ctx.stroke();

      // Rotors
      [-10, 10].forEach(ox => {
        [-10, 10].forEach(oy => {
          ctx.beginPath();
          ctx.arc(ox, oy, 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#00f0ff';
          ctx.stroke();
        });
      });

      // Center Hub
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();

      // Drone Label
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`UAV: SKYEYE-04 (${droneState.altitudeM}m)`, dx - 35, dy - 18);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activePreset, progress, roverState, droneState, activeLayers, detectedHazards, allHazards, missionStatus]);

  // Handle click on canvas to select hazard pin
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const waypoints = activePreset.waypoints;
    let clickedHazard = null;

    detectedHazards.forEach(hazard => {
      const norm = hazard.progressTrigger / 100;
      const segs = waypoints.length - 1;
      const sIndex = Math.min(Math.floor(norm * segs), segs - 1);
      const sFrac = (norm * segs) - sIndex;
      const pA = waypoints[sIndex];
      const pB = waypoints[sIndex + 1];
      const hx = pA.x + (pB.x - pA.x) * sFrac;
      const hy = pA.y + (pB.y - pA.y) * sFrac;

      const dist = Math.hypot(clickX - hx, clickY - hy);
      if (dist < 18) {
        clickedHazard = hazard;
      }
    });

    setSelectedPin(clickedHazard);
    if (clickedHazard && onSelectHazard) {
      onSelectHazard(clickedHazard);
    }
  };

  return (
    <div className="tactical-map-container hud-panel hud-corner">
      {/* Map Header Toolbar */}
      <div className="map-toolbar">
        <div className="map-title-group">
          <Crosshair size={18} className="text-cyan" />
          <h3 className="map-title font-display">Tactical Route & Swarm Vector Map</h3>
          <span className="badge badge-online font-mono">RTK Centimetric GPS</span>
        </div>

        {/* Tactical Layers Toggle Pills */}
        <div className="layer-toggles">
          <button 
            onClick={() => toggleLayer('lidarScan')}
            className={`layer-btn font-mono ${activeLayers.lidarScan ? 'active' : ''}`}
          >
            LIDAR Beam
          </button>
          <button 
            onClick={() => toggleLayer('droneCorridor')}
            className={`layer-btn font-mono ${activeLayers.droneCorridor ? 'active' : ''}`}
          >
            Flight Corridor
          </button>
          <button 
            onClick={() => toggleLayer('hazards')}
            className={`layer-btn font-mono ${activeLayers.hazards ? 'active' : ''}`}
          >
            Hazard Pins
          </button>
          <button 
            onClick={() => toggleLayer('grid')}
            className={`layer-btn font-mono ${activeLayers.grid ? 'active' : ''}`}
          >
            Tactical Grid
          </button>
        </div>
      </div>

      {/* Canvas Map Viewport */}
      <div className="map-canvas-viewport">
        <canvas 
          ref={canvasRef}
          width={920}
          height={480}
          onClick={handleCanvasClick}
          className="tactical-canvas"
        />

        {/* Selected Hazard Pin Overlay Popover */}
        {selectedPin && (
          <div className="hazard-popover-card hud-panel font-sans">
            <div className="popover-header">
              <span className={`badge ${selectedPin.severity === 'critical' ? 'badge-danger' : 'badge-warning'} font-mono`}>
                {selectedPin.severity.toUpperCase()}
              </span>
              <button 
                onClick={() => setSelectedPin(null)}
                className="close-popover-btn"
              >
                ×
              </button>
            </div>

            <div className="popover-body">
              <img 
                src={selectedPin.image} 
                alt={selectedPin.title} 
                className="popover-thumb"
              />
              <div>
                <strong className="popover-title">{selectedPin.title}</strong>
                <div className="popover-meta font-mono">
                  <span>Confidence: <strong>{selectedPin.confidence}%</strong></span>
                  <span>Coords: {selectedPin.lat.toFixed(4)}°N, {selectedPin.lng.toFixed(4)}°W</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Legend & Telemetry Bar */}
        <div className="map-legend-overlay font-mono">
          <div className="legend-item">
            <span className="legend-dot rover"></span>
            <span>UGV Titan-01</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot drone"></span>
            <span>UAV SkyEye-04</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot hazard-critical"></span>
            <span>Critical Hazard</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot hazard-major"></span>
            <span>Major Hazard</span>
          </div>
        </div>
      </div>

      <style>{`
        .tactical-map-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .map-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .map-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .map-title {
          font-size: 1.15rem;
          color: #ffffff;
        }
        .layer-toggles {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .layer-btn {
          background: rgba(8, 14, 30, 0.85);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .layer-btn.active {
          background: rgba(0, 240, 255, 0.15);
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        }
        .map-canvas-viewport {
          position: relative;
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(0, 240, 255, 0.2);
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.7);
        }
        .tactical-canvas {
          width: 100%;
          height: auto;
          display: block;
          cursor: crosshair;
        }
        .hazard-popover-card {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 320px;
          background: rgba(10, 16, 35, 0.95);
          backdrop-filter: blur(16px);
          padding: 14px;
          border: 1px solid var(--neon-cyan);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
          z-index: 20;
          animation: fadeIn 0.2s ease-out;
        }
        .popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .close-popover-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.2rem;
          cursor: pointer;
        }
        .popover-body {
          display: flex;
          gap: 10px;
        }
        .popover-thumb {
          width: 70px;
          height: 60px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        .popover-title {
          font-size: 0.84rem;
          color: #ffffff;
          display: block;
          margin-bottom: 4px;
        }
        .popover-meta {
          font-size: 0.72rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .map-legend-overlay {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(5, 8, 17, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 6px;
          padding: 6px 12px;
          display: flex;
          gap: 14px;
          font-size: 0.7rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .legend-dot.rover { background: #00f0ff; box-shadow: 0 0 6px #00f0ff; }
        .legend-dot.drone { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }
        .legend-dot.hazard-critical { background: #ef4444; }
        .legend-dot.hazard-major { background: #f59e0b; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
