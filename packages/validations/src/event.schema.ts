import { z } from "zod";

const MAX_PROPERTIES_SIZE = 10000; // 10KB max for properties

export const ingestEventSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  name: z
    .string()
    .min(1, "Event name is required")
    .max(255, "Event name must be at most 255 characters"),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        const size = JSON.stringify(val).length;
        return size <= MAX_PROPERTIES_SIZE;
      },
      { message: `Properties must be at most ${MAX_PROPERTIES_SIZE} bytes` }
    ),
});

export type IngestEventInput = z.infer<typeof ingestEventSchema>;