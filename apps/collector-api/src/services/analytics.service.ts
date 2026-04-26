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

function buildDateFilter(
  where: Record<string, unknown>,
  dateRange?: DateRange
): void {
  if (dateRange?.startDate && dateRange?.endDate) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  } else if (dateRange?.startDate) {
    where.createdAt = { gte: dateRange.startDate };
  } else if (dateRange?.endDate) {
    where.createdAt = { lte: dateRange.endDate };
  }
}

export async function getTotalEvents(
  projectId: string,
  dateRange?: DateRange,
  eventName?: string
): Promise<number> {
  const where: Record<string, unknown> = { projectId };
  buildDateFilter(where, dateRange);
  if (eventName) where.name = eventName;

  const result = await prisma.event.aggregate({ where, _count: true });
  return result._count;
}

export async function getEventsOverTime(
  projectId: string,
  dateRange?: DateRange
): Promise<EventCountByDate[]> {
  const params: (string | Date)[] = [projectId];
  let sql = `SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*) AS count
    FROM "Event"
    WHERE "projectId" = $1`;

  if (dateRange?.startDate) {
    params.push(dateRange.startDate);
    sql += ` AND "createdAt" >= $${params.length}`;
  }
  if (dateRange?.endDate) {
    params.push(dateRange.endDate);
    sql += ` AND "createdAt" <= $${params.length}`;
  }

  sql += ` GROUP BY DATE_TRUNC('day', "createdAt")::date ORDER BY date ASC`;

  const result = await prisma.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(sql, ...params);

  return result.map((row) => ({
    date: row.date.toISOString().split("T")[0] as string,
    count: Number(row.count),
  }));
}

export async function getTopEvents(
  projectId: string,
  dateRange?: DateRange,
  eventName?: string,
  limit: number = 10
): Promise<EventTopEvent[]> {
  const params: (string | Date | number)[] = [projectId];
  let sql = `SELECT name, COUNT(*) AS count
    FROM "Event"
    WHERE "projectId" = $1`;

  if (eventName) {
    params.push(eventName);
    sql += ` AND name = $${params.length}`;
  }
  if (dateRange?.startDate) {
    params.push(dateRange.startDate);
    sql += ` AND "createdAt" >= $${params.length}`;
  }
  if (dateRange?.endDate) {
    params.push(dateRange.endDate);
    sql += ` AND "createdAt" <= $${params.length}`;
  }

  sql += ` GROUP BY name ORDER BY count DESC LIMIT ${limit}`;

  const result = await prisma.$queryRawUnsafe<Array<{ name: string; count: bigint }>>(sql, ...params);

  return result.map((row) => ({
    name: row.name,
    count: Number(row.count),
  }));
}

export async function getSessionMetrics(
  projectId: string,
  dateRange?: DateRange
): Promise<SessionMetricsResult> {
  const params: (string | Date)[] = [projectId];
  let whereClause = `"projectId" = $1`;

  if (dateRange?.startDate) {
    params.push(dateRange.startDate);
    whereClause += ` AND "startedAt" >= $${params.length}`;
  }
  if (dateRange?.endDate) {
    params.push(dateRange.endDate);
    whereClause += ` AND "startedAt" <= $${params.length}`;
  }

  const sessionsSql = `SELECT DATE_TRUNC('day', "startedAt")::date AS date, COUNT(*) AS count
    FROM "Session"
    WHERE ${whereClause}
    GROUP BY DATE_TRUNC('day', "startedAt")::date
    ORDER BY date ASC`;

  const avgSql = `SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) AS avg
    FROM "Session"
    WHERE ${whereClause} AND "endedAt" > "startedAt"`;

  const [sessionsResult, avgResult] = await prisma.$transaction([
    prisma.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(sessionsSql, ...params),
    prisma.$queryRawUnsafe<Array<{ avg: number | null }>>(avgSql, ...params),
  ]);

  const totalSessions = sessionsResult.reduce((sum, row) => sum + Number(row.count), 0);

  return {
    totalSessions,
    averageDuration: avgResult[0]?.avg ?? null,
    sessionsPerDay: sessionsResult.map((row) => ({
      date: row.date.toISOString().split("T")[0] as string,
      count: Number(row.count),
    })),
  };
}

export async function getUserMetrics(
  projectId: string,
  dateRange?: DateRange
): Promise<UserMetricsResult> {
  const params: (string | Date)[] = [projectId];
  let dateCondition = ``;

  if (dateRange?.startDate) {
    params.push(dateRange.startDate);
    dateCondition += ` AND "createdAt" >= $${params.length}`;
  }
  if (dateRange?.endDate) {
    params.push(dateRange.endDate);
    dateCondition += ` AND "createdAt" <= $${params.length}`;
  }

  const totalSql = `SELECT COUNT(DISTINCT "userId") AS count
    FROM "Event"
    WHERE "projectId" = $1 AND "userId" IS NOT NULL${dateCondition}`;

  const dauSql = `SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(DISTINCT "userId") AS count
    FROM "Event"
    WHERE "projectId" = $1 AND "userId" IS NOT NULL${dateCondition}
    GROUP BY DATE_TRUNC('day', "createdAt")::date
    ORDER BY date ASC`;

  const [totalResult, dauResult] = await prisma.$transaction([
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(totalSql, ...params),
    prisma.$queryRawUnsafe<Array<{ date: Date; count: bigint }>>(dauSql, ...params),
  ]);

  let newUsers = 0;
  let returningUsers = 0;

  if (dateRange?.startDate) {
    const firstSeenParams: (string | Date)[] = [projectId];
    let firstSeenCondition = `"projectId" = $1 AND "userId" IS NOT NULL`;

    if (dateRange?.endDate) {
      firstSeenParams.push(dateRange.endDate);
      firstSeenCondition += ` AND "createdAt" <= $${firstSeenParams.length}`;
    }

    const firstSeenSql = `SELECT "userId", MIN("createdAt")::date AS firstSeen
      FROM "Event"
      WHERE ${firstSeenCondition}
      GROUP BY "userId"`;

    const firstSeenResult = await prisma.$queryRawUnsafe<Array<{ userId: string; firstSeen: Date }>>(
      firstSeenSql,
      ...firstSeenParams
    );

    for (const row of firstSeenResult) {
      if (row.firstSeen >= dateRange.startDate) {
        newUsers++;
      } else {
        returningUsers++;
      }
    }
  } else {
    newUsers = Number(totalResult[0]?.count ?? 0n);
  }

  return {
    totalUsers: Number(totalResult[0]?.count ?? 0n),
    newUsers,
    returningUsers,
    dailyActiveUsers: dauResult.map((row) => ({
      date: row.date.toISOString().split("T")[0] as string,
      count: Number(row.count),
    })),
  };
}