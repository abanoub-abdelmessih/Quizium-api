import User from "../models/User.js";
import Score from "../models/Score.js";
import Exam from "../models/Exam.js";
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
    const user = await User.findById(req.user._id, '-password -otp');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's quiz statistics
    const userScores = await Score.find({ user: req.user._id });
    const totalQuizzesTaken = userScores.length;
    const totalPointsGained = userScores.reduce((sum, score) => sum + score.score, 0);

    // Calculate rank
    const allScores = await Score.find({});
    const userBestScores = {};
    allScores.forEach(score => {
      const userId = score.user?.toString();
      if (!userId) return;
      if (!userBestScores[userId] || score.score > userBestScores[userId]) {
        userBestScores[userId] = score.score;
      }
    });

    const sortedUsers = Object.entries(userBestScores)
      .map(([userId, bestScore]) => ({ userId, bestScore }))
      .sort((a, b) => b.bestScore - a.bestScore);

    let rank = sortedUsers.findIndex(u => u.userId === req.user._id.toString()) + 1;
    if (rank === 0) rank = sortedUsers.length + 1;

    const totalUsers = sortedUsers.length || 1;
    const percentageRank = (rank / totalUsers) * 100;

    let topPercentageMessage = null;
    if (percentageRank <= 5 && rank > 0) {
      const roundedPercentage = Math.ceil(percentageRank);
      topPercentageMessage = `You are in the top ${roundedPercentage}% of ${totalUsers} learners!`;
    }

    const userObj = user.toObject ? user.toObject() : { ...user };
    res.json({
      user: {
        ...userObj,
        profileImage: userObj.profileImage,
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
    const user = await User.findOne(
      { username: username.toLowerCase() },
      'username name profileImage createdAt'
    );

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
    if (!user) return res.status(404).json({ message: "User not found" });

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
      user: { id: user._id, name: user.name, username: user.username, email: user.email, profileImage: user.profileImage },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profileImage) {
      try {
        const publicId = extractPublicId(user.profileImage);
        if (publicId) await deleteFromCloudinary(publicId, "auto");
      } catch (error) {
        console.error("Error deleting old image from Cloudinary:", error);
      }
    }

    const uploadResult = await uploadToCloudinary(req.file, "quizium/profile", "auto");
    user.profileImage = uploadResult.secure_url;
    await user.save();

    res.json({ message: "Profile image uploaded successfully", profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete profile image
export const deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.profileImage) {
      return res.status(400).json({ message: "No profile image to delete" });
    }

    try {
      const publicId = extractPublicId(user.profileImage);
      if (publicId) await deleteFromCloudinary(publicId, "image");
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
    }

    user.profileImage = null;
    await user.save();

    res.json({
      message: "Profile image deleted successfully",
      user: { id: user._id, name: user.name, username: user.username, email: user.email, profileImage: null },
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
      return res.status(400).json({ message: "Please provide current and new password" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

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
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const users = await User.find({}, { sort: { createdAt: -1 } });

    // Remove password/otp from each user
    const sanitizedUsers = users.map(u => {
      const obj = u.toObject ? u.toObject() : { ...u };
      delete obj.password;
      delete obj.otp;
      return obj;
    });

    res.json({
      message: "Users retrieved successfully",
      users: sanitizedUsers,
      totalCount: sanitizedUsers.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profileImage) {
      try {
        const publicId = extractPublicId(user.profileImage);
        if (publicId) await deleteFromCloudinary(publicId, "auto");
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
      }
    }

    await Score.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all users (admin only) - Except admins
export const deleteAllUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const { confirmation, adminPassword } = req.body;

    if (!confirmation || confirmation !== "DELETE_ALL_USERS") {
      return res.status(400).json({
        message: 'Confirmation required. Send { confirmation: "DELETE_ALL_USERS" } in request body.',
      });
    }

    if (!adminPassword) {
      return res.status(400).json({ message: "Admin password required for this operation" });
    }

    const adminUser = await User.findById(req.user._id);
    const isPasswordValid = await adminUser.comparePassword(adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    // Get all users
    const allUsers = await User.find({});
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const usersToDelete = allUsers.filter(u => !u.isAdmin);

    if (usersToDelete.length === 0) {
      return res.json({
        message: "No non-admin users found to delete",
        preservedAdmins: adminUsers.map(a => ({ id: a._id, username: a.username, email: a.email })),
      });
    }

    for (const user of usersToDelete) {
      if (user.profileImage) {
        try {
          const publicId = extractPublicId(user.profileImage);
          if (publicId) await deleteFromCloudinary(publicId, "auto");
        } catch (error) {
          console.error("Error deleting image for user:", user.username, error);
        }
      }
      await Score.deleteMany({ user: user._id });
      await User.findByIdAndDelete(user._id);
    }

    console.warn(`ADMIN ACTION: User ${req.user.username} deleted ${usersToDelete.length} non-admin users.`);

    res.json({
      message: `Successfully deleted ${usersToDelete.length} non-admin users`,
      deletedCount: usersToDelete.length,
      preservedAdmins: adminUsers.map(a => ({ id: a._id, username: a.username, email: a.email, name: a.name })),
      totalAdminsPreserved: adminUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get performance statistics for last 7 quizzes
export const getPerformanceStats = async (req, res) => {
  try {
    const recentScores = await Score.find(
      { user: req.user._id },
      { sort: { completedAt: -1 }, limit: 7 }
    );

    if (!recentScores || recentScores.length === 0) {
      return res.json({
        performanceData: [],
        overallAverage: 0,
        totalQuizzes: 0,
        message: "No quiz attempts found",
      });
    }

    // Populate exam info
    for (const score of recentScores) {
      if (score.exam && typeof score.exam === 'string') {
        const exam = await Exam.findById(score.exam);
        if (exam) {
          // Also get subject title
          let subjectTitle = "Unknown Subject";
          if (exam.subject && typeof exam.subject === 'string') {
            const Subject = (await import("../models/Subject.js")).default;
            const subjectDoc = await Subject.findById(exam.subject);
            if (subjectDoc) subjectTitle = subjectDoc.title;
          }
          score.exam = { _id: exam._id, title: exam.title, subject: { title: subjectTitle } };
        }
      }
    }

    const performanceData = recentScores.map(score => ({
      examTitle: score.exam?.title || "Unknown Exam",
      subject: score.exam?.subject?.title || "Unknown Subject",
      score: score.score,
      totalMarks: score.totalMarks,
      percentage: score.percentage,
      completedAt: score.completedAt,
      attemptNumber: score.attemptNumber,
    }));

    const totalPercentage = recentScores.reduce((sum, s) => sum + s.percentage, 0);
    const overallAverage = parseFloat((totalPercentage / recentScores.length).toFixed(2));

    res.json({ performanceData, overallAverage, totalQuizzes: recentScores.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
