import { getDB } from '../config/database.js';

const COLLECTION = 'subjects';

const SubjectModel = {
  async create(data) {
    const db = getDB();
    const now = new Date().toISOString();

    const subjectData = {
      title: data.title,
      description: data.description,
      image: data.image || null,
      createdBy: data.createdBy,
      status: data.status || 'available',
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection(COLLECTION).add(subjectData);
    return attachMethods({ _id: docRef.id, id: docRef.id, ...subjectData });
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

  async findByIdAndDelete(id) {
    const db = getDB();
    await db.collection(COLLECTION).doc(id).delete();
    return true;
  },

  async deleteOne(query) {
    if (query._id) {
      return this.findByIdAndDelete(query._id);
    }
    const doc = await this.findOne(query);
    if (doc) {
      return this.findByIdAndDelete(doc._id);
    }
    return false;
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
    delete updateData.populate;
    // Remove virtual topics (they are in a separate collection)
    delete updateData.topics;

    await db.collection(COLLECTION).doc(id).set(updateData, { merge: true });
    return this.findById(id);
  },

  /**
   * Populate subject with its topics (replaces Mongoose virtual)
   */
  async populateWithTopics(subjectOrId) {
    const db = getDB();
    const subject = typeof subjectOrId === 'string'
      ? await this.findById(subjectOrId)
      : subjectOrId;

    if (!subject) return null;

    const topicsSnapshot = await db.collection('topics')
      .where('subject', '==', subject._id)
      .get();

    const topicsData = topicsSnapshot.docs.map(doc => ({
      _id: doc.id, id: doc.id, ...doc.data()
    }));

    // Sort in memory to avoid needing a Firestore composite index
    subject.topics = topicsData.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return subject;
  }
};

function attachMethods(data) {
  data.save = async function() {
    return SubjectModel.save(this);
  };

  data.toObject = function() {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    delete obj.populate;
    return obj;
  };

  data.populate = async function(path) {
    if (path === 'topics') {
      return SubjectModel.populateWithTopics(this);
    }
    return this;
  };

  return data;
}

export default SubjectModel;
