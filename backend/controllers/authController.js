import User from '../models/User.js'; 
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * 📝 Production Registration Controller Engine (Multi-Tenant RBAC Ready)
 */
const registerUser = async (req, res) => {
  try {
    console.log("🚨 INCOMING REGISTRATION PAYLOAD:", req.body);
    
    // 1. EXTRACT EVERYTHING EXPLICITLY
    const { username, email, password, role, specialty, hospitalId } = req.body;

    let formattedName = username.trim().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // 2. Enforce "Dr. " prefix for clinical staff
    if (role === 'doctor') {
      if (!formattedName.startsWith('Dr. ')) {
        if (formattedName.startsWith('Dr ')) {
          formattedName = formattedName.replace('Dr ', 'Dr. '); // Fix missing dot
        } else {
          formattedName = `Dr. ${formattedName}`; // Prepend completely
        }
      }
    }
    // Override the original username with the perfectly formatted one
    const finalUsername = formattedName;

    // 2. Uniqueness Checks
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: 'fail', message: 'This identity node key email is already registered inside MedVault.' });
    }

    const usernameExists = await User.findOne({ username: finalUsername });
    if (usernameExists) {
      return res.status(400).json({ status: 'fail', message: 'This operator username is already assigned. Please select a different identifier.' });
    }

    // 3. Generate a dedicated RSA Keypair for this user
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // 4. SECURITY GATE: Determine Verification Status and Specialty based on Role
    let initialStatus = 'verified'; // Default for patients and super_admins
    let assignedSpecialty = null;

    if (role === 'doctor') {
      initialStatus = 'pending'; // 🔥 MUST BE APPROVED BY ADMIN
      // Store the specific specialty, fallback to General Practice if they bypassed the input
      assignedSpecialty = specialty && specialty.trim() !== '' ? specialty : 'General Practice';
    }

    // 🔒 STRICT REQUIREMENT: Only 1 Admin per Hospital
    if (role === 'hospital_admin') {
      const targetHospital = hospitalId || 'HOSPITAL-01';
      const existingAdmin = await User.findOne({ role: 'hospital_admin', hospitalId: targetHospital });
      
      if (existingAdmin) {
        return res.status(403).json({ 
          status: 'fail', 
          message: `Action Blocked: An Administrator is already assigned to ${targetHospital}.` 
        });
      }
    }

    // 5. Create User Record (Injecting Hospital ID for RBAC)
    const newUser = await User.create({
      username: finalUsername,
      email,
      password, // Assuming your Mongoose schema has a pre('save') hook to hash this
      role: role || 'patient',
      specialty: assignedSpecialty,
      verificationStatus: initialStatus,
      // MULTI-TENANT ROUTING: Assign hospital ID to clinical staff. Defaults to 'HOSPITAL-01' for demo fallback.
      hospitalId: (role === 'doctor' || role === 'hospital_admin') ? (hospitalId || 'HOSPITAL-01') : undefined,
      publicKey,  
      privateKey  
    });

    return res.status(201).json({
      status: 'success',
      message: role === 'doctor' 
        ? 'Registration successful. Please wait for an Administrator to verify your clinical credentials.'
        : 'MedVault Operator Identity Record successfully committed to secure ledger.',
      data: { 
        user: {
          id: newUser._id,
          username: newUser.username,
          role: newUser.role,
          verificationStatus: newUser.verificationStatus,
          specialty: newUser.specialty,
          hospitalId: newUser.hospitalId
        } 
      }
    });

  } catch (err) {
    console.error("❌ Critical System Error During User Registration:", err.message);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error Encountered. Failed to write ledger identity document.' });
  }
};

/**
 * 🔑 Production Authentication & Sync Login Controller
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Authorization handshake failed. Invalid identity credentials or node key.' });
    }

    // 2. Compare password (assuming user.comparePassword is defined in your schema)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Authorization handshake failed. Invalid identity credentials or node key.' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '30d' }
    );

    // 4. Set secure HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('token', token, cookieOptions);

    // 5. Return success payload
    return res.status(200).json({
      status: 'success',
      token,
      message: 'Cryptographic Identity Handshake Complete. Master Node Synced Cleanly.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        specialty: user.specialty, 
        verificationStatus: user.verificationStatus, 
        hospitalId: user.hospitalId, 
        publicKey: user.publicKey,
        privateKey: user.privateKey 
      }
    });

  } catch (err) {
    console.error("❌ Critical System Error During User Authentication:", err.message);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error Encountered. Authentication pipeline validation tracking crashed.' });
  }
};

/**
 * 🔐 Settings Action: Update Password Securely
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; 

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'fail', message: 'Both current and new passwords are required.' });
    }

    // 1. Fetch user to get their current hashed password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User identity node not found.' });
    }

    // 2. Validate current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Current password is incorrect' });
    }

    // 3. Apply the new password (Mongoose pre-save hook will automatically hash it)
    user.password = newPassword;
    await user.save(); 

    return res.status(200).json({
      status: 'success',
      message: 'Cryptographic access key updated successfully.'
    });

  } catch (err) {
    console.error("❌ Password Update Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update cryptographic access key.' });
  }
};

// Fetch all users (used for the clinical directory)
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    
    // If a role is provided in the URL (like ?role=doctor), filter by it. Otherwise, get everyone.
    const query = role ? { role: role.toLowerCase() } : {};
    
    // Find users and exclude their passwords and sensitive data from the result
    const users = await User.find(query).select('username email role specialty hospitalId ');
    
    return res.status(200).json({ status: 'success', users });
  } catch (err) {
    console.error("❌ Directory Fetch Error:", err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch clinical directory.' });
  }
};

export { registerUser, loginUser, updatePassword };