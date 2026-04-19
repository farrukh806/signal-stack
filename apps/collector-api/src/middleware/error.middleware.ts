import type { Request, Response, NextFunction } from "express";
import { ZodValidationError } from "../utils/errors";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodValidationError) {
    res.status(400).json({
      error: "Validation failed",
      fields: err.fields,
    });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
