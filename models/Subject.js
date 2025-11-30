import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'upcoming', 'archived'],
    default: 'available'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

subjectSchema.virtual('topics', {
  ref: 'Topic',
  localField: '_id',
  foreignField: 'subject',
  justOne: false
});

export default mongoose.model('Subject', subjectSchema);

