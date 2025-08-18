import type { Request, Response } from "express";
import pool from "../../config/db.ts";
import { NODE_ENVIRONMENT } from "../../config/env.ts";

export const checkUsernameAvailability = async (
  req: Request,
  res: Response
) => {
  const { username } = req.body;
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
          "user-validation.controller.ts:65 checkEmailAvailability => Server Error => " +
          e,
      });
  }
};
