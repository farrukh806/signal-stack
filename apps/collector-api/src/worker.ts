import { config as dotenvConfig } from "dotenv";
import { Worker } from "bullmq";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventsQueueConfig } from "./config/queue";
import { processEventJob } from "./services/event-processor.service";
import type { EventJobPayload } from "./services/queue.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.resolve(__dirname, "../../../.env"),
});

const worker = new Worker<EventJobPayload>(
  eventsQueueConfig.name,
  async (job) => {
    await processEventJob(job.data);
  },
  {
    connection: eventsQueueConfig.connection,
    concurrency: 10,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed for project ${job.data.projectId} (${job.data.name})`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err.message);
});

const port = Number(process.env.WORKER_PORT ?? 3002);

async function shutdown(): Promise<void> {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

worker.run().then(() => {
  console.log(`Event worker listening on port ${port}`);
});