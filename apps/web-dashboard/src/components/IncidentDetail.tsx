import React, { useState } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { useAuth } from '../context/AuthContext';

interface IncidentDetailProps {
  incident: ApiContracts.IncidentStaffDetailResponse;
  onOpenTriage: () => void;
  onOpenAssign: () => void;
  onUpdateStatus: (newStatus: ApiContracts.IncidentStatus, note?: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incident,
  onOpenTriage,
  onOpenAssign,
  onUpdateStatus,
  onAddNote
}) => {
  const { user, isDispatcher } = useAuth();
  const [internalNote, setInternalNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(internalNote.trim());
      setInternalNote('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = async (status: ApiContracts.IncidentStatus) => {
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isUnverified = incident.verificationState === ApiContracts.VerificationState.PENDING || incident.verificationState === ApiContracts.VerificationState.UNVERIFIED;

  return (
    <div className="glass-panel detail-panel">
      {/* Detail Header */}
      <div className="detail-header">
        <div className="detail-title-group">
          <h2>
            <span>Incident {incident.referenceCode}</span>
            <span className={`status-badge status-${incident.status}`}>
              {ApiContracts.mapInternalToPublicStatus(incident.status)}
            </span>
            <span className={`status-badge severity-${incident.reporterSeverity}`}>
              {incident.reporterSeverity}
            </span>
          </h2>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Received at {new Date(incident.receivedAt).toLocaleString()} ({incident.category.replace('_', ' ')})
          </div>
        </div>

        {/* Action Buttons for Dispatcher */}
        {isDispatcher && (
          <div className="detail-actions">
            <button className="btn btn-secondary" onClick={onOpenTriage}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Triage & Verify
            </button>
            <button className="btn btn-primary" onClick={onOpenAssign}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Assign Responders
            </button>
          </div>
        )}
      </div>

      {/* Unverified Warning Banner */}
      {isUnverified && (
        <div className="unverified-warning-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Unverified Public Submission:</strong> This report has not yet been verified by an operational coordinator. Verify details before dispatching emergency teams.
          </div>
        </div>
      )}

      {/* Operational Fast Lifecycle Progression */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {incident.status === ApiContracts.IncidentStatus.SUBMITTED && (
          <button
            className="btn btn-primary"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange(ApiContracts.IncidentStatus.ACKNOWLEDGED)}
          >
            Acknowledge Receipt
          </button>
        )}
        {incident.status === ApiContracts.IncidentStatus.ACKNOWLEDGED && (
          <button
            className="btn btn-primary"
            disabled={isUpdatingStatus}
            onClick={onOpenAssign}
          >
            Dispatch Response Team
          </button>
        )}
        {incident.status === ApiContracts.IncidentStatus.ASSIGNED && (
          <button
            className="btn btn-primary"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange(ApiContracts.IncidentStatus.EN_ROUTE)}
          >
            Mark En Route
          </button>
        )}
        {incident.status === ApiContracts.IncidentStatus.EN_ROUTE && (
          <button
            className="btn btn-success"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange(ApiContracts.IncidentStatus.ON_SCENE)}
          >
            Mark On Scene
          </button>
        )}
        {incident.status === ApiContracts.IncidentStatus.ON_SCENE && (
          <button
            className="btn btn-success"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange(ApiContracts.IncidentStatus.RESOLVED)}
          >
            Mark Incident Resolved
          </button>
        )}
        {incident.status === ApiContracts.IncidentStatus.RESOLVED && (
          <button
            className="btn btn-secondary"
            disabled={isUpdatingStatus}
            onClick={() => handleStatusChange(ApiContracts.IncidentStatus.CLOSED)}
          >
            Close Incident File
          </button>
        )}
      </div>

      {/* Detail Grid */}
      <div className="detail-grid">
        {/* Location & GPS Confidence Card */}
        <div className="detail-card">
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Location & Accuracy Confidence
          </div>

          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
            <strong>{incident.location.landmarkOrAddress || 'Location Coordinates Supplied'}</strong>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div>
              <span>Coordinates: </span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {incident.location.latitude.toFixed(6)}, {incident.location.longitude.toFixed(6)}
              </strong>
            </div>
            <div>
              <span>Source: </span>
              <span className="badge-live">{incident.location.source}</span>
            </div>
            {incident.location.accuracyMetres && (
              <div>
                <span>Accuracy: </span>
                <strong>±{incident.location.accuracyMetres}m</strong>
              </div>
            )}
          </div>

          {/* Interactive Radar Simulation Canvas */}
          <div className="map-canvas-container" title="Simulated Location CAD Radar">
            <div className="map-radar-ping"></div>
            <div className="map-marker-pin"></div>
            <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              CAD GIS Grid: {incident.location.latitude.toFixed(3)}N, {incident.location.longitude.toFixed(3)}E
            </div>
          </div>
        </div>

        {/* Casualties & Hazard Assessment Card */}
        <div className="detail-card">
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Hazard & Casualty Breakdown
          </div>

          <div className="stats-grid">
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VEHICLES INVOLVED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{incident.vehicleCount ?? 'Unknown'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>INJURED CASUALTIES</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: incident.injuredPersonCount ? '#f87171' : 'inherit' }}>
                {incident.injuredPersonCount ?? 'Unknown'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vehicle Fire Suspected:</span>
              <strong>{incident.fireSuspected === true ? 'YES (HIGH RISK)' : incident.fireSuspected === false ? 'No' : 'Unknown'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Trapped Persons Suspected:</span>
              <strong>{incident.trappedPersonsSuspected === true ? 'YES (EXTRACTION NEEDED)' : incident.trappedPersonsSuspected === false ? 'No' : 'Unknown'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Road Blockage Suspected:</span>
              <strong>{incident.roadBlockageSuspected === true ? 'YES (TRAFFIC DIVERSION)' : incident.roadBlockageSuspected === false ? 'No' : 'Unknown'}</strong>
            </div>
          </div>

          {incident.description && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>REPORTER DESCRIPTION</div>
              "{incident.description}"
            </div>
          )}
        </div>
      </div>

      {/* Assigned Response Teams */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
          Assigned Emergency Units ({incident.assignments.length})
        </h3>
        {incident.assignments.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No response units assigned yet. Dispatch an agency using the button above.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {incident.assignments.map(a => (
              <div key={a.id} className="detail-card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>{a.agencyName}</strong>
                  <span className="badge-live">{a.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Assigned To: {a.assignedToName || 'Duty Unit'}
                </div>
                {a.notes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Note: {a.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Photos */}
      {incident.media.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
            Attached Photo Evidence ({incident.media.length})
          </h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {incident.media.map(m => (
              <div key={m.id} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <img
                  src={m.viewUrl}
                  alt="Incident Scene Evidence"
                  style={{ width: '180px', height: '140px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--bg-tertiary)' }}>
                  {m.mimeType} ({(m.sizeBytes / 1024).toFixed(0)} KB)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Dispatcher Notes Form */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
          Internal Dispatcher Notes (Shielded from Public View)
        </h3>
        <form onSubmit={handleAddNote} className="note-form">
          <input
            type="text"
            className="search-input"
            placeholder="Add operational notes or hospital coordination info..."
            value={internalNote}
            onChange={e => setInternalNote(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={isSubmittingNote}>
            Add Note
          </button>
        </form>
      </div>

      {/* Append-Only Status Audit Timeline */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
          Append-Only Event & Status Timeline
        </h3>
        <div className="timeline-list">
          {incident.statusEvents.map(event => (
            <div key={event.id} className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span>
                    <strong>{event.actorName}</strong> ({event.actorRole})
                  </span>
                  <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="timeline-note">{event.note || `Transition to ${event.toStatus}`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
