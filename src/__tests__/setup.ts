import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgres://penguin:t_pranav@localhost:5432/novacast_test',
  ssl: { rejectUnauthorized: false }
});

beforeAll(async () => {
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      handle VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

afterEach(async () => {
  await testPool.query('DELETE FROM users');
});

afterAll(async () => {
  await testPool.end();
  
  // Also close the main app pool used by controllers
  try {
    const pool = require('../config/db.ts').default;
    await pool.end();
  } catch (e) {
    // Ignore if already closed
  }
});

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};