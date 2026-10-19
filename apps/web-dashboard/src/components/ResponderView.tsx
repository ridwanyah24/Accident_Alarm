import React from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { useAuth } from '../context/AuthContext';

interface ResponderViewProps {
  incidents: ApiContracts.IncidentStaffDetailResponse[];
  onUpdateStatus: (incidentId: string, newStatus: ApiContracts.IncidentStatus, note?: string) => Promise<void>;
  onSelectIncident: (id: string) => void;
}

export const ResponderView: React.FC<ResponderViewProps> = ({
  incidents,
  onUpdateStatus,
  onSelectIncident
}) => {
  const { user } = useAuth();

  // Filter incidents assigned to this responder's agency
  const assignedIncidents = incidents.filter(i =>
    i.assignments.some(a => a.agencyId === user?.agencyId || a.assignedToUserId === user?.id)
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Field Responder Duty Workspace</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Active calls dispatched to: <strong>{user?.agencyName || 'Your Response Team'}</strong>
        </p>
      </div>

      {assignedIncidents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Active Dispatches</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Your response unit is currently on standby. Newly dispatched accident calls will appear here in real time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {assignedIncidents.map(inc => {
            return (
              <div key={inc.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="ref-code" style={{ fontSize: '1.2rem' }}>{inc.referenceCode}</span>
                      <span className={`status-badge status-${inc.status}`}>
                        {ApiContracts.mapInternalToPublicStatus(inc.status)}
                      </span>
                      <span className={`status-badge severity-${inc.reporterSeverity}`}>
                        {inc.reporterSeverity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {inc.category.replace('_', ' ')} • Reported at {new Date(inc.receivedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onSelectIncident(inc.id)}
                  >
                    View Full Details
                  </button>
                </div>

                {/* Location Bar */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DESTINATION SCENE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                    {inc.location.landmarkOrAddress || `${inc.location.latitude.toFixed(4)}, ${inc.location.longitude.toFixed(4)}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Accuracy: ±{inc.location.accuracyMetres || '20'}m ({inc.location.source})
                  </div>
                </div>

                {/* Quick Responder Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {inc.status === ApiContracts.IncidentStatus.ASSIGNED && (
                    <button
                      className="btn btn-primary"
                      onClick={() => onUpdateStatus(inc.id, ApiContracts.IncidentStatus.EN_ROUTE, 'Responding unit en route with emergency siren.')}
                    >
                      Acknowledge & Mark En Route
                    </button>
                  )}
                  {inc.status === ApiContracts.IncidentStatus.EN_ROUTE && (
                    <button
                      className="btn btn-success"
                      onClick={() => onUpdateStatus(inc.id, ApiContracts.IncidentStatus.ON_SCENE, 'Response crew arrived on scene. Commencing triage.')}
                    >
                      Arrived on Scene
                    </button>
                  )}
                  {inc.status === ApiContracts.IncidentStatus.ON_SCENE && (
                    <button
                      className="btn btn-success"
                      onClick={() => onUpdateStatus(inc.id, ApiContracts.IncidentStatus.RESOLVED, 'Casualties treated / transferred. Scene secured.')}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
