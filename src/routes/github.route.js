import { Router } from "express";
import githubController from "../controllers/github.controller.js";

const router = Router();

router.post("/chat", githubController.chat);
router.post("/chat/stream", githubController.stream);
export default router;