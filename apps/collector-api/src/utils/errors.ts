import type { ZodIssue } from "zod";

export class ZodValidationError extends Error {
  constructor(public readonly fields: ZodIssue[]) {
    super(formatZodErrors(fields));
    this.name = "ZodValidationError";
  }
}

function formatZodErrors(fields: ZodIssue[]): string {
  return fields.map((f) => `${f.path.join(".")}: ${f.message}`).join("; ");
}
