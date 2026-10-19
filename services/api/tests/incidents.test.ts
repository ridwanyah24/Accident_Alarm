import request from 'supertest';
import { createApp } from '../src/app';
import { getDbStore, seedDefaultData } from '../src/db';
import {
  IncidentCategory,
  ReporterSeverity,
  LocationSource,
  IncidentStatus,
  VerificationState,
  OperationalPriority
} from '@accident-alarm/api-contracts';

describe('Incidents API & Lifecycle Tests', () => {
  let app: any;
  const store = getDbStore();
  let dispatcherToken: string;

  beforeAll(async () => {
    await store.reset();
    await seedDefaultData(store);
    app = createApp();

    // Login as dispatcher for staff operations
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dispatcher@accidentalarm.gov',
        password: 'DispatchPass123!'
      });
    expect(loginRes.status).toBe(200);
    dispatcherToken = loginRes.body.data.token;
  });

  describe('Incident Submission & Validation', () => {
    it('FR-02: Successfully submits a valid incident report with GPS coordinates', async () => {
      const payload = {
        category: IncidentCategory.COLLISION,
        reporterSeverity: ReporterSeverity.SERIOUS,
        description: 'Two cars involved at the roundabout.',
        vehicleCount: 2,
        injuredPersonCount: 1,
        fireSuspected: false,
        trappedPersonsSuspected: false,
        roadBlockageSuspected: true,
        location: {
          latitude: 10.5105,
          longitude: 7.4165,
          accuracyMetres: 12.5,
          source: LocationSource.GPS,
          landmarkOrAddress: 'Stadium Roundabout'
        }
      };

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Idempotency-Key', 'test-idemp-001')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.referenceCode).toMatch(/^RA-[A-Z0-9]{6}$/);
      expect(res.body.data.status).toBe(IncidentStatus.SUBMITTED);
      expect(res.body.data).toHaveProperty('guestAccessToken');
      expect(res.body.data.message).toContain('does not confirm');
    });

    it('FR-02 & NFR-05: Returns existing incident without duplicate creation on repeated idempotency key', async () => {
      const payload = {
        category: IncidentCategory.VEHICLE_ROLLOVER,
        reporterSeverity: ReporterSeverity.CRITICAL,
        location: {
          latitude: 10.5200,
          longitude: 7.4200,
          source: LocationSource.GPS
        }
      };

      const res1 = await request(app)
        .post('/api/v1/incidents')
        .set('Idempotency-Key', 'unique-idempotency-key-abc')
        .send(payload);
      expect(res1.status).toBe(201);
      const incidentId1 = res1.body.data.id;
      const refCode1 = res1.body.data.referenceCode;

      // Repeat with same idempotency key
      const res2 = await request(app)
        .post('/api/v1/incidents')
        .set('Idempotency-Key', 'unique-idempotency-key-abc')
        .send(payload);
      expect(res2.status).toBe(201);
      expect(res2.body.data.id).toBe(incidentId1);
      expect(res2.body.data.referenceCode).toBe(refCode1);
    });

    it('NFR-03: Rejects invalid latitude out of bounds [-90, 90]', async () => {
      const payload = {
        category: IncidentCategory.COLLISION,
        reporterSeverity: ReporterSeverity.MINOR,
        location: {
          latitude: 195.0, // Invalid latitude > 90
          longitude: 7.4165,
          source: LocationSource.GPS
        }
      };

      const res = await request(app)
        .post('/api/v1/incidents')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('NFR-03: Rejects invalid longitude out of bounds [-180, 180]', async () => {
      const payload = {
        category: IncidentCategory.COLLISION,
        reporterSeverity: ReporterSeverity.MINOR,
        location: {
          latitude: 10.5,
          longitude: 250.0, // Invalid longitude > 180
          source: LocationSource.GPS
        }
      };

      const res = await request(app)
        .post('/api/v1/incidents')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('FR-03: Requires landmark or address when location source is MANUAL', async () => {
      const payload = {
        category: IncidentCategory.COLLISION,
        reporterSeverity: ReporterSeverity.MINOR,
        location: {
          latitude: 10.5,
          longitude: 7.4,
          source: LocationSource.MANUAL,
          landmarkOrAddress: '' // Empty landmark
        }
      };

      const res = await request(app)
        .post('/api/v1/incidents')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Guest Status Access & Privacy Protection', () => {
    let createdIncidentId: string;
    let guestToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .send({
          category: IncidentCategory.MOTORCYCLE_INCIDENT,
          reporterSeverity: ReporterSeverity.SERIOUS,
          description: 'Rider fell on slippery surface.',
          location: {
            latitude: 10.5123,
            longitude: 7.4123,
            source: LocationSource.GPS
          }
        });
      expect(res.status).toBe(201);
      createdIncidentId = res.body.data.id;
      guestToken = res.body.data.guestAccessToken;
      expect(guestToken).toBeDefined();
    });

    it('FR-05: Allows guest to view public status with valid guest token', async () => {
      const res = await request(app)
        .get(`/api/v1/incidents/${createdIncidentId}/status`)
        .set('X-Guest-Token', guestToken);

      expect(res.status).toBe(200);
      expect(res.body.data.statusDisplay).toBe('Report Received');
      expect(res.body.data).not.toHaveProperty('internalNotes');
    });

    it('NFR-04: Rejects unauthorized access when invalid guest token is supplied', async () => {
      const res = await request(app)
        .get(`/api/v1/incidents/${createdIncidentId}/status`)
        .set('X-Guest-Token', 'invalid_random_guest_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Staff Triage and Status Lifecycle', () => {
    let incidentId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .send({
          category: IncidentCategory.VEHICLE_FIRE,
          reporterSeverity: ReporterSeverity.CRITICAL,
          description: 'Sedan engine caught fire after hitting guard rail.',
          location: {
            latitude: 10.53,
            longitude: 7.43,
            source: LocationSource.GPS
          }
        });
      incidentId = res.body.data.id;
    });

    it('FR-08: Dispatcher can triage incident, set priority, and verify', async () => {
      const res = await request(app)
        .patch(`/api/v1/staff/incidents/${incidentId}/triage`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          verificationState: VerificationState.VERIFIED,
          operationalPriority: OperationalPriority.CRITICAL,
          notes: 'Confirmed by traffic cameras. Fire tender required.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.verificationState).toBe(VerificationState.VERIFIED);
      expect(res.body.data.operationalPriority).toBe(OperationalPriority.CRITICAL);
    });

    it('FR-09: Validates allowed status transitions and rejects illegal transitions', async () => {
      // Transition from SUBMITTED to ACKNOWLEDGED
      const ackRes = await request(app)
        .post(`/api/v1/staff/incidents/${incidentId}/status-events`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          toStatus: IncidentStatus.ACKNOWLEDGED,
          note: 'Dispatch acknowledged and coordinating with Fire Department.'
        });
      expect(ackRes.status).toBe(200);
      expect(ackRes.body.data.status).toBe(IncidentStatus.ACKNOWLEDGED);

      // Transition from ACKNOWLEDGED to EN_ROUTE
      const enRouteRes = await request(app)
        .post(`/api/v1/staff/incidents/${incidentId}/status-events`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          toStatus: IncidentStatus.EN_ROUTE,
          note: 'Engine 4 en route.'
        });
      expect(enRouteRes.status).toBe(200);
      expect(enRouteRes.body.data.status).toBe(IncidentStatus.EN_ROUTE);

      // Try illegal jump: EN_ROUTE directly to SUBMITTED
      const illegalRes = await request(app)
        .post(`/api/v1/staff/incidents/${incidentId}/status-events`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          toStatus: IncidentStatus.SUBMITTED
        });
      expect(illegalRes.status).toBe(400);
      expect(illegalRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
