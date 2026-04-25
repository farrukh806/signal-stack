export type DomainValidationMode = "strict" | "soft";

export interface DomainValidationResult {
  valid: boolean;
  suspicious: boolean;
  reason?: string;
}

export function extractHostname(origin: string | undefined): string | null {
  if (!origin) return null;

  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return null;
  }
}

export function validateDomain(
  origin: string | undefined,
  allowedDomains: string[]
): DomainValidationResult {
  const hostname = extractHostname(origin);

  if (!hostname) {
    return {
      valid: false,
      suspicious: true,
      reason: "Missing or invalid Origin header",
    };
  }

  if (allowedDomains.length === 0) {
    return { valid: true, suspicious: false };
  }

  const isAllowed = allowedDomains.some((domain) => {
    if (domain === hostname) return true;
    if (domain.startsWith("*.") && hostname.endsWith(domain.slice(1))) {
      return true;
    }
    return false;
  });

  if (isAllowed) {
    return { valid: true, suspicious: false };
  }

  return {
    valid: false,
    suspicious: true,
    reason: `Domain "${hostname}" is not in allowed list`,
  };
}