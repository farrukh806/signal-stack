import { Queue } from "bullmq";
import { eventsQueueConfig } from "../config/queue";

export interface EventJobPayload {
  projectId: string;
  name: string;
  properties: Record<string, unknown> | undefined;
  timestamp: Date;
  ip: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
}

export const eventsQueue = new Queue<EventJobPayload>(
  eventsQueueConfig.name,
  { connection: eventsQueueConfig.connection }
);

export async function enqueueEvent(payload: EventJobPayload): Promise<void> {
  await eventsQueue.add("event", payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}