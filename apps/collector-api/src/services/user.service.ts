import { prisma } from "@repo/db";

export async function getOrCreateUser(
  userId: string,
  projectId: string
): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { id: userId, projectId },
  });

  if (existing) {
    return existing.id;
  }

  const user = await prisma.user.create({
    data: {
      id: userId,
      projectId,
    },
  });

  return user.id;
}