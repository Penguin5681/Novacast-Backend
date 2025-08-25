import type { Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const viewProfile = async(req: Request, res: Response) => {};

export const updateProfile = async(req: Request, res: Response) => {};