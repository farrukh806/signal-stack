import type { Request, Response } from "express";
import { register, login, refreshTokens, logout } from "../services/auth.service";
import { prisma } from "@repo/db";
import { ACCESS_COOKIE_OPTIONS, COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "../constants";

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  try {
    const tokens = await register(email, password);

    res.cookie("accessToken", tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const tokens = await login(email, password);

    if (!tokens) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.cookie("accessToken", tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
}

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ error: "Refresh token required" });
    return;
  }

  try {
    const result = await refreshTokens(refreshToken);

    if (!result) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    res.cookie("accessToken", result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", result.newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({ message: "Token refreshed" });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await logout(refreshToken);
  }

  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);

  res.json({ message: "Logged out successfully" });
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  const accountId = req.accountId;

  if (!accountId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, createdAt: true },
  });

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(account);
}
