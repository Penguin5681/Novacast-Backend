import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { testPool } from './setup.js';
import {
  generateTestUser,
  insertTestUser,
  expectSuccess,
  performLoadTest
} from './helpers.js';
import { registerUser, loginUser } from '../controllers/auth/auth.controller.ts';
import { healthCheck } from '../controllers/health/health.controller.ts';
import { checkUsernameAvailability, checkEmailAvailability } from '../controllers/users/user-validation.controller.ts';

// Create test app that mirrors the main app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Auth routes
  app.post('/api/auth/signup', registerUser);
  app.post('/api/auth/login', loginUser);
  
  // Health routes
  app.get('/api/health', healthCheck);
  
  // User validation routes
  app.post('/api/user-validation/username-check', checkUsernameAvailability);
  app.post('/api/user-validation/email-check', checkEmailAvailability);
  
  return app;
};

describe('Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Full User Registration Flow', () => {
    test('should complete full user registration workflow', async () => {
      const userData = generateTestUser();

      // Step 1: Check username availability
      const usernameCheck = await request(app)
        .post('/api/user-validation/username-check')
        .send({ username: userData.username });

      expectSuccess(usernameCheck);
      expect(usernameCheck.body.available).toBe(true);

      // Step 2: Check email availability
      const emailCheck = await request(app)
        .post('/api/user-validation/email-check')
        .send({ email: userData.email });

      expectSuccess(emailCheck);
      expect(emailCheck.body.available).toBe(true);

      // Step 3: Register user
      const registration = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expectSuccess(registration, 201);
      expect(registration.body.message).toBe('User created successfully');

      // Step 4: Verify username is now unavailable
      const usernameCheck2 = await request(app)
        .post('/api/user-validation/username-check')
        .send({ username: userData.username });

      expectSuccess(usernameCheck2);
      expect(usernameCheck2.body.available).toBe(false);

      // Step 5: Verify email is now unavailable
      const emailCheck2 = await request(app)
        .post('/api/user-validation/email-check')
        .send({ email: userData.email });

      expectSuccess(emailCheck2);
      expect(emailCheck2.body.available).toBe(false);

      // Step 6: Login with the new user
      const login = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: userData.username,
          password: userData.password
        });

      expectSuccess(login);
      expect(login.body).toHaveProperty('token');
      expect(login.body).toHaveProperty('user');
      expect(login.body.user.username).toBe(userData.username);
    });

    test('should prevent duplicate registrations', async () => {
      const userData = generateTestUser();

      // First registration should succeed
      const registration1 = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expectSuccess(registration1, 201);

      // Second registration with same data should fail
      const registration2 = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(registration2.status).toBe(500);
    });

    test('should handle partial duplicate data', async () => {
      const userData1 = generateTestUser();
      const userData2 = generateTestUser({
        username: userData1.username // Same username, different email
      });
      const userData3 = generateTestUser({
        email: userData1.email // Same email, different username
      });

      // Register first user
      const registration1 = await request(app)
        .post('/api/auth/signup')
        .send(userData1);

      expectSuccess(registration1, 201);

      // Try to register with same username should fail
      const registration2 = await request(app)
        .post('/api/auth/signup')
        .send(userData2);

      expect(registration2.status).toBe(500);

      // Try to register with same email should fail
      const registration3 = await request(app)
        .post('/api/auth/signup')
        .send(userData3);

      expect(registration3.status).toBe(500);
    });
  });

  describe('Authentication Flow', () => {
    test('should handle login with username', async () => {
      const user = await insertTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.username,
          password: user.originalPassword
        });

      expectSuccess(response);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(user.username);
    });

    test('should handle login with email', async () => {
      const user = await insertTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.email,
          password: user.originalPassword
        });

      expectSuccess(response);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(user.email);
    });

    test('should reject invalid credentials', async () => {
      const user = await insertTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.username,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('API Health and Monitoring', () => {
    test('should have healthy status across all endpoints', async () => {
      const healthResponse = await request(app).get('/api/health');

      expectSuccess(healthResponse);
      expect(healthResponse.body.server).toBe('ok');
      expect(healthResponse.body.database).toBe('ok');
    });

    test('should handle cross-origin requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expectSuccess(response);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should handle unsupported media type', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      expect([400, 415]).toContain(response.status);
    });

    test('should handle large request bodies', async () => {
      const largeData = {
        username: 'a'.repeat(10000),
        email: 'test@example.com',
        password: 'password123',
        handle: '@test'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(largeData);

      // Should either process or reject gracefully
      expect([201, 400, 413, 500]).toContain(response.status);
    });

    test('should handle malformed routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent health checks', async () => {
      const { successfulRequests, totalRequests, avgResponseTime } = await performLoadTest(
        () => request(app).get('/api/health'),
        25,
        3
      );

      expect(successfulRequests).toBe(totalRequests);
      expect(avgResponseTime).toBeLessThan(500);
    });

    test('should handle concurrent validation requests', async () => {
      const { successfulRequests, totalRequests } = await performLoadTest(
        () => {
          const testData = generateTestUser();
          return Promise.all([
            request(app).post('/api/user-validation/username-check').send({ username: testData.username }),
            request(app).post('/api/user-validation/email-check').send({ email: testData.email })
          ]);
        },
        10,
        2
      );

      expect(successfulRequests).toBe(totalRequests);
    });

    test('should handle mixed workload efficiently', async () => {
      const operations = [
        () => request(app).get('/api/health'),
        () => request(app).post('/api/user-validation/username-check').send({ username: `test_${Math.random()}` }),
        () => request(app).post('/api/user-validation/email-check').send({ email: `test${Math.random()}@example.com` })
      ];

      const results = await Promise.all(
        Array.from({ length: 50 }, () => {
          const randomOp = operations[Math.floor(Math.random() * operations.length)];
          return randomOp!();
        })
      );

      const successCount = results.filter(r => r.status >= 200 && r.status < 400).length;
      expect(successCount).toBeGreaterThan(45); // At least 90% success rate
    });
  });

  describe('Data Integrity', () => {
    test('should maintain database consistency under concurrent operations', async () => {
      const users = Array.from({ length: 5 }, () => generateTestUser());

      // Perform concurrent registrations
      const registrations = await Promise.allSettled(
        users.map(user => request(app).post('/api/auth/signup').send(user))
      );

      const successfulRegistrations = registrations.filter(
        r => r.status === 'fulfilled' && r.value.status === 201
      ).length;

      // Verify database state
      const dbCount = await testPool.query('SELECT COUNT(*) FROM users');
      expect(parseInt(dbCount.rows[0].count)).toBeGreaterThanOrEqual(successfulRegistrations);

      // Verify all successful registrations are queryable
      for (const registration of registrations) {
        if (registration.status === 'fulfilled' && registration.value.status === 201) {
          const userIndex = registrations.indexOf(registration);
          const userData = users[userIndex];

          const dbUser = await testPool.query(
            'SELECT * FROM users WHERE username = $1',
            [userData.username]
          );
          expect(dbUser.rows).toHaveLength(1);
        }
      }
    });

    test('should handle database transactions correctly', async () => {
      const userData = generateTestUser();

      // Register user
      await request(app).post('/api/auth/signup').send(userData);

      // Verify user exists with all expected fields
      const result = await testPool.query(
        'SELECT id, username, email, handle, password_hash, created_at FROM users WHERE username = $1',
        [userData.username]
      );

      expect(result.rows).toHaveLength(1);
      const user = result.rows[0];
      
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.handle).toBe(userData.handle);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password);
      expect(user.created_at).toBeDefined();
      expect(user.id).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    test('should not expose sensitive information in responses', async () => {
      const user = await insertTestUser();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.username,
          password: user.originalPassword
        });

      expectSuccess(loginResponse);
      expect(loginResponse.body.user).not.toHaveProperty('password_hash');
      expect(loginResponse.body.user).not.toHaveProperty('password');
    });

    test('should handle SQL injection attempts safely', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];

      for (const input of maliciousInputs) {
        // Test in username validation
        const usernameResponse = await request(app)
          .post('/api/user-validation/username-check')
          .send({ username: input });

        expectSuccess(usernameResponse);

        // Test in email validation
        const emailResponse = await request(app)
          .post('/api/user-validation/email-check')
          .send({ email: input + '@example.com' });

        expectSuccess(emailResponse);

        // Test in login
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            identifier: input,
            password: 'password'
          });

        expect(loginResponse.status).toBe(401); // Should reject, not crash
      }

      // Verify database integrity
      const tableCheck = await testPool.query('SELECT COUNT(*) FROM users');
      expect(tableCheck.rows).toBeDefined();
    });

    test('should rate limit or handle brute force attempts', async () => {
      const user = await insertTestUser();
      const attempts = 20;

      // Perform multiple failed login attempts
      const results = await Promise.all(
        Array.from({ length: attempts }, () =>
          request(app)
            .post('/api/auth/login')
            .send({
              identifier: user.username,
              password: 'wrongpassword'
            })
        )
      );

      // All should return 401 (no rate limiting implemented yet, but they should all fail)
      results.forEach(response => {
        expect(response.status).toBe(401);
      });

      // Verify legitimate login still works
      const legitimateLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: user.username,
          password: user.originalPassword
        });

      expectSuccess(legitimateLogin);
    });
  });
});
