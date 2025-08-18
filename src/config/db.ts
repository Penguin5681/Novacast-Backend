import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const ENVIRONMENT = process.env.NODE_ENV;

const isDev = ENVIRONMENT === "dev";

const pool = new Pool({
	connectionString: isDev
		? process.env.LOCAL_DATABASE_URL
		: process.env.PROD_DATABASE_URL,
	ssl: isDev
		? { rejectUnauthorized: false }
		: { rejectUnauthorized: true },
});

export default pool;
