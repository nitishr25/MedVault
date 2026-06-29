import { z } from 'zod';

/**
 * 📝 Core Registration Validation Schema
 * Rigid structural enforcement matching your production database Mongoose Model
 */
const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username cannot exceed 30 characters")
    .trim(),
  email: z.string()
    .email("Invalid email format structure")
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters long"),
  role: z.enum(['patient', 'doctor', 'admin', 'hospital_admin'], {
    errorMap: () => ({ message: "Please select a valid ecosystem role (patient, doctor, admin, hospital_admin)" })
  }),
  specialty: z.string().optional(), // ✅ CRITICAL FIX: Zod will now allow this field through
  encryptionSalt: z.string().min(10).optional(),
  hospitalId: z.string().optional()
});

/**
 * 🔑 Core Login Validation Schema
 * Ensures incoming authorization vectors are structurally sound before database lookups
 */
const loginSchema = z.object({
  email: z.string()
    .email("Invalid email format structure")
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, "Password security input field cannot be left empty")
});

/**
 * 🖨️ Centralized Structural Error Formatter
 * Formats data array mismatches cleanly for seamless Next.js Toast UI rendering
 */
const handleValidationError = (error, res) => {
  // 1. Zod Parsing Error Processor
  if (error?.errors && Array.isArray(error.errors)) {
    const errorDetails = error.errors.map(err => {
      const field = err.path ? err.path.join('.') : 'field';
      return `${field}: ${err.message}`;
    });

    return res.status(400).json({
      status: 'fail',
      message: errorDetails[0] // Return the primary issue directly to keep the UI toast sleek and readable
    });
  }

  // 2. Legacy Express-Validator Array Extraction Fallback
  if (typeof error?.array === 'function') {
    const legacyErrors = error.array().map(err => err.msg || 'Invalid input field value');
    return res.status(400).json({
      status: 'fail',
      message: legacyErrors[0]
    });
  }

  // 3. Absolute Fallback Guard Clause
  return res.status(400).json({
    status: 'fail',
    message: error.message || 'Validation layer rejected transmission due to structural input mismatch.'
  });
};

/**
 * 🛡️ Registration Validation Middleware
 */
const validateRegister = (req, res, next) => {
  try {
    // CRITICAL FIX: Reassign req.body to the stripped, validated payload returned by Zod
    req.body = registerSchema.parse(req.body);
    return next();
  } catch (error) {
    console.error("❌ Registration Payload Validation Failed:");
    return handleValidationError(error, res);
  }
};

/**
 * 🛡️ Login Validation Middleware
 */
const validateLogin = (req, res, next) => {
  try {
    // CRITICAL FIX: Reassign req.body to the stripped, validated payload returned by Zod
    req.body = loginSchema.parse(req.body);
    return next();
  } catch (error) {
    console.error("❌ Login Payload Validation Failed:");
    return handleValidationError(error, res);
  }
};

// CRITICAL FIX: Modern ES Module named exports standard syntax
export { 
  validateRegister,
  validateLogin 
};