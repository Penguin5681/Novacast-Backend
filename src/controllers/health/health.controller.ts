import type { Request, Response } from "express";
import pool from "../../config/db.ts";

export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query("SELECT 1");
    res.status(200).json({
      server: "ok",
      database: "ok",
    });
  } catch (error) {
    res.status(500).json({
      server: "ok",
      database: "error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};