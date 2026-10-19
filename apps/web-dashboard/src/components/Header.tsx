import React from 'react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenReportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenReportModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      {/* Verified Emergency Notice Banner */}
      <div className="emergency-disclaimer-banner">
        <span className="disclaimer-tag">Emergency Advisory</span>
        <span>
          This application is an incident reporting and coordination aid. For life-threatening emergencies, contact your verified local emergency service directly.
        </span>
      </div>

      <div className="header-main">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="brand-title-group">
            <h1>
              AccidentAlarm Operations
              <span className="badge-live">
                <span className="pulse-dot"></span> LIVE CAD
              </span>
            </h1>
            <p>Road Accident Triage, Verification & Emergency Coordination System</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-danger report-accident-btn"
            onClick={onOpenReportModal}
            title="Simulate a new citizen accident report submission"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>+ Report Accident</span>
          </button>

          {user && (
            <div className="user-profile">
              <div className="user-profile-text">
                <div className="user-profile-name">{user.fullName}</div>
                <div className="user-profile-meta">
                  {user.agencyName || user.role}
                </div>
              </div>
              <button
                className="btn btn-secondary sign-out-btn"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
