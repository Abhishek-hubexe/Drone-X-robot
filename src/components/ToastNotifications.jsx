import React from 'react';
import { useMission } from '../context/MissionContext';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function ToastNotifications() {
  const { toasts } = useMission();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container font-mono">
      {toasts.map(toast => {
        let Icon = Info;
        let toastClass = 'info';
        if (toast.type === 'warning') {
          Icon = AlertTriangle;
          toastClass = 'warning';
        } else if (toast.type === 'danger') {
          Icon = ShieldAlert;
          toastClass = 'danger';
        } else if (toast.type === 'success') {
          Icon = CheckCircle2;
          toastClass = 'success';
        }

        return (
          <div key={toast.id} className={`hud-toast ${toastClass} hud-panel`}>
            <div className="toast-icon">
              <Icon size={18} />
            </div>
            <div className="toast-content">
              <strong className="toast-title">{toast.title}</strong>
              <span className="toast-msg font-sans">{toast.message}</span>
            </div>
          </div>
        );
      })}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
          pointer-events: none;
        }
        .hud-toast {
          pointer-events: auto;
          min-width: 300px;
          max-width: 420px;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(9, 15, 32, 0.95);
          backdrop-filter: blur(14px);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hud-toast.info {
          border: 1px solid var(--neon-cyan);
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
        }
        .hud-toast.info .toast-icon {
          color: var(--neon-cyan);
        }
        .hud-toast.warning {
          border: 1px solid var(--status-amber);
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
        }
        .hud-toast.warning .toast-icon {
          color: var(--status-amber);
        }
        .hud-toast.danger {
          border: 1px solid var(--status-crimson);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }
        .hud-toast.danger .toast-icon {
          color: var(--status-crimson);
        }
        .hud-toast.success {
          border: 1px solid var(--status-emerald);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }
        .hud-toast.success .toast-icon {
          color: var(--status-emerald);
        }
        .toast-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .toast-title {
          font-size: 0.82rem;
          color: #ffffff;
        }
        .toast-msg {
          font-size: 0.76rem;
          color: var(--text-muted);
          line-height: 1.3;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
