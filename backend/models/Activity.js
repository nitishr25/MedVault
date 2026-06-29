import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: { type: String }, // 👈 ADDED
    action: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actor: { type: String },
    patient: { type: String },
    record: { type: String },
    hospitalId: { type: String, index: true }, // 👈 ADDED (CRITICAL FOR ADMINS)
    color: { type: String } // 👈 ADDED
  },
  { 
    timestamps: true 
  }
);

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

export default Activity;