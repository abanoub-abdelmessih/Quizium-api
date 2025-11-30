import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Create admin accounts
    console.log('Creating admin accounts...');

    const adminEmails = (process.env.SEED_ADMIN_EMAILS || '').split(',').filter(Boolean);
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmails.length === 0 || !adminPassword) {
      console.warn('Skipping admin creation: SEED_ADMIN_EMAILS or ADMIN_PASSWORD not set in .env');
    } else {
      for (const email of adminEmails) {
        let admin = await User.findOne({ email: email.toLowerCase() });
        const adminName = 'Admin'; // Default name since we don't have mapping

        if (!admin) {
          admin = await User.create({
            name: adminName,
            username: email.toLowerCase().split('@')[0],
            email: email.toLowerCase(),
            password: adminPassword,
            isAdmin: true
          });
          console.log(`Admin created: ${admin.email} (${admin.name})`);
        } else {
          // Update admin status
          if (!admin.isAdmin) {
            admin.isAdmin = true;
            await admin.save();
            console.log(`Admin updated: ${admin.email} (${admin.name})`);
          } else {
            console.log(`Admin already exists: ${admin.email}`);
          }
        }
      }
    }

    // Get first admin for creating subjects/exams (if any exist)
    const firstAdminEmail = adminEmails[0];
    let admin = null;

    if (firstAdminEmail) {
      admin = await User.findOne({ email: firstAdminEmail.toLowerCase() });
    }

    if (!admin) {
      console.warn('No admin found to create sample content. Skipping sample data creation.');
      process.exit(0);
    }

    // Create a sample subject
    console.log('Creating sample subject...');
    let subject = await Subject.findOne({ title: 'Mathematics' });
    if (!subject) {
      subject = await Subject.create({
        title: 'Mathematics',
        description: 'Basic mathematics and algebra',
        createdBy: admin._id
      });
      console.log(`Subject created: ${subject.title}`);
    } else {
      console.log(`Subject already exists: ${subject.title}`);
    }

    const existingTopics = await Topic.countDocuments({ subject: subject._id });
    if (existingTopics === 0) {
      await Topic.insertMany([
        {
          subject: subject._id,
          title: 'Number Sense',
          description: 'Explains natural numbers, integers, and place value using short bullet-style sentences.',
          tags: ['numbers', 'basics']
        },
        {
          subject: subject._id,
          title: 'Algebra Basics',
          description: 'Covers variables, simple equations, and the idea of balancing both sides step by step.',
          tags: ['algebra']
        }
      ]);
      console.log('Sample topics created for Mathematics');
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
