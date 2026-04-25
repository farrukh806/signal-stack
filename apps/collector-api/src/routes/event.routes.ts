import { Router } from "express";
import { handleIngestEvent } from "../controllers/event.controller";

const router = Router();

router.post("/", handleIngestEvent);

export default router;