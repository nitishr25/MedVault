import mongoose from 'mongoose';

const RecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A medical record must be explicitly bound to an authorized operator user node.']
  },
  title: {
    type: String,
    required: [true, 'Please provide a descriptive title for this document entry.'],
    trim: true,
    maxlength: [100, 'Document title cannot exceed a length constraint of 100 characters.']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Document description parameters cannot exceed 500 characters.']
  },
  ipfsHash: {
    type: String,
    required: [true, 'Cryptographic IPFS pinning address hash code is required.'],
    unique: true,
    trim: true
  },
  ipfsGatewayUrl: {
    type: String,
    required: [true, 'Direct gateway URL network path is required for document retrieval operations.']
  },
  fileSize: {
    type: String,
    default: '0.00 MB',
    trim: true
  },
  mimeType: {
    type: String,
    trim: true
  },
  // Find your existing schema definition and add these three fields to it:

  iv: {
    type: [Number],   // the 12-byte AES-GCM initialization vector
    default: []
  },
  wrappedKey: {
    type: [Number],   // the DEK wrapped under the user's KEK
    default: []
  },
  originalMimeType: {
    type: String,     // original file type before encryption
    default: ''
},

// To store doctor keys
sharedAccess: [{
    recipient: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    wrappedKey: { 
      type: [Number], // The array of bytes specifically locked for this doctor
      required: true 
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    doctorRemarks: {
    type: String,
    default: '' // Doctor can update this after reviewing the decrypted file
  }
  }]
}, { timestamps: true });

// Index optimizations to facilitate high-speed document lookups for authenticated sessions
RecordSchema.index({ user: 1, createdAt: -1 });
RecordSchema.index({ ipfsHash: 1 });

// CRITICAL FIX: Instantiate the Mongoose model cleanly before exporting
const Record = mongoose.model('Record', RecordSchema);

export default Record;