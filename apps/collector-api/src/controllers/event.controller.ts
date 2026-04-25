import type { Request, Response } from "express";
import { ingestEventSchema } from "@repo/validations";
import { findProjectByApiKey } from "../services/project.service";
import { validateDomain } from "../services/domain.service";
import { rateLimiter } from "../services/rate-limiter.service";
import { enqueueEvent } from "../services/queue.service";

export interface IngestRequest extends Request {
  projectId?: string;
}

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

function getUserAgent(req: Request): string {
  return req.headers["user-agent"] ?? "unknown";
}

export async function handleIngestEvent(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = ingestEventSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid payload",
      details: parsed.error.issues.map((e) => e.message),
    });
    return;
  }

  const { apiKey, name, properties } = parsed.data;

  const projectContext = await findProjectByApiKey(apiKey);

  if (!projectContext) {
    res.status(401).json({ success: false, error: "Invalid API key" });
    return;
  }

  const { allowed } = await rateLimiter.isAllowed(apiKey);

  if (!allowed) {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
    });
    return;
  }

  const origin = req.headers.origin;
  const domainResult = validateDomain(origin, projectContext.allowedDomains);

  if (!domainResult.valid) {
    res.status(403).json({
      success: false,
      error: "Domain not allowed",
    });
    return;
  }

  const timestamp = new Date();
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  await enqueueEvent({
    projectId: projectContext.projectId,
    name,
    properties,
    timestamp,
    ip,
    userAgent,
  });

  if (domainResult.suspicious) {
    res.setHeader("X-Suspicious-Request", "1");
  }

  res.status(202).json({ success: true });
}