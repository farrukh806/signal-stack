import { prisma } from "@repo/db";

export interface ProjectContext {
  projectId: string;
  allowedDomains: string[];
}

export async function findProjectByApiKey(
  apiKey: string
): Promise<ProjectContext | null> {
  const project = await prisma.project.findUnique({
    where: { apiKey },
    select: { id: true, allowedDomains: true },
  });

  if (!project) return null;

  return {
    projectId: project.id,
    allowedDomains: project.allowedDomains,
  };
}

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "sk_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function createProject(accountId: string, name: string) {
  const apiKey = generateApiKey();

  const project = await prisma.project.create({
    data: {
      name,
      apiKey,
      accountId,
    },
  });

  return project;
}

export async function getProjectsByAccount(accountId: string) {
  return prisma.project.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(projectId: string, accountId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, accountId },
  });
}

export async function deleteProject(projectId: string, accountId: string) {
  await prisma.project.deleteMany({
    where: { id: projectId, accountId },
  });
}

export async function updateProject(
  projectId: string,
  accountId: string,
  data: { name?: string; allowedDomains?: string[] }
): Promise<{ count: number }> {
  return prisma.project.updateMany({
    where: { id: projectId, accountId },
    data,
  });
}