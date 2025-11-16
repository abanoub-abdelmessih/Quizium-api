import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';

dotenv.config();

const ADMIN_EMAILS = ['abanoubabdelmessih110@gmail.com', 'abdelmottale3@gmail.com'];
const ADMIN_PASSWORD = 'quiziumAdmin1103';

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Create admin accounts
    console.log('Creating admin accounts...');
    const adminNames = {
      'abanoubabdelmessih110@gmail.com': 'Abanoub',
      'abdelmottale3@gmail.com': 'Ahmed'
    };
    
    for (const email of ADMIN_EMAILS) {
      let admin = await User.findOne({ email: email.toLowerCase() });
      const adminName = adminNames[email.toLowerCase()] || 'Admin';
      if (!admin) {
        admin = await User.create({
          name: adminName,
          username: email.toLowerCase().split('@')[0],
          email: email.toLowerCase(),
          password: ADMIN_PASSWORD,
          isAdmin: true
        });
        console.log(`Admin created: ${admin.email} (${admin.name})`);
      } else {
        // Update admin name and ensure username exists
        if (admin.name !== adminName) {
          admin.name = adminName;
        }
        if (!admin.username) {
          admin.username = email.toLowerCase().split('@')[0];
        }
        admin.isAdmin = true;
        await admin.save();
        console.log(`Admin updated: ${admin.email} (${admin.name})`);
      }
    }

    // Get first admin for creating subjects/exams
    const admin = await User.findOne({ email: ADMIN_EMAILS[0].toLowerCase() });

    // Create a sample subject
    console.log('Creating sample subject...');
    let subject = await Subject.findOne({ name: 'Mathematics' });
    if (!subject) {
      subject = await Subject.create({
        name: 'Mathematics',
        description: 'Basic mathematics and algebra',
        createdBy: admin._id
      });
      console.log(`Subject created: ${subject.name}`);
    } else {
      console.log(`Subject already exists: ${subject.name}`);
    }

    // Create a sample exam
    console.log('Creating sample exam...');
    let exam = await Exam.findOne({ title: 'Basic Math Quiz' });
    if (!exam) {
      exam = await Exam.create({
        title: 'Basic Math Quiz',
        description: 'A basic mathematics quiz covering addition, subtraction, and multiplication',
        subject: subject._id,
        duration: 30, // 30 minutes
        totalMarks: 0, // Will be updated when questions are added
        createdBy: admin._id
      });
      console.log(`Exam created: ${exam.title}`);
    } else {
      console.log(`Exam already exists: ${exam.title}`);
    }

    // Create sample questions
    console.log('Creating sample questions...');
    const questions = [
      {
        exam: exam._id,
        questionText: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1,
        marks: 5,
        createdBy: admin._id
      },
      {
        exam: exam._id,
        questionText: 'What is 10 - 5?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        marks: 5,
        createdBy: admin._id
      },
      {
        exam: exam._id,
        questionText: 'What is 3 × 4?',
        options: ['10', '11', '12', '13'],
        correctAnswer: 2,
        marks: 5,
        createdBy: admin._id
      },
      {
        exam: exam._id,
        questionText: 'What is 15 ÷ 3?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        marks: 5,
        createdBy: admin._id
      },
      {
        exam: exam._id,
        questionText: 'What is the square root of 16?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        marks: 10,
        createdBy: admin._id
      }
    ];

    let createdCount = 0;
    for (const questionData of questions) {
      const existingQuestion = await Question.findOne({
        exam: questionData.exam,
        questionText: questionData.questionText
      });

      if (!existingQuestion) {
        await Question.create(questionData);
        createdCount++;
      }
    }

    // Update exam total marks
    const totalMarks = await Question.aggregate([
      { $match: { exam: exam._id } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    exam.totalMarks = totalMarks[0]?.total || 0;
    await exam.save();

    console.log(`Created ${createdCount} new questions`);
    console.log(`Exam total marks: ${exam.totalMarks}`);

    console.log('\n✅ Seed data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

