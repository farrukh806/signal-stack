import type { Request, Response, NextFunction } from "express";
import {
  totalEventsSchema,
  eventsOverTimeSchema,
  topEventsSchema,
  sessionMetricsSchema,
  userMetricsSchema,
} from "@repo/validations";
import {
  getTotalEvents,
  getEventsOverTime,
  getTopEvents,
  getSessionMetrics,
  getUserMetrics,
} from "../services/analytics.service";

export interface AnalyticsQueryRequest extends Request {
  validatedQuery?: Record<string, unknown>;
}

function parseDate(dateStr: unknown): Date | undefined {
  if (typeof dateStr === "string" && dateStr) {
    return new Date(dateStr);
  }
  return undefined;
}

export async function handleTotalEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = totalEventsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((e) => e.message),
      });
      return;
    }

    const { projectId, startDate, endDate, eventName } = parsed.data;
    const dateRange = { startDate: parseDate(startDate), endDate: parseDate(endDate) };

    const count = await getTotalEvents(projectId, dateRange, eventName);

    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function handleEventsOverTime(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = eventsOverTimeSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((e) => e.message),
      });
      return;
    }

    const { projectId, startDate, endDate } = parsed.data;
    const dateRange = { startDate: parseDate(startDate), endDate: parseDate(endDate) };

    const data = await getEventsOverTime(projectId, dateRange);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function handleTopEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = topEventsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((e) => e.message),
      });
      return;
    }

    const { projectId, startDate, endDate, limit } = parsed.data;
    const dateRange = { startDate: parseDate(startDate), endDate: parseDate(endDate) };

    const data = await getTopEvents(projectId, dateRange, undefined, limit);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function handleSessionMetrics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = sessionMetricsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((e) => e.message),
      });
      return;
    }

    const { projectId, startDate, endDate } = parsed.data;
    const dateRange = { startDate: parseDate(startDate), endDate: parseDate(endDate) };

    const data = await getSessionMetrics(projectId, dateRange);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function handleUserMetrics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = userMetricsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((e) => e.message),
      });
      return;
    }

    const { projectId, startDate, endDate } = parsed.data;
    const dateRange = { startDate: parseDate(startDate), endDate: parseDate(endDate) };

    const data = await getUserMetrics(projectId, dateRange);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}