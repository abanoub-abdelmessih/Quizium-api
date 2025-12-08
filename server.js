import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import examRoutes from './routes/examRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----------------------
//  GLOBAL OPEN CORS
// ----------------------
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (non-serverless)
if (process.env.VERCEL !== '1') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ----------------------
//        ROUTES
// ----------------------
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Quizium API is running' });
});

// ----------------------
//   GLOBAL ERROR HANDLER
// ----------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ----------------------
//   SERVER STARTUP LOGIC
// ----------------------
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

export default app;
