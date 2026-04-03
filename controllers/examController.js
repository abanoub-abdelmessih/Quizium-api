import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';

// Create exam
export const createExam = async (req, res) => {
  try {
    const { title, description, subject, duration, totalMarks } = req.body;

    if (!title || !subject || !duration) {
      return res.status(400).json({ message: 'Title, subject, and duration are required' });
    }

    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const exam = await Exam.create({
      title,
      description,
      subject,
      duration: parseInt(duration),
      totalMarks: totalMarks ? parseInt(totalMarks) : 0,
      createdBy: req.user._id
    });

    // Populate subject info manually
    exam.subject = { _id: subjectExists._id, title: subjectExists.title };

    res.status(201).json({
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to populate exam references
async function populateExam(exam) {
  if (!exam) return exam;

  // Populate subject
  if (exam.subject && typeof exam.subject === 'string') {
    const subject = await Subject.findById(exam.subject);
    exam.subject = subject ? { _id: subject._id, title: subject.title } : exam.subject;
  }

  // Populate createdBy
  if (exam.createdBy && typeof exam.createdBy === 'string') {
    const user = await User.findById(exam.createdBy, 'name email username');
    exam.createdBy = user ? { _id: user._id, name: user.name, email: user.email, username: user.username } : exam.createdBy;
  }

  return exam;
}

// Get all exams
export const getExams = async (req, res) => {
  try {
    const { subject } = req.query;
    const query = subject ? { subject } : {};

    const exams = await Exam.find(query, { sort: { createdAt: -1 } });

    // Populate each exam
    const populatedExams = await Promise.all(exams.map(populateExam));

    res.json({ exams: populatedExams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams across all subjects
export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find({}, { sort: { createdAt: -1 } });

    // Populate each exam
    const populatedExams = await Promise.all(exams.map(populateExam));

    res.json({
      totalCount: populatedExams.length,
      exams: populatedExams
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
      return res.status(404).json({ message: 'Exam not found' });
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
    const { title, description, duration, totalMarks } = req.body;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration) exam.duration = parseInt(duration);
    if (totalMarks !== undefined) exam.totalMarks = parseInt(totalMarks);

    await exam.save();

    const updated = await Exam.findById(exam._id);
    await populateExam(updated);

    res.json({
      message: 'Exam updated successfully',
      exam: updated
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
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Delete all questions associated with this exam
    await Question.deleteMany({ exam: exam._id });

    await Exam.findByIdAndDelete(exam._id);

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
