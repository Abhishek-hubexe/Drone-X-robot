import React, { useState } from 'react';
import { MissionProvider } from './context/MissionContext';
import Header from './components/Header';
import MissionControls from './components/MissionControls';
import LiveDashboard from './components/LiveDashboard';
import TacticalMap from './components/TacticalMap';
import AutomationWorkflow from './components/AutomationWorkflow';
import AiDetectionPanel from './components/AiDetectionPanel';
import InspectionReports from './components/InspectionReports';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import FaultInjectionPanel from './components/FaultInjectionPanel';
import HardwareIntegrationModal from './components/HardwareIntegrationModal';
import ToastNotifications from './components/ToastNotifications';
import Footer from './components/Footer';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiModalOpen, setApiModalOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Top Futuristic Navigation */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenApiModal={() => setApiModalOpen(true)}
      />

      {/* Main App Workspace */}
      <main className="container main-content-area">
        {/* Persistent Swarm Mission Controls */}
        <MissionControls />

        {/* Tab Content Panes */}
        {activeTab === 'dashboard' && (
          <LiveDashboard 
            onNavigateToHazards={() => setActiveTab('ai-detection')}
          />
        )}

        {activeTab === 'map' && (
          <TacticalMap 
            onSelectHazard={(hazard) => {}}
          />
        )}

        {activeTab === 'workflow' && (
          <AutomationWorkflow />
        )}

        {activeTab === 'ai-detection' && (
          <AiDetectionPanel />
        )}

        {activeTab === 'reports' && (
          <InspectionReports />
        )}

        {activeTab === 'diagnostics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DiagnosticsPanel />
            <FaultInjectionPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer onOpenApiModal={() => setApiModalOpen(true)} />

      {/* Hardware & API Guide Modal */}
      <HardwareIntegrationModal 
        isOpen={apiModalOpen} 
        onClose={() => setApiModalOpen(false)} 
      />

      {/* Real-time In-App HUD Toast Alerts */}
      <ToastNotifications />

      <style>{`
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .main-content-area {
          flex: 1;
          padding-top: 24px;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <MissionProvider>
      <MainAppContent />
    </MissionProvider>
  );
}
