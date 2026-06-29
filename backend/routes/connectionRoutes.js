// routes/connectionRoutes.js
import express from 'express';
import { 
  requestConnection, 
  acceptConnection, 
  rejectConnection, 
  getPatientConnections, 
  getDoctorPendingRequests 
} from '../controllers/connectionController.js';
import { protect } from '../middleware/auth.js'; // Use your actual auth middleware path

const router = express.Router();

// All connection routes require authentication
router.use(protect);

// Routes
router.post('/request', requestConnection);
router.post('/accept/:connectionId', acceptConnection);
router.post('/reject/:connectionId', rejectConnection);
router.get('/patient', getPatientConnections);
router.get('/doctor/pending', getDoctorPendingRequests);

export default router;