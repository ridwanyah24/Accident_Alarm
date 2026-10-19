import React from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';

interface MetricsBarProps {
  incidents: ApiContracts.IncidentStaffDetailResponse[];
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ incidents }) => {
  const activeCount = incidents.filter(i => ![ApiContracts.IncidentStatus.RESOLVED, ApiContracts.IncidentStatus.CLOSED, ApiContracts.IncidentStatus.CANCELLED].includes(i.status)).length;
  const criticalCount = incidents.filter(i => i.reporterSeverity === ApiContracts.ReporterSeverity.CRITICAL || i.operationalPriority === 'CRITICAL').length;
  const unverifiedCount = incidents.filter(i => i.verificationState === ApiContracts.VerificationState.PENDING || i.verificationState === ApiContracts.VerificationState.UNVERIFIED).length;
  const dispatchedCount = incidents.filter(i => [ApiContracts.IncidentStatus.ASSIGNED, ApiContracts.IncidentStatus.EN_ROUTE, ApiContracts.IncidentStatus.ON_SCENE].includes(i.status)).length;

  return (
    <div className="metrics-grid">
      <div className="glass-panel metric-card">
        <div className="metric-header">
          <span>Active Incidents</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div className="metric-value" style={{ color: '#38bdf8' }}>{activeCount}</div>
        <div className="metric-sub">Open coordination queues</div>
      </div>

      <div className="glass-panel metric-card">
        <div className="metric-header">
          <span>Critical Severity</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="metric-value" style={{ color: '#ef4444' }}>{criticalCount}</div>
        <div className="metric-sub">Life-threatening or major road hazard</div>
      </div>

      <div className="glass-panel metric-card">
        <div className="metric-header">
          <span>Awaiting Verification</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div className="metric-value" style={{ color: '#f59e0b' }}>{unverifiedCount}</div>
        <div className="metric-sub">Needs dispatcher review & triage</div>
      </div>

      <div className="glass-panel metric-card">
        <div className="metric-header">
          <span>Active Dispatches</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div className="metric-value" style={{ color: '#10b981' }}>{dispatchedCount}</div>
        <div className="metric-sub">Responders en route or on scene</div>
      </div>
    </div>
  );
};
