import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const ENVIRONMENT = process.env.NODE_ENV;

const isDev = ENVIRONMENT === "dev";
const isTest = ENVIRONMENT === "test";

const getDatabaseUrl = () => {
  if (isTest) {
    return process.env.TEST_DATABASE_URL || process.env.LOCAL_DATABASE_URL;
  }
  return isDev 
    ? process.env.LOCAL_DATABASE_URL
    : process.env.PROD_DATABASE_URL;
};

const pool = new Pool({
	connectionString: getDatabaseUrl(),
	ssl: (isDev || isTest)
		? { rejectUnauthorized: false }
		: { rejectUnauthorized: true },
});

export default pool;
