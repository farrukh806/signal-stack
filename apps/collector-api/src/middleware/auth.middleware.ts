import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/tokens";

export interface AuthenticatedRequest extends Request {
  accountId?: string;
  accountEmail?: string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken) as AccessTokenPayload;
    req.accountId = payload.accountId;
    req.accountEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
