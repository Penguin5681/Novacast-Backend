import request from 'supertest';
import express from 'express';
import { healthCheck } from '../../controllers/health/health.controller.js';
import { testPool } from '../setup.js';
import {
  expectSuccess,
  expectServerError,
  mockDatabaseError,
  performLoadTest,
  measureResponseTime
} from '../helpers.js';

describe('Health Controller', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get('/health', healthCheck);
  });

  describe('GET /health', () => {
    describe('Success Cases', () => {
      test('should return healthy status when database is connected', async () => {
        const response = await request(app).get('/health');

        expectSuccess(response);
        expect(response.body).toHaveProperty('server', 'ok');
        expect(response.body).toHaveProperty('database', 'ok');
        expect(response.body).not.toHaveProperty('details');
      });

      test('should respond quickly for health checks', async () => {
        const { duration } = await measureResponseTime(
          () => request(app).get('/health')
        );

        expect(duration).toBeLessThan(1000); // Health check should be fast
      });

      test('should return consistent response format', async () => {
        const response = await request(app).get('/health');

        expect(response.body).toEqual({
          server: 'ok',
          database: 'ok'
        });
      });
    });

    describe('Database Error Handling', () => {
      test('should handle database connection failure gracefully', async () => {
        const restoreMock = mockDatabaseError();

        const response = await request(app).get('/health');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('server', 'ok');
        expect(response.body).toHaveProperty('database', 'error');
        expect(response.body).toHaveProperty('details');
        expect(response.body.details).toContain('Database connection failed');

        restoreMock();
      });

      test('should return proper error structure when database fails', async () => {
        const restoreMock = mockDatabaseError();

        const response = await request(app).get('/health');

        expect(response.body).toMatchObject({
          server: 'ok',
          database: 'error',
          details: expect.any(String)
        });

        restoreMock();
      });
    });

    describe('Edge Cases', () => {
      test('should handle malformed requests gracefully', async () => {
        const response = await request(app)
          .get('/health')
          .set('Content-Type', 'application/json')
          .send('invalid json');

        // Should still respond to health check regardless of body
        expect([200, 400]).toContain(response.status);
      });

      test('should handle requests with query parameters', async () => {
        const response = await request(app)
          .get('/health?check=full&detailed=true');

        expectSuccess(response);
        expect(response.body).toHaveProperty('server', 'ok');
        expect(response.body).toHaveProperty('database', 'ok');
      });

      test('should handle requests with headers', async () => {
        const response = await request(app)
          .get('/health')
          .set('User-Agent', 'Health-Check-Bot/1.0')
          .set('X-Request-ID', 'test-12345');

        expectSuccess(response);
        expect(response.body).toHaveProperty('server', 'ok');
        expect(response.body).toHaveProperty('database', 'ok');
      });
    });

    describe('Performance Tests', () => {
      test('should handle multiple concurrent health checks', async () => {
        const { successfulRequests, totalRequests, avgResponseTime } = await performLoadTest(
          () => request(app).get('/health'),
          20, // 20 concurrent requests
          3   // 3 iterations
        );

        expect(successfulRequests).toBe(totalRequests);
        expect(avgResponseTime).toBeLessThan(500); // Should be very fast
      });

      test('should maintain performance under sustained load', async () => {
        const results = [];
        
        // Run health checks repeatedly to test sustained performance
        for (let i = 0; i < 10; i++) {
          const { duration } = await measureResponseTime(
            () => request(app).get('/health')
          );
          results.push(duration);
        }

        const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
        const maxDuration = Math.max(...results);

        expect(avgDuration).toBeLessThan(200);
        expect(maxDuration).toBeLessThan(1000);
      });

      test('should not degrade with repeated database connections', async () => {
        const iterations = 15;
        const durations = [];

        for (let i = 0; i < iterations; i++) {
          const { duration } = await measureResponseTime(
            () => request(app).get('/health')
          );
          durations.push(duration);
        }

        // Check that response times don't increase significantly over time
        const firstHalf = durations.slice(0, Math.floor(iterations / 2));
        const secondHalf = durations.slice(Math.floor(iterations / 2));

        const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        // Second half shouldn't be more than 2x slower than first half
        expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 2);
      });
    });

    describe('Integration Tests', () => {
      test('should verify actual database connectivity', async () => {
        // Ensure we can actually query the database
        const dbResult = await testPool.query('SELECT 1 as test_value');
        expect(dbResult.rows[0].test_value).toBe(1);

        const response = await request(app).get('/health');
        expectSuccess(response);
        expect(response.body.database).toBe('ok');
      });

      test('should handle database queries that take time', async () => {
        // Test with a slower query to ensure health check still works
        await testPool.query('SELECT pg_sleep(0.1)'); // 100ms delay

        const response = await request(app).get('/health');
        expectSuccess(response);
        expect(response.body.database).toBe('ok');
      });

      test('should work with various database states', async () => {
        // Test creating and dropping a temporary table
        await testPool.query('CREATE TEMP TABLE health_test (id INT)');
        
        const response1 = await request(app).get('/health');
        expectSuccess(response1);

        await testPool.query('DROP TABLE health_test');
        
        const response2 = await request(app).get('/health');
        expectSuccess(response2);
      });
    });

    describe('Response Format Validation', () => {
      test('should always return JSON response', async () => {
        const response = await request(app).get('/health');

        expect(response.type).toBe('application/json');
      });

      test('should have correct response headers', async () => {
        const response = await request(app).get('/health');

        expect(response.headers['content-type']).toMatch(/application\/json/);
      });

      test('should return consistent field types', async () => {
        const response = await request(app).get('/health');

        expect(typeof response.body.server).toBe('string');
        expect(typeof response.body.database).toBe('string');
        
        if (response.body.details) {
          expect(typeof response.body.details).toBe('string');
        }
      });
    });
  });
});
