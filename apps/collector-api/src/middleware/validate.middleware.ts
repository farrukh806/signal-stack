import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";
import { ZodValidationError } from "../utils/errors";

export function validate(schema: { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: ZodIssue[] } } }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ZodValidationError(result.error!.issues);
    }
    req.body = result.data;
    next();
  };
}
