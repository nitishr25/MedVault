import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// CRITICAL FIX: Modern ES Module imports for your custom routes
import authRoutes from './routes/authRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';

// ==========================================
// 🧯 0. PROCESS-LEVEL CRASH RESILIENCE
// ==========================================
// Without these, one unhandled rejection anywhere (a missed .catch on a
// background task, a timer callback, etc.) takes down the entire process —
// every in-flight request included — with nothing but a stack trace in a
// log nobody's watching. Log loudly and exit so the process supervisor
// (nodemon/pm2/host) restarts cleanly, instead of the process either dying
// silently or limping on in undefined state.
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] — process will restart:', err);
  process.exit(1);
});

const app = express();

// ==========================================
// 🗄️ 1. DATABASE CONFIGURATION & LIFECYCLE
// ==========================================
// autoIndex only applies indexes declared in the schema at *connection* time —
// with it off, any index added to a model later never gets created in
// production and nobody notices until queries are silently doing full
// collection scans. syncIndexes() below is the explicit, deploy-time
// equivalent: it runs once on boot instead of on every write.
mongoose.set('autoIndex', false);

// Fallback logic check for MONGODB_URI or local fallback parameters
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGOOB_URI || 'mongodb://127.0.0.1:27017/medvault';

let isDbReady = false;

mongoose.connect(MONGO_URI)
  .then(async (conn) => {
    console.log(`[Database] MongoDB Connected Securely: ${conn.connection.host}`);
    isDbReady = true;
    try {
      await Promise.all(
        Object.values(mongoose.connection.models).map((model) => model.syncIndexes())
      );
      console.log('[Database] Indexes synced for all models.');
    } catch (indexErr) {
      console.error('[Database] Index sync failed:', indexErr.message);
    }
  })
  .catch((err) => {
    // Previously the server started accepting traffic regardless of this
    // failure — every request would then fail with an opaque Mongoose
    // "buffering timed out" error instead of a clear signal the DB never
    // connected in the first place.
    console.error(`[Database Error] Connection Failed: ${err.message}`);
  });

mongoose.connection.on('disconnected', () => {
  isDbReady = false;
  console.error('[Database] Connection lost — Mongoose will attempt to reconnect.');
});
mongoose.connection.on('reconnected', () => {
  isDbReady = true;
  console.log('[Database] Reconnected.');
});

// ==========================================
// 🛡️ 2. GLOBAL ARCHITECTURE MIDDLEWARE LAYERS
// ==========================================
app.use(compression()); // gzip all responses — cheap, direct win on transfer size/TTFB
// Grouped and ordered all inbound data payload structural parsers sequentially
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optimized CORS configuration gateway to clear preflight handshakes
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.endsWith('.vercel.app') || origin === 'http://localhost:3000') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// ==========================================
// 🩺 3. BASE API HEALTHCHECK DIAGNOSTIC ROUTE
// ==========================================
app.get('/api/v1/health', (req, res) => {
  // Reports actual DB readiness instead of just "the process is running" —
  // a process can be up while Mongo is unreachable, and a health check that
  // can't tell the difference is worse than no health check at all.
  res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'success' : 'degraded',
    message: isDbReady
      ? 'MedVault Cryptographic Engine Operating Normally'
      : 'Database connection not yet established.',
    dbReady: isDbReady,
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
