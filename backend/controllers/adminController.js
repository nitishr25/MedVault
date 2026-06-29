import User from '../models/User.js';
import Record from '../models/Record.js'; 
import Activity from '../models/Activity.js';
import Connection from '../models/Connection.js';

/**
 * 📊 Admin Telemetry Fetcher (Multi-Tenant RBAC Enabled)
 * Automatically scopes data based on admin clearance level.
 */
export const getAdminTelemetry = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const hospitalId = isSuperAdmin ? null : req.user.hospitalId;

    // --- 1. VERIFIED DOCTORS & UNIQUE PATIENTS ---
    const docQuery = { role: 'doctor', verificationStatus: 'verified' };
    if (hospitalId) docQuery.hospitalId = hospitalId;
    
    const hospitalDoctors = await User.find(docQuery).select('_id');
    const doctorIds = hospitalDoctors.map(d => d._id);

    const uniquePatientIds = await Connection.distinct('patientId', { 
      doctorId: { $in: doctorIds },
      status: 'active'
    });

    // 🚨 BULLETPROOF FIX: Convert ObjectIds to Strings to prevent type-mismatches
    const stringPatientIds = uniquePatientIds.map(id => String(id));
    const queryTargetIds = [...uniquePatientIds, ...stringPatientIds];

    // --- 2. TOTAL RECORDS ---
    const totalRecords = await Record.countDocuments({ 
      $or: [
        { user: { $in: queryTargetIds } },
        { patient: { $in: queryTargetIds } },
        { owner: { $in: queryTargetIds } },
        { patientId: { $in: queryTargetIds } }
      ]
    });

    console.log("🔍 DIAGNOSTIC - Target Patient IDs:", queryTargetIds);
    console.log("🔍 DIAGNOSTIC - Found Records:", totalRecords);

    // --- 3. 🚨 PENDING DOCTORS (RESTORED) ---
    const pendingFilter = { role: 'doctor', verificationStatus: 'pending' };
    if (hospitalId) pendingFilter.hospitalId = hospitalId;
    
    console.log("🔍 DIAGNOSTIC - Searching for pending doctors with filter:", pendingFilter);

    const pendingDoctors = await User.find(pendingFilter)
      .select('_id username email specialty createdAt hospitalId')
      .sort('-createdAt');

    console.log(`🔍 DIAGNOSTIC - Found ${pendingDoctors.length} pending doctors in the database.`);

    return res.status(200).json({
      status: 'success',
      data: {
        totalPatients: uniquePatientIds.length,
        totalRecords: totalRecords,
        totalDoctors: hospitalDoctors.length,
        pendingCount: pendingDoctors.length, // 👈 Restored
        pendingDoctors                       // 👈 Restored
      }
    });
  } catch (err) {
    console.error("❌ Telemetry Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to aggregate.' });
  }
};

/**
 * 🔐 Admin Action: Verify or Reject Doctor (Multi-Tenant Gatekeeper)
 */
export const verifyDoctor = async (req, res) => {
  try {
    const { doctorId, action = 'approve' } = req.body; 

    if (!doctorId) {
      return res.status(400).json({ status: 'fail', message: 'Operator ID payload missing.' });
    }

    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ status: 'fail', message: 'Target operator node not found.' });
    }

    if (req.user.role === 'hospital_admin') {
      if (String(doctor.hospitalId) !== String(req.user.hospitalId)) {
        return res.status(403).json({ 
          status: 'fail', 
          message: 'Security Breach: You cannot verify/reject an operator outside your designated hospital network.' 
        });
      }
    }

    if (action === 'reject') {
      const rejectedName = doctor.username;
      await User.findByIdAndDelete(doctorId);

      try {
        await Activity.create({
          user: req.user._id,
          source: 'System Administration',
          type: 'Admin Actions',
          actor: req.user.username || 'Hospital Admin',
          patient: 'System Update',
          record: 'Operator Authorization',
          action: `Rejected and removed operator ${rejectedName}`,
          hospitalId: req.user.hospitalId,
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          timestamp: new Date()
        });
      } catch (logError) {
        console.error("❌ Admin Reject Log Error:", logError.message);
      }

      return res.status(200).json({ 
        status: 'success', 
        message: `Unauthorized operator ${rejectedName} has been permanently purged from the ledger.` 
      });
    }

    doctor.verificationStatus = 'verified';
    await doctor.save();

    try {
      await Activity.create({
        user: req.user._id,
        source: 'System Administration',
        type: 'Admin Actions',
        actor: req.user.username || 'Hospital Admin',
        patient: 'System Update',
        record: 'Operator Authorization',
        action: `Verified and unlocked operator ${doctor.username}`, // 👈 Fixed duplicate "Dr." issue
        hospitalId: req.user.hospitalId,
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Admin Verify Log Error:", logError.message);
    }

    return res.status(200).json({
      status: 'success',
      message: `Operator ${doctor.username} has been cryptographically verified and unlocked.`
    });
  } catch (err) {
    console.error("❌ Doctor Verification Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to process clinical operator action.' });
  }
};

/**
 * 🩺 Active Clinical Personnel Workload (Staff Telemetry)
 * Fetches verified doctors and their active patient load across the network.
 */
export const getHospitalTelemetry = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const hospitalId = isSuperAdmin ? req.query.hospitalId : req.user.hospitalId;

    if (!hospitalId && !isSuperAdmin) {
      return res.status(403).json({ status: 'fail', message: 'Jurisdiction error.' });
    }

    const activeDoctors = await User.find({ 
      role: 'doctor', 
      ...(hospitalId && { hospitalId }), 
      verificationStatus: 'verified' 
    }).select('username specialty email _id');

    const staffLoad = await Promise.all(activeDoctors.map(async (doctor) => {
      const connections = await Connection.find({ 
        doctorId: doctor._id, 
        status: 'active' 
      }).select('patientId');
      
      const patientIds = connections.map(c => c.patientId);
      
      const stringPatientIds = patientIds.map(id => String(id));
      const queryTargetIds = [...patientIds, ...stringPatientIds];
      
      const recordCount = await Record.countDocuments({ 
        $or: [
          { user: { $in: queryTargetIds } },
          { patient: { $in: queryTargetIds } },
          { owner: { $in: queryTargetIds } },
          { patientId: { $in: queryTargetIds } }
        ]
      });

      return { 
        ...doctor.toObject(), 
        patientCount: patientIds.length, 
        recordCount 
      };
    }));

    return res.status(200).json({ status: 'success', data: staffLoad });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'hospital_admin') {
      query = { hospitalId: req.user.hospitalId };
    } 

    const logs = await Activity.find(query).sort('-createdAt').limit(100);
    
    return res.status(200).json({
      status: 'success',
      data: logs
    });
  } catch (err) {
    console.error("❌ Audit Logs Filtering Error:", err); 
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to sync scoped audit logs' 
    });
  }
};