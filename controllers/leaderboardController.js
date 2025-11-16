import Score from '../models/Score.js';
import User from '../models/User.js';

// Get leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // Get top scores with user and exam details
    const topScores = await Score.find()
      .populate('user', 'name email profileImage')
      .populate('exam', 'title subject')
      .populate('exam.subject', 'name')
      .sort({ score: -1, completedAt: -1 })
      .limit(limit);

    // Group by user to get their best scores
    const userBestScores = {};
    
    topScores.forEach(score => {
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

