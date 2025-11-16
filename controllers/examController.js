import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Subject from '../models/Subject.js';

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

    res.status(201).json({
      message: 'Exam created successfully',
      exam: await Exam.findById(exam._id).populate('subject', 'name')
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams
export const getExams = async (req, res) => {
  try {
    const { subject } = req.query;
    const query = subject ? { subject } : {};

    const exams = await Exam.find(query)
      .populate('subject', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ exams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams across all subjects
export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('subject', 'name')
      .populate('createdBy', 'name email username')
      .sort({ createdAt: -1 });

    res.json({
      totalCount: exams.length,
      exams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single exam
export const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name')
      .populate('createdBy', 'name email');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

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

    res.json({
      message: 'Exam updated successfully',
      exam: await Exam.findById(exam._id).populate('subject', 'name')
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

