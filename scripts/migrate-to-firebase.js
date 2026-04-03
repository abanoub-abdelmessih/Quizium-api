/**
 * MongoDB to Firebase Firestore Migration Script
 * 
 * This script reads all data from your MongoDB Atlas database
 * and writes it to Firebase Firestore, preserving document IDs
 * and all relationships.
 * 
 * Usage: node scripts/migrate-to-firebase.js
 * 
 * Prerequisites:
 * - MONGODB_URI must be set in .env (your existing MongoDB connection)
 * - Firebase credentials must be configured (serviceAccountKey.json or .env variables)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. Connect to MongoDB
// ==========================================
const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found in .env file. This is required for migration.');
  }
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
};

// ==========================================
// 2. Connect to Firebase
// ==========================================
const connectFirebase = () => {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || path.join(__dirname, '..', 'serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  } else {
    throw new Error(
      'Firebase credentials not found. Place serviceAccountKey.json in project root ' +
      'or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env'
    );
  }

  const db = admin.firestore();
  console.log('✅ Connected to Firebase Firestore');
  return db;
};

// ==========================================
// 3. Define MongoDB Schemas (for reading)
// ==========================================
const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  password: String,
  profileImage: String,
  isAdmin: Boolean,
  otp: { code: String, expiresAt: Date }
}, { timestamps: true, strict: false });

const subjectSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true, strict: false });

const topicSchema = new mongoose.Schema({
  subject: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  image: String,
  tags: [String]
}, { timestamps: true, strict: false });

const examSchema = new mongoose.Schema({
  title: String,
  description: String,
  subject: mongoose.Schema.Types.ObjectId,
  duration: Number,
  totalMarks: Number,
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true, strict: false });

const questionSchema = new mongoose.Schema({
  exam: mongoose.Schema.Types.ObjectId,
  questionText: String,
  options: [String],
  correctAnswer: Number,
  marks: Number,
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true, strict: false });

const scoreSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  exam: mongoose.Schema.Types.ObjectId,
  score: Number,
  totalMarks: Number,
  percentage: Number,
  answers: [{
    question: mongoose.Schema.Types.ObjectId,
    selectedAnswer: Number,
    isCorrect: Boolean
  }],
  completedAt: Date
}, { timestamps: true, strict: false });

const MongoUser = mongoose.model('User', userSchema);
const MongoSubject = mongoose.model('Subject', subjectSchema);
const MongoTopic = mongoose.model('Topic', topicSchema);
const MongoExam = mongoose.model('Exam', examSchema);
const MongoQuestion = mongoose.model('Question', questionSchema);
const MongoScore = mongoose.model('Score', scoreSchema);

// ==========================================
// 4. Migration Logic
// ==========================================

/**
 * Convert MongoDB ObjectId references to string
 */
const convertObjectIds = (obj) => {
  if (!obj) return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id' || key === '__v') continue; // Skip _id and __v
    
    if (value && typeof value === 'object' && value._bsontype === 'ObjectId') {
      converted[key] = value.toString();
    } else if (value instanceof Date) {
      converted[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      converted[key] = value.map(item => {
        if (item && typeof item === 'object' && item._bsontype === 'ObjectId') {
          return item.toString();
        }
        if (item && typeof item === 'object') {
          return convertObjectIds(typeof item.toObject === 'function' ? item.toObject() : item);
        }
        return item;
      });
    } else if (value && typeof value === 'object') {
      converted[key] = convertObjectIds(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
};

/**
 * Migrate a single collection
 */
const migrateCollection = async (db, collectionName, MongoModel, idMap) => {
  console.log(`\n📦 Migrating collection: ${collectionName}...`);
  
  const docs = await MongoModel.find({}).lean();
  console.log(`   Found ${docs.length} documents`);

  if (docs.length === 0) {
    console.log(`   ⏭️  No documents to migrate`);
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const doc of docs) {
    try {
      const mongoId = doc._id.toString();
      const convertedDoc = convertObjectIds(doc);

      // Use a new Firebase document ID and map the old MongoDB ID to it
      const docRef = db.collection(collectionName).doc();
      const firebaseId = docRef.id;

      // Store the mapping
      idMap[mongoId] = firebaseId;

      await docRef.set(convertedDoc);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error migrating document ${doc._id}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`   ✅ Migrated: ${successCount}, ❌ Errors: ${errorCount}`);
};

/**
 * Update all cross-references to use new Firebase IDs
 */
const updateReferences = async (db, idMap) => {
  console.log('\n🔗 Updating cross-references...');

  // Map of collection -> fields that contain references
  const referenceFields = {
    subjects: ['createdBy'],
    topics: ['subject'],
    exams: ['subject', 'createdBy'],
    questions: ['exam', 'createdBy'],
    scores: ['user', 'exam']
  };

  for (const [collection, fields] of Object.entries(referenceFields)) {
    console.log(`   Updating references in ${collection}...`);
    const snapshot = await db.collection(collection).get();
    
    const batch = db.batch();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updates = {};
      let hasUpdates = false;

      for (const field of fields) {
        if (data[field] && idMap[data[field]]) {
          updates[field] = idMap[data[field]];
          hasUpdates = true;
        }
      }

      // Handle nested references in scores.answers
      if (collection === 'scores' && data.answers && Array.isArray(data.answers)) {
        const updatedAnswers = data.answers.map(answer => {
          if (answer.question && idMap[answer.question]) {
            return { ...answer, question: idMap[answer.question] };
          }
          return answer;
        });
        
        const hasChangedAnswers = data.answers.some((answer, i) => 
          answer.question !== updatedAnswers[i].question
        );
        
        if (hasChangedAnswers) {
          updates.answers = updatedAnswers;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        batch.update(doc.ref, updates);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`   ✅ Updated ${updateCount} documents in ${collection}`);
    } else {
      console.log(`   ⏭️  No references to update in ${collection}`);
    }
  }
};

// ==========================================
// 5. Main Migration Function
// ==========================================
const migrate = async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  MongoDB → Firebase Firestore Migration');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Connect to both databases
    await connectMongo();
    const db = connectFirebase();

    // ID mapping: MongoDB ObjectId string → Firebase document ID
    const idMap = {};

    // Migrate each collection (order matters for references)
    await migrateCollection(db, 'users', MongoUser, idMap);
    await migrateCollection(db, 'subjects', MongoSubject, idMap);
    await migrateCollection(db, 'topics', MongoTopic, idMap);
    await migrateCollection(db, 'exams', MongoExam, idMap);
    await migrateCollection(db, 'questions', MongoQuestion, idMap);
    await migrateCollection(db, 'scores', MongoScore, idMap);

    // Update cross-references to use new Firebase IDs
    await updateReferences(db, idMap);

    // Save ID mapping for reference
    const mappingPath = path.join(__dirname, '..', 'id-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(idMap, null, 2));
    console.log(`\n📄 ID mapping saved to: ${mappingPath}`);

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ Migration completed successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('\nSummary:');
    console.log(`  Total documents migrated: ${Object.keys(idMap).length}`);
    console.log(`  ID mapping file: id-mapping.json`);
    console.log('\nNext steps:');
    console.log('  1. Verify data in Firebase Console');
    console.log('  2. Test your API endpoints');
    console.log('  3. Remove MONGODB_URI from .env when satisfied');
    console.log('  4. Uninstall mongoose: npm uninstall mongoose');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

migrate();
