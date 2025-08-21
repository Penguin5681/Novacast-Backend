import request from 'supertest';
import express from 'express';
import { registerUser, loginUser } from '../../controllers/auth/auth.controller.js';
import { testPool } from '../setup.js';

describe('Auth Controller - Basic Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/register', registerUser);
    app.post('/login', loginUser);
  });

  afterEach(async () => {
    // Clean up test data
    await testPool.query('DELETE FROM users WHERE username LIKE $1', ['testuser_%']);
  });

  test('should register a new user', async () => {
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      handle: `@testhandle_${Date.now()}`
    };

    const response = await request(app)
      .post('/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User created successfully');
  });

  test('should reject registration with missing data', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        username: 'testuser',
        // missing email, password, handle
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should login with valid credentials', async () => {
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      handle: `@testhandle_${Date.now()}`
    };

    // First register the user
    await request(app).post('/register').send(userData);

    // Then try to login
    const response = await request(app)
      .post('/login')
      .send({
        identifier: userData.username,
        password: userData.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe(userData.username);
  });

  test('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        identifier: 'nonexistentuser',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('should handle concurrent registrations', async () => {
    const users = Array.from({ length: 5 }, (_, i) => ({
      username: `testuser_${Date.now()}_${i}`,
      email: `test_${Date.now()}_${i}@example.com`,
      password: 'TestPassword123!',
      handle: `@testhandle_${Date.now()}_${i}`
    }));

    const promises = users.map(user =>
      request(app).post('/register').send(user)
    );

    const responses = await Promise.all(promises);
    
    const successCount = responses.filter(r => r.status === 201).length;
    expect(successCount).toBe(5);
  });
});
