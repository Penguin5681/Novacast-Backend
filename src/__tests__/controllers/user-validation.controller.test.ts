import request from 'supertest';
import express from 'express';
import { checkUsernameAvailability, checkEmailAvailability } from '../../controllers/users/user-validation.controller.js';
import { testPool } from '../setup.js';
import {
  generateTestUser,
  insertTestUser,
  expectSuccess,
  expectServerError,
  mockDatabaseError,
  performLoadTest
} from '../helpers.js';

describe('User Validation Controller', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/username-check', checkUsernameAvailability);
    app.post('/email-check', checkEmailAvailability);
  });

  describe('POST /username-check', () => {
    describe('Success Cases', () => {
      test('should return available for non-existent username', async () => {
        const username = `testuser_${Date.now()}`;

        const response = await request(app)
          .post('/username-check')
          .send({ username });

        expectSuccess(response);
        expect(response.body).toEqual({
          username,
          exists: false,
          available: true
        });
      });

      test('should return unavailable for existing username', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/username-check')
          .send({ username: user.username });

        expectSuccess(response);
        expect(response.body).toEqual({
          username: user.username,
          exists: true,
          available: false
        });
      });

      test('should handle case sensitivity correctly', async () => {
        const user = await insertTestUser({ username: 'TestUser123' });

        const response = await request(app)
          .post('/username-check')
          .send({ username: 'testuser123' });

        expectSuccess(response);
        expect(response.body).toHaveProperty('username', 'testuser123');
        expect(response.body).toHaveProperty('exists');
        expect(response.body).toHaveProperty('available');
        expect(response.body.available).toBe(!response.body.exists);
      });
    });

    describe('Validation Cases', () => {
      test('should handle missing username', async () => {
        const response = await request(app)
          .post('/username-check')
          .send({});

        expect([400, 500]).toContain(response.status);
      });

      test('should handle null username', async () => {
        const response = await request(app)
          .post('/username-check')
          .send({ username: null });

        expect([400, 500]).toContain(response.status);
      });

      test('should handle undefined username', async () => {
        const response = await request(app)
          .post('/username-check')
          .send({ username: undefined });

        expect([400, 500]).toContain(response.status);
      });

      test('should handle empty username', async () => {
        const response = await request(app)
          .post('/username-check')
          .send({ username: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Edge Cases', () => {
      test('should handle very long username', async () => {
        const longUsername = 'a'.repeat(300);

        const response = await request(app)
          .post('/username-check')
          .send({ username: longUsername });

        expectSuccess(response);
        expect(response.body.username).toBe(longUsername);
      });

      test('should handle special characters in username', async () => {
        const specialUsername = 'test@#$%^&*()';

        const response = await request(app)
          .post('/username-check')
          .send({ username: specialUsername });

        expectSuccess(response);
        expect(response.body.username).toBe(specialUsername);
      });

      test('should handle unicode characters', async () => {
        const unicodeUsername = 'тест用户名试验';

        const response = await request(app)
          .post('/username-check')
          .send({ username: unicodeUsername });

        expectSuccess(response);
        expect(response.body.username).toBe(unicodeUsername);
      });

      test('should handle SQL injection attempts', async () => {
        const maliciousUsername = "'; DROP TABLE users; --";

        const response = await request(app)
          .post('/username-check')
          .send({ username: maliciousUsername });

        expectSuccess(response);
        expect(response.body.username).toBe(maliciousUsername);

        const result = await testPool.query('SELECT COUNT(*) FROM users');
        expect(result.rows).toBeDefined();
      });
    });

    describe('Performance Tests', () => {
      test('should handle multiple usernames efficiently', async () => {
        const usernames = Array.from({ length: 10 }, (_, i) => `testuser${i}`);
        const promises = usernames.map(username =>
          request(app).post('/username-check').send({ username })
        );

        const responses = await Promise.all(promises);
        responses.forEach(response => {
          expectSuccess(response);
          expect(response.body).toHaveProperty('available', true);
        });
      });

      test('should perform well under load', async () => {
        const { avgResponseTime, successfulRequests, totalRequests } = await performLoadTest(
          () => request(app).post('/username-check').send({ 
            username: `loadtest_${Math.random().toString(36).substr(2, 9)}` 
          }),
          15,
          3
        );

        expect(successfulRequests).toBe(totalRequests);
        expect(avgResponseTime).toBeLessThan(1000);
      });
    });

    describe('Database Error Handling', () => {
      test('should handle database connection failure', async () => {
        const restoreMock = mockDatabaseError();

        const response = await request(app)
          .post('/username-check')
          .send({ username: 'testuser' });

        expectServerError(response);
        expect(response.body.error).toContain('Server Error');

        restoreMock();
      });
    });
  });

  describe('POST /email-check', () => {
    describe('Success Cases', () => {
      test('should return available for non-existent email', async () => {
        const email = `test_${Date.now()}@example.com`;

        const response = await request(app)
          .post('/email-check')
          .send({ email });

        expectSuccess(response);
        expect(response.body).toEqual({
          email,
          exists: false,
          available: true
        });
      });

      test('should return unavailable for existing email', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/email-check')
          .send({ email: user.email });

        expectSuccess(response);
        expect(response.body).toEqual({
          email: user.email,
          exists: true,
          available: false
        });
      });

      test('should handle case sensitivity in email correctly', async () => {
        const user = await insertTestUser({ email: 'Test@Example.com' });

        const response = await request(app)
          .post('/email-check')
          .send({ email: 'test@example.com' });

        expectSuccess(response);
        expect(response.body).toHaveProperty('email', 'test@example.com');
        expect(response.body).toHaveProperty('exists');
        expect(response.body).toHaveProperty('available');
        expect(response.body.available).toBe(!response.body.exists);
      });
    });

    describe('Validation Cases', () => {
      test('should handle missing email', async () => {
        const response = await request(app)
          .post('/email-check')
          .send({});

        expect([400, 500]).toContain(response.status);
      });

      test('should handle null email', async () => {
        const response = await request(app)
          .post('/email-check')
          .send({ email: null });

        expect([400, 500]).toContain(response.status);
      });

      test('should handle empty email', async () => {
        const response = await request(app)
          .post('/email-check')
          .send({ email: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      test('should handle invalid email formats', async () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example',
          'test space@example.com'
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/email-check')
            .send({ email });

          expectSuccess(response);
          expect(response.body.email).toBe(email);
        }
      });
    });

    describe('Edge Cases', () => {
      test('should handle very long email', async () => {
        const longEmail = 'a'.repeat(250) + '@example.com';

        const response = await request(app)
          .post('/email-check')
          .send({ email: longEmail });

        expectSuccess(response);
        expect(response.body.email).toBe(longEmail);
      });

      test('should handle special characters in email', async () => {
        const specialEmail = 'test+tag@example.com';

        const response = await request(app)
          .post('/email-check')
          .send({ email: specialEmail });

        expectSuccess(response);
        expect(response.body.email).toBe(specialEmail);
      });

      test('should handle international domain names', async () => {
        const intlEmail = 'test@测试.com';

        const response = await request(app)
          .post('/email-check')
          .send({ email: intlEmail });

        expectSuccess(response);
        expect(response.body.email).toBe(intlEmail);
      });

      test('should handle SQL injection attempts in email', async () => {
        const maliciousEmail = "test'; DROP TABLE users; --@example.com";

        const response = await request(app)
          .post('/email-check')
          .send({ email: maliciousEmail });

        expectSuccess(response);
        expect(response.body.email).toBe(maliciousEmail);

        const result = await testPool.query('SELECT COUNT(*) FROM users');
        expect(result.rows).toBeDefined();
      });
    });

    describe('Performance Tests', () => {
      test('should handle multiple email checks efficiently', async () => {
        const emails = Array.from({ length: 10 }, (_, i) => `test${i}@example.com`);
        const promises = emails.map(email =>
          request(app).post('/email-check').send({ email })
        );

        const responses = await Promise.all(promises);
        responses.forEach(response => {
          expectSuccess(response);
          expect(response.body).toHaveProperty('available', true);
        });
      });

      test('should perform well under concurrent load', async () => {
        const { avgResponseTime, successfulRequests, totalRequests } = await performLoadTest(
          () => request(app).post('/email-check').send({ 
            email: `loadtest_${Math.random().toString(36).substr(2, 9)}@example.com` 
          }),
          20,
          2
        );

        expect(successfulRequests).toBe(totalRequests);
        expect(avgResponseTime).toBeLessThan(1000);
      });
    });

    describe('Database Error Handling', () => {
      test('should handle database connection failure', async () => {
        const restoreMock = mockDatabaseError();

        const response = await request(app)
          .post('/email-check')
          .send({ email: 'test@example.com' });

        expectServerError(response);
        expect(response.body.error).toContain('Server Error');

        restoreMock();
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work together correctly', async () => {
      const userData = generateTestUser();

      const usernameResponse = await request(app)
        .post('/username-check')
        .send({ username: userData.username });

      const emailResponse = await request(app)
        .post('/email-check')
        .send({ email: userData.email });

      expect(usernameResponse.body.available).toBe(true);
      expect(emailResponse.body.available).toBe(true);

      await insertTestUser(userData);

      const usernameResponse2 = await request(app)
        .post('/username-check')
        .send({ username: userData.username });

      const emailResponse2 = await request(app)
        .post('/email-check')
        .send({ email: userData.email });

      expect(usernameResponse2.body.available).toBe(false);
      expect(emailResponse2.body.available).toBe(false);
    });

    test('should handle bulk validation requests', async () => {
      const testData = Array.from({ length: 5 }, () => generateTestUser());
      
      const initialChecks = await Promise.all([
        ...testData.map(data => request(app).post('/username-check').send({ username: data.username })),
        ...testData.map(data => request(app).post('/email-check').send({ email: data.email }))
      ]);

      initialChecks.forEach(response => {
        expectSuccess(response);
        expect(response.body.available).toBe(true);
      });

      await Promise.all(testData.map(data => insertTestUser(data)));

      const finalChecks = await Promise.all([
        ...testData.map(data => request(app).post('/username-check').send({ username: data.username })),
        ...testData.map(data => request(app).post('/email-check').send({ email: data.email }))
      ]);

      finalChecks.forEach(response => {
        expectSuccess(response);
        expect(response.body.available).toBe(false);
      });
    });

    test('should maintain data consistency', async () => {
      const iterations = 10;
      const userData = generateTestUser();

      const preChecks = await Promise.all(
        Array.from({ length: iterations }, () => Promise.all([
          request(app).post('/username-check').send({ username: userData.username }),
          request(app).post('/email-check').send({ email: userData.email })
        ]))
      );

      preChecks.flat().forEach(response => {
        expectSuccess(response);
        expect(response.body.available).toBe(true);
      });

      await insertTestUser(userData);

      const postChecks = await Promise.all(
        Array.from({ length: iterations }, () => Promise.all([
          request(app).post('/username-check').send({ username: userData.username }),
          request(app).post('/email-check').send({ email: userData.email })
        ]))
      );

      postChecks.flat().forEach(response => {
        expectSuccess(response);
        expect(response.body.available).toBe(false);
      });
    });
  });
});
