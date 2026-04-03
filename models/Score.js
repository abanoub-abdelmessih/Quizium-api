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
      attemptNumber: data.attemptNumber || 1,
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

    const snapshot = await ref.get();
    if (snapshot.empty) return null;

    let docs = snapshot.docs.map(doc => ({ _id: doc.id, id: doc.id, ...doc.data() }));

    if (options.sort) {
      for (const [key, order] of Object.entries(options.sort)) {
        // Simple in-memory sort
        docs.sort((a, b) => {
          let valA = a[key];
          let valB = b[key];
          // Handle dates
          if (typeof valA === 'string' && !isNaN(Date.parse(valA))) valA = new Date(valA).getTime();
          if (typeof valB === 'string' && !isNaN(Date.parse(valB))) valB = new Date(valB).getTime();
          
          if (valA < valB) return order === -1 ? 1 : -1;
          if (valA > valB) return order === -1 ? -1 : 1;
          return 0;
        });
      }
    }

    const doc = docs[0];
    return attachMethods(doc);
  },

  async find(query = {}, options = {}) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    const snapshot = await ref.get();
    let docs = snapshot.docs.map(doc => ({ _id: doc.id, id: doc.id, ...doc.data() }));

    if (options.sort) {
      for (const [key, order] of Object.entries(options.sort)) {
        // Simple in-memory sort
        docs.sort((a, b) => {
          let valA = a[key];
          let valB = b[key];
          // Handle dates
          if (typeof valA === 'string' && !isNaN(Date.parse(valA))) valA = new Date(valA).getTime();
          if (typeof valB === 'string' && !isNaN(Date.parse(valB))) valB = new Date(valB).getTime();
          
          if (valA < valB) return order === -1 ? 1 : -1;
          if (valA > valB) return order === -1 ? -1 : 1;
          return 0;
        });
      }
    }

    if (options.limit) {
      docs = docs.slice(0, options.limit);
    }

    return docs.map(doc => attachMethods(doc));
  },

  async countDocuments(query = {}) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    const snapshot = await ref.get();
    return snapshot.size;
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
