import express from 'express';
import UserController from '../controllers/user.controller.js';
import { IsAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', UserController.register); 

router.post("/login", UserController.login);

router.get("/get-users", IsAuthenticated, UserController.getUsers);

router.put("/update-user/:id", IsAuthenticated, UserController.updateUser);

router.get("/get-user/:id", IsAuthenticated, UserController.getUsersById);

router.delete("/delete-user/:id", IsAuthenticated, UserController.deleteUser);   

export default router;