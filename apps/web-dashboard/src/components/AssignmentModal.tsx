import React, { useState, useEffect } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';
import { api } from '../services/api';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApiContracts.CreateAssignmentRequest) => Promise<void>;
  incidentRef: string;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  incidentRef
}) => {
  const [agencies, setAgencies] = useState<ApiContracts.AgencyDto[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getAgencies().then(data => {
        setAgencies(data);
        if (data.length > 0) {
          setSelectedAgencyId(data[0].id);
        }
      }).catch(err => console.error('Failed to load agencies:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyId) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        agencyId: selectedAgencyId,
        notes: notes.trim() || undefined
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dispatch Response Unit: {incidentRef}</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Response Agency / Service</label>
              <select
                className="form-control"
                value={selectedAgencyId}
                onChange={e => setSelectedAgencyId(e.target.value)}
                required
              >
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.agencyType})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dispatch Instructions & Casualty Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Specific instructions for responding team (e.g., Heavy extrication gear needed, 2 ambulances requested)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
