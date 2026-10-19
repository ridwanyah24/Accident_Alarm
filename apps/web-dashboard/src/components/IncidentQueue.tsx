import React from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';

interface IncidentQueueProps {
  incidents: ApiContracts.IncidentStaffDetailResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (val: string) => void;
  verificationFilter: string;
  onVerificationFilterChange: (val: string) => void;
}

export const IncidentQueue: React.FC<IncidentQueueProps> = ({
  incidents,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  verificationFilter,
  onVerificationFilterChange
}) => {
  const filtered = incidents.filter(inc => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.reporterSeverity !== severityFilter) return false;
    if (verificationFilter && inc.verificationState !== verificationFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchRef = inc.referenceCode.toLowerCase().includes(q);
      const matchLoc = inc.location.landmarkOrAddress?.toLowerCase().includes(q) || false;
      const matchDesc = inc.description?.toLowerCase().includes(q) || false;
      if (!matchRef && !matchLoc && !matchDesc) return false;
    }
    return true;
  });

  const formatTimeAgo = (isoString: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by ref, street, or description..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.values(ApiContracts.IncidentStatus).map(s => (
            <option key={s} value={s}>{ApiContracts.mapInternalToPublicStatus(s)}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={severityFilter}
          onChange={e => onSeverityFilterChange(e.target.value)}
        >
          <option value="">All Severities</option>
          {Object.values(ApiContracts.ReporterSeverity).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={verificationFilter}
          onChange={e => onVerificationFilterChange(e.target.value)}
        >
          <option value="">All Verification</option>
          {Object.values(ApiContracts.VerificationState).map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Incident List */}
      <div className="incident-list-container">
        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No incident reports found matching current filters.
          </div>
        ) : (
          filtered.map(inc => {
            const isSelected = inc.id === selectedId;
            const borderClass =
              inc.reporterSeverity === ApiContracts.ReporterSeverity.CRITICAL
                ? 'critical-border'
                : inc.reporterSeverity === ApiContracts.ReporterSeverity.SERIOUS
                ? 'serious-border'
                : '';

            return (
              <div
                key={inc.id}
                className={`glass-panel incident-card ${isSelected ? 'selected' : ''} ${borderClass}`}
                onClick={() => onSelect(inc.id)}
              >
                <div className="card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ref-code">{inc.referenceCode}</span>
                    {inc.verificationState === ApiContracts.VerificationState.PENDING && (
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}
                      >
                        UNVERIFIED
                      </span>
                    )}
                  </div>
                  <span className="time-ago">{formatTimeAgo(inc.receivedAt)}</span>
                </div>

                <div className="badge-row">
                  <span className={`status-badge status-${inc.status}`}>
                    {ApiContracts.mapInternalToPublicStatus(inc.status)}
                  </span>
                  <span className={`status-badge severity-${inc.reporterSeverity}`}>
                    {inc.reporterSeverity}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {inc.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="card-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{inc.location.landmarkOrAddress || `${inc.location.latitude.toFixed(4)}, ${inc.location.longitude.toFixed(4)} (${inc.location.source})`}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
