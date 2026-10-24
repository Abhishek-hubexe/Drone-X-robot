import React from 'react';
import { useMission } from '../context/MissionContext';
import { 
  Bot, 
  Plane, 
  Wifi, 
  Volume2, 
  VolumeX, 
  AlertOctagon, 
  Code, 
  Activity, 
  MapPin, 
  Layers, 
  ShieldAlert, 
  FileText,
  Stethoscope
} from 'lucide-react';
import { setSoundEnabled } from '../utils/audio';

export default function Header({ activeTab, setActiveTab, onOpenApiModal }) {
  const { 
    missionStatus, 
    soundOn, 
    setSoundOn, 
    emergencyStop, 
    roverState, 
    droneState,
    detectedHazards,
    activeAlerts,
    MissionState
  } = useMission();

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const unackedAlerts = (activeAlerts || []).filter(a => !a.acknowledged).length;

  const navItems = [
    { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
    { id: 'map', label: 'Tactical Map', icon: MapPin },
    { id: 'workflow', label: 'Automation Workflow', icon: Layers },
    { id: 'ai-detection', label: 'AI Hazard Detection', icon: ShieldAlert, badge: detectedHazards.length },
    { id: 'reports', label: 'Inspection Reports', icon: FileText },
    { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope, badge: unackedAlerts }
  ];

  return (
    <header className="header-nav">
      <div className="header-container">
        {/* Brand & Platform Identity */}
        <div className="brand-group">
          <div className="logo-badge">
            <div className="logo-glow-ring"></div>
            <Bot className="logo-icon-bot" size={24} />
            <Plane className="logo-icon-drone" size={16} />
          </div>
          <div>
            <div className="brand-title font-hud">
              AERO<span className="glow-text-cyan">DRIVE</span>
            </div>
            <div className="brand-subtitle">
              Smart Vehicle Robotics & Drones Platform
            </div>
          </div>
        </div>

        {/* Global Live Swarm Telemetry Indicators */}
        <div className="swarm-telemetry-bar">
          <div className="telemetry-pill">
            <span className={`pulse-dot ${missionStatus === 'RUNNING' ? 'active' : 'online'}`}></span>
            <Bot size={14} className="text-cyan" />
            <span className="telemetry-label">UGV Titan:</span>
            <span className="telemetry-value font-mono">{roverState.battery}%</span>
          </div>

          <div className="telemetry-pill">
            <span className={`pulse-dot ${missionStatus === 'RUNNING' ? 'active' : 'online'}`}></span>
            <Plane size={14} className="text-cyan" />
            <span className="telemetry-label">UAV SkyEye:</span>
            <span className="telemetry-value font-mono">{droneState.battery}%</span>
          </div>

          <div className="telemetry-pill hide-on-mobile">
            <Wifi size={14} className="text-emerald" />
            <span className="telemetry-label">5G Mesh:</span>
            <span className="telemetry-value font-mono">4.2ms</span>
          </div>
        </div>

        {/* Action Controls & E-STOP */}
        <div className="header-actions">
          {/* Sound Toggle */}
          <button 
            onClick={handleToggleSound}
            className="action-icon-btn"
            title={soundOn ? 'Futuristic Sound FX On' : 'Sound FX Muted'}
            aria-label="Toggle sound"
          >
            {soundOn ? <Volume2 size={18} className="glow-text-cyan" /> : <VolumeX size={18} className="text-dim" />}
          </button>

          {/* Hardware API Modal Toggle */}
          <button 
            onClick={onOpenApiModal}
            className="action-icon-btn api-btn"
            title="Hardware & API Architecture Guide"
          >
            <Code size={18} />
            <span className="api-btn-text">API & ROS2</span>
          </button>

          {/* Emergency Stop Button */}
          <button 
            onClick={emergencyStop}
            className="e-stop-btn font-hud"
            title="Emergency Swarm Actuator Shutdown"
          >
            <AlertOctagon size={16} />
            <span>E-STOP</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="nav-tabs-bar">
        <div className="nav-tabs-container">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                id={`tab-${item.id}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="tab-badge font-mono">{item.badge}</span>
                )}
                {isActive && <div className="tab-active-indicator"></div>}
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        .header-nav {
          background: rgba(5, 8, 17, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-container {
          max-width: 1480px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .logo-badge {
          position: relative;
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 102, 255, 0.2));
          border: 1px solid var(--neon-cyan);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);
        }
        .logo-icon-bot {
          color: var(--neon-cyan);
        }
        .logo-icon-drone {
          position: absolute;
          top: 4px;
          right: 4px;
          color: #ffffff;
        }
        .brand-title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ffffff;
          line-height: 1.1;
        }
        .brand-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }
        .swarm-telemetry-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(13, 23, 46, 0.7);
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(56, 189, 248, 0.15);
        }
        .telemetry-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
        }
        .telemetry-label {
          color: var(--text-muted);
        }
        .telemetry-value {
          color: #ffffff;
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .action-icon-btn {
          background: rgba(13, 23, 46, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          color: var(--text-main);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .action-icon-btn:hover {
          border-color: var(--neon-cyan);
          background: rgba(0, 240, 255, 0.1);
        }
        .api-btn {
          width: auto;
          padding: 0 12px;
          gap: 6px;
          font-size: 0.8rem;
          font-family: var(--font-display);
          font-weight: 600;
          border-color: rgba(56, 189, 248, 0.3);
        }
        .e-stop-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
          border: 1px solid #fca5a5;
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.05em;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
          transition: all var(--transition-fast);
        }
        .e-stop-btn:hover {
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
          transform: translateY(-1px);
        }
        .nav-tabs-bar {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(8, 14, 30, 0.8);
        }
        .nav-tabs-container {
          max-width: 1480px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          gap: 6px;
          overflow-x: auto;
        }
        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-display);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .nav-tab-btn:hover {
          color: #ffffff;
        }
        .nav-tab-btn.active {
          color: var(--neon-cyan);
        }
        .tab-active-indicator {
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 2px;
          background: var(--neon-cyan);
          box-shadow: 0 0 10px var(--neon-cyan);
          border-radius: 2px 2px 0 0;
        }
        .tab-badge {
          background: rgba(239, 68, 68, 0.25);
          border: 1px solid #ef4444;
          color: #fca5a5;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 700;
        }
        @media (max-width: 900px) {
          .hide-on-mobile { display: none; }
          .api-btn-text { display: none; }
          .brand-subtitle { display: none; }
        }
      `}</style>
    </header>
  );
}
