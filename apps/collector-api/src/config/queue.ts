export const eventsQueueConfig = {
  name: "events",
  connection: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  },
};