const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: String,
  type: String,
  content: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
   answer: { type: String }, // ✅ make sure this exists
  reviewedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Request || mongoose.model('Request', requestSchema);
