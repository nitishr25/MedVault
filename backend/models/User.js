import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Operator username identifier parameter is required.'], 
    unique: true, 
    trim: true, 
    index: true 
  },
  email: { 
    type: String, 
    required: [true, 'Identity node key email address parameter is required.'], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Security secret phrase password parameter is required.'] 
  },
  role: {
      type: String,
      enum: ['patient', 'doctor', 'hospital_admin', 'super_admin'],
      default: 'patient'
    },
  hospitalId: {
      // Links the user to a specific hospital (Required for doctors and hospital_admins)
    type: String, 
    required: function() {
      return this.role === 'doctor' || this.role === 'hospital_admin';
    }
  },
  specialty: { 
    type: String,
    enum: [
       'General Practice',
        'Cardiologist',
        'Neurologist',
        'Oncologist',
        'Orthopedic', 
        'Orthopedic Surgeon',
        'Pediatrician',
        'Psychiatrist',
        'General Surgeon',
        'Dermatologist',
        'Radiologist',
        'Hepatologist'

      ], 
    default: 'General Practice'
  },
  encryptionSalt: { 
    type: String, 
    required: false 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  // 👇 NEW: Asymmetric Cryptography Keys for Secure File Sharing 👇
  publicKey: {
    type: String,
    required: false
  },
  privateKey: {
    type: String,
    required: false
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'verified' // Patients/Admins are verified by default
  },
}, { timestamps: true });

/**
 * 🔐 Pre-Save Cryptographic Casing Hook Middleware
 */
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err; 
  }
});

/**
 * 🛠️ Embedded Model Instance Methods Matrix
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error('Cryptographic string evaluation failed inside database model instance.');
  }
};

const User = mongoose.model('User', UserSchema);
export default User;