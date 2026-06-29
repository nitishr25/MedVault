// controllers/connectionController.js
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';

/**
 * 🧑‍⚕️ PATIENT ACTION: Request Connection to Doctor
 */
export const requestConnection = async (req, res) => {
  try {
    const { doctorEmail } = req.body;
    const patientId = req.user.id;

    // 1. Find the target doctor
    const targetDoctor = await User.findOne({ email: doctorEmail.toLowerCase(), role: 'doctor' });
    if (!targetDoctor) {
      return res.status(404).json({ status: 'fail', message: 'Doctor Email Address not found.' });
    }

    // 2. Ensure doctor is actually verified by an admin
    if (targetDoctor.verificationStatus !== 'verified') {
      return res.status(403).json({ status: 'fail', message: 'This operator node is pending admin verification.' });
    }

    // 3. Check if connection already exists
    const existingConnection = await Connection.findOne({ patientId, doctorId: targetDoctor._id });
    if (existingConnection) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `Connection is already ${existingConnection.status}.` 
      });
    }

    // 4. Create Pending Connection
    const newConnection = await Connection.create({
      patientId,
      doctorId: targetDoctor._id,
      status: 'pending'
    });

    // Log Pending Connection for Audit Logs
    try {
      // Format doctor name to avoid "Dr. Dr." if it already has it
      const formattedDoctorName = targetDoctor.username.toLowerCase().startsWith('dr') 
        ? targetDoctor.username 
        : `Dr. ${targetDoctor.username}`;

      await Activity.create({
        user: targetDoctor._id, // Targeted to the doctor's feed
        source: 'Patient Node',
        type: 'Access Requests',
        actor: req.user.username || 'Patient',
        patient: req.user.username || 'Patient',
        record: 'Connection Request',
        // 🚨 FIX: Now specifies exactly which doctor the request was sent to
        action: `Requested clinical connection access to ${formattedDoctorName}`,
        hospitalId: targetDoctor.hospitalId,
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Connection Request Log Error:", logError.message);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Connection request dispatched securely.',
      data: newConnection
    });

  } catch (err) {
    console.error("❌ Connection Request Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to dispatch connection request.' });
  }
};

/**
 * 🩺 DOCTOR ACTION: Accept Pending Connection
 */
export const acceptConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const doctorId = req.user.id;

    const connection = await Connection.findOneAndUpdate(
      { _id: connectionId, doctorId, status: 'pending' },
      { status: 'active' },
      { new: true }
    );

    if (!connection) {
      return res.status(404).json({ status: 'fail', message: 'Valid pending request not found.' });
    }

    // Generate Patient Notification Log & Audit Trail Entry
    try {
      const doctorUser = await User.findById(doctorId);
      const patientUser = await User.findById(connection.patientId); // 🚨 FIX: Fetch the actual patient
      
      const formattedDoctorName = doctorUser.username.toLowerCase().startsWith('dr') 
        ? doctorUser.username 
        : `Dr. ${doctorUser.username}`;
      
      const patientName = patientUser ? patientUser.username : 'Patient';

      // Log for Patient Feed
      await Activity.create({
        user: connection.patientId,
        source: 'System',
        type: 'Access Approved',
        actor: formattedDoctorName,
        patient: patientName, // 🚨 FIX: Replaced 'You' with actual name
        record: 'Clinical Ledger Node',
        action: `Accepted connection request from ${patientName}`, // 🚨 FIX: Makes sense in global admin view
        hospitalId: doctorUser.hospitalId,
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Failed to log acceptance activity:", logError.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Cryptographic handshake authorized.'
    });

  } catch (err) {
    console.error("❌ Accept Connection Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to authorize connection.' });
  }
};

/**
 * 🩺 DOCTOR ACTION: Reject Pending Connection
 */
export const rejectConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const doctorId = req.user.id;

    // Delete the pending connection entirely
    const connection = await Connection.findOneAndDelete({ 
      _id: connectionId, 
      doctorId, 
      status: 'pending' 
    });

    if (!connection) {
      return res.status(404).json({ status: 'fail', message: 'Valid pending request not found.' });
    }

    // Log the Rejection so the Patient knows
    try {
      const doctorUser = await User.findById(doctorId);
      const patientUser = await User.findById(connection.patientId); // 🚨 FIX: Fetch the actual patient
      
      const formattedDoctorName = doctorUser.username.toLowerCase().startsWith('dr') 
        ? doctorUser.username 
        : `Dr. ${doctorUser.username}`;
        
      const patientName = patientUser ? patientUser.username : 'Patient';

      await Activity.create({
        user: connection.patientId,
        source: 'System',
        type: 'Access Rejected',
        actor: formattedDoctorName,
        patient: patientName, // 🚨 FIX: Replaced 'You' with actual name
        record: 'Clinical Ledger Node',
        action: `Rejected connection request from ${patientName}`, // 🚨 FIX: Clear action string
        hospitalId: doctorUser.hospitalId,
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Failed to log rejection activity:", logError.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Connection request rejected and removed.'
    });

  } catch (err) {
    console.error("❌ Reject Connection Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to reject connection.' });
  }
};

/**
 * 📊 DASHBOARD ACTION: Get Patient's Doctors
 */
export const getPatientConnections = async (req, res) => {
  try {
    const connections = await Connection.find({ patientId: req.user.id })
      .populate('doctorId', 'username email specialty status hospitalId hospital')
      .sort('-createdAt'); 

    return res.status(200).json({ status: 'success', data: connections });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch network map.' });
  }
};

/**
 * 📊 DASHBOARD ACTION: Get Doctor's Pending Requests
 */
export const getDoctorPendingRequests = async (req, res) => {
  try {
    const requests = await Connection.find({ doctorId: req.user.id, status: 'pending' })
      .populate('patientId', 'username email specialty')
      .sort('-createdAt');

    return res.status(200).json({ status: 'success', data: requests });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch pending queue.' });
  }
};