import React from 'react';
import { Bot, Plane, ShieldCheck, Terminal, Cpu } from 'lucide-react';

export default function Footer({ onOpenApiModal }) {
  return (
    <footer className="footer-panel">
      <div className="container footer-content">
        <div className="footer-left">
          <div className="footer-brand font-hud">
            AERO<span className="glow-text-cyan">DRIVE</span>
          </div>
          <p className="footer-description font-sans">
            Intelligent collaborative robotics platform uniting autonomous ground rovers and aerial recon drones for high-precision civil infrastructure inspection and pothole hazard mitigation.
          </p>
          <div className="simulation-notice font-mono">
            <span className="pulse-dot online"></span>
            <span>HIGH-FIDELITY SIMULATION MODE — Ready for ROS 2 & MAVLink Physical Hardware Bridging</span>
          </div>
        </div>

        <div className="footer-links-group font-mono">
          <span className="footer-heading text-cyan">Platform Specifications</span>
          <div className="footer-spec-item">
            <Bot size={13} /> UGV: 32-Beam 3D LIDAR + RTK GPS
          </div>
          <div className="footer-spec-item">
            <Plane size={13} /> UAV: FLIR Thermal + 4K Optical Gimbal
          </div>
          <div className="footer-spec-item">
            <Cpu size={13} /> Edge AI: YOLOv8 Segmentation (Jetson Orin)
          </div>
          <button 
            onClick={onOpenApiModal}
            className="footer-api-link"
          >
            <Terminal size={13} /> View Hardware API Endpoints
          </button>
        </div>
      </div>

      <div className="footer-sub-bar font-mono">
        <div className="container sub-bar-flex">
          <span>AeroDrive Autonomous Systems © 2026. All Rights Reserved.</span>
          <span>Security Protocol: AES-256 Swarm Mesh Uplink Locked</span>
        </div>
      </div>

      <style>{`
        .footer-panel {
          margin-top: 60px;
          background: rgba(4, 7, 16, 0.95);
          border-top: 1px solid rgba(56, 189, 248, 0.12);
        }
        .footer-content {
          padding: 36px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 24px;
        }
        .footer-left {
          max-width: 580px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .footer-brand {
          font-size: 1.25rem;
          color: #ffffff;
          letter-spacing: 0.08em;
        }
        .footer-description {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .simulation-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 240, 255, 0.06);
          border: 1px solid rgba(0, 240, 255, 0.2);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          color: var(--neon-cyan);
        }
        .footer-links-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.76rem;
        }
        .footer-heading {
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .footer-spec-item {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-api-link {
          background: transparent;
          border: none;
          color: var(--sky-blue);
          text-decoration: underline;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 0.75rem;
          padding: 0;
          margin-top: 4px;
          text-align: left;
        }
        .footer-api-link:hover {
          color: var(--neon-cyan);
        }
        .footer-sub-bar {
          background: #02040a;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding: 12px 0;
          font-size: 0.7rem;
          color: var(--text-dim);
        }
        .sub-bar-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </footer>
  );
}
