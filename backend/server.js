import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

// CRITICAL FIX: Modern ES Module imports for your custom routes
import authRoutes from './routes/authRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';

const app = express();

// ==========================================
// 🗄️ 1. DATABASE CONFIGURATION & LIFECYCLE
// ==========================================
// Forces Mongoose to ignore stale or corrupted index rules on your Atlas cluster
mongoose.set('autoIndex', false); 

// Fallback logic check for MONGODB_URI or local fallback parameters
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGOOB_URI || 'mongodb://127.0.0.1:27017/medvault';

mongoose.connect(MONGO_URI)
  .then((conn) => {
    console.log(`[Database] MongoDB Connected Securely: ${conn.connection.host}`);
  })
  .catch((err) => {
    console.error(`[Database Error] Connection Failed: ${err.message}`);
  });

// ==========================================
// 🛡️ 2. GLOBAL ARCHITECTURE MIDDLEWARE LAYERS
// ==========================================
// Grouped and ordered all inbound data payload structural parsers sequentially
app.use(express.json());
app.use(express.urlencoded({ extended: true }));   
app.use(cookieParser());

// Optimized CORS configuration gateway to clear preflight handshakes
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 'https://med-vault-beige.vercel.app'// Dynamic alignment
  credentials: true, // Clears passing secure HTTP-Only cookies across origin lines
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// ==========================================
// 🩺 3. BASE API HEALTHCHECK DIAGNOSTIC ROUTE
// ==========================================
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'MedVault Cryptographic Engine Operating Normally',
    timestamp: new Date()
  });
});

// ==========================================
// 🚀 4. MOUNT MODULAR APPLICATION API ROUTERS
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/records', recordRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/connections', connectionRoutes);
// ==========================================
// 🚨 5. GLOBAL ERROR HANDLER CATCH (BUG TRAPPER)
// ==========================================
app.use((err, req, res, next) => {
  console.error('======================================================');
  console.error('[CRITICAL SERVER ERROR EVENT]:');
  console.error(err.stack); // Dumps line execution paths and traces straight to terminal log
  console.error('======================================================');

  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error Encountered within core cluster execution layers.',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Secure execution exception triggered.'
  });
});

// ==========================================
// 🔌 6. NETWORK CORE LISTENER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Core Service Active on Port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
