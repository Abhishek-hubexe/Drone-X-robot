// AeroDrive Realistic Simulated Datasets & Mission Presets

export const MISSION_PRESETS = [
  {
    id: 'route_alpha',
    name: 'Sector 4: Tech Corridor & Grand Ave',
    roadType: 'Urban Arterial Highway',
    totalDistanceKm: 2.4,
    targetAreaSqm: 48000,
    speedLimitKmh: 45,
    description: 'High-traffic commercial boulevard with frequent heavy axle loading and asphalt wear.',
    waypoints: [
      { id: 'wp-1', name: 'Depot Gate Alpha', x: 80, y: 320, lat: 37.7749, lng: -122.4194 },
      { id: 'wp-2', name: '4th & Market Intersection', x: 200, y: 260, lat: 37.7762, lng: -122.4172 },
      { id: 'wp-3', name: 'Mission Bay Viaduct', x: 380, y: 220, lat: 37.7781, lng: -122.4138 },
      { id: 'wp-4', name: 'Central Boulevard Hub', x: 540, y: 240, lat: 37.7802, lng: -122.4105 },
      { id: 'wp-5', name: 'Harbor Transit Overpass', x: 700, y: 180, lat: 37.7825, lng: -122.4068 },
      { id: 'wp-6', name: 'East Pier Logistics Terminus', x: 840, y: 150, lat: 37.7850, lng: -122.4030 }
    ]
  },
  {
    id: 'route_beta',
    name: 'Sector 9: Coastal Expressway Span',
    roadType: 'Interstate Highway Span',
    totalDistanceKm: 4.8,
    targetAreaSqm: 96000,
    speedLimitKmh: 65,
    description: 'Coastal bridge highway subject to high salt mist corrosion and thermal expansion cracks.',
    waypoints: [
      { id: 'wp-10', name: 'Toll Plaza South', x: 60, y: 350, lat: 37.7910, lng: -122.4200 },
      { id: 'wp-11', name: 'Suspension Tower 1', x: 260, y: 290, lat: 37.7940, lng: -122.4140 },
      { id: 'wp-12', name: 'Mid-Span Joint Beta', x: 500, y: 240, lat: 37.7980, lng: -122.4080 },
      { id: 'wp-13', name: 'Suspension Tower 2', x: 690, y: 200, lat: 37.8020, lng: -122.4020 },
      { id: 'wp-14', name: 'North Pier Lookout', x: 860, y: 140, lat: 37.8060, lng: -122.3950 }
    ]
  }
];

export const INITIAL_HAZARDS = [
  {
    id: 'HAZ-4198',
    type: 'Pothole',
    category: 'surface_depression',
    title: 'Severe Asphalt Cavity (Depth > 14cm)',
    severity: 'critical', // critical, major, minor
    confidence: 96.8,
    lat: 37.7774,
    lng: -122.4151,
    detectedBy: 'UGV Titan-01 (LIDAR + Camera)',
    estimatedDimensions: '58cm x 42cm x 14.2cm',
    waterPresent: true,
    speedImpact: 'Requires immediate swerve; high blowout risk',
    timestamp: '10:14:22 AM',
    progressTrigger: 28, // triggers when mission progress >= 28%
    image: '/images/hazard_pothole.jpg',
    status: 'unverified', // unverified, verified, dismissed
    repairAssigned: false
  },
  {
    id: 'HAZ-4202',
    type: 'Structural Crack',
    category: 'pavement_fissure',
    title: 'Alligator Longitudinal Fissure Grid',
    severity: 'major',
    confidence: 91.4,
    lat: 37.7798,
    lng: -122.4112,
    detectedBy: 'UAV SkyEye-04 (Thermal/RGB)',
    estimatedDimensions: '210cm x 85cm x 2.4cm',
    waterPresent: false,
    speedImpact: 'Long-term structural fatigue; moisture seepage',
    timestamp: '10:17:48 AM',
    progressTrigger: 54,
    image: '/images/hazard_crack.jpg',
    status: 'unverified',
    repairAssigned: false
  },
  {
    id: 'HAZ-4215',
    type: 'Obstacle Debris',
    category: 'foreign_object',
    title: 'Blown Commercial Tire Tread in Lane 2',
    severity: 'critical',
    confidence: 98.2,
    lat: 37.7831,
    lng: -122.4055,
    detectedBy: 'Dual Swarm Triangulation',
    estimatedDimensions: '94cm x 35cm x 18cm',
    waterPresent: false,
    speedImpact: 'Direct lane obstruction; vehicular hazard',
    timestamp: '10:21:05 AM',
    progressTrigger: 78,
    image: '/images/hazard_debris.jpg',
    status: 'unverified',
    repairAssigned: false
  }
];

