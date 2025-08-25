import type { Request, Response } from "express";
import pool from "../../config/db.ts";
import { NODE_ENVIRONMENT } from "../../config/env.ts";
import { email } from "zod";

export const checkUsernameAvailability = async (
  req: Request,
  res: Response
) => {
  const { username } = req.body;
  
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({
      error: 'Username is required and must be a non-empty string'
    });
  }
  
  try {
    const result = await pool.query(
      "SELECT username FROM users WHERE username = $1",
      [username]
    );
    const exists = result.rows.length > 0;

    if (NODE_ENVIRONMENT.isDev) {
      console.log(
        "user-validation.controller.ts:13 checkUsernameAvailability => " +
          exists
      );
    }

    res.json({
      username,
      exists,
      available: !exists,
    });
  } catch (e) {
    res
      .status(500)
      .json({
        error:
          "user-validation.controller.ts:22 checkUsernameAvailability => Server Error => " +
          e,
      });
  }
};

export const checkEmailAvailability = async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({
      error: 'Email is required and must be a non-empty string'
    });
  }
  
  try {
    const result = await pool.query(
      "SELECT email FROM users WHERE email = $1",
      [email]
    );
    const exists = result.rows.length > 0;

    if (NODE_ENVIRONMENT.isDev) {
      console.log(
        "user-validation.controller.ts:51 checkEmailAvailability => " + exists
      );
    }

    res.json({
      email,
      exists,
      available: !exists,
    });
  } catch (e) {
    res
      .status(500)
      .json({
        error:
          "user-validation.controller.ts:62 checkEmailAvailability => Server Error => " +
          e,
      });
  }
};

export const checkHandleAvailability = async (req: Request, res: Response) => {
  const { handle } = req.body;

  if (!handle || typeof handle !== 'string' || handle.trim() === '') {
    return res.status(400).json({error: 'Handle is required and it must be a non-empty string'});
  }

  try {
    const result = await pool.query("SELECT handle FROM users WHERE handle = $1", [handle]);

    const exists = result.rows.length > 0;

    if (NODE_ENVIRONMENT.isDev) {
      console.log("user-validation.controller.ts:98 checkHandleAvailability => " + exists);

      res.json({
        handle,
        exists,
        available: !exists,
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({
        error:
          "user-validation.controller.ts:112 checkHandleAvailability => Server Error => " +
          err,
      });
  }
};
