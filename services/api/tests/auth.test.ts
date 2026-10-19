import request from 'supertest';
import { createApp } from '../src/app';
import { getDbStore, seedDefaultData } from '../src/db';
import { UserRole } from '@accident-alarm/api-contracts';

describe('Authentication & RBAC Security Tests', () => {
  let app: any;
  const store = getDbStore();
  let adminToken: string;
  let responderToken: string;

  beforeAll(async () => {
    await store.reset();
    await seedDefaultData(store);
    app = createApp();

    // Login Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@accidentalarm.gov',
        password: 'AdminPass123!'
      });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;

    // Login Responder
    const responderLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'responder@accidentalarm.gov',
        password: 'ResponderPass123!'
      });
    expect(responderLogin.status).toBe(200);
    responderToken = responderLogin.body.data.token;
  });

  describe('Staff Login & Token Verification', () => {
    it('FR-06: Authenticates staff with valid credentials and returns JWT profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@accidentalarm.gov',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('admin@accidentalarm.gov');
      expect(res.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it('NFR-03: Rejects login with incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@accidentalarm.gov',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('FR-06: Returns current user profile via /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('FR-06 & NFR-03: Blocks unauthenticated access to staff routes', async () => {
      const res = await request(app).get('/api/v1/staff/incidents');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('FR-06: Allows Admin to access staff management endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('FR-06 & NFR-03: Forbids Responder from accessing Admin-only staff management', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${responderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('FR-11: Admin can invite a new staff member and assign role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newdispatcher@accidentalarm.gov',
          fullName: 'New Dispatcher Tanko',
          role: UserRole.DISPATCHER
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('newdispatcher@accidentalarm.gov');
      expect(res.body.data.role).toBe(UserRole.DISPATCHER);
    });
  });
});
