import { getDB } from '../config/database.js';
import bcrypt from 'bcryptjs';

const COLLECTION = 'users';

const UserModel = {
  /**
   * Create a new user
   */
  async create(data) {
    const db = getDB();
    const now = new Date().toISOString();

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userData = {
      name: data.name,
      username: data.username?.toLowerCase()?.trim() || null,
      email: data.email?.toLowerCase()?.trim(),
      password: hashedPassword,
      profileImage: data.profileImage || null,
      isAdmin: data.isAdmin || false,
      otp: data.otp || null,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection(COLLECTION).add(userData);
    return attachMethods({ _id: docRef.id, id: docRef.id, ...userData });
  },

  /**
   * Find user by ID
   */
  async findById(id, selectFields = null) {
    if (!id) return null;
    const db = getDB();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    let data = { _id: doc.id, id: doc.id, ...doc.data() };

    if (selectFields) {
      data = applySelect(data, selectFields);
    }

    return attachMethods(data);
  },

  /**
   * Find user by query (single)
   */
  async findOne(query, selectFields = null) {
    const db = getDB();
    let results;

    // Handle $or queries
    if (query.$or) {
      for (const condition of query.$or) {
        const result = await this.findOne(condition, selectFields);
        if (result) return result;
      }
      return null;
    }

    let ref = db.collection(COLLECTION);
    for (const [key, value] of Object.entries(query)) {
      ref = ref.where(key, '==', value);
    }

    const snapshot = await ref.get();
    if (snapshot.empty) return null;

    let docs = snapshot.docs.map(doc => ({ _id: doc.id, id: doc.id, ...doc.data() }));

    const doc = docs[0];
    let data = doc;

    if (selectFields) {
      data = applySelect(data, selectFields);
    }

    return attachMethods(data);
  },

  /**
   * Find multiple users
   */
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

    return docs.map(doc => {
      let data = doc;
      if (options.select) {
        data = applySelect(data, options.select);
      }
      return attachMethods(data);
    });
  },

  /**
   * Update user by ID
   */
  async findByIdAndUpdate(id, updateData) {
    const db = getDB();
    const now = new Date().toISOString();

    // Hash password if being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    updateData.updatedAt = now;
    await db.collection(COLLECTION).doc(id).update(updateData);
    return this.findById(id);
  },

  /**
   * Delete user by ID
   */
  async findByIdAndDelete(id) {
    const db = getDB();
    await db.collection(COLLECTION).doc(id).delete();
    return true;
  },

  /**
   * Save user (update existing document)
   */
  async save(user) {
    const db = getDB();
    const id = user._id || user.id;
    const now = new Date().toISOString();

    const updateData = { ...user, updatedAt: now };
    delete updateData._id;
    delete updateData.id;

    // If password was modified (not already hashed), hash it
    if (updateData._passwordModified) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
      delete updateData._passwordModified;
    }

    // Remove methods before saving
    delete updateData.comparePassword;
    delete updateData.save;
    delete updateData.toObject;

    await db.collection(COLLECTION).doc(id).set(updateData, { merge: true });
    return this.findById(id);
  }
};

/**
 * Apply select/projection fields
 */
function applySelect(data, selectFields) {
  if (typeof selectFields === 'string') {
    const fields = selectFields.split(' ');
    const exclude = fields.filter(f => f.startsWith('-'));
    const include = fields.filter(f => !f.startsWith('-'));

    if (exclude.length > 0) {
      for (const field of exclude) {
        delete data[field.substring(1)];
      }
    } else if (include.length > 0) {
      const filtered = { _id: data._id, id: data.id };
      for (const field of include) {
        if (data[field] !== undefined) {
          filtered[field] = data[field];
        }
      }
      return filtered;
    }
  }
  return data;
}

/**
 * Attach instance methods to user data
 */
function attachMethods(data) {
  data.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  data.save = async function() {
    return UserModel.save(this);
  };

  data.toObject = function() {
    const obj = { ...this };
    delete obj.comparePassword;
    delete obj.save;
    delete obj.toObject;
    return obj;
  };

  // Proxy to detect password changes
  const originalData = { ...data };
  return new Proxy(data, {
    set(target, prop, value) {
      if (prop === 'password' && value !== originalData.password) {
        target._passwordModified = true;
      }
      target[prop] = value;
      return true;
    }
  });
}

export default UserModel;
