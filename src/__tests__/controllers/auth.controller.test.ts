import request from 'supertest';
import express from 'express';
import { registerUser, loginUser } from '../../controllers/auth/auth.controller.js';
import { testPool } from '../setup.js';
import {
  generateTestUser,
  insertTestUser,
  expectValidationError,
  expectAuthError,
  expectServerError,
  expectSuccess,
  mockDatabaseError,
  performLoadTest
} from '../helpers.js';

describe('Auth Controller', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/register', registerUser);
    app.post('/login', loginUser);
  });

  describe('POST /register', () => {
    describe('Success Cases', () => {
      test('should register a new user with valid data', async () => {
        const userData = generateTestUser();

        const response = await request(app)
          .post('/register')
          .send(userData);

        expectSuccess(response, 201);
        expect(response.body).toHaveProperty('message', 'User created successfully');

        // Verify user was actually created in database
        const result = await testPool.query(
          'SELECT * FROM users WHERE email = $1',
          [userData.email]
        );
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].username).toBe(userData.username);
        expect(result.rows[0].email).toBe(userData.email);
        expect(result.rows[0].handle).toBe(userData.handle);
        expect(result.rows[0].password_hash).toBeDefined();
        expect(result.rows[0].password_hash).not.toBe(userData.password);
      });

      test('should hash password correctly', async () => {
        const userData = generateTestUser();

        await request(app)
          .post('/register')
          .send(userData);

        const result = await testPool.query(
          'SELECT password_hash FROM users WHERE email = $1',
          [userData.email]
        );

        const bcrypt = await import('bcryptjs');
        const isValidHash = await bcrypt.compare(userData.password, result.rows[0].password_hash);
        expect(isValidHash).toBe(true);
      });
    });

    describe('Validation Cases', () => {
      test('should reject registration with missing username', async () => {
        const userData = generateTestUser();
        delete userData.username;

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });

      test('should reject registration with missing email', async () => {
        const userData = generateTestUser();
        delete userData.email;

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });

      test('should reject registration with missing password', async () => {
        const userData = generateTestUser();
        delete userData.password;

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });

      test('should reject registration with missing handle', async () => {
        const userData = generateTestUser();
        delete userData.handle;

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });

      test('should reject registration with duplicate username', async () => {
        const userData1 = generateTestUser();
        const userData2 = generateTestUser({ username: userData1.username });

        await request(app).post('/register').send(userData1);
        
        const response = await request(app)
          .post('/register')
          .send(userData2);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });

      test('should reject registration with duplicate email', async () => {
        const userData1 = generateTestUser();
        const userData2 = generateTestUser({ email: userData1.email });

        await request(app).post('/register').send(userData1);
        
        const response = await request(app)
          .post('/register')
          .send(userData2);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });

      test('should reject registration with duplicate handle', async () => {
        const userData1 = generateTestUser();
        const userData2 = generateTestUser({ handle: userData1.handle });

        await request(app).post('/register').send(userData1);
        
        const response = await request(app)
          .post('/register')
          .send(userData2);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Edge Cases', () => {
      test('should handle very long username', async () => {
        const userData = generateTestUser({
          username: 'a'.repeat(300)
        });

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });

      test('should handle special characters in username', async () => {
        const userData = generateTestUser({
          username: 'test@#$%^&*()'
        });

        const response = await request(app)
          .post('/register')
          .send(userData);

        // Should either succeed or provide clear validation message
        expect([201, 500]).toContain(response.status);
      });

      test('should handle empty strings', async () => {
        const userData = {
          username: '',
          email: '',
          password: '',
          handle: ''
        };

        const response = await request(app)
          .post('/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Database Error Handling', () => {
      test('should handle database connection failure', async () => {
        const restoreMock = mockDatabaseError();
        const userData = generateTestUser();

        const response = await request(app)
          .post('/register')
          .send(userData);

        expectServerError(response);
        restoreMock();
      });
    });
  });

  describe('POST /login', () => {
    describe('Success Cases', () => {
      test('should login with valid username and password', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.username,
            password: user.originalPassword
          });

        expectSuccess(response);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.username).toBe(user.username);
        expect(response.body.user.email).toBe(user.email);
        expect(response.body.user).not.toHaveProperty('password_hash');
      });

      test('should login with valid email and password', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.email,
            password: user.originalPassword
          });

        expectSuccess(response);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(user.email);
      });

      test('should return valid JWT token', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.username,
            password: user.originalPassword
          });

        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET as string);
        expect(decoded).toHaveProperty('id');
        expect(decoded).toHaveProperty('username', user.username);
        expect(decoded).toHaveProperty('email', user.email);
      });
    });

    describe('Authentication Failures', () => {
      test('should reject login with invalid username', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            identifier: 'nonexistentuser',
            password: 'password123'
          });

        expectAuthError(response);
        expect(response.body.error).toBe('Invalid credentials');
      });

      test('should reject login with invalid email', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            identifier: 'nonexistent@example.com',
            password: 'password123'
          });

        expectAuthError(response);
        expect(response.body.error).toBe('Invalid credentials');
      });

      test('should reject login with wrong password', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.username,
            password: 'wrongpassword'
          });

        expectAuthError(response);
        expect(response.body.error).toBe('Invalid credentials');
      });

      test('should reject login with missing identifier', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      test('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            identifier: 'testuser'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Edge Cases', () => {
      test('should handle case sensitivity in username', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.username.toUpperCase(),
            password: user.originalPassword
          });

        // Should either be case-insensitive or return proper error
        expect([200, 401]).toContain(response.status);
      });

      test('should handle case sensitivity in email', async () => {
        const user = await insertTestUser();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: user.email.toUpperCase(),
            password: user.originalPassword
          });

        // Should either be case-insensitive or return proper error
        expect([200, 401]).toContain(response.status);
      });

      test('should handle SQL injection attempts', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            identifier: "'; DROP TABLE users; --",
            password: 'password'
          });

        expectAuthError(response);
        
        // Verify table still exists
        const result = await testPool.query('SELECT COUNT(*) FROM users');
        expect(result.rows).toBeDefined();
      });
    });

    describe('Database Error Handling', () => {
      test('should handle database connection failure during login', async () => {
        const restoreMock = mockDatabaseError();

        const response = await request(app)
          .post('/login')
          .send({
            identifier: 'testuser',
            password: 'password123'
          });

        expectServerError(response);
        restoreMock();
      });
    });
  });

  describe('Performance Tests', () => {
    test('registration should complete within reasonable time', async () => {
      const userData = generateTestUser();

      const { avgResponseTime } = await performLoadTest(
        () => request(app).post('/register').send(generateTestUser()),
        1,
        1
      );

      expect(avgResponseTime).toBeLessThan(5000); // 5 seconds
    });

    test('login should complete within reasonable time', async () => {
      const user = await insertTestUser();

      const { avgResponseTime } = await performLoadTest(
        () => request(app).post('/login').send({
          identifier: user.username,
          password: user.originalPassword
        }),
        5,
        3
      );

      expect(avgResponseTime).toBeLessThan(2000); // 2 seconds average
    });

    test('should handle concurrent registrations', async () => {
      const { successfulRequests, totalRequests } = await performLoadTest(
        () => request(app).post('/register').send(generateTestUser()),
        10,
        2
      );

      expect(successfulRequests).toBe(totalRequests);
    });

    test('should handle concurrent logins', async () => {
      const users: any[] = [];
      for (let i = 0; i < 5; i++) {
        users.push(await insertTestUser());
      }

      const { successfulRequests, totalRequests } = await performLoadTest(
        () => {
          const user = users[Math.floor(Math.random() * users.length)];
          return request(app).post('/login').send({
            identifier: user.username,
            password: user.originalPassword
          });
        },
        10,
        2
      );

      expect(successfulRequests).toBe(totalRequests);
    });
  });
});
