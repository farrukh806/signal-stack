/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@repo/db";

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface EventCountByDate {
  date: string;
  count: number;
}

export interface EventTopEvent {
  name: string;
  count: number;
}

export interface SessionMetricsResult {
  totalSessions: number;
  averageDuration: number | null;
  sessionsPerDay: EventCountByDate[];
}

export interface UserMetricsResult {
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  dailyActiveUsers: EventCountByDate[];
}

export async function getTotalEvents(
  projectId: string,
  dateRange?: DateRange,
  eventName?: string
): Promise<number> {
  const where: any = { projectId };
  if (dateRange?.startDate) where.createdAt = { gte: dateRange.startDate };
  if (dateRange?.endDate) where.createdAt = { ...where.createdAt, lte: dateRange.endDate };
  if (eventName) where.name = eventName;

  const result = await prisma.event.aggregate({ where, _count: true });
  return result._count;
}

export async function getEventsOverTime(
  projectId: string,
  dateRange?: DateRange
): Promise<EventCountByDate[]> {
  const where: any = { projectId };
  if (dateRange?.startDate) where.createdAt = { gte: dateRange.startDate };
  if (dateRange?.endDate) where.createdAt = { ...where.createdAt, lte: dateRange.endDate };

  const events = await prisma.event.findMany({ where, select: { createdAt: true } });

  const countByDate: Record<string, number> = {};
  for (const event of events) {
    const dateStr = event.createdAt.toISOString().split("T")[0] as string;
    countByDate[dateStr] = (countByDate[dateStr] ?? 0) + 1;
  }

  return Object.entries(countByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopEvents(
  projectId: string,
  dateRange?: DateRange,
  eventName?: string,
  limit: number = 10
): Promise<EventTopEvent[]> {
  const where: any = { projectId };
  if (dateRange?.startDate) where.createdAt = { gte: dateRange.startDate };
  if (dateRange?.endDate) where.createdAt = { ...where.createdAt, lte: dateRange.endDate };
  if (eventName) where.name = eventName;

  const events = await prisma.event.findMany({ where, select: { name: true } });

  const countByName: Record<string, number> = {};
  for (const event of events) {
    countByName[event.name] = (countByName[event.name] ?? 0) + 1;
  }

  return Object.entries(countByName)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getSessionMetrics(
  projectId: string,
  dateRange?: DateRange
): Promise<SessionMetricsResult> {
  const where: any = { projectId };
  if (dateRange?.startDate) where.startedAt = { gte: dateRange.startDate };
  if (dateRange?.endDate) where.startedAt = { ...where.startedAt, lte: dateRange.endDate };

  const sessions = await prisma.session.findMany({
    where,
    select: { startedAt: true, endedAt: true },
  });

  let totalDuration = 0;
  let durationCount = 0;

  for (const session of sessions) {
    const duration = session.endedAt.getTime() - session.startedAt.getTime();
    if (duration >= 0) {
      totalDuration += duration;
      durationCount++;
    }
  }

  const averageDuration = durationCount > 0 ? totalDuration / durationCount : null;

  const sessionsPerDay: Record<string, number> = {};
  for (const session of sessions) {
    const dateStr = session.startedAt.toISOString().split("T")[0] as string;
    sessionsPerDay[dateStr] = (sessionsPerDay[dateStr] ?? 0) + 1;
  }

  return {
    totalSessions: sessions.length,
    averageDuration,
    sessionsPerDay: Object.entries(sessionsPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getUserMetrics(
  projectId: string,
  dateRange?: DateRange
): Promise<UserMetricsResult> {
  const eventWhere: any = { projectId };
  if (dateRange?.startDate) eventWhere.createdAt = { gte: dateRange.startDate };
  if (dateRange?.endDate) eventWhere.createdAt = { ...eventWhere.createdAt, lte: dateRange.endDate };

  const events = await prisma.event.findMany({
    where: eventWhere,
    select: { userId: true, createdAt: true },
  });

  const userActivityMap: Record<string, Set<string>> = {};
  const userFirstSeen: Record<string, string> = {};

  for (const event of events) {
    if (!event.userId) continue;

    const dateStr = event.createdAt.toISOString().split("T")[0] as string;

    if (!userFirstSeen[event.userId]) {
      userFirstSeen[event.userId] = dateStr;
    }

    if (!userActivityMap[dateStr]) {
      userActivityMap[dateStr] = new Set();
    }
    userActivityMap[dateStr].add(event.userId);
  }

  const totalUsers = Object.keys(userFirstSeen).length;

  let newUsers = 0;
  let returningUsers = 0;

  if (dateRange?.startDate) {
    for (const [, firstSeen] of Object.entries(userFirstSeen)) {
      const firstSeenDate = new Date(firstSeen);
      if (firstSeenDate >= dateRange.startDate) {
        newUsers++;
      } else {
        returningUsers++;
      }
    }
  } else {
    newUsers = totalUsers;
  }

  const dailyActiveUsers = Object.entries(userActivityMap)
    .map(([date, users]) => ({ date, count: users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalUsers, newUsers, returningUsers, dailyActiveUsers };
}