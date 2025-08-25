import request from 'supertest';
import express from 'express';
import { healthCheck } from '../../controllers/health/health.controller.js';

describe('Health Controller - Basic Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get('/health', healthCheck);
  });

  test('should return health status', async () => {
    const response = await request(app).get('/health');

    expect([200, 500]).toContain(response.status);
    expect(response.body).toHaveProperty('server');
    expect(response.body).toHaveProperty('database');
    expect(response.body.server).toBe('ok');
  });

  test('should return JSON response', async () => {
    const response = await request(app).get('/health');

    expect(response.type).toBe('application/json');
    expect(typeof response.body).toBe('object');
  });

  test('should handle the request quickly', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
  });
});
