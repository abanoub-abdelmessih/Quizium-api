import Question from '../models/Question.js';
import Exam from '../models/Exam.js';

// Create question
export const createQuestion = async (req, res) => {
  try {
    const { exam, questionText, options, correctAnswer, marks } = req.body;

    if (!exam || !questionText || !options || correctAnswer === undefined) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question must have at least 2 options' });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({ message: 'Correct answer index is invalid' });
    }

    const examExists = await Exam.findById(exam);
    if (!examExists) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const question = await Question.create({
      exam,
      questionText,
      options,
      correctAnswer: parseInt(correctAnswer),
      marks: marks ? parseInt(marks) : 1,
      createdBy: req.user._id
    });

    // Update exam total marks
    const totalMarks = await Question.aggregate([
      { $match: { exam: examExists._id } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    examExists.totalMarks = totalMarks[0]?.total || 0;
    await examExists.save();

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all questions for an exam
export const getQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const questions = await Question.find({ exam: examId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });

    // Hide correct answers for non-admin users
    const isAdmin = req.user && req.user.isAdmin;
    const questionsToReturn = questions.map(q => {
      const questionObj = q.toObject();
      if (!isAdmin) {
        delete questionObj.correctAnswer;
      }
      return questionObj;
    });

    res.json({ questions: questionsToReturn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single question
export const getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('exam', 'title')
      .populate('createdBy', 'name email');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Hide correct answer for non-admin users
    const isAdmin = req.user && req.user.isAdmin;
    const questionObj = question.toObject();
    if (!isAdmin) {
      delete questionObj.correctAnswer;
    }

    res.json({ question: questionObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { questionText, options, correctAnswer, marks } = req.body;
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (questionText) question.questionText = questionText;
    if (options) {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'Question must have at least 2 options' });
      }
      question.options = options;
    }
    if (correctAnswer !== undefined) {
      const optionsArray = options || question.options;
      if (correctAnswer < 0 || correctAnswer >= optionsArray.length) {
        return res.status(400).json({ message: 'Correct answer index is invalid' });
      }
      question.correctAnswer = parseInt(correctAnswer);
    }
    if (marks !== undefined) question.marks = parseInt(marks);

    await question.save();

    // Update exam total marks
    const exam = await Exam.findById(question.exam);
    const totalMarks = await Question.aggregate([
      { $match: { exam: exam._id } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    exam.totalMarks = totalMarks[0]?.total || 0;
    await exam.save();

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const examId = question.exam;
    await Question.findByIdAndDelete(question._id);

    // Update exam total marks
    const exam = await Exam.findById(examId);
    const totalMarks = await Question.aggregate([
      { $match: { exam: examId } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    exam.totalMarks = totalMarks[0]?.total || 0;
    await exam.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

