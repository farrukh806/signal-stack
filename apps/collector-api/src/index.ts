import { config as dotenvConfig } from "dotenv";
import express from "express";
import { prisma } from "@repo/db";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.resolve(__dirname, "../../../.env")
});

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  const userCount = await prisma.user.count();
  res.json({ ok: true, db: true, userCount });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`api listening on http://localhost:${port}`);
});

