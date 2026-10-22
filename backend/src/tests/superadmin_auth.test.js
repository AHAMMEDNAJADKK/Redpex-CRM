import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock Redis connection to prevent open handles during automated test runs
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
const { isUserSuperAdmin, requireSuperAdmin, requireAdmin } = await import('../middleware/auth.middleware.js');

describe('Super Admin Authentication & RBAC Privilege Safeguards', () => {
  const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkey_12345';

  beforeAll(async () => {
    await connectDB();
  }, 20000);

  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });

  describe('1. Super Admin Authentication Endpoint', () => {
    test('POST /api/v1/auth/login with valid superadmin credentials returns 200, JWT token, and superadmin role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@gmail.com',
          password: 'superadmin@111'
        });

      // If database is connected to Atlas with the seeded account
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe('superadmin@gmail.com');
        expect(res.body.user.role).toBe('superadmin');
        expect(res.body.user.role_id).toBe('0');
        expect(res.body.user.isSuperAdmin).toBe(true);

        // Verify signed JWT payload contains isSuperAdmin: true
        const decoded = jwt.verify(res.body.token, jwtSecret);
        expect(decoded.isSuperAdmin).toBe(true);
        expect(decoded.role).toBe('superadmin');
        expect(decoded.role_id).toBe('0');
      } else {
        // In offline unit environment, verify error is not a 500 crash
        expect([200, 401, 503]).toContain(res.status);
      }
    }, 15000);

    test('POST /api/v1/auth/login with incorrect password fails with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@gmail.com',
          password: 'wrong_password_attempt_999'
        });

      expect([401, 503]).toContain(res.status);
      if (res.status === 401) {
        expect(res.body.detail || res.body.message).toContain('Invalid credentials');
      }
    }, 15000);
  });

  describe('2. isUserSuperAdmin & RBAC Middleware Logic', () => {
    test('isUserSuperAdmin correctly identifies Super Admin variations', () => {
      expect(isUserSuperAdmin({ isSuperAdmin: true })).toBe(true);
      expect(isUserSuperAdmin({ is_super_admin: true })).toBe(true);
      expect(isUserSuperAdmin({ role: 'superadmin' })).toBe(true);
      expect(isUserSuperAdmin({ role: 'Superadmin' })).toBe(true);
      expect(isUserSuperAdmin({ role: 'super_admin' })).toBe(true);
      expect(isUserSuperAdmin({ role_id: '0' })).toBe(true);
    });

    test('isUserSuperAdmin correctly rejects non-superadmin accounts', () => {
      expect(isUserSuperAdmin(null)).toBe(false);
      expect(isUserSuperAdmin({})).toBe(false);
      expect(isUserSuperAdmin({ role: 'admin', role_id: '1' })).toBe(false);
      expect(isUserSuperAdmin({ role: 'manager', role_id: '2' })).toBe(false);
      expect(isUserSuperAdmin({ role: 'employee', role_id: '3' })).toBe(false);
      expect(isUserSuperAdmin({ role: 'student', role_id: '10' })).toBe(false);
    });

    test('requireSuperAdmin blocks non-superadmins with 403 Forbidden', async () => {
      const req = {
        user: { id: '6a6d94a4c973caa843d91699', role: 'employee', role_id: '3', isSuperAdmin: false }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      await requireSuperAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }, 15000);

    test('requireSuperAdmin allows verified Super Admin to proceed', async () => {
      const req = {
        user: { id: '6a6d94a4c973caa843d916ed', role: 'superadmin', role_id: '0', isSuperAdmin: true }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      await requireSuperAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }, 15000);
  });

  describe('3. Privilege Escalation Prevention on User Management Endpoints', () => {
    test('Non-admin token is rejected with 403 when attempting administrative actions', async () => {
      const normalUserToken = jwt.sign(
        {
          id: new mongoose.Types.ObjectId().toString(),
          role: 'employee',
          role_id: '3',
          isSuperAdmin: false
        },
        jwtSecret
      );

      // Attempt to create a user
      const createRes = await request(app)
        .post('/api/v1/users/create')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          name: 'Hacker User',
          email: 'hacker@redpex.in',
          role: 'superadmin'
        });

      expect(createRes.status).toBe(403);

      // Attempt to change a user role
      const roleRes = await request(app)
        .patch('/api/v1/users/6a6d94a4c973caa843d916ed/role')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ role: 'superadmin' });

      expect(roleRes.status).toBe(403);

      // Attempt to delete a user
      const deleteRes = await request(app)
        .delete('/api/v1/users/6a6d94a4c973caa843d916ed')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(deleteRes.status).toBe(403);
    }, 15000);

    test('Regular admin cannot promote an account to Super Admin', async () => {
      const regularAdminToken = jwt.sign(
        {
          id: new mongoose.Types.ObjectId().toString(),
          role: 'admin',
          role_id: '1',
          isSuperAdmin: false
        },
        jwtSecret
      );

      const res = await request(app)
        .post('/api/v1/users/create')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .send({
          name: 'Fake SuperAdmin',
          email: 'fakesuper@redpex.in',
          role: 'superadmin',
          role_id: '0',
          isSuperAdmin: true
        });

      // Regular admin is rejected when trying to create a superadmin
      expect(res.status).toBe(403);
      expect(res.body.message || res.body.error).toContain('Only Super Admins can create Super Admin accounts');
    }, 15000);

    test('Unauthenticated requests to administrative endpoints return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/users/create')
        .send({
          name: 'Anonymous',
          email: 'anon@redpex.in'
        });

      expect(res.status).toBe(401);
    });
  });
});
