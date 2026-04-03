<<<<<<< HEAD
import { getDB } from '../config/database.js';

const COLLECTION = 'scores';

const ScoreModel = {
  async create(data) {
    const db = getDB();
    const now = new Date().toISOString();

    const scoreData = {
      user: data.user,
      exam: data.exam,
      score: data.score,
      totalMarks: data.totalMarks,
      percentage: data.percentage,
      answers: data.answers || [],
      completedAt: data.completedAt || now,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection(COLLECTION).add(scoreData);
    return attachMethods({ _id: docRef.id, id: docRef.id, ...scoreData });
  },

  async findById(id) {
    if (!id) return null;
    const db = getDB();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return attachMethods({ _id: doc.id, id: doc.id, ...doc.data() });
  },

  async findOne(query, options = {}) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    if (options.sort) {
      for (const [key, order] of Object.entries(options.sort)) {
        ref = ref.orderBy(key, order === -1 ? 'desc' : 'asc');
      }
    }

    const snapshot = await ref.limit(1).get();
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return attachMethods({ _id: doc.id, id: doc.id, ...doc.data() });
  },

  async find(query = {}, options = {}) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    if (options.sort) {
      for (const [key, order] of Object.entries(options.sort)) {
        ref = ref.orderBy(key, order === -1 ? 'desc' : 'asc');
      }
    }

    if (options.limit) {
      ref = ref.limit(options.limit);
    }

    const snapshot = await ref.get();
    return snapshot.docs.map(doc =>
      attachMethods({ _id: doc.id, id: doc.id, ...doc.data() })
    );
  },

  async deleteMany(query) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    const snapshot = await ref.get();
    const batch = db.batch();

    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return { deletedCount: snapshot.size };
  },

  async save(doc) {
    const db = getDB();
    const id = doc._id || doc.id;
    const now = new Date().toISOString();

    const updateData = { ...doc, updatedAt: now };
    delete updateData._id;
    delete updateData.id;
    delete updateData.save;
    delete updateData.toObject;

    await db.collection(COLLECTION).doc(id).set(updateData, { merge: true });
    return this.findById(id);
  }
};

function attachMethods(data) {
  data.save = async function() {
    return ScoreModel.save(this);
  };

  data.toObject = function() {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    return obj;
  };

  return data;
}

export default ScoreModel;
=======
import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    answers: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedAnswer: Number,
        isCorrect: Boolean,
      },
    ],
    attemptNumber: {
      type: Number,
      default: 1,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for better query performance
scoreSchema.index({ user: 1, exam: 1, attemptNumber: -1 });
scoreSchema.index({ score: -1, completedAt: -1 });

export default mongoose.model("Score", scoreSchema);
>>>>>>> 299e46e31cc25dddd2b67a1e7b3f7e3812bdc632
