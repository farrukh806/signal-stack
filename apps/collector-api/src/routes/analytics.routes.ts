import { Router } from "express";
import {
  handleTotalEvents,
  handleEventsOverTime,
  handleTopEvents,
  handleSessionMetrics,
  handleUserMetrics,
} from "../controllers/analytics.controller";

const router = Router();

router.get("/total-events", handleTotalEvents);
router.get("/events-over-time", handleEventsOverTime);
router.get("/top-events", handleTopEvents);
router.get("/sessions", handleSessionMetrics);
router.get("/users", handleUserMetrics);

export default router;