import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from './models/User.js';
import Connection from './models/Connection.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGOOB_URI || 'mongodb://127.0.0.1:27017/medvault';
const DEMO_PASSWORD = 'MedVaultDemo@2026';

// Same RSA keypair shape authController.registerUser generates — demo accounts are
// upserted directly (bypassing registration), so without this, getTargetPublicKey
// 400s on every demo doctor/admin and record-sharing can never succeed.
const generateKeyPair = () => crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const seedDemoAccounts = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    // Fixed, well-known ID for the sandbox tenant — every demo account lives under it
    // so authController's per-login sandbox wipe (Record/Activity) targets exactly this tenant.
    const demoHospitalId = new mongoose.Types.ObjectId('111111111111111111111111');

    const password = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Group all demo users under the single isolated demo hospital tenant.
    // NOTE: verificationStatus is set explicitly (not left to the schema default) so the
    // demo doctor is always immediately usable — bypassing the normal hospital-admin
    // approval workflow that real doctor signups require.
    const demoUsers = [
      {
        username: 'Demo Patient',
        email: 'patient@demo.com',
        role: 'patient',
        isDemo: true,
        password,
        verificationStatus: 'verified',
        hospitalId: demoHospitalId,
        ...generateKeyPair(), // every uploader wraps their own records under their own key now — see lib/encryption.js
      },
      {
        username: 'Dr. Demo Doctor',
        email: 'doctor@demo.com',
        role: 'doctor',
        specialty: 'General Practice',
        isDemo: true,
        password,
        verificationStatus: 'verified', // 👈 Pre-approved — skips hospital admin verification
        hospitalId: demoHospitalId,
        ...generateKeyPair(), // record-sharing looks doctors up by publicKey — see getTargetPublicKey
      },
      {
        username: 'Demo Hospital Admin',
        email: 'admin@demo.com',
        // 'hospital_admin' matches the real Mongoose role enum (avoid the previous 'admin'
        // value, which isn't a valid User.role and only "worked" because findOneAndUpdate
        // was skipping schema validation).
        role: 'hospital_admin',
        isDemo: true,
        password,
        verificationStatus: 'verified',
        hospitalId: demoHospitalId,
        ...generateKeyPair(),
      },
    ];

    const savedUsers = {};
    for (const user of demoUsers) {
      const saved = await User.findOneAndUpdate(
        { email: user.email },
        { $set: user },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      savedUsers[user.role] = saved;
      console.log(`✅ Seeded ${user.role} → ${user.email}`);
    }

    // Link the demo patient and demo doctor with an active connection so neither
    // dashboard opens to an empty state — the doctor immediately has a patient in
    // their roster, and the patient immediately has a doctor in their network.
    if (savedUsers.patient && savedUsers.doctor) {
      await Connection.findOneAndUpdate(
        { patientId: savedUsers.patient._id, doctorId: savedUsers.doctor._id },
        { $set: { status: 'active' } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      console.log('✅ Linked Demo Patient ↔ Demo Doctor (active connection)');
    }

    console.log('\n🎉 Demo sandbox ready. Credentials (password is the same for all):');
    console.log(`   Patient        → patient@demo.com`);
    console.log(`   Doctor         → doctor@demo.com`);
    console.log(`   Hospital Admin → admin@demo.com`);
    console.log(`   Password       → ${DEMO_PASSWORD}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedDemoAccounts();
