import { Router } from "express";
import {
  handleCreateProject,
  handleGetProjects,
  handleGetProject,
  handleDeleteProject,
  handleUpdateProject,
} from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createProjectSchema } from "@repo/validations";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createProjectSchema), handleCreateProject);
router.get("/", handleGetProjects);
router.get("/:id", handleGetProject);
router.patch("/:id", handleUpdateProject);
router.delete("/:id", handleDeleteProject);

export default router;