import Score from '../models/Score.js';
import User from '../models/User.js';

// Get leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filter = req.query.filter || 'all'; // 'all', 'week', 'month'

    // Build date filter based on time period
    let dateFilter = {};
    const now = new Date();

    if (filter === 'week') {
      // Last 7 days
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter.completedAt = { $gte: weekAgo };
    } else if (filter === 'month') {
      // Last 30 days
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter.completedAt = { $gte: monthAgo };
    }
    // If filter is 'all', no date filter is applied

    // Get top scores with user and exam details, applying date filter
    const topScores = await Score.find(dateFilter)
      .populate('user', 'name email profileImage')
      .populate('exam', 'title subject')
      .populate('exam.subject', 'title')
      .sort({ score: -1, completedAt: -1 });

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
      .slice(0, limit) // Apply limit
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

