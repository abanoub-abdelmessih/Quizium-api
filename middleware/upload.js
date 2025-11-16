import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for serverless (Vercel), or local uploads for regular server
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseDir = isServerless ? path.join(os.tmpdir(), 'quizium-uploads') : path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profileImage') {
      const profileDir = path.join(baseDir, 'profiles');
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }
      cb(null, profileDir);
    } else if (file.fieldname === 'pdf') {
      const pdfDir = path.join(baseDir, 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      cb(null, pdfDir);
    } else {
      cb(null, baseDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profileImage') {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile images'));
    }
  } else if (file.fieldname === 'pdf') {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  } else {
    cb(null, true);
  }
};

export const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('profileImage');

export const uploadPDF = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('pdf');

// For subject creation/update - handles both image and multiple PDFs
export const uploadSubjectFiles = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'subjectImage') {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for subject images'));
      }
    } else if (file.fieldname === 'pdf') {
      // Validate PDF MIME type
      const validMimeTypes = ['application/pdf'];
      if (validMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB per file
}).fields([
  { name: 'subjectImage', maxCount: 1 },
  { name: 'pdf', maxCount: 10 } // Allow up to 10 PDFs
]);

