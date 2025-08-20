import request from 'supertest';
import express from 'express';
import { testPool } from './setup.ts';
import pool from '../config/db.ts';

export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};


export const generateTestUser = (overrides?: any) => ({
  username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
  password: 'TestPassword123!',
  handle: `@testhandle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  ...overrides
});

export const generateMultipleTestUsers = (count: number) => {
  return Array.from({ length: count }, () => generateTestUser());
};


export const insertTestUser = async (userData?: any) => {
  const user = generateTestUser(userData);
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(user.password, 10);
  
  const result = await testPool.query(
    'INSERT INTO users(username, email, password_hash, handle) VALUES ($1, $2, $3, $4) RETURNING *',
    [user.username, user.email, hashedPassword, user.handle]
  );
  
  return { ...result.rows[0], originalPassword: user.password };
};

export const insertMultipleTestUsers = async (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await insertTestUser());
  }
  return users;
};


export const generateTestToken = (payload?: any) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: 1, username: 'testuser', email: 'test@example.com', ...payload },
    process.env.JWT_SECRET || 'test_secret_key_for_testing_only'
  );
};


export const expectValidationError = (response: any, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('error');
  if (field) {
    expect(response.body.error).toContain(field);
  }
};

export const expectAuthError = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('error');
};

export const expectServerError = (response: any) => {
  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('error');
};

export const expectSuccess = (response: any, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
};


export const mockDatabaseError = () => {
  // Mock the main pool used by controllers
  const originalQuery = pool.query;
  pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));
  return () => {
    pool.query = originalQuery;
  };
};


export const measureResponseTime = async (requestFn: () => Promise<any>) => {
  const start = Date.now();
  const response = await requestFn();
  const duration = Date.now() - start;
  return { response, duration };
};


export const performLoadTest = async (
  requestFn: () => Promise<any>, 
  concurrentRequests: number = 10,
  iterations: number = 5
) => {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const promises = Array.from({ length: concurrentRequests }, () => 
      measureResponseTime(requestFn)
    );
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }
  
  const durations = results.map(r => r.duration);
  const avgResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxResponseTime = Math.max(...durations);
  const minResponseTime = Math.min(...durations);
  
  return {
    results,
    avgResponseTime,
    maxResponseTime,
    minResponseTime,
    totalRequests: results.length,
    successfulRequests: results.filter(r => r.response.status < 400).length
  };
};
