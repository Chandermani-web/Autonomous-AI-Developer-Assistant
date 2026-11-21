import express from "express";
import ChatController from "../controllers/chat.controller.js";

const router = express.Router();

router.post('/', ChatController.chat);
router.post('/stream', ChatController.streamChat);

export default router;
