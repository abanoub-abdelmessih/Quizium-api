import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getFileUrl } from '../utils/fileStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create subject
export const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    const pdfUrl = req.file ? req.file.path : null;

    const subject = await Subject.create({
      name,
      description,
      pdfUrl,
      createdBy: req.user._id
    });

    res.status(201).json({
      message: 'Subject created successfully',
      subject: {
        ...subject.toObject(),
        pdfUrl: getFileUrl(pdfUrl)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all subjects
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const subjectsWithUrls = subjects.map(subject => ({
      ...subject.toObject(),
      pdfUrl: getFileUrl(subject.pdfUrl)
    }));

    res.json({ subjects: subjectsWithUrls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single subject
export const getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({
      subject: {
        ...subject.toObject(),
        pdfUrl: getFileUrl(subject.pdfUrl)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update subject
export const updateSubject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (name) subject.name = name;
    if (description !== undefined) subject.description = description;

    // Handle PDF update
    if (req.file) {
      // Delete old PDF if exists
      if (subject.pdfUrl) {
        const oldPdfPath = path.join(__dirname, '..', subject.pdfUrl);
        if (fs.existsSync(oldPdfPath)) {
          fs.unlinkSync(oldPdfPath);
        }
      }
      subject.pdfUrl = req.file.path;
    }

    await subject.save();

    res.json({
      message: 'Subject updated successfully',
      subject: {
        ...subject.toObject(),
        pdfUrl: getFileUrl(subject.pdfUrl)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Delete PDF if exists
    if (subject.pdfUrl) {
      const pdfPath = path.join(__dirname, '..', subject.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Delete all exams associated with this subject
    const exams = await Exam.find({ subject: subject._id });
    for (const exam of exams) {
      await Exam.findByIdAndDelete(exam._id);
    }

    await Subject.findByIdAndDelete(subject._id);

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

