import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

// Create exam
export const createExam = async (req, res) => {
  try {
    const { title, description, subject, duration, totalMarks, difficulty } =
      req.body;

    if (!title || !subject || !duration || !difficulty) {
      return res.status(400).json({
        message: "Title, subject, duration, and difficulty are required",
      });
    }

    // Validate difficulty level
    const validDifficulties = ["beginner", "intermediate", "advanced"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        message: "Difficulty must be: beginner, intermediate, or advanced",
      });
    }

    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const exam = await Exam.create({
      title,
      description,
      subject,
      difficulty,
      duration: parseInt(duration),
      totalMarks: totalMarks ? parseInt(totalMarks) : 0,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam: await Exam.findById(exam._id).populate("subject", "title"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams with filtering by subject
export const getExams = async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    const query = {};

    // Build query based on filters
    if (subject) query.subject = subject;
    if (difficulty) {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      if (validDifficulties.includes(difficulty)) {
        query.difficulty = difficulty;
      }
    }

    const exams = await Exam.find(query)
      .populate("subject", "title")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      exams,
      totalCount: exams.length,
      filters: {
        subject: subject || "all",
        difficulty: difficulty || "all",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams across all subjects with advanced filtering
export const getAllExams = async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    const query = {};

    // Build query based on filters
    if (subject) query.subject = subject;
    if (difficulty) {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      if (validDifficulties.includes(difficulty)) {
        query.difficulty = difficulty;
      }
    }

    const exams = await Exam.find(query)
      .populate("subject", "title")
      .populate("createdBy", "name email username")
      .sort({ createdAt: -1 });

    res.json({
      totalCount: exams.length,
      exams,
      filters: {
        subject: subject || "all",
        difficulty: difficulty || "all",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single exam
export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("subject", "title")
      .populate("createdBy", "name email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const { title, description, duration, totalMarks, difficulty } = req.body;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration) exam.duration = parseInt(duration);
    if (totalMarks !== undefined) exam.totalMarks = parseInt(totalMarks);

    if (difficulty) {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          message: "Difficulty must be: beginner, intermediate, or advanced",
        });
      }
      exam.difficulty = difficulty;
    }

    await exam.save();

    res.json({
      message: "Exam updated successfully",
      exam: await Exam.findById(exam._id).populate("subject", "title"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete exam
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Delete all questions associated with this exam
    await Question.deleteMany({ exam: exam._id });

    await Exam.findByIdAndDelete(exam._id);

    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all exams (admin only) - Enhanced security version
export const deleteAllExams = async (req, res) => {
  try {
    const { confirmation, adminPassword } = req.body;

    // Safety confirmation check
    if (!confirmation || confirmation !== "DELETE_ALL_EXAMS") {
      return res.status(400).json({
        message:
          'Confirmation required. Send { confirmation: "DELETE_ALL_EXAMS", adminPassword: "your_password" } in request body to proceed.',
      });
    }

    // Verify admin password
    if (!adminPassword || adminPassword !== "quiziumAdmin1103") {
      return res.status(401).json({
        message: "Invalid admin password",
      });
    }

    // Additional security: Verify the user is actually an admin
    const adminUser = await User.findById(req.user._id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
      });
    }

    // Get exam statistics before deletion
    const totalExams = await Exam.countDocuments();
    const totalQuestions = await Question.countDocuments();

    if (totalExams === 0) {
      return res.json({
        message: "No exams found to delete",
        stats: {
          totalExams: 0,
          totalQuestions: totalQuestions,
        },
      });
    }

    // Get exam details for logging
    const examDetails = await Exam.find()
      .populate("subject", "title")
      .select("title difficulty subject createdAt")
      .sort({ createdAt: -1 })
      .limit(10); // Log only last 10 exams for brevity

    // Delete all questions first
    const questionDeleteResult = await Question.deleteMany({});

    // Then delete all exams
    const examDeleteResult = await Exam.deleteMany({});

    // Log the action with details
    console.warn(
      `ADMIN ACTION: User ${adminUser.username} (${adminUser.email}) deleted all exams`,
      {
        action: "DELETE_ALL_EXAMS",
        adminUser: {
          id: adminUser._id,
          username: adminUser.username,
          email: adminUser.email,
        },
        deleted: {
          exams: examDeleteResult.deletedCount,
          questions: questionDeleteResult.deletedCount,
        },
        lastExamsDeleted: examDetails.map((exam) => ({
          title: exam.title,
          difficulty: exam.difficulty,
          subject: exam.subject?.title || "Unknown",
          createdAt: exam.createdAt,
        })),
        timestamp: new Date().toISOString(),
      }
    );

    res.json({
      message: `Successfully deleted all exams and questions from the system`,
      summary: {
        deletedExams: examDeleteResult.deletedCount,
        deletedQuestions: questionDeleteResult.deletedCount,
        previousStats: {
          totalExams: totalExams,
          totalQuestions: totalQuestions,
        },
      },
      warning:
        "This action is irreversible. All exam and question data has been permanently deleted.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in deleteAllExams:", error);
    res.status(500).json({
      message: "Failed to delete all exams",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
