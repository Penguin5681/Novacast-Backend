import request from 'supertest';
import express from 'express';
import { registerUser } from '../../controllers/auth/auth.controller.js';

describe('Auth Controller - Debug Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/register', registerUser);
  });

  test('should show registration error details', async () => {
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      handle: `@testhandle_${Date.now()}`
    };

    const response = await request(app)
      .post('/register')
      .send(userData);

    console.log('Response status:', response.status);
    console.log('Response body:', response.body);

    expect(response.status).toBeGreaterThan(0); // Just check we got a response
  });
});
