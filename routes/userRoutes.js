import express from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadProfileImage as uploadMiddleware } from "../middleware/upload.js";
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  changePassword,
  deleteAccount,
  getPublicProfile,
  getAllUsers,
  deleteAllUsers,
  deleteProfileImage,
} from "../controllers/userController.js";

const router = express.Router();

// Public route
router.get("/public/:username", getPublicProfile);

// All other routes require authentication
router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/profile/image", uploadMiddleware, uploadProfileImage);
router.delete("/profile/image", deleteProfileImage);
router.put("/change-password", changePassword);
router.delete("/account", deleteAccount);

// ! Admin only route

// Get all users
router.get("/admin/users", getAllUsers);

// Delete all users
router.delete("/admin/users", deleteAllUsers);

export default router;
