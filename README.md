# AeroDrive — Smart Vehicle Robotics & Drones Platform

**AeroDrive** is a futuristic, intelligent automation platform demonstrating how an **Unmanned Ground Vehicle (UGV)** and an **Unmanned Aerial Vehicle (UAV Drone)** collaborate in real time to inspect road infrastructure, detect obstacles, profile asphalt defects, and flag hazards.

---

## ⚡ Key Highlights & Design Aesthetic

- **Theme**: Sleek cyber dark navy (`#050811`, `#080e1e`) accented with luminous electric blue (`#00f0ff`, `#0088ff`), safety amber (`#f59e0b`), and alert crimson (`#ef4444`).
- **Typography**: Google Fonts pairing Orbitron (HUD metrics), Space Grotesk (headers), JetBrains Mono (telemetry streams), and Inter (content).
- **Audio Synthesizer**: Built-in HTML5 Web Audio API synthesizing futuristic HUD sound effects (radar ping, mission start sweep, hazard alert chirp) with zero audio file dependencies and a 1-click mute toggle.
- **High-Fidelity Assets**: Generated photorealistic UGV rover scanning, UAV aerial drone recon, and road hazard detection imagery (potholes with depth contours, alligator cracks, lane debris).

---

## 🛠️ System Architecture & Core Sections

### 1. Live Dashboard (`src/components/LiveDashboard.jsx`)
- **KPI Summary**: Distance inspected, total road area surveyed ($m^2$), detected hazard count, and Pavement Condition Index (PCI).
- **UGV Titan-01 Rover Telemetry**: Battery voltage/drain, speed (km/h), wheel RPM, 32-beam LIDAR point-cloud throughput (340k pts/sec), and RTK-GPS centimeter fix.
- **UAV SkyEye-04 Drone Telemetry**: Battery level with RTH guard threshold, altitude AGL (meters), 4K downward gimbal pitch angle, wind resistance, and loiter flight modes.
- **Live AI HUD Camera Feed**: Simulated real-time 45 FPS canvas video stream with optical RGB vs FLIR thermal false-color toggle, artificial horizon ladder, and animated YOLO bounding boxes.
- **Swarm Telemetry Tele-Log**: Real-time auto-scrolling terminal capturing chronological telemetry alerts.

### 2. Interactive Mission Controls (`src/components/MissionControls.jsx`)
- **Actions**: `Start Autonomous Mission`, `Pause Mission`, `Resume Trajectory`, `Abort Patrol`, and `Reset Waypoints`.
- **Simulation Rates**: 1x real-time, 2x fast-recon, and 4x rapid-survey.
- **Sector Presets**: Sector 4 Tech Corridor & Grand Ave (2.4 km) vs Sector 9 Coastal Expressway Span (4.8 km).
- **Interactive Anomaly Injection**: "Simulate Anomaly" button triggers real-time obstacle discoveries at the vehicle's exact current GPS coordinates.
- **Global E-STOP**: Emergency actuator shutdown cutoff button in the header.

### 3. Interactive Tactical Route Map (`src/components/TacticalMap.jsx`)
- **Vector Canvas Map**: Renders asphalt road geometry, waypoint pins (`WP-1` to `WP-6`), and scanned vs upcoming route paths.
- **Ground Robot Tracker**: Rover body with direction arrow and animated sweeping LIDAR laser fan beam.
- **Aerial Drone Tracker**: High-altitude hovering hexacopter with altitude ground shadow and animated pulsing radar sweeps.
- **Interactive Hazard Pins**: Discovered potholes, cracks, and debris appear with popover cards showing confidence, coordinates, and photo snapshots.
- **Layer Controls**: Toggle LIDAR Beam, Flight Corridor, Hazard Pins, and Tactical Coordinate Grid.

### 4. Collaborative Automation Workflow (`src/components/AutomationWorkflow.jsx`)
Visual 6-stage pipeline reflecting live mission progression:
1. **Start Mission**: Mission planning, pre-flight diagnostics, RTK lock.
2. **Ground Robot Navigation**: Autonomous rover traversal, 3D LIDAR surface profiling.
3. **Drone Aerial Scan**: 28m altitude reconnaissance, forward corridor inspection.
4. **AI Hazard Detection**: Dual-stream edge YOLOv8 segmentation on Jetson AGX.
5. **Dashboard Alert & Sync**: Sub-second 5G NR mesh uplink with geo-bounding boxes.
6. **Human Verification**: Operator triage, false-positive dismissal, automated work-order generation.
- Click any stage to inspect the technical hardware specifications and sample JSON telemetry payloads.

### 5. AI Detection Panel (`src/components/AiDetectionPanel.jsx`)
- **Filterable Gallery**: Filter by All, Critical, Potholes, Structural Cracks, Debris, and Needs Verification.
- **Hazard Cards**: High-res inspection imagery, confidence scores (e.g. 96.8%), geometric dimensions (Length x Width x Depth), GPS coordinates, and traffic impact analysis.
- **Human Triage**: Buttons to `Verify Hazard` or `Dismiss False Positive`.
- **Automated Work-Orders**: 1-click `Dispatch Repair Crew` generates municipal repair tickets.
- **GIS Export**: 1-click `Export GeoJSON` for integration into municipal GIS software (ArcGIS, QGIS).
- **High-Res Inspection Modal**: Expanded view with depth contour profiles and defect telemetry.

### 6. Inspection Reports & Analytics (`src/components/InspectionReports.jsx`)
- **Dynamic IRI Graph**: Canvas chart displaying road roughness profile (IRI m/km) along the route distance with hazard peaks.
- **Hazard Breakdown**: Visual percentage split of potholes (45%), cracks (35%), and foreign debris (20%).
- **Completed Missions Archive**: Historical table with search filter and CSV export.
- **Official Municipal Audit Certificate**: Formal printable/exportable report modal with DOT agency headers and defect schedule.

### 7. Diagnostics & Scenario Simulator (`src/components/DiagnosticsPanel.jsx`, `FaultInjectionPanel.jsx`)
- **System Observability**: Live health tracking of Backend, Persistent Storage (localStorage), Edge Detection AI, and UGV/UAV adapters with telemetry stale detection.
- **Scenario Fault Injection**: Development simulator to inject UGV/UAV comm loss, critical battery states, path obstructions, camera/LIDAR failures, and detection service dropouts.

### 8. Hardware & API Architecture (`src/components/HardwareIntegrationModal.jsx`)
Ready-to-use code integration templates:
- **ROS 2 Ground Rover Node** (`/ugv/cmd_vel`, `/ugv/odom`, `/ugv/battery`)
- **PX4 / MAVLink UAV Drone Uplink** (`GLOBAL_POSITION_INT`, `MAV_CMD_DO_SET_SERVO`)
- **NVIDIA Jetson Edge AI Pipeline** (YOLOv8 TensorRT engine)
- **AeroDrive Telemetry JSON Schema** (WebSocket / MQTT contract)

---

## 🧪 Automated Testing Suite

The system includes 17 automated unit and integration tests implementing requirements 15 through 31:
- Validated state machine transitions (IDLE, PREPARING, RUNNING, PAUSED, COMPLETED, ABORTED).
- Command idempotency and duplicate request suppression.
- Preflight readiness checklist enforcement.
- Low-battery RTH fail-safe response.
- Stale telemetry and communication loss detection.
- Persistent hazard verification with human audit history.
- Refresh recovery without duplicate actions.
- Physical hardware actuation boundaries and timeout handling.

To run the automated tests:
```bash
npm test
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18 or newer recommended)
- npm

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Run automated tests
npm test

# 3. Start local development server
npm run dev

# 4. Open browser at:
http://localhost:3000/
```

### Production Bundle
```bash
npm run build
npm run preview
```

---

## 🛡️ Simulation vs Hardware Boundary Notice
AeroDrive clearly distinguishes between simulation and physical hardware mode:
- All telemetry, video feeds, and sensor metrics in default mode are simulated.
- Physical hardware actuation requires validated adapter authentication, operating envelope checks, and hardware acknowledgements. Browser commands never directly bypass robot safety controllers or hardware E-STOP circuits.

