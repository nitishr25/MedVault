import express from 'express';
// Modern ES Module imports directly mapped to your validated authController parameters
import { registerUser, loginUser, updatePassword, getUsersByRole } from '../controllers/authController.js'; // 👈 Added updatePassword
import { validateRegister, validateLogin } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js'; // 👈 Added protection middleware

const router = express.Router();

/**
 * Authentication Router Matrix Gateway Mappings
 * Secure validation hooks execute sequentially before hitting database controller layers.
 */
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

// Public or Protected route to get the directory
router.get('/users', getUsersByRole);

/**
 * 🔐 Secure Settings Routing
 * Requires valid JWT Bearer token (enforced by 'protect' middleware)
 */
router.put('/update-password', protect, updatePassword); // 👈 New route wired up

// Explicit root router allocation export compliance
export default router;