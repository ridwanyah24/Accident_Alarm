import React, { useEffect, useState } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApiContracts.TriageIncidentRequest) => Promise<void>;
  currentVerification: ApiContracts.VerificationState;
  currentPriority?: ApiContracts.OperationalPriority | null;
}

export const TriageModal: React.FC<TriageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentVerification,
  currentPriority
}) => {
  const [verificationState, setVerificationState] = useState<ApiContracts.VerificationState>(currentVerification);
  const [operationalPriority, setOperationalPriority] = useState<ApiContracts.OperationalPriority>(
    currentPriority ?? ApiContracts.OperationalPriority.MEDIUM
  );

  useEffect(() => {
    if (isOpen) {
      setVerificationState(currentVerification);
      setOperationalPriority(currentPriority ?? ApiContracts.OperationalPriority.MEDIUM);
      setDuplicateOfIncidentId('');
      setNotes('');
    }
  }, [isOpen, currentVerification, currentPriority]);
  const [duplicateOfIncidentId, setDuplicateOfIncidentId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        verificationState,
        operationalPriority,
        duplicateOfIncidentId: duplicateOfIncidentId.trim() || null,
        notes: notes.trim() || null
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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Incident Triage & Operational Assessment</h3>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Verification State</label>
              <select
                className="form-control"
                value={verificationState}
                onChange={e => setVerificationState(e.target.value as ApiContracts.VerificationState)}
              >
                <option value={ApiContracts.VerificationState.VERIFIED}>VERIFIED - Incident Confirmed Genuine</option>
                <option value={ApiContracts.VerificationState.UNVERIFIED}>UNVERIFIED - Needs Additional Evidence</option>
                <option value={ApiContracts.VerificationState.DUPLICATE}>DUPLICATE - Matches Existing Incident</option>
                <option value={ApiContracts.VerificationState.FALSE_REPORT_SUSPECTED}>FALSE_REPORT_SUSPECTED - Suspected Misuse</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dispatcher Operational Priority</label>
              <select
                className="form-control"
                value={operationalPriority}
                onChange={e => setOperationalPriority(e.target.value as ApiContracts.OperationalPriority)}
              >
                <option value={ApiContracts.OperationalPriority.CRITICAL}>CRITICAL - Immediate Multi-Agency Response</option>
                <option value={ApiContracts.OperationalPriority.HIGH}>HIGH - Serious Casualties / Road Blocked</option>
                <option value={ApiContracts.OperationalPriority.MEDIUM}>MEDIUM - Minor Injuries / Traffic Slowdown</option>
                <option value={ApiContracts.OperationalPriority.LOW}>LOW - Minor Damage / Non-urgent</option>
              </select>
            </div>

            {verificationState === ApiContracts.VerificationState.DUPLICATE && (
              <div className="form-group">
                <label className="form-label">Primary Incident ID (UUID)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter parent incident UUID..."
                  value={duplicateOfIncidentId}
                  onChange={e => setDuplicateOfIncidentId(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Triage & Assessment Rationale</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Explain the verification source or reasoning..."
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
              {isSubmitting ? 'Saving...' : 'Save Triage Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
