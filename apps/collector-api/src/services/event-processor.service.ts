import { prisma } from "@repo/db";
import type { EventJobPayload } from "./queue.service";
import { getOrCreateSession } from "./session.service";
import { getOrCreateUser } from "./user.service";
import { parseUserAgent } from "./user-agent.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

function sanitizeProperties(props: Record<string, unknown> | undefined): JsonValue | undefined {
  return props as JsonValue;
}

export async function processEventJob(payload: EventJobPayload): Promise<void> {
  const { projectId, name, properties, timestamp, ip: _ip, userAgent, sessionId: providedSessionId, userId } = payload;

  const sessionId = await getOrCreateSession(projectId, providedSessionId, timestamp);

  const userIdToUse = userId ? await getOrCreateUser(userId, projectId) : undefined;

  const deviceInfo = parseUserAgent(userAgent);

  await prisma.$transaction(async (tx) => {
    await tx.event.create({
      data: {
        name,
        properties: sanitizeProperties(properties),
        projectId,
        sessionId,
        userId: userIdToUse,
        createdAt: timestamp,
      },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: { endedAt: timestamp, userId: userIdToUse },
    });

    if (name === "page_view" && properties?.path) {
      const path = typeof properties.path === "string" ? properties.path : String(properties.path);

      await tx.pageView.create({
        data: {
          path,
          projectId,
          sessionId,
          createdAt: timestamp,
        },
      });
    }

    await tx.device.upsert({
      where: { sessionId },
      create: {
        sessionId,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
      },
      update: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
      },
    });
  });
}