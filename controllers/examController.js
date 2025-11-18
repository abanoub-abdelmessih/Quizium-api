import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import Subject from "../models/Subject.js";

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
