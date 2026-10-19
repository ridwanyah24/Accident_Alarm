import React, { useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from '../services/api';

export const OutboxView: React.FC = () => {
  const [notifications, setNotifications] = useState<ApiContracts.NotificationDeliveryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOutbox = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notification outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutbox();
    const interval = setInterval(loadOutbox, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Notification & Outbox Queue Monitor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Transactional delivery tracking across FCM Push, SMS, and In-App operational channels
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadOutbox}>
          Refresh Queue
        </button>
      </div>

      <div className="glass-panel table-scroll">
        <table className="data-table">
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Incident Ref</th>
              <th style={{ padding: '12px 16px' }}>Channel</th>
              <th style={{ padding: '12px 16px' }}>Event Type</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Attempts</th>
              <th style={{ padding: '12px 16px' }}>Created</th>
              <th style={{ padding: '12px 16px' }}>Delivered</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading outbox deliveries...' : 'No notification deliveries recorded.'}
                </td>
              </tr>
            ) : (
              notifications.map(n => {
                const statusColor =
                  n.status === ApiContracts.DeliveryStatus.DELIVERED
                    ? '#10b981'
                    : n.status === ApiContracts.DeliveryStatus.FAILED
                    ? '#ef4444'
                    : '#f59e0b';

                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {n.incidentReferenceCode || 'SYSTEM'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge-live">{n.channel}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{n.eventType}</td>
                    <td style={{ padding: '12px 16px', color: statusColor, fontWeight: 700 }}>
                      {n.status}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{n.attemptCount}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {n.deliveredAt ? new Date(n.deliveredAt).toLocaleTimeString() : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
