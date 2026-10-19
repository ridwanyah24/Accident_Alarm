import React, { useState } from 'react';
import * as ApiContracts from '@accident-alarm/api-contracts';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApiContracts.CreateIncidentRequest, idempotencyKey: string) => Promise<void>;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [category, setCategory] = useState<ApiContracts.IncidentCategory>(ApiContracts.IncidentCategory.COLLISION);
  const [severity, setSeverity] = useState<ApiContracts.ReporterSeverity>(ApiContracts.ReporterSeverity.SERIOUS);
  const [description, setDescription] = useState('');
  const [vehicleCount, setVehicleCount] = useState(2);
  const [injuredCount, setInjuredCount] = useState(1);
  const [fireSuspected, setFireSuspected] = useState(false);
  const [trappedSuspected, setTrappedSuspected] = useState(false);
  const [blockageSuspected, setBlockageSuspected] = useState(true);
  const [locationSource, setLocationSource] = useState<ApiContracts.LocationSource>(ApiContracts.LocationSource.GPS);
  const [latitude, setLatitude] = useState(10.5105);
  const [longitude, setLongitude] = useState(7.4165);
  const [accuracy, setAccuracy] = useState(15.0);
  const [landmark, setLandmark] = useState('Near Nnamdi Azikiwe Expressway Flyover');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const idempotencyKey = `web-sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await onSubmit(
        {
          category,
          reporterSeverity: severity,
          description: description.trim() || undefined,
          vehicleCount,
          injuredPersonCount: injuredCount,
          fireSuspected,
          trappedPersonsSuspected: trappedSuspected,
          roadBlockageSuspected: blockageSuspected,
          occurredAtDevice: new Date().toISOString(),
          location: {
            latitude,
            longitude,
            accuracyMetres: locationSource === ApiContracts.LocationSource.GPS ? accuracy : null,
            source: locationSource,
            landmarkOrAddress: landmark.trim() || null
          }
        },
        idempotencyKey
      );
      onClose();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Simulate Public Accident Report</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Submits a live report matching the Android application contract to the backend API
            </p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Incident Category</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={e => setCategory(e.target.value as ApiContracts.IncidentCategory)}
                >
                  {Object.values(ApiContracts.IncidentCategory).map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reporter Severity</label>
                <select
                  className="form-control"
                  value={severity}
                  onChange={e => setSeverity(e.target.value as ApiContracts.ReporterSeverity)}
                >
                  {Object.values(ApiContracts.ReporterSeverity).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Incident Description</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Describe what occurred, vehicle types, road condition..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Vehicles Involved</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  className="form-control"
                  value={vehicleCount}
                  onChange={e => setVehicleCount(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Injured Casualties</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control"
                  value={injuredCount}
                  onChange={e => setInjuredCount(parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            {/* Hazard Checkboxes */}
            <div className="hazard-checks">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fireSuspected}
                  onChange={e => setFireSuspected(e.target.checked)}
                />
                Fire Suspected
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={trappedSuspected}
                  onChange={e => setTrappedSuspected(e.target.checked)}
                />
                Trapped Casualties
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={blockageSuspected}
                  onChange={e => setBlockageSuspected(e.target.checked)}
                />
                Road Blocked
              </label>
            </div>

            {/* Location Data */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                LOCATION CAPTURE
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select
                    className="form-control"
                    value={locationSource}
                    onChange={e => setLocationSource(e.target.value as ApiContracts.LocationSource)}
                  >
                    <option value={ApiContracts.LocationSource.GPS}>GPS</option>
                    <option value={ApiContracts.LocationSource.MAP_PIN}>Map Pin</option>
                    <option value={ApiContracts.LocationSource.MANUAL}>Manual Entry</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={latitude}
                    onChange={e => setLatitude(parseFloat(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={longitude}
                    onChange={e => setLongitude(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Landmark / Street Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Near Stadium Roundabout, Western Bypass"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
              {isSubmitting ? 'Transmitting Report...' : 'Transmit Accident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
