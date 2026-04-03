import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

const connectDB = async () => {
  if (db) {
    return db;
  }

  try {
    // Try loading from service account file first
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      || path.join(__dirname, '..', 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Fallback to .env variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      throw new Error(
        'Firebase credentials not found. Either place serviceAccountKey.json in the project root ' +
        'or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env'
      );
    }

    db = admin.firestore();
    console.log('Firebase Firestore Connected');
    return db;
  } catch (error) {
    // If already initialized, just get the firestore instance
    if (error.code === 'app/duplicate-app') {
      db = admin.firestore();
      return db;
    }
    console.error('Firebase connection error:', error.message);
    throw error;
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
};

export { admin };
export default connectDB;
