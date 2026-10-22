import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock Redis connection
jest.unstable_mockModule('../config/redis.js', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    status: 'ready'
  }
}));

const { default: app } = await import('../../app.js');
const { default: connectDB } = await import('../config/db.js');
const { default: Lead } = await import('../models/lead.model.js');
const { default: Task } = await import('../models/task.model.js');

describe('REDPEX CRM — Comprehensive Workflow & Quality Audit Test Suite', () => {
  let superadminToken = '';
  let superadminUserId = '';
  const testLeadIds = [];
  const testTaskIds = [];

  beforeAll(async () => {
    await connectDB();

    // Authenticate Super Admin to acquire valid session token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@gmail.com',
        password: 'superadmin@111'
      });

    if (loginRes.status === 200 && loginRes.body.token) {
      superadminToken = loginRes.body.token;
      superadminUserId = loginRes.body.user?._id || loginRes.body.user?.id;
    }
  }, 25000);

  afterAll(async () => {
    try {
      // Clean up only test records with QA-REDPEX- prefix
      if (testLeadIds.length > 0) {
        await Lead.deleteMany({ _id: { $in: testLeadIds } });
      }
      await Lead.deleteMany({ leadName: { $regex: /^QA-REDPEX-/i } });

      if (testTaskIds.length > 0) {
        await Task.deleteMany({ _id: { $in: testTaskIds } });
      }
      await Task.deleteMany({ title: { $regex: /^QA-REDPEX-/i } });

      await mongoose.disconnect();
    } catch (_) {}
  });

  describe('Workflow 1: System Readiness & Health Checks', () => {
    test('REQ-HEALTH-01: GET /api/health reports database readiness without secret exposure', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBeDefined();
      expect(res.body.database.connected).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('mongodb+srv');
      expect(JSON.stringify(res.body)).not.toContain('password');
    });

    test('REQ-HEALTH-02: GET / returns 200 Redpex CRM active confirmation', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Redpex CRM Backend Server is running successfully');
    });
  });

  describe('Workflow 2: Authentication & RBAC Security Flows', () => {
    test('REQ-AUTH-01: Valid Superadmin credentials authenticate successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@gmail.com',
          password: 'superadmin@111'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('superadmin');
      expect(res.body.user.isSuperAdmin).toBe(true);
    }, 15000);

    test('REQ-AUTH-02: Bad password returns 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@gmail.com',
          password: 'wrong_password_999'
        });

      expect(res.status).toBe(401);
      expect(res.body.detail || res.body.message).toContain('Invalid credentials');
    }, 15000);

    test('REQ-AUTH-03: Missing credentials return 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    test('REQ-AUTH-04: Unauthenticated access to protected routes returns 401', async () => {
      const res = await request(app).get('/api/v1/user');
      expect(res.status).toBe(401);
    });
  });

  describe('Workflow 3: Lead Pipeline Operations (Safe Data: QA-REDPEX-)', () => {
    let createdLeadId = '';

    test('REQ-LEAD-01: Create lead with valid fields succeeds', async () => {
      if (!superadminToken) return;

      const res = await request(app)
        .post('/api/v1/leads/create')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          leadName: 'QA-REDPEX-Client Alpha',
          phone: '9988776655',
          email: 'qa-client-alpha@redpex-test.com',
          source: 'WALK_IN',
          priority: 'High',
          status: 'New',
          remarks: 'Automated Redpex QA Lead verification'
        });

      expect([200, 201]).toContain(res.status);
      const leadData = res.body.data || res.body.lead || res.body;
      createdLeadId = leadData._id || leadData.id;
      expect(createdLeadId).toBeDefined();
      testLeadIds.push(createdLeadId);
    }, 15000);

    test('REQ-LEAD-02: Fetch lead list includes newly created lead', async () => {
      if (!superadminToken || !createdLeadId) return;

      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      const leads = res.body.data || res.body.leads || res.body;
      expect(Array.isArray(leads)).toBe(true);
      const found = leads.some(l => (l._id || l.id) === String(createdLeadId));
      expect(found).toBe(true);
    }, 15000);

    test('REQ-LEAD-03: Update lead status transition persists in MongoDB', async () => {
      if (!superadminToken || !createdLeadId) return;

      const res = await request(app)
        .put(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          status: 'Contacted',
          remarks: 'QA status transition updated to Contacted'
        });

      expect([200, 204]).toContain(res.status);

      // Verify updated status from database
      const verified = await Lead.findById(createdLeadId);
      expect(verified).not.toBeNull();
      expect(verified.status).toBe('Contacted');
    }, 15000);

    test('REQ-LEAD-04: Delete lead removes record safely', async () => {
      if (!superadminToken || !createdLeadId) return;

      const res = await request(app)
        .delete(`/api/v1/leads/${createdLeadId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect([200, 204]).toContain(res.status);

      // Confirm deletion from DB
      const verified = await Lead.findById(createdLeadId);
      expect(verified).toBeNull();
    }, 15000);
  });

  describe('Workflow 4: Task Operations (Safe Data: QA-REDPEX-)', () => {
    let createdTaskId = '';

    test('REQ-TASK-01: Create operational task persists in database', async () => {
      if (!superadminToken || !superadminUserId) return;

      const res = await request(app)
        .post('/api/v1/tasks/create')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: 'QA-REDPEX-Safety Inspection Task',
          description: 'Quarterly fire extinguisher safety audit testing',
          priority: 'high',
          status: 'pending',
          assigned_to: superadminUserId,
          dueDate: new Date(Date.now() + 86400000).toISOString()
        });

      expect([200, 201]).toContain(res.status);
      const taskData = res.body.data || res.body.task || res.body;
      createdTaskId = taskData._id || taskData.id;
      expect(createdTaskId).toBeDefined();
      testTaskIds.push(createdTaskId);
    }, 15000);

    test('REQ-TASK-02: Query task list returns the active QA task', async () => {
      if (!superadminToken || !createdTaskId) return;

      const res = await request(app)
        .get('/api/v1/tasks/all')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      const tasks = res.body.data || res.body.tasks || res.body;
      expect(Array.isArray(tasks)).toBe(true);
      const found = tasks.some(t => (t._id || t.id) === String(createdTaskId));
      expect(found).toBe(true);
    }, 15000);

    test('REQ-TASK-03: Delete operational task cleans up record', async () => {
      if (!superadminToken || !createdTaskId) return;

      const res = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect([200, 204]).toContain(res.status);

      // Confirm purged from DB
      const verified = await Task.findById(createdTaskId);
      expect(verified).toBeNull();
    }, 15000);
  });
});
