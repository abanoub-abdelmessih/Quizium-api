import Score from '../models/Score.js';
import User from '../models/User.js';
import Exam from '../models/Exam.js';

// Get leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filter = req.query.filter || 'all'; // 'all', 'week', 'month'

    let allScores = await Score.find({}, { sort: { score: -1 } });

    // Filter by time period in-memory (Firestore doesn't support $gte on dates easily)
    if (filter === 'week' || filter === 'month') {
      const now = new Date();
      const cutoff = filter === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      allScores = allScores.filter(score => {
        const completedAt = new Date(score.completedAt);
        return completedAt >= cutoff;
      });
    }

    // Populate user and exam details for each score
    for (const score of allScores) {
      if (score.user && typeof score.user === 'string') {
        const user = await User.findById(score.user, 'name email profileImage');
        if (user) {
          score.user = { _id: user._id, name: user.name, email: user.email, profileImage: user.profileImage };
        }
      }
      if (score.exam && typeof score.exam === 'string') {
        const exam = await Exam.findById(score.exam);
        if (exam) {
          score.exam = { _id: exam._id, title: exam.title, subject: exam.subject };
        }
      }
    }

    // Group by user to get their best scores
    const userBestScores = {};

    allScores.forEach(score => {
      if (!score.user || typeof score.user === 'string') return;
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

    const leaderboard = Object.values(userBestScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

    res.json({
      leaderboard,
      total: leaderboard.length,
      filter: filter,
      limit: limit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
