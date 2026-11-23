import { Router } from "express";
import dashboardController from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/overview", dashboardController.overview);
router.get("/gmail", dashboardController.gmail);
router.get("/github", dashboardController.github);
router.get("/postgres", dashboardController.postgres);
router.get("/queues", dashboardController.queues);

export default router;
