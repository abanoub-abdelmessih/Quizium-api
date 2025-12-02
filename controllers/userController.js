import User from "../models/User.js";
import Score from "../models/Score.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -otp");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's quiz statistics
    const userScores = await Score.find({ user: req.user._id });
    const totalQuizzesTaken = userScores.length;
    const totalPointsGained = userScores.reduce((sum, score) => sum + score.score, 0);

    // Calculate user's rank in the leaderboard
    // Get all users' best scores
    const allScores = await Score.find().populate('user', '_id');

    // Group by user to get their best scores
    const userBestScores = {};
    allScores.forEach(score => {
      const userId = score.user._id.toString();
      if (!userBestScores[userId] || score.score > userBestScores[userId]) {
        userBestScores[userId] = score.score;
      }
    });

    // Convert to array and sort by score (descending)
    const sortedUsers = Object.entries(userBestScores)
      .map(([userId, bestScore]) => ({ userId, bestScore }))
      .sort((a, b) => b.bestScore - a.bestScore);

    // Find user's rank
    const userBestScore = userBestScores[req.user._id.toString()] || 0;
    let rank = sortedUsers.findIndex(u => u.userId === req.user._id.toString()) + 1;

    // If user has no scores, rank is last
    if (rank === 0) {
      rank = sortedUsers.length + 1;
    }

    const totalUsers = sortedUsers.length || 1;
    const percentageRank = (rank / totalUsers) * 100;

    // Generate top percentage message if user is in top 5%
    let topPercentageMessage = null;
    if (percentageRank <= 5 && rank > 0) {
      const roundedPercentage = Math.ceil(percentageRank);
      topPercentageMessage = `You are in the top ${roundedPercentage}% of ${totalUsers} learners!`;
    }

    res.json({
      user: {
        ...user.toObject(),
        profileImage: user.profileImage, // Already a Cloudinary URL
        rank: rank,
        topPercentageMessage: topPercentageMessage,
        totalQuizzesTaken: totalQuizzesTaken,
        totalPointsGained: totalPointsGained,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get public user profile by username
export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: username.toLowerCase(),
    }).select("username name profileImage createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username,
      name: user.name,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile image from Cloudinary if exists
    if (user.profileImage) {
      try {
        const publicId = extractPublicId(user.profileImage);
        if (publicId) {
          await deleteFromCloudinary(publicId, "auto");
        }
      } catch (error) {
        console.error("Error deleting old image from Cloudinary:", error);
        // Continue even if deletion fails
      }
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file,
      "quizium/profile",
      "auto"
    );

    // Save Cloudinary URL to database
    user.profileImage = uploadResult.secure_url;
    await user.save();

    res.json({
      message: "Profile image uploaded successfully",
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Please provide current and new password" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const users = await User.find()
      .select("-password -otp")
      .sort({ createdAt: -1 });

    res.json({
      message: "Users retrieved successfully",
      users: users,
      totalCount: users.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete profile image from Cloudinary if exists
    if (user.profileImage) {
      try {
        const publicId = extractPublicId(user.profileImage);
        if (publicId) {
          await deleteFromCloudinary(publicId, "auto");
        }
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Continue even if deletion fails
      }
    }

    // Delete all user scores
    await Score.deleteMany({ user: user._id });

    await User.findByIdAndDelete(user._id);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all users (admin only) - Except all admin accounts
export const deleteAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Additional safety checks
    const { confirmation, adminPassword } = req.body;

    if (!confirmation || confirmation !== "DELETE_ALL_USERS") {
      return res.status(400).json({
        message:
          'Confirmation required. Send { confirmation: "DELETE_ALL_USERS" } in request body to proceed.',
      });
    }

    // Verify admin password for extra security
    if (!adminPassword) {
      return res.status(400).json({
        message: "Admin password required for this operation",
      });
    }

    const adminUser = await User.findById(req.user._id);
    const isPasswordValid = await adminUser.comparePassword(adminPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid admin password",
      });
    }

    // Get all admin users to preserve them
    const adminUsers = await User.find({ isAdmin: true }).select(
      "_id username email name"
    );

    // Get count of non-admin users to be deleted
    const usersToDeleteCount = await User.countDocuments({ isAdmin: false });

    if (usersToDeleteCount === 0) {
      return res.json({
        message: "No non-admin users found to delete",
        preservedAdmins: adminUsers,
      });
    }

    // Get all non-admin users for cleanup
    const usersToDelete = await User.find({ isAdmin: false });

    // Delete profile images from Cloudinary and user scores for non-admin users
    const cleanupPromises = usersToDelete.map(async (user) => {
      // Delete profile image from Cloudinary if exists
      if (user.profileImage) {
        try {
          const publicId = extractPublicId(user.profileImage);
          if (publicId) {
            await deleteFromCloudinary(publicId, "auto");
          }
        } catch (error) {
          console.error(
            "Error deleting image from Cloudinary for user:",
            user.username,
            error
          );
        }
      }

      // Delete all user scores
      await Score.deleteMany({ user: user._id });
    });

    await Promise.all(cleanupPromises);

    // Delete all non-admin users
    const result = await User.deleteMany({ isAdmin: false });

    console.warn(
      `ADMIN ACTION: User ${req.user.username} deleted ${result.deletedCount} non-admin users. Preserved ${adminUsers.length} admin accounts.`
    );

    res.json({
      message: `Successfully deleted ${result.deletedCount} non-admin users`,
      deletedCount: result.deletedCount,
      preservedAdmins: adminUsers.map((admin) => ({
        id: admin._id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
      })),
      totalAdminsPreserved: adminUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in deleteAllUsers:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete profile image
export const deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a profile image
    if (!user.profileImage) {
      return res.status(400).json({ message: "No profile image to delete" });
    }

    // Delete profile image from Cloudinary
    try {
      const publicId = extractPublicId(user.profileImage);
      if (publicId) {
        await deleteFromCloudinary(publicId, "image");
      }
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
      // Continue even if deletion fails to update database
    }

    // Remove profile image from database
    user.profileImage = null;
    await user.save();

    res.json({
      message: "Profile image deleted successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
