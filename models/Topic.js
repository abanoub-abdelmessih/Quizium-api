import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
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
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('Topic', topicSchema);

