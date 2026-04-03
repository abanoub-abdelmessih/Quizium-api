import { getDB } from '../config/database.js';

const COLLECTION = 'exams';

const ExamModel = {
  async create(data) {
    const db = getDB();
    const now = new Date().toISOString();

    const examData = {
      title: data.title,
      description: data.description || '',
      subject: data.subject,
      duration: data.duration,
      totalMarks: data.totalMarks || 0,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection(COLLECTION).add(examData);
    return attachMethods({ _id: docRef.id, id: docRef.id, ...examData });
  },

  async findById(id) {
    if (!id) return null;
    const db = getDB();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return attachMethods({ _id: doc.id, id: doc.id, ...doc.data() });
  },

  async findOne(query) {
    const db = getDB();
    let ref = db.collection(COLLECTION);

    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
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

  async findByIdAndDelete(id) {
    const db = getDB();
    await db.collection(COLLECTION).doc(id).delete();
    return true;
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
    return ExamModel.save(this);
  };

  data.toObject = function() {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    return obj;
  };

  return data;
}

export default ExamModel;
