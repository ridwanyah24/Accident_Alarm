import React, { useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { IncidentQueue } from './components/IncidentQueue';
import { IncidentDetail } from './components/IncidentDetail';
import { TriageModal } from './components/TriageModal';
import { AssignmentModal } from './components/AssignmentModal';
import { ResponderView } from './components/ResponderView';
import { OutboxView } from './components/OutboxView';
import { StaffManagement } from './components/StaffManagement';
import { AuditLogsView } from './components/AuditLogsView';
import { NewReportModal } from './components/NewReportModal';
import { LoginView } from './components/LoginView';

type ActiveTab = 'queue' | 'responder' | 'notifications' | 'staff' | 'audit';

export const App: React.FC = () => {
  const { user, loading: authLoading, isAdmin, isResponder } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('queue');
  const [incidents, setIncidents] = useState<ApiContracts.IncidentStaffDetailResponse[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Modals
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data.items);
      if (data.items.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data.items[0].id);
      }
    } catch (err) {
      console.warn('API polling wait or offline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setIncidents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadIncidents();
    const interval = setInterval(loadIncidents, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || (incidents.length > 0 ? incidents[0] : null);

  const handleTriageSubmit = async (triageData: ApiContracts.TriageIncidentRequest) => {
    if (!selectedIncident) return;
    const updated = await api.triageIncident(selectedIncident.id, triageData);
    setIncidents(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  };

  const handleAssignSubmit = async (assignData: ApiContracts.CreateAssignmentRequest) => {
    if (!selectedIncident) return;
    await api.assignIncident(selectedIncident.id, assignData);
    await loadIncidents();
  };

  const handleStatusUpdate = async (incidentId: string, toStatus: ApiContracts.IncidentStatus, note?: string) => {
    const updated = await api.updateIncidentStatus(incidentId, toStatus, note);
    setIncidents(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  };

  const handleAddInternalNote = async (note: string) => {
    if (!selectedIncident) return;
    const updated = await api.addInternalNote(selectedIncident.id, note);
    setIncidents(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  };

  const handleCreateReport = async (data: ApiContracts.CreateIncidentRequest, idempotencyKey: string) => {
    const result = await api.createIncident(data, idempotencyKey);
    await loadIncidents();
    setSelectedIncidentId(result.id);
  };

  if (authLoading) {
    return <main className="auth-page"><p className="auth-loading">Restoring secure session...</p></main>;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="app-container">
      <Header onOpenReportModal={() => setIsNewReportOpen(true)} />

      {/* Navigation Bar */}
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="nav-tabs-bar">
          <button
            className={`nav-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Incident Queue
          </button>

          {isResponder && (
            <button
              className={`nav-tab-btn ${activeTab === 'responder' ? 'active' : ''}`}
              onClick={() => setActiveTab('responder')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              Responder Workspace
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Alert Outbox
          </button>

          {isAdmin && (
            <>
              <button
                className={`nav-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Staff Accounts
              </button>

              <button
                className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Audit Trail
              </button>
            </>
          )}
        </div>
      </div>

      <main className="dashboard-main">
        {/* Global Key Metrics Overview */}
        <MetricsBar incidents={incidents} />

        {/* Dynamic Tab Views */}
        {activeTab === 'queue' && (
          <div className="split-view-container">
            <IncidentQueue
              incidents={incidents}
              selectedId={selectedIncident?.id || null}
              onSelect={id => setSelectedIncidentId(id)}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              verificationFilter={verificationFilter}
              onVerificationFilterChange={setVerificationFilter}
            />

            {selectedIncident ? (
              <IncidentDetail
                incident={selectedIncident}
                onOpenTriage={() => setIsTriageOpen(true)}
                onOpenAssign={() => setIsAssignOpen(true)}
                onUpdateStatus={(st, note) => handleStatusUpdate(selectedIncident.id, st, note)}
                onAddNote={handleAddInternalNote}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select an incident from the queue to inspect operational details.
              </div>
            )}
          </div>
        )}

        {activeTab === 'responder' && (
          <ResponderView
            incidents={incidents}
            onUpdateStatus={handleStatusUpdate}
            onSelectIncident={id => {
              setSelectedIncidentId(id);
              setActiveTab('queue');
            }}
          />
        )}

        {activeTab === 'notifications' && <OutboxView />}

        {activeTab === 'staff' && <StaffManagement />}

        {activeTab === 'audit' && <AuditLogsView />}
      </main>

      {/* Modals */}
      {selectedIncident && (
        <>
          <TriageModal
            isOpen={isTriageOpen}
            onClose={() => setIsTriageOpen(false)}
            onSubmit={handleTriageSubmit}
            currentVerification={selectedIncident.verificationState}
            currentPriority={selectedIncident.operationalPriority}
          />

          <AssignmentModal
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            onSubmit={handleAssignSubmit}
            incidentRef={selectedIncident.referenceCode}
          />
        </>
      )}

      <NewReportModal
        isOpen={isNewReportOpen}
        onClose={() => setIsNewReportOpen(false)}
        onSubmit={handleCreateReport}
      />
    </div>
  );
};
