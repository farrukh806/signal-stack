import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  accountId: string;
  email: string;
}

export interface RefreshTokenPayload {
  accountId: string;
  tokenId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, process.env.ACCESS_SECRET!, {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRY ?? "15m") as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, process.env.REFRESH_SECRET!, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRY ?? "7d") as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.ACCESS_SECRET!) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, process.env.REFRESH_SECRET!) as RefreshTokenPayload;
}
