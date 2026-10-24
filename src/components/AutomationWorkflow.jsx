import React, { useState } from 'react';
import { useMission } from '../context/MissionContext';
import { WORKFLOW_STAGES } from '../data/mockData';
import { 
  PlayCircle, 
  Bot, 
  Plane, 
  Cpu, 
  BellRing, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  Code2, 
  Info 
} from 'lucide-react';

export default function AutomationWorkflow() {
  const { currentStageNumber, missionStatus, progress } = useMission();
  const [selectedStage, setSelectedStage] = useState(WORKFLOW_STAGES[0]);

  const stageIcons = {
    1: PlayCircle,
    2: Bot,
    3: Plane,
    4: Cpu,
    5: BellRing,
    6: UserCheck
  };

  const stagePayloads = {
    1: {
      action: 'INITIALIZE_PATROL',
      swarm_id: 'AERO_SWARM_ALPHA_01',
      rtk_gps_sync: { hdop: 0.8, status: 'CENTIMETRIC_LOCKED' },
      mesh_channel: '5.8GHz_WPA3_CH44',
      preflight_check: 'PASS'
    },
    2: {
      topic: '/ugv/cmd_vel_autonomous',
      linear_velocity: 5.1, // m/s (~18 km/h)
      lidar_scan_freq: '20Hz_32Beam',
      ultrasonic_proximity_front: 'CLEAR_45m',
      chassis_health: 'NORMAL'
    },
    3: {
      mavlink_command: 'MAV_CMD_DO_SET_SERVO',
      uav_altitude_agl: 28.4,
      uav_lead_distance_rover: 38.0,
      downward_gimbal_deg: -30.0,
      sensor_stream: 'RTSP_H265_4K_THERMAL'
    },
    4: {
      model: 'YOLOv8x_RoadDamage_Seg',
      inference_time_ms: 22.4,
      bounding_boxes: [
        { label: 'pothole', conf: 0.968, depth_est_cm: 14.2 },
        { label: 'crack_alligator', conf: 0.914, length_m: 2.1 }
      ],
      edge_device: 'NVIDIA Jetson AGX Orin 64GB'
    },
    5: {
      alert_id: 'ALT-8849',
      priority: 'CRITICAL',
      geo_tag: { lat: 37.7774, lng: -122.4151 },
      mqtt_topic: 'aerodrive/telemetry/hazard/critical',
      uplink_latency_ms: 18.2
    },
    6: {
      work_order_id: 'WO-2026-CITY-991',
      operator_id: 'OP-412_CIVIL_ENG',
      repair_category: 'ASPHALT_COLD_PATCH_URGENT',
      estimated_materials: '45kg Polymer Cold Mix',
      contractor_dispatched: true
    }
  };

  return (
    <div className="workflow-section hud-panel hud-corner">
      {/* Workflow Section Header */}
      <div className="workflow-header">
        <div>
          <h3 className="section-title font-display">Collaborative Automation Workflow</h3>
          <p className="section-desc">
            Autonomous multi-tier pipeline connecting ground robotic rovers, aerial recon drones, edge AI neural networks, and tele-operators.
          </p>
        </div>
        <div className="status-tracker font-mono">
          <span>Active Phase:</span>
          <strong className="text-cyan">Stage {currentStageNumber} of 6</strong>
        </div>
      </div>

      {/* Visual Pipeline Stages Stepper */}
      <div className="stages-pipeline-track">
        {WORKFLOW_STAGES.map((s, index) => {
          const Icon = stageIcons[s.stage];
          const isCurrent = currentStageNumber === s.stage;
          const isDone = currentStageNumber > s.stage;
          const isSelected = selectedStage.stage === s.stage;

          return (
            <React.Fragment key={s.stage}>
              <div 
                className={`stage-card ${isCurrent ? 'active-stage' : ''} ${isDone ? 'completed-stage' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedStage(s)}
              >
                <div className="stage-top-meta">
                  <span className="stage-badge font-mono">{s.badge}</span>
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-emerald" />
                  ) : isCurrent ? (
                    <span className="pulse-dot active"></span>
                  ) : (
                    <span className="stage-dot-idle"></span>
                  )}
                </div>

                <div className="stage-icon-circle">
                  <Icon size={22} />
                </div>

                <h4 className="stage-title">{s.title}</h4>
                <p className="stage-sub">{s.subtitle}</p>
                <span className="stage-vehicle font-mono">{s.vehicleInvolved}</span>

                {isCurrent && <div className="active-glow-beam"></div>}
              </div>

              {index < WORKFLOW_STAGES.length - 1 && (
                <div className={`stage-connector ${isDone ? 'done' : isCurrent ? 'animating' : ''}`}>
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Detailed Technical Deep-Dive for Selected Stage */}
      <div className="stage-detail-panel hud-panel">
        <div className="detail-col-info">
          <div className="detail-badge-group">
            <span className="badge badge-active font-mono">{selectedStage.badge}</span>
            <span className="badge badge-simulated font-mono">{selectedStage.duration} Mission Trajectory</span>
          </div>
          <h3 className="detail-title font-display">{selectedStage.title}</h3>
          <h4 className="detail-subtitle">{selectedStage.subtitle}</h4>
          <p className="detail-paragraph">{selectedStage.description}</p>

          <div className="detail-hardware-box">
            <span className="box-title font-mono">
              <Code2 size={14} className="text-cyan" /> Hardware & API Endpoints:
            </span>
            <code className="api-code font-mono">{selectedStage.hardwareApi}</code>
          </div>
        </div>

        {/* Real Sample JSON Telemetry Payload */}
        <div className="detail-col-payload font-mono">
          <div className="payload-header">
            <Terminal size={14} className="text-cyan" />
            <span>Sample Edge Telemetry Message ({selectedStage.badge})</span>
          </div>
          <pre className="json-code-block">
            {JSON.stringify(stagePayloads[selectedStage.stage], null, 2)}
          </pre>
        </div>
      </div>

      <style>{`
        .workflow-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .workflow-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
          padding-bottom: 16px;
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
        .status-tracker {
          background: rgba(8, 14, 30, 0.9);
          border: 1px solid var(--border-glow);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.82rem;
          display: flex;
          gap: 6px;
        }
        .stages-pipeline-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 4px 18px 4px;
        }
        .stage-card {
          flex: 1;
          min-width: 175px;
          background: rgba(10, 18, 38, 0.7);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          position: relative;
          transition: all var(--transition-fast);
        }
        .stage-card:hover {
          border-color: var(--border-bright);
          transform: translateY(-2px);
        }
        .stage-card.selected {
          border-color: var(--neon-cyan);
          background: rgba(14, 25, 52, 0.9);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
        }
        .stage-card.active-stage {
          border-color: var(--neon-cyan);
          background: rgba(0, 140, 255, 0.12);
        }
        .stage-card.completed-stage {
          border-color: rgba(16, 185, 129, 0.35);
        }
        .stage-top-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stage-badge {
          font-size: 0.68rem;
          color: var(--text-dim);
          font-weight: 700;
        }
        .stage-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.25);
          color: var(--neon-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stage-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
        }
        .stage-sub {
          font-size: 0.74rem;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .stage-vehicle {
          font-size: 0.7rem;
          color: var(--sky-blue);
          margin-top: auto;
        }
        .stage-dot-idle {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
        }
        .stage-connector {
          color: var(--text-dim);
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .stage-connector.done {
          color: var(--status-emerald);
        }
        .stage-connector.animating {
          color: var(--neon-cyan);
          animation: pulse-ring 1.5s infinite;
        }
        .active-glow-beam {
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 3px;
          background: var(--neon-cyan);
          box-shadow: 0 0 10px var(--neon-cyan);
          border-radius: 3px 3px 0 0;
        }
        .stage-detail-panel {
          padding: 22px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          background: rgba(8, 14, 30, 0.95);
        }
        .detail-col-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detail-badge-group {
          display: flex;
          gap: 8px;
        }
        .detail-title {
          font-size: 1.35rem;
          color: #ffffff;
        }
        .detail-subtitle {
          font-size: 0.92rem;
          color: var(--neon-cyan);
          font-weight: 500;
        }
        .detail-paragraph {
          font-size: 0.88rem;
          color: var(--text-main);
          line-height: 1.6;
        }
        .detail-hardware-box {
          background: rgba(5, 8, 17, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .box-title {
          font-size: 0.74rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .api-code {
          color: var(--neon-cyan);
          font-size: 0.78rem;
        }
        .detail-col-payload {
          background: rgba(5, 8, 17, 0.9);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .payload-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-muted);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 6px;
        }
        .json-code-block {
          color: #38bdf8;
          font-size: 0.76rem;
          overflow-x: auto;
          line-height: 1.45;
        }
        @media (max-width: 900px) {
          .stage-detail-panel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
