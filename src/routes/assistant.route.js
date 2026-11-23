import { Router } from "express";
import assistantController from "../controllers/assistant.controller.js";

const router = Router();

router.post("/chat", assistantController.chat);
// router.post("/chat/stream", assistantController.stream);
export default router;