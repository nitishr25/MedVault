// controllers/recordController.js
import Record from '../models/Record.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Connection from '../models/Connection.js';
import axios from 'axios';
import FormData from 'form-data';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sanitizePrivateKey = (raw) => {
  if (!raw) throw new Error('RELAYER_PRIVATE_KEY is not set in environment.');
  const stripped = raw.replace(/["'\s]/g, '');
  const hexOnly = stripped.replace(/^0[xX]/, '').replace(/[^0-9a-fA-F]/g, '');

  if (hexOnly.length !== 64) {
    throw new Error(`RELAYER_PRIVATE_KEY has invalid length after sanitization: expected 64 hex chars, got ${hexOnly.length}.`);
  }
  return `0x${hexOnly}`;
};

const uploadRecord = async (req, res, next) => {
  try {
    const { title, description, iv, wrappedKey, originalMimeType } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ status: 'fail', message: 'Document title identifier is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'No valid binary file asset detected in form payload.' });
    }

    let parsedIv = [];
    let parsedWrappedKey = [];
    try {
      parsedIv = iv ? JSON.parse(iv) : [];
      parsedWrappedKey = wrappedKey ? JSON.parse(wrappedKey) : [];
    } catch (parseError) {
      return res.status(400).json({ status: 'fail', message: 'Invalid encryption metadata format' });
    }

    const masterApiKey = process.env.PINATA_API_KEY;
    const masterSecretKey = process.env.PINATA_API_SECRET;

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'pinata_api_key': masterApiKey.trim(),
          'pinata_secret_api_key': masterSecretKey.trim(),
          ...formData.getHeaders(),
        },
      }
    );

    const ipfsHash = pinataResponse.data.IpfsHash;
    const ipfsGatewayUrl = `${process.env.IPFS_GATEWAY_BASE_URL || 'https://gateway.pinata.cloud/ipfs'}/${ipfsHash}`;
    const computedSizeInMB = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;

    const record = await Record.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      ipfsHash,
      ipfsGatewayUrl,
      fileSize: computedSizeInMB,
      mimeType: 'application/octet-stream',
      iv: parsedIv,
      wrappedKey: parsedWrappedKey,
      originalMimeType: originalMimeType || ''
    });

    try {
      await Activity.create({
        user: req.user._id,
        source: 'Patient Node',
        type: 'Uploads',
        actor: req.user.username || 'Patient',
        patient: req.user.username || 'Patient',
        record: title.trim(),
        action: 'Uploaded Document',
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Mongoose Upload Log Error:", logError.message);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Medical document entry successfully pinned and keys secured.',
      data: { record },
    });
  } catch (err) {
    next(err);
  }
};

const syncRecordToBlockchain = async (req, res, next) => {
  try {
    const { ipfsHash, title } = req.body;
    if (!ipfsHash || !title) return res.status(400).json({ status: 'error', message: 'Missing IPFS payload.' });

    const provider = new JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const cleanKey = sanitizePrivateKey(process.env.RELAYER_PRIVATE_KEY);
    const relayerWallet = new Wallet(cleanKey, provider);

    const abiPath = path.resolve(__dirname, './MedVaultABI.json');
    if (!fs.existsSync(abiPath)) return res.status(500).json({ status: 'error', message: 'ABI map missing.' });
    const contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const medVaultContract = new Contract(process.env.SMART_CONTRACT_ADDRESS, contractABI, relayerWallet);
    const txResponse = await medVaultContract.addMedicalRecord(ipfsHash, title);
    const txReceipt = await txResponse.wait();

    return res.status(200).json({
      status: 'success',
      blockchainData: {
        transactionHash: txReceipt.hash,
        blockNumber: txReceipt.blockNumber,
        gasUsed: txReceipt.gasUsed.toString(),
        contractDestination: process.env.SMART_CONTRACT_ADDRESS,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUserRecords = async (req, res, next) => {
  try {
    const query = { $or: [{ user: req.user._id }, { 'sharedAccess.recipient': req.user._id }] };
    const records = await Record.find(query)
      .populate('user', 'username email')
      .populate('sharedAccess.recipient', 'username email specialty hospitalId hospital')
      .sort({ createdAt: -1 });

    
    return res.status(200).json({ status: 'success', count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch node records.' });
  }
};

const getRecordStats = async (req, res, next) => {
  try {
    const records = await Record.find({ user: req.user._id }).sort({ createdAt: 1 });
    const parseSize = (sizeStr) => parseFloat(sizeStr?.replace(/[^\d.]/g, '')) || 0;
    const computedTotalStorage = records.reduce((acc, r) => acc + parseSize(r.fileSize), 0).toFixed(2);
    
    const monthlyMap = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };
    records.forEach((r) => {
      if (r.createdAt) {
        const monthIndex = new Date(r.createdAt).toLocaleString('default', { month: 'short' });
        if (monthlyMap[monthIndex] !== undefined) monthlyMap[monthIndex]++;
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalRecords: records.length,
        totalStorage: `${computedTotalStorage} MB`,
        chartData: Object.keys(monthlyMap).map((month) => ({ month, records: monthlyMap[month] })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getRecord = async (req, res, next) => {
  try {
    const record = await Record.findOne({ 
      _id: req.params.id,
      $or: [{ user: req.user._id }, { 'sharedAccess.recipient': req.user._id }]
    });

    if (!record) return res.status(404).json({ status: 'fail', message: 'No document matches that signature.' });

    if (req.user.role === 'doctor') {
      try {
        const patientUser = await User.findById(record.user);
        const formattedDoctorName = req.user.username.toLowerCase().startsWith('dr') ? req.user.username : `Dr. ${req.user.username}`;
        await Activity.create({
          user: req.user._id,
          source: 'Clinical Ledger',
          type: 'Records Viewed',
          actor: formattedDoctorName,
          patient: patientUser?.username || 'Patient',
          record: record.title || 'Medical Document',
          action: 'Viewed Document',
          hospitalId: req.user.hospitalId,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          timestamp: new Date()
        });
      } catch (logError) {
        console.error("❌ Mongoose Viewed Log Error:", logError.message);
      }
    }

    return res.status(200).json({ status: 'success', data: { record } });
  } catch (err) {
    next(err);
  }
};

const getTargetPublicKey = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({ email: req.params.email.toLowerCase().trim(), role: { $in: ['doctor', 'hospital_admin'] } });
    if (!targetUser) return res.status(404).json({ status: 'fail', message: 'Clinical operator not found.' });
    if (!targetUser.publicKey) return res.status(400).json({ status: 'fail', message: 'Target node lacks RSA init.' });

    return res.status(200).json({ status: 'success', data: { doctorId: targetUser._id, publicKey: targetUser.publicKey }});
  } catch (err) {
    next(err);
  }
};

const grantRecordAccess = async (req, res, next) => {
  try {
    const { recordId, doctorId, sharedWrappedKey } = req.body;
    const record = await Record.findOne({ _id: recordId, user: req.user._id });
    
    if (!record) return res.status(404).json({ status: 'fail', message: 'Record not found or access denied.' });

    const existingShareIndex = record.sharedAccess.findIndex(sa => sa.recipient.toString() === doctorId);
    if (existingShareIndex > -1) {
      record.sharedAccess[existingShareIndex].wrappedKey = sharedWrappedKey;
      record.sharedAccess[existingShareIndex].grantedAt = Date.now();
    } else {
      record.sharedAccess.push({ recipient: doctorId, wrappedKey: sharedWrappedKey });
    }
    await record.save();

    try {
      const doctorUser = await User.findById(doctorId);
      const doctorName = doctorUser ? (doctorUser.username.toLowerCase().startsWith('dr') ? doctorUser.username : `Dr. ${doctorUser.username}`) : 'Doctor Node';

      await Activity.create({
        user: doctorId, 
        source: 'Patient Node',
        type: 'Access Events',
        actor: `${req.user.username} (Patient)`,
        patient: req.user.username,
        record: record.title || 'Medical Record',
        action: `Granted Access to ${doctorName}`,
        hospitalId: doctorUser?.hospitalId || undefined,
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Mongoose Access Log Error:", logError.message);
    }

    return res.status(200).json({ status: 'success', message: 'Payload delegated.' });
  } catch (err) {
    next(err);
  }
};

const addDoctorFeedback = async (req, res, next) => {
  try {
    const recordId = req.params.id;
    const { remarks } = req.body;
    
    const record = await Record.findOneAndUpdate(
      { _id: recordId, "sharedAccess.recipient": req.user._id },
      { $set: { "sharedAccess.$.doctorRemarks": remarks } },
      { new: true }
    );

    if (!record) return res.status(404).json({ status: 'fail', message: 'Record not found.' });

    try {
      const patientId = record.user || record.patient || record.owner;
      const patientUser = await User.findById(patientId);
      const formattedDoctorName = req.user.username.toLowerCase().startsWith('dr') ? req.user.username : `Dr. ${req.user.username}`;
      
      await Activity.create({
        user: patientId, 
        source: 'Clinical Ledger',
        type: 'Feedback',
        actor: formattedDoctorName,
        patient: patientUser?.username || 'Patient',
        record: record.title || 'Medical Record',
        action: `Added clinical remarks`,
        hospitalId: req.user.hospitalId,
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Mongoose Feedback Log Error:", logError.message);
    }

    return res.status(200).json({ status: 'success', message: 'Feedback added.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to save feedback.' });
  }
};

// 9. READ TIMELINE ACTIVITY MATRIX FEED (INDESTRUCTIBLE FIREWALL VERSION)
const getUserActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find({ user: req.user._id })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(20);

    return res.status(200).json({ status: 'success', data: activities });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch activity feed.' });
  }
};

// 10. REFACTOR ROUTE FALLBACK
export const addRecordRemark = async (req, res) => {
  try {
    const updatedRecord = await Record.findOneAndUpdate(
      { _id: req.body.recordId }, 
      { doctorRemarks: req.body.remark },
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ status: 'fail', message: 'Record not found.' });

    try {
      const patientId = updatedRecord.user || updatedRecord.patient;
      const patientUser = await User.findById(patientId);
      const formattedDoctorName = req.user.username?.toLowerCase().startsWith('dr') ? req.user.username : `Dr. ${req.user.username || 'Doctor'}`;
      
      await Activity.create({
        user: patientId,
        source: 'Clinical Ledger',
        type: 'Feedback',
        actor: formattedDoctorName,
        patient: patientUser?.username || 'Patient',
        record: updatedRecord.title || 'Medical Record',
        action: `Added clinical remarks`,
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("❌ Mongoose Fallback Feedback Log Error:", logError.message);
    }

    return res.status(200).json({ status: 'success', data: updatedRecord });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

const recordController = {
  uploadRecord,
  syncRecordToBlockchain,
  getUserRecords,
  getRecordStats,
  addDoctorFeedback,
  getRecord,
  getTargetPublicKey, 
  grantRecordAccess,
  addRecordRemark,
  getUserActivities
};

export default recordController;