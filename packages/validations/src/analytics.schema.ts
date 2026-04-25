import { z } from "zod";

export const dateRangeSchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: "startDate must be before or equal to endDate" }
);

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export const eventNameFilterSchema = z.object({
  eventName: z.string().min(1).optional(),
});

export type EventNameFilterInput = z.infer<typeof eventNameFilterSchema>;

export const topEventsSchema = z.object({
  ...dateRangeSchema.shape,
  ...eventNameFilterSchema.shape,
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type TopEventsInput = z.infer<typeof topEventsSchema>;

export const sessionMetricsSchema = dateRangeSchema;

export type SessionMetricsInput = z.infer<typeof sessionMetricsSchema>;

export const userMetricsSchema = dateRangeSchema;

export type UserMetricsInput = z.infer<typeof userMetricsSchema>;