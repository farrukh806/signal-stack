import { z } from "zod";

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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

export const projectIdSchema = z.object({
  projectId: z.string().uuid({ message: "Invalid project ID" }),
});

export type ProjectIdInput = z.infer<typeof projectIdSchema>;

export const eventNameFilterSchema = z.object({
  eventName: z.string().min(1).optional(),
});

export type EventNameFilterInput = z.infer<typeof eventNameFilterSchema>;

export const totalEventsSchema = z.object({
  ...projectIdSchema.shape,
  ...dateRangeSchema.shape,
  ...eventNameFilterSchema.shape,
});

export type TotalEventsInput = z.infer<typeof totalEventsSchema>;

export const eventsOverTimeSchema = z.object({
  ...projectIdSchema.shape,
  ...dateRangeSchema.shape,
});

export type EventsOverTimeInput = z.infer<typeof eventsOverTimeSchema>;

export const topEventsSchema = z.object({
  ...projectIdSchema.shape,
  ...dateRangeSchema.shape,
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type TopEventsInput = z.infer<typeof topEventsSchema>;

export const sessionMetricsSchema = z.object({
  ...projectIdSchema.shape,
  ...dateRangeSchema.shape,
});

export type SessionMetricsInput = z.infer<typeof sessionMetricsSchema>;

export const userMetricsSchema = z.object({
  ...projectIdSchema.shape,
  ...dateRangeSchema.shape,
});

export type UserMetricsInput = z.infer<typeof userMetricsSchema>;