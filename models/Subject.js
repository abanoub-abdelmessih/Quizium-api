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

    const snapshot = await ref.limit(1).get();
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return attachMethods({ _id: doc.id, id: doc.id, ...doc.data() });
  },
<<<<<<< HEAD

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
      .orderBy('createdAt', 'asc')
      .get();

    subject.topics = topicsSnapshot.docs.map(doc => ({
      _id: doc.id, id: doc.id, ...doc.data()
    }));

    return subject;
=======
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'upcoming', 'archived'],
    default: 'available'
>>>>>>> 299e46e31cc25dddd2b67a1e7b3f7e3812bdc632
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
