import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import { verifyAdminPassword } from "../utils/adminAuth.js";

// Helper to populate exam references
async function populateExam(exam) {
  if (!exam) return exam;

  if (exam.subject && typeof exam.subject === 'string') {
    const subject = await Subject.findById(exam.subject);
    exam.subject = subject ? { _id: subject._id, title: subject.title } : exam.subject;
  }

  if (exam.createdBy && typeof exam.createdBy === 'string') {
    const user = await User.findById(exam.createdBy, 'name email username');
    exam.createdBy = user ? { _id: user._id, name: user.name, email: user.email, username: user.username } : exam.createdBy;
  }

  return exam;
}

// Create exam
export const createExam = async (req, res) => {
  try {
    const { title, description, subject, duration, totalMarks, difficulty, status } = req.body;

    if (!title || !subject || !duration || !difficulty) {
      return res.status(400).json({
        message: "Title, subject, duration, and difficulty are required",
      });
    }

    const validDifficulties = ["beginner", "intermediate", "advanced"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        message: "Difficulty must be: beginner, intermediate, or advanced",
      });
    }

    const validStatuses = ['available', 'upcoming', 'archived'];
    if (!status) {
      return res.status(400).json({
        message: "Status is required. Must be one of: available, upcoming, archived"
      });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: available, upcoming, archived"
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
      status: status,
    });

    exam.subject = { _id: subjectExists._id, title: subjectExists.title };

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams with filtering
export const getExams = async (req, res) => {
  try {
    const { subject, difficulty, limit, sort } = req.query;

    // Build query - Firestore doesn't support $in, so we filter in-memory for status
    const query = {};
    if (subject) query.subject = subject;
    if (difficulty) {
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      if (validDifficulties.includes(difficulty)) {
        query.difficulty = difficulty;
      }
    }

    const isUserAdmin = req.user?.isAdmin || false;

    const sortOrder = sort === 'oldest' ? 1 : -1;
    const options = { sort: { createdAt: sortOrder } };
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum > 0) options.limit = limitNum;
    }

    let exams = await Exam.find(query, options);

    // Populate each exam
    const populatedExams = await Promise.all(exams.map(populateExam));

    // Filter by status in-memory (Firestore doesn't support $in)
    let filteredExams = populatedExams;
    if (!isUserAdmin) {
      filteredExams = populatedExams.filter(e =>
        e.status === 'available' || e.status === 'upcoming' || !e.status
      );
    }

    // Calculate eligibility for each exam
    const Score = (await import('../models/Score.js')).default;
    const userScores = await Score.find({ user: req.user._id });

    const examAttemptsMap = {};
    userScores.forEach(score => {
      const examId = (score.exam && typeof score.exam === 'object') ? score.exam._id?.toString() : score.exam?.toString();
      if (!examId) return;
      if (!examAttemptsMap[examId]) examAttemptsMap[examId] = [];
      examAttemptsMap[examId].push(score);
    });

    const examsWithEligibility = filteredExams.map(exam => {
      const examId = exam._id.toString();
      const attempts = examAttemptsMap[examId] || [];
      const attemptCount = attempts.length;

      let canTakeExam = true;
      let isPassed = false;
      let remainingAttempts = 2 - attemptCount;

      const passedAttempt = attempts.find(a => a.percentage >= 50);
      if (passedAttempt) isPassed = true;

      if (attemptCount >= 2) {
        canTakeExam = false;
        remainingAttempts = 0;
      } else if (isPassed) {
        canTakeExam = false;
        remainingAttempts = 0;
      }

      const examObj = exam.toObject ? exam.toObject() : { ...exam };
      return { ...examObj, canTakeExam, isPassed, remainingAttempts };
    });

    res.json({
      exams: examsWithEligibility,
      totalCount: examsWithEligibility.length,
      filters: {
        subject: subject || "all",
        difficulty: difficulty || "all",
        limit: limit ? parseInt(limit) : "all",
        sort: sort || "latest",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single exam
export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await populateExam(exam);
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const { title, description, duration, totalMarks, difficulty, status } = req.body;
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

    if (status !== undefined) {
      const validStatuses = ['available', 'upcoming', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be one of: available, upcoming, archived"
        });
      }
      exam.status = status;
    }

    await exam.save();

    const updated = await Exam.findById(exam._id);
    await populateExam(updated);

    res.json({
      message: "Exam updated successfully",
      exam: updated,
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

    await Question.deleteMany({ exam: exam._id });
    await Exam.findByIdAndDelete(exam._id);

    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all exams (admin only)
export const deleteAllExams = async (req, res) => {
  try {
    const { confirmation, adminPassword } = req.body;

    if (!confirmation || confirmation !== "DELETE_ALL_EXAMS") {
      return res.status(400).json({
        message: 'Confirmation required. Send { confirmation: "DELETE_ALL_EXAMS", adminPassword: "your_password" } in request body.',
      });
    }

    if (!verifyAdminPassword(adminPassword)) {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    const adminUser = await User.findById(req.user._id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    const totalExams = await Exam.countDocuments();
    const totalQuestions = await Question.countDocuments();

    if (totalExams === 0) {
      return res.json({
        message: "No exams found to delete",
        stats: { totalExams: 0, totalQuestions },
      });
    }

    await Question.deleteMany({});
    await Exam.deleteMany({});

    console.warn(`ADMIN ACTION: User ${adminUser.username} (${adminUser.email}) deleted all exams`);

    res.json({
      message: "Successfully deleted all exams and questions from the system",
      summary: {
        deletedExams: totalExams,
        deletedQuestions: totalQuestions,
      },
      warning: "This action is irreversible.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in deleteAllExams:", error);
    res.status(500).json({ message: "Failed to delete all exams" });
  }
};
