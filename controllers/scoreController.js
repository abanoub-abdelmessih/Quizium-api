import Score from "../models/Score.js";
import Exam from "../models/Exam.js";
import Question from "../models/Question.js";

// Submit exam answers
// Submit exam answers with retake validation
export const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers must be an array" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check if user has already taken this exam
    const existingScores = await Score.find({
      user: req.user._id,
      exam: examId,
    }).sort({ completedAt: -1 });

    const latestScore = existingScores[0];
    const attemptCount = existingScores.length;

    // Validation rules
    if (attemptCount >= 2) {
      return res.status(400).json({
        message: "You have already used both attempts for this exam",
        previousAttempts: existingScores.map((score) => ({
          score: score.score,
          percentage: score.percentage,
          completedAt: score.completedAt,
        })),
      });
    }

    if (attemptCount === 1 && latestScore.percentage >= 50) {
      return res.status(400).json({
        message: "You have already passed this exam and cannot retake it",
        previousScore: {
          score: latestScore.score,
          percentage: latestScore.percentage,
          completedAt: latestScore.completedAt,
        },
      });
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
      attemptNumber: attemptCount + 1,
    });

    const response = {
      message: "Exam submitted successfully",
      result: {
        score,
        totalMarks: exam.totalMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        attemptNumber: attemptCount + 1,
        isRetake: attemptCount > 0,
      },
    };

    // Add comparison data if this is a retake
    if (attemptCount === 1) {
      const previousScore = existingScores[1]; // Get the first attempt
      const scoreImprovement = score - previousScore.score;
      const percentageImprovement = percentage - previousScore.percentage;

      response.comparison = {
        previousAttempt: {
          score: previousScore.score,
          percentage: previousScore.percentage,
          completedAt: previousScore.completedAt,
        },
        improvement: {
          score: scoreImprovement,
          percentage: percentageImprovement,
          status:
            scoreImprovement > 0
              ? "improved"
              : scoreImprovement < 0
              ? "declined"
              : "same",
        },
      };
    }

    res.status(201).json(response);
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
      .select("-answers")
      .sort({ completedAt: -1 });

    res.json({ scores });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get detailed exam answers (only for users who took the exam)
export const getExamAnswers = async (req, res) => {
  try {
    const { examId } = req.params;

    // Check if user has taken this exam
    const score = await Score.findOne({
      user: req.user._id,
      exam: examId,
    })
      .populate("exam", "title subject")
      .populate("exam.subject", "title")
      .populate("answers.question", "questionText options correctAnswer marks")
      .sort({ completedAt: -1 });

    if (!score) {
      return res.status(404).json({
        message: "You have not taken this exam yet or no results found",
      });
    }

    // Return the full result with answers
    res.json({
      message: "Exam answers retrieved successfully",
      result: score,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if user can take an exam
export const checkExamEligibility = async (req, res) => {
  try {
    const { examId } = req.params;

    const existingScores = await Score.find({
      user: req.user._id,
      exam: examId,
    }).sort({ completedAt: -1 });

    const latestScore = existingScores[0];
    const attemptCount = existingScores.length;

    let canTakeExam = true;
    let message = "You can take this exam";
    let remainingAttempts = 2 - attemptCount;

    if (attemptCount >= 2) {
      canTakeExam = false;
      message = "You have used all attempts for this exam";
      remainingAttempts = 0;
    } else if (attemptCount === 1 && latestScore.percentage >= 50) {
      canTakeExam = false;
      message = "You have already passed this exam";
      remainingAttempts = 0;
    } else if (attemptCount === 1) {
      message = "You can retake this exam (failed first attempt)";
    }

    res.json({
      canTakeExam,
      message,
      attemptInfo: {
        currentAttempts: attemptCount,
        remainingAttempts,
        maxAttempts: 2,
      },
      previousScores: existingScores.map((score) => ({
        score: score.score,
        percentage: score.percentage,
        attemptNumber: score.attemptNumber,
        completedAt: score.completedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