export const WORKFLOW_STAGES = [
  {
    stage: 1,
    id: 'stage-start',
    title: 'Start Mission',
    subtitle: 'Mission Planning & Self-Check',
    description: 'Autonomous pre-mission hardware handshake, RTK-GPS calibration, LIDAR spin-up, and swarm mesh frequency lock.',
    vehicleInvolved: 'Swarm Command',
    duration: '0 - 5%',
    badge: 'STAGE 01',
    hardwareApi: 'ROS2 /mission_control/initiate | MAVLink CMD_PREFLIGHT_STORAGE'
  },
  {
    stage: 2,
    id: 'stage-rover',
    title: 'Ground Robot Navigation',
    subtitle: 'Surface Profiling & Ultrasonic Scan',
    description: 'UGV Titan-01 crawls along pavement at 18 km/h using 32-channel Velodyne LIDAR and 4K stereoscopic cameras.',
    vehicleInvolved: 'UGV Titan-01 Rover',
    duration: '5 - 35%',
    badge: 'STAGE 02',
    hardwareApi: 'ROS2 /cmd_vel | /nav_msgs/Odometry | /velodyne_points'
  },
  {
    stage: 3,
    id: 'stage-drone',
    title: 'Drone Aerial Scan',
    subtitle: 'High-Altitude 4K Reconnaissance',
    description: 'UAV SkyEye-04 ascends to 28m altitude, flying 40m ahead of rover to preview blind spots, traffic blockages, and broad thermal fissures.',
    vehicleInvolved: 'UAV SkyEye-04 Drone',
    duration: '35 - 65%',
    badge: 'STAGE 03',
    hardwareApi: 'MAVLink HEARTBEAT | GLOBAL_POSITION_INT | RTSP H.265'
  },
  {
    stage: 4,
    id: 'stage-ai',
    title: 'AI Hazard Detection',
    subtitle: 'Dual-Stream Edge Neural Inference',
    description: 'On-board NVIDIA Jetson Orin runs optimized YOLOv8-Road segmentation model at 45 FPS to classify depth, crack length, and debris volume.',
    vehicleInvolved: 'Edge Jetson AGX',
    duration: '65 - 85%',
    badge: 'STAGE 04',
    hardwareApi: 'TensorRT Inference Engine | ONNX Runtime | OpenCV CUDA'
  },
  {
    stage: 5,
    id: 'stage-alert',
    title: 'Dashboard Alert & Sync',
    subtitle: 'Sub-Second Edge Telemetry Uplink',
    description: 'Telemetry broker broadcasts detected hazard geo-bounding boxes, confidence scores, and raw imagery to central operator dashboard via 5G NR mesh.',
    vehicleInvolved: '5G Mesh Broker',
    duration: '85 - 95%',
    badge: 'STAGE 05',
    hardwareApi: 'MQTT /telemetry/hazard/alert | WebSocket WSS Secure'
  },
  {
    stage: 6,
    id: 'stage-verify',
    title: 'Human Verification',
    subtitle: 'Operator Triage & Work Order',
    description: 'Civil engineer or operator verifies severity score, dismisses anomalies, and automatically dispatches automated road repair work order.',
    vehicleInvolved: 'Human-in-the-Loop',
    duration: '95 - 100%',
    badge: 'STAGE 06',
    hardwareApi: 'REST /api/v1/workorders/dispatch | GIS GeoJSON Export'
  }
];

export const HISTORICAL_MISSIONS = [
  {
    id: 'MSN-2026-089',
    name: 'Sector 4 Routine Pavement Audit',
    date: '2026-10-22',
    durationMinutes: 38,
    distanceKm: 3.2,
    hazardsFound: 7,
    criticalCount: 2,
    pciScore: 78, // Pavement Condition Index (0-100)
    batteryConsumedUgv: '28%',
    batteryConsumedUav: '42%',
    operator: 'Operator #412 (Verified)',
    status: 'Completed'
  },
  {
    id: 'MSN-2026-088',
    name: 'Interstate 80 Overpass Rapid Recon',
    date: '2026-10-21',
    durationMinutes: 24,
    distanceKm: 2.1,
    hazardsFound: 3,
    criticalCount: 1,
    pciScore: 84,
    batteryConsumedUgv: '19%',
    batteryConsumedUav: '31%',
    operator: 'Autonomous Verified',
    status: 'Completed'
  },
  {
    id: 'MSN-2026-087',
    name: 'Port Harbor Heavy Haul Route Audit',
    date: '2026-10-19',
    durationMinutes: 52,
    distanceKm: 4.5,
    hazardsFound: 12,
    criticalCount: 5,
    pciScore: 61,
    batteryConsumedUgv: '41%',
    batteryConsumedUav: '59%',
    operator: 'Operator #108 (Dispatched)',
    status: 'Completed'
  }
];
