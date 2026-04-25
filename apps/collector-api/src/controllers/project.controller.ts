import type { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createProject,
  getProjectsByAccount,
  getProjectById,
  deleteProject,
  updateProject,
} from "../services/project.service";

export async function handleCreateProject(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const accountId = req.accountId!;
  const { name } = req.body;

  try {
    const project = await createProject(accountId, name);
    res.status(201).json(project);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}

export async function handleGetProjects(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const accountId = req.accountId!;

  try {
    const projects = await getProjectsByAccount(accountId);
    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
}

export async function handleGetProject(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const accountId = req.accountId!;
  const id = req.params.id as string;

  try {
    const project = await getProjectById(id, accountId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ error: "Failed to get project" });
  }
}

export async function handleDeleteProject(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const accountId = req.accountId!;
  const id = req.params.id as string;

  try {
    const project = await getProjectById(id, accountId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await deleteProject(id, accountId);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
}

export async function handleUpdateProject(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const accountId = req.accountId!;
  const id = req.params.id as string;
  const { name, allowedDomains } = req.body;

  try {
    const project = await getProjectById(id, accountId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const updated = await updateProject(id, accountId, { name, allowedDomains });
    res.json(updated);
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
}