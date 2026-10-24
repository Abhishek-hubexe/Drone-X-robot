import React, { useState } from 'react';
import { 
  Bot, 
  Plane, 
  Cpu, 
  Network, 
  Terminal, 
  Copy, 
  Check, 
  BookOpen, 
  X 
} from 'lucide-react';

export default function HardwareIntegrationModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ros2');
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const ros2Code = `# ROS 2 (Humble/Iron) Node for UGV Titan-01 Telemetry Bridge
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import PointCloud2, BatteryState
import json, asyncio, websockets

class AeroDriveUgvBridge(Node):
    def __init__(self):
        super().__init__('aerodrive_ugv_bridge')
        self.cmd_pub = self.create_publisher(Twist, '/ugv/cmd_vel', 10)
        self.odom_sub = self.create_subscription(Odometry, '/ugv/odom', self.odom_callback, 10)
        self.battery_sub = self.create_subscription(BatteryState, '/ugv/battery', self.bat_callback, 10)
        self.get_logger().info('AeroDrive UGV Hardware Telemetry Bridge Activated.')

    def odom_callback(self, msg):
        pos = msg.pose.pose.position
        telemetry = {
            "type": "UGV_TELEMETRY",
            "lat_offset": pos.x,
            "lng_offset": pos.y,
            "speed_kmh": msg.twist.twist.linear.x * 3.6
        }
        # Broadcast over WebSocket / MQTT to AeroDrive Dashboard
        # websocket.send(json.dumps(telemetry))

    def bat_callback(self, msg):
        self.battery_pct = msg.percentage * 100.0

def main():
    rclpy.init()
    node = AeroDriveUgvBridge()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
`;

  const mavlinkCode = `# Python MAVLink / DroneKit Telemetry Uplink for UAV SkyEye-04
from pymavlink import mavutil
import time, json

# Connect to Pixhawk / PX4 flight controller via serial or telemetry radio
connection = mavutil.mavlink_connection('/dev/ttyUSB0', baud=57600)
connection.wait_heartbeat()
print(f"Connected to UAV Drone (System {connection.target_system})")

# Request Telemetry Data Stream (20 Hz)
connection.mav.request_data_stream_send(
    connection.target_system,
    connection.target_component,
    mavutil.mavlink.MAV_DATA_STREAM_ALL,
    20, 1
)

while True:
    msg = connection.recv_match(blocking=True)
    if msg.get_type() == 'GLOBAL_POSITION_INT':
        telemetry = {
            "vehicle": "UAV_SKYEYE",
            "lat": msg.lat / 1e7,
            "lng": msg.lon / 1e7,
            "alt_m": msg.relative_alt / 1000.0,
            "vx_ms": msg.vx / 100.0,
            "vy_ms": msg.vy / 100.0
        }
        # Ingest into AeroDrive Central Mission Engine
    time.sleep(0.05)
`;

  const yoloCode = `# Edge AI Inference Pipeline (NVIDIA Jetson AGX Orin)
from ultralytics import YOLO
import cv2, json

# Load optimized TensorRT Road Defect Segmentation model
model = YOLO('aerodrive_road_yolov8x_seg.engine')

# Ingest 4K RTSP stream from UGV front camera
cap = cv2.VideoCapture("rtsp://192.168.1.120:8554/front_camera")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break

    results = model.predict(frame, conf=0.75, iou=0.45)
    for r in results:
        for box in r.boxes:
            hazard_cls = model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            coords = box.xyxy[0].tolist()
            # Publish alert payload when confidence exceeds threshold
            if conf > 0.85:
                publish_alert(hazard_cls, conf, coords)
`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="api-modal-card hud-panel" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <BookOpen size={20} className="text-cyan" />
            <h3 className="modal-title font-display">Hardware Architecture & Real-Device Integration Guide</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="api-tabs-bar">
          <button 
            onClick={() => setActiveTab('ros2')}
            className={`api-tab-btn font-mono ${activeTab === 'ros2' ? 'active' : ''}`}
          >
            <Bot size={15} /> 1. ROS 2 Ground Rover Node
          </button>
          <button 
            onClick={() => setActiveTab('mavlink')}
            className={`api-tab-btn font-mono ${activeTab === 'mavlink' ? 'active' : ''}`}
          >
            <Plane size={15} /> 2. PX4 / MAVLink UAV Drone
          </button>
          <button 
            onClick={() => setActiveTab('yolo')}
            className={`api-tab-btn font-mono ${activeTab === 'yolo' ? 'active' : ''}`}
          >
            <Cpu size={15} /> 3. Edge AI (YOLOv8 + Jetson)
          </button>
          <button 
            onClick={() => setActiveTab('mqtt')}
            className={`api-tab-btn font-mono ${activeTab === 'mqtt' ? 'active' : ''}`}
          >
            <Network size={15} /> 4. Telemetry Schema
          </button>
        </div>

        {/* Code & Documentation Body */}
        <div className="api-modal-body">
          {activeTab === 'ros2' && (
            <div className="code-view-container">
              <div className="code-view-header">
                <span className="file-tag font-mono">aerodrive_ugv_bridge.py (ROS 2 Humble / Iron)</span>
                <button 
                  onClick={() => handleCopy('ros2', ros2Code)}
                  className="copy-btn font-mono"
                >
                  {copiedKey === 'ros2' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copiedKey === 'ros2' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="code-block font-mono">{ros2Code}</pre>
            </div>
          )}

          {activeTab === 'mavlink' && (
            <div className="code-view-container">
              <div className="code-view-header">
                <span className="file-tag font-mono">uav_mavlink_uplink.py (PX4 / ArduPilot)</span>
                <button 
                  onClick={() => handleCopy('mavlink', mavlinkCode)}
                  className="copy-btn font-mono"
                >
                  {copiedKey === 'mavlink' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copiedKey === 'mavlink' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="code-block font-mono">{mavlinkCode}</pre>
            </div>
          )}

          {activeTab === 'yolo' && (
            <div className="code-view-container">
              <div className="code-view-header">
                <span className="file-tag font-mono">jetson_road_inference.py (TensorRT YOLOv8)</span>
                <button 
                  onClick={() => handleCopy('yolo', yoloCode)}
                  className="copy-btn font-mono"
                >
                  {copiedKey === 'yolo' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copiedKey === 'yolo' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="code-block font-mono">{yoloCode}</pre>
            </div>
          )}

          {activeTab === 'mqtt' && (
            <div className="schema-view font-mono">
              <h4 className="schema-title text-cyan">AeroDrive JSON Telemetry Ingestion Contract</h4>
              <p className="schema-desc font-sans">
                Real hardware bridges can pipe telemetry payloads directly into the AeroDrive frontend by connecting to the local WebSocket or MQTT endpoint:
              </p>
              <pre className="code-block">
{`// Topic: aerodrive/swarm/telemetry/sync
{
  "timestamp": "2026-10-23T14:30:15.200Z",
  "swarm_id": "AERO-01",
  "ugv": {
    "status": "CRUISING",
    "speed_kmh": 18.4,
    "battery_pct": 94,
    "heading_deg": 48.2,
    "gps": { "lat": 37.7774, "lng": -122.4151, "rtk_fixed": true },
    "lidar_pts_sec": 340000
  },
  "uav": {
    "flight_mode": "FORWARD_RECON",
    "altitude_m": 28.5,
    "battery_pct": 89,
    "gimbal_pitch_deg": -30.0,
    "wind_resistance_ms": 3.2
  }
}`}
              </pre>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .api-modal-card {
          width: 100%;
          max-width: 920px;
          background: #090e1e;
          border: 1px solid var(--neon-cyan);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
          max-height: 90vh;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
          padding-bottom: 12px;
        }
        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-title {
          font-size: 1.15rem;
          color: #ffffff;
        }
        .api-tabs-bar {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
          overflow-x: auto;
        }
        .api-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .api-tab-btn.active {
          background: rgba(0, 240, 255, 0.15);
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
        }
        .api-modal-body {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .code-view-container {
          background: #050811;
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .code-view-header {
          background: rgba(13, 23, 46, 0.9);
          padding: 8px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(56, 189, 248, 0.15);
        }
        .file-tag {
          font-size: 0.74rem;
          color: var(--neon-cyan);
        }
        .copy-btn {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.72rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .code-block {
          padding: 16px;
          color: #94a3b8;
          font-size: 0.78rem;
          line-height: 1.5;
          overflow-x: auto;
        }
        .schema-view {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .schema-title {
          font-size: 0.95rem;
        }
        .schema-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
