import { prisma } from "@repo/db";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function getOrCreateSession(
  projectId: string,
  providedSessionId: string | undefined,
  timestamp: Date
): Promise<string> {
  if (providedSessionId) {
    const existing = await prisma.session.findFirst({
      where: { id: providedSessionId, projectId },
    });

    if (existing) {
      return existing.id;
    }
  }

  const newSession = await prisma.session.create({
    data: {
      projectId,
      startedAt: timestamp,
      endedAt: timestamp,
    },
  });

  return newSession.id;
}

export async function touchSession(sessionId: string, timestamp: Date): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { endedAt: timestamp },
  });
}

export async function isSessionExpired(sessionId: string, now: Date): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { endedAt: true },
  });

  if (!session) return true;

  const diff = now.getTime() - session.endedAt.getTime();
  return diff > SESSION_TIMEOUT_MS;
}