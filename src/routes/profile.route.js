import express from 'express';
import ProfileController from '../controllers/profile.controller.js';
import { IsAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", IsAuthenticated, ProfileController.createProfile);
router.post("/upload/profile/image", IsAuthenticated, ProfileController.uploadProfileImage);

router.post("/upload/cover/image", IsAuthenticated, ProfileController.uploadCoverImage);
router.get("/get-profile", IsAuthenticated, ProfileController.getProfile);

router.put("/update-profile/:user_id", IsAuthenticated, ProfileController.updateProfile);

// router.delete("/delete", IsAuthenticated, ProfileController.deleteProfile);

export default router;
