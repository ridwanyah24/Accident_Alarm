import React, { useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from '../services/api';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ApiContracts.AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Security & Operational Audit Trail</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Tamper-evident log of operational decisions, status updates, staff invitations, and dispatches
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs}>
          Refresh Audit Trail
        </button>
      </div>

      <div className="glass-panel table-scroll">
        <table className="data-table">
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px' }}>Staff Actor</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
              <th style={{ padding: '12px 16px' }}>Entity Type</th>
              <th style={{ padding: '12px 16px' }}>Metadata / Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading audit records...' : 'No audit records found.'}
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {log.actorName || 'System Automated'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge-live">{log.action}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {log.entityType}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.metadata ? JSON.stringify(log.metadata) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
