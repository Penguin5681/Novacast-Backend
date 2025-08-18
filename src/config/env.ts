import type { TNodeEnv } from "../types/env.js";

const nodeEnv = process.env.NODE_ENV as TNodeEnv;

if (nodeEnv !== "dev" && nodeEnv !== "prod") {
  throw new Error(`❌ Invalid NODE_ENV: ${process.env.NODE_ENV}`);
}

export const NODE_ENVIRONMENT = {
  NODE_ENV: nodeEnv,
  isDev: nodeEnv === "dev",
  isProd: nodeEnv === "prod",
};
