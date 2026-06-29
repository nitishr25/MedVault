import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
// Make sure this path points to your actual controller file
import { getAdminTelemetry, verifyDoctor, getHospitalTelemetry, getAuditLogs } from '../controllers/adminController.js'; 

const router = express.Router();

// 1. SECURITY GATE: Ensure all routes below require a valid token
router.use(protect);

// 2. RBAC GATE: Only Super Admins and Hospital Admins can access these routes
router.use(restrictTo('super_admin', 'hospital_admin'));

// 3. THE ROUTES
// Note: Your controller already handles the logic to show global vs local telemetry
router.get('/telemetry', getAdminTelemetry); 
router.post('/verify-doctor', verifyDoctor);
router.get('/hospital-telemetry', getHospitalTelemetry);
// Ensure this route exists in your backend adminRoutes.js
router.get('/hospital-staff', protect, restrictTo('admin', 'hospital_admin'), getHospitalTelemetry);
router.get('/audit-logs', protect, restrictTo('admin', 'hospital_admin'), getAuditLogs);
export default router;