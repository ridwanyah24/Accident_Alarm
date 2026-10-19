import React, { useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from '../services/api';

export const StaffManagement: React.FC = () => {
  const [users, setUsers] = useState<ApiContracts.UserProfile[]>([]);
  const [agencies, setAgencies] = useState<ApiContracts.AgencyDto[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ApiContracts.UserRole>(ApiContracts.UserRole.RESPONDER);
  const [agencyId, setAgencyId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [uList, aList] = await Promise.all([api.getStaffUsers(), api.getAgencies()]);
      setUsers(uList);
      setAgencies(aList);
      if (aList.length > 0 && !agencyId) {
        setAgencyId(aList[0].id);
      }
    } catch (err) {
      console.error('Failed to load staff management data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.inviteStaff({
        email,
        fullName,
        role,
        agencyId: role === ApiContracts.UserRole.ADMIN ? null : agencyId
      });
      setIsInviteOpen(false);
      setFullName('');
      setEmail('');
      await loadData();
    } catch (err: any) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (user: ApiContracts.UserProfile) => {
    const newStatus = user.accountStatus === ApiContracts.AccountStatus.ACTIVE ? ApiContracts.AccountStatus.SUSPENDED : ApiContracts.AccountStatus.ACTIVE;
    try {
      await api.updateStaff(user.id, { accountStatus: newStatus });
      await loadData();
    } catch (err: any) {
      alert(`Failed to update account: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff & Agency Account Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage approved emergency agency personnel, role-based access, and account status
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsInviteOpen(true)}>
          + Invite New Staff Member
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Name</th>
              <th style={{ padding: '12px 16px' }}>Email</th>
              <th style={{ padding: '12px 16px' }}>Role</th>
              <th style={{ padding: '12px 16px' }}>Agency Assignment</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.fullName}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge-live">{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>{u.agencyName || 'Central Administration'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: u.accountStatus === ApiContracts.AccountStatus.ACTIVE ? '#10b981' : '#ef4444'
                    }}
                  >
                    {u.accountStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {u.role !== ApiContracts.UserRole.ADMIN && (
                    <button
                      className={`btn ${u.accountStatus === ApiContracts.AccountStatus.ACTIVE ? 'btn-secondary' : 'btn-success'}`}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => handleStatusToggle(u)}
                    >
                      {u.accountStatus === ApiContracts.AccountStatus.ACTIVE ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Invite Emergency Staff Member</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setIsInviteOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name & Rank</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Inspector John Doe"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Work Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. officer@frsc.gov.ng"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select
                    className="form-control"
                    value={role}
                    onChange={e => setRole(e.target.value as ApiContracts.UserRole)}
                  >
                    <option value={ApiContracts.UserRole.RESPONDER}>Field Responder (Patrol / EMS crew)</option>
                    <option value={ApiContracts.UserRole.DISPATCHER}>Incident Coordinator / Dispatcher</option>
                    <option value={ApiContracts.UserRole.ADMIN}>System Administrator</option>
                  </select>
                </div>

                {role !== ApiContracts.UserRole.ADMIN && (
                  <div className="form-group">
                    <label className="form-label">Response Agency Membership</label>
                    <select
                      className="form-control"
                      value={agencyId}
                      onChange={e => setAgencyId(e.target.value)}
                      required
                    >
                      {agencies.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.agencyType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInviteOpen(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending Invite...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
