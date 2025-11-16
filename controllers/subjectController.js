import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create subject
export const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    let subjectImage = null;
    let pdfUrl = null;

    // Handle image upload if present
    if (req.files && req.files.subjectImage) {
      try {
        const imageResult = await uploadToCloudinary(
          req.files.subjectImage[0],
          'quizium/subjects',
          'auto'
        );
        subjectImage = imageResult.secure_url;
      } catch (error) {
        return res.status(500).json({ message: 'Failed to upload subject image: ' + error.message });
      }
    }

    // Handle PDF upload if present
    if (req.files && req.files.pdf) {
      try {
        const pdfResult = await uploadToCloudinary(
          req.files.pdf[0],
          'quizium/pdfs',
          'auto'
        );
        pdfUrl = pdfResult.secure_url;
      } catch (error) {
        return res.status(500).json({ message: 'Failed to upload PDF: ' + error.message });
      }
    }

    const subject = await Subject.create({
      name,
      description,
      subjectImage,
      pdfUrl,
      createdBy: req.user._id
    });

    res.status(201).json({
      message: 'Subject created successfully',
      subject: {
        ...subject.toObject(),
        subjectImage: subject.subjectImage,
        pdfUrl: subject.pdfUrl
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

    res.json({ subjects });
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
        ...subject.toObject()
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

    // Handle subject image update
    if (req.files && req.files.subjectImage) {
      // Delete old image from Cloudinary if exists
      if (subject.subjectImage) {
        try {
          const publicId = extractPublicId(subject.subjectImage);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'auto');
          }
        } catch (error) {
          console.error('Error deleting old image from Cloudinary:', error);
        }
      }

      // Upload new image
      try {
        const imageResult = await uploadToCloudinary(
          req.files.subjectImage[0],
          'quizium/subjects',
          'auto'
        );
        subject.subjectImage = imageResult.secure_url;
      } catch (error) {
        return res.status(500).json({ message: 'Failed to upload subject image: ' + error.message });
      }
    }

    // Handle PDF update
    if (req.files && req.files.pdf) {
      // Delete old PDF from Cloudinary if exists
      if (subject.pdfUrl) {
        try {
          const publicId = extractPublicId(subject.pdfUrl);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'auto');
          }
        } catch (error) {
          console.error('Error deleting old PDF from Cloudinary:', error);
        }
      }

      // Upload new PDF
      try {
        const pdfResult = await uploadToCloudinary(
          req.files.pdf[0],
          'quizium/pdfs',
          'auto'
        );
        subject.pdfUrl = pdfResult.secure_url;
      } catch (error) {
        return res.status(500).json({ message: 'Failed to upload PDF: ' + error.message });
      }
    }

    await subject.save();

    res.json({
      message: 'Subject updated successfully',
      subject: {
        ...subject.toObject()
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

    // Delete subject image from Cloudinary if exists
    if (subject.subjectImage) {
      try {
        const publicId = extractPublicId(subject.subjectImage);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'auto');
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    // Delete PDF from Cloudinary if exists
    if (subject.pdfUrl) {
      try {
        const publicId = extractPublicId(subject.pdfUrl);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'auto');
        }
      } catch (error) {
        console.error('Error deleting PDF from Cloudinary:', error);
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

