import Score from "../models/Score.js";
import Exam from "../models/Exam.js";
import Question from "../models/Question.js";

// Submit exam answers
export const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body; // Array of { questionId, selectedAnswer }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers must be an array" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Get all questions for this exam
    const questions = await Question.find({ exam: examId });
    if (questions.length === 0) {
      return res.status(400).json({ message: "Exam has no questions" });
    }

    let score = 0;
    const answerDetails = [];

    // Check each answer
    for (const question of questions) {
      const userAnswer = answers.find(
        (a) => a.questionId === question._id.toString()
      );
      const selectedAnswer = userAnswer
        ? parseInt(userAnswer.selectedAnswer)
        : null;
      const isCorrect = selectedAnswer === question.correctAnswer;

      if (isCorrect) {
        score += question.marks;
      }

      answerDetails.push({
        question: question._id,
        selectedAnswer,
        isCorrect,
      });
    }

    const percentage = (score / exam.totalMarks) * 100;

    // Save score
    const scoreRecord = await Score.create({
      user: req.user._id,
      exam: examId,
      score,
      totalMarks: exam.totalMarks,
      percentage: parseFloat(percentage.toFixed(2)),
      answers: answerDetails,
    });

    res.status(201).json({
      message: "Exam submitted successfully",
      result: {
        score,
        totalMarks: exam.totalMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        answers: answerDetails.map((answer, index) => ({
          question: questions[index].questionText,
          options: questions[index].options,
          correctAnswer: questions[index].correctAnswer,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          marks: answer.isCorrect ? questions[index].marks : 0,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's exam results
export const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const score = await Score.findOne({
      user: req.user._id,
      exam: examId,
    })
      .populate("exam", "title subject")
      .populate("exam.subject", "title")
      .select("-answers")
      .sort({ completedAt: -1 });

    if (!score) {
      return res
        .status(404)
        .json({ message: "No results found for this exam" });
    }

    res.json({ result: score });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all user's scores
export const getUserScores = async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user._id })
      .populate("exam", "title subject")
      .populate("exam.subject", "title")
      .sort({ completedAt: -1 });

    res.json({ scores });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
