import { getDB } from '../config/database.js';

const COLLECTION = 'topics';

const TopicModel = {
  async create(data) {
    const db = getDB();
    const now = new Date().toISOString();

    const topicData = {
      subject: data.subject,
      title: data.title,
      description: data.description,
      image: data.image || null,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection(COLLECTION).add(topicData);
    return attachMethods({ _id: docRef.id, id: docRef.id, ...topicData });
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

    const snapshot = await ref.get();
    if (snapshot.empty) return null;

    let docs = snapshot.docs.map(doc => ({ _id: doc.id, id: doc.id, ...doc.data() }));

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

  async insertMany(items) {
    const db = getDB();
    const batch = db.batch();
    const now = new Date().toISOString();
    const results = [];

    for (const item of items) {
      const docRef = db.collection(COLLECTION).doc();
      const topicData = {
        subject: item.subject,
        title: item.title,
        description: item.description,
        image: item.image || null,
        tags: item.tags || [],
        createdAt: now,
        updatedAt: now
      };
      batch.set(docRef, topicData);
      results.push({ _id: docRef.id, id: docRef.id, ...topicData });
    }

    await batch.commit();
    return results;
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

  async deleteOne(query) {
    if (query._id) {
      const db = getDB();
      await db.collection(COLLECTION).doc(query._id).delete();
      return true;
    }
    const doc = await this.findOne(query);
    if (doc) {
      const db = getDB();
      await db.collection(COLLECTION).doc(doc._id).delete();
      return true;
    }
    return false;
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
    return TopicModel.save(this);
  };

  data.toObject = function() {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    return obj;
  };

  return data;
}

export default TopicModel;
