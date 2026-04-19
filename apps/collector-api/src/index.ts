import { config as dotenvConfig } from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "@repo/db";
import authRoutes from "./routes/auth.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.resolve(__dirname, "../../../.env")
});

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);

app.get("/health", async (_req, res) => {
  const userCount = await prisma.user.count();
  res.json({ ok: true, db: true, userCount });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});

app.use(errorMiddleware);

