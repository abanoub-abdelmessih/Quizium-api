import Score from '../models/Score.js';
import User from '../models/User.js';
import Exam from '../models/Exam.js';

// Get leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // Get all scores (sorted by score descending)
    const topScores = await Score.find({}, { sort: { score: -1 }, limit });

    // Populate user and exam details for each score
    for (const score of topScores) {
      // Populate user
      if (score.user && typeof score.user === 'string') {
        const user = await User.findById(score.user, 'name email profileImage');
        if (user) {
          score.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage
          };
        }
      }

      // Populate exam
      if (score.exam && typeof score.exam === 'string') {
        const exam = await Exam.findById(score.exam);
        if (exam) {
          score.exam = { _id: exam._id, title: exam.title, subject: exam.subject };
        }
      }
    }

    // Group by user to get their best scores
    const userBestScores = {};
    
    topScores.forEach(score => {
      if (!score.user || typeof score.user === 'string') return; // skip if user not found
      const userId = score.user._id.toString();
      if (!userBestScores[userId] || score.score > userBestScores[userId].score) {
        userBestScores[userId] = {
          user: {
            id: score.user._id,
            name: score.user.name,
            email: score.user.email,
            profileImage: score.user.profileImage
          },
          score: score.score,
          totalMarks: score.totalMarks,
          percentage: score.percentage,
          exam: score.exam,
          completedAt: score.completedAt
        };
      }
    });

    // Convert to array and sort
    const leaderboard = Object.values(userBestScores)
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

    res.json({
      leaderboard,
      total: leaderboard.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
