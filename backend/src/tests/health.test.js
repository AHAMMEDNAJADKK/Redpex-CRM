import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock Redis connection
jest.unstable_mockModule('../config/redis.js', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0)
  }
}));

const { default: app } = await import('../../app.js');

describe('Redpex Health & System API Tests', () => {
  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });

  test('GET / should return 200 with Redpex CRM welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Redpex CRM Backend Server is running successfully');
  });

  test('GET /api/health should return health status JSON without leaking secrets', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('database');
    expect(res.body.service).toBe('Redpex CRM API');
    // Ensure no passwords or URIs are leaked in health check
    expect(JSON.stringify(res.body)).not.toContain('mongodb+srv');
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('GET /api/nonexistent-route-test should return clean 404 JSON', async () => {
    const res = await request(app).get('/api/nonexistent-route-test');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Route Not Found');
  });
});
