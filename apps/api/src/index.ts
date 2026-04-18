import "dotenv/config";
import express from "express";
import { prisma } from "@repo/db";

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

