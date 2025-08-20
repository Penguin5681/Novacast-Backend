import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/db.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const registerUser = async (req: Request, res: Response) => {
	const {username, email, password, handle} = req.body;
	
	// Validation
	if (!username || !email || !password || !handle) {
		return res.status(400).json({ message: "All fields are required" });
	}
	
	if (username.trim() === '' || email.trim() === '' || password.trim() === '' || handle.trim() === '') {
		return res.status(400).json({ message: "Fields cannot be empty" });
	}
	
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		await pool.query('INSERT INTO users(username, email, password_hash, handle) VALUES ($1, $2, $3, $4)', [username, email, hashedPassword, handle]);
		res.status(201).json({message: "User created successfully"});
	} catch (e) {
		res.status(500).json({ error: "" + e});
	}
};

export const loginUser = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  
  // Validation
  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifier and password are required" });
  }
  
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $1",
      [identifier]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET
    );
    
    // Remove sensitive data from user object
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      handle: user.handle,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
    res.status(200).json({
      token,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err });
  }
};