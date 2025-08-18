import express from "express";
import cors from "cors";
import http from "http";
import morgan from "morgan";
import authRoutes from "./routes/auth/auth.routes.ts";
import healthRoutes from "./routes/health/health.routes.ts";
import userValidationRoutes from './routes/users/user-validation.routes.ts';
import { NODE_ENVIRONMENT } from "./config/env.ts";
import fs from "fs";
import path from "path";


const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

if (NODE_ENVIRONMENT.isDev) {
  console.log("DEV ENV ACTIVE")
  morgan.token("body", (req: any) => {
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      const sanitizedBody = { ...req.body };
      const sensitiveFields = ["password", "token", "secret", "key"];
      sensitiveFields.forEach((field) => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = "***HIDDEN***";
        }
      });
      return JSON.stringify(sanitizedBody);
    }
    return "";
  });

  const logFormat =
    "🌐 :method :url | Status: :status | :response-time ms | IP: :remote-addr | Body: :body";

  // if (process.env.WRITE_LOGS_TO_FILE) {
  //   const logStream = fs.createWriteStream(
  //     path.join(__dirname, "../logs/server.log.txt"),
  //     { flags: "a" }
  //   );
  //   app.use(morgan(logFormat, { stream: logStream }));
  // } else {
  //   app.use(morgan(logFormat));
  // }
    app.use(morgan(logFormat));

}

app.use("/api/auth", authRoutes);

app.use("/api/health", healthRoutes);

app.use("/api/user-validation", userValidationRoutes);

const server = http.createServer(app);

const startServer = async () => {
  try {
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();