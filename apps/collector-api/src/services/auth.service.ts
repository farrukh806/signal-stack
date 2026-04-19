import bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens";

const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function generateTokens(accountId: string, email: string): Promise<TokenPair> {
  const tokenId = crypto.randomUUID();

  const accessToken = signAccessToken({ accountId, email });
  const refreshToken = signRefreshToken({ accountId, tokenId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, accountId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string): Promise<TokenPair> {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const account = await prisma.account.create({
    data: { email, password: hashedPassword },
  });

  return generateTokens(account.id, account.email);
}

export async function login(email: string, password: string): Promise<TokenPair | null> {
  const account = await prisma.account.findUnique({ where: { email } });

  if (!account) return null;

  const passwordValid = await bcrypt.compare(password, account.password);
  if (!passwordValid) return null;

  return generateTokens(account.id, account.email);
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; newRefreshToken: string } | null> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    return null;
  }

  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const account = await prisma.account.findUnique({
    where: { id: payload.accountId },
  });

  if (!account) return null;

  const tokens = await generateTokens(account.id, account.email);
  return { accessToken: tokens.accessToken, newRefreshToken: tokens.refreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}
