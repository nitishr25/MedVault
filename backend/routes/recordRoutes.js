import express from 'express';
import multer from 'multer';

// Modern ES Module imports for your local controller and middleware modules
// CRITICAL: Always append the explicit '.js' extension when importing local files in ESM!
import recordController from '../controllers/recordController.js';
import { protect } from '../middleware/auth.js'; 

const router = express.Router();

// Destructure the sync controller function safely out of the controller exports block
const { syncRecordToBlockchain, addDoctorFeedback, getUserActivities } = recordController;

// 📦 Multer Memory Storage Configuration Engine
const storage = multer.memoryStorage();

// NEW CODE 
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/pdf' || 
    file.mimetype === 'image/png' || 
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'application/octet-stream' // <-- ADD THIS LINE to allow encrypted blobs
  ) {
    cb(null, true);
  } else {
    cb(new Error('Payload upload rejected: File type restriction violation. System clears only PDF, PNG, JPG, or encrypted (octet-stream) formats.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Hard limit ceiling capped cleanly at 10 MegaBytes
  }
});

// =========================================================================
// 🛡️ SECURE NETWORK BOUNDARIES
// =========================================================================

// Endpoint 1: Live Database Telemetry Metrics
router.get('/stats/telemetry', protect, (req, res, next) => {
  if (recordController && typeof recordController.getRecordStats === 'function') {
    return recordController.getRecordStats(req, res, next);
  }
  return res.status(500).json({ error: "getRecordStats handler function is not defined on recordController" });
});

// Endpoint 2: Stream authenticated user list arrays back down to the interface
router.get('/user', protect, (req, res, next) => {
  if (recordController && typeof recordController.getUserRecords === 'function') {
    return recordController.getUserRecords(req, res, next);
  }
  return res.status(500).json({ error: "getUserRecords handler function is not defined on recordController" });
});

// Endpoint 3: Upload and pin fresh digital health documentation matrix streams to IPFS
router.post('/upload', protect, upload.single('file'), (req, res, next) => {
  if (recordController && typeof recordController.uploadRecord === 'function') {
    return recordController.uploadRecord(req, res, next);
  }
  return res.status(500).json({ error: "uploadRecord handler function is not defined on recordController" });
});

// Endpoint 4: Decentralized Relayer Network Anchor Sync Gate
// Protected so only authenticated users can trigger decentralized logging loops
router.post('/blockchain-sync', protect, (req, res, next) => {
  if (typeof syncRecordToBlockchain === 'function') {
    return syncRecordToBlockchain(req, res, next);
  }
  return res.status(500).json({ error: "syncRecordToBlockchain handler function is not defined or exported correctly on recordController" });
});

// Get a specific doctor's public key by their email
router.get('/public-key/:email', protect, recordController.getTargetPublicKey);
router.put('/:id/feedback', protect, addDoctorFeedback);
router.get('/activities', protect, getUserActivities);

  // Grant access to a specific record
router.post('/share', protect, recordController.grantRecordAccess);

router.post('/add-remark', protect, recordController.addRecordRemark);

// Endpoint 5: Query singular transaction data allocations via unique ID string matching
// (Placed last to prevent greedy parameter match collisions with explicit static paths)
router.get('/:id', protect, (req, res, next) => {
  if (recordController && typeof recordController.getRecord === 'function') {
    return recordController.getRecord(req, res, next);
  }
  return res.status(500).json({ error: "getRecord handler function is not defined on recordController" });
});

export default router;