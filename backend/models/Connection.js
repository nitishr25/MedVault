import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'revoked'], 
    default: 'pending' 
  }
}, { timestamps: true });

// Prevent duplicate connection requests between the same patient and doctor
connectionSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

// 👇 Changed from module.exports to export default
export default mongoose.model('Connection', connectionSchema);