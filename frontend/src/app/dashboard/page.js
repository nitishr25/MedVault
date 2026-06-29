'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { encryptFile, decryptFile } from '@/lib/encryption';
import {
  Shield,
  ShieldCheck,
  LayoutDashboard,
  FileText,
  UploadCloud,
  Settings,
  LogOut,
  Activity,
  User,
  CheckCircle2,
  AlertCircle,
  Database,
  Search,
  UserCheck,
  Server,
  FileCheck,
  ExternalLink,
  RefreshCw,
  FolderLock,
  ShieldAlert,
  Mail,
  KeyRound,
  Terminal,
  FolderPlus,
  HardDrive,
  BarChart3,
  Clock,
  UserPlus,
  Users,
  ClipboardList,
  Eye,
  EyeOff,
  Building2,
  Stethoscope
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const HOSPITAL_DIRECTORY = {
  "HOSPITAL-01": "City General Hospital",
  "HOSPITAL-02": "Metro Medical Center",
  "HOSPITAL-03": "Valley Health Clinic",
  "HOSPITAL-04": "Sunrise Care Hospital",
  "HOSPITAL-05": "Oceanview Medical",
  "HOSPITAL-06": "Pinnacle Health System",
  "HOSPITAL-07": "Central Neurological Institute"
};

export default function PremiumDashboard() {
  const router = useRouter();

  // =========================================================================
  // 💾 CORE REACT STATE INITIALIZATION ENGINES (Declared First)
  // =========================================================================
  const [activeTab, setActiveTab] = useState('overview');
  const [dbRecords, setDbRecords] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [currentUser, setCurrentUser] = useState({ username: 'Operator', role: 'patient', email: '' });

  const [directoryDoctors, setDirectoryDoctors] = useState([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // 1. Patient selection state for Doctor Roster
  const [activePatient, setActivePatient] = useState(null);

  // 📋 AUDIT LOG STATE
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('All');
  const [auditDate, setAuditDate] = useState('All Time');
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // 🛡️ ADMIN STATE
  const [adminTelemetry, setAdminTelemetry] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalRecords: 0,
    pendingCount: 0,
    pendingDoctors: []
  });

  // 🤝 HANDSHAKE STATE (For Patients)
  const [patientConnections, setPatientConnections] = useState([]);
  const [searchDoctorEmail, setSearchDoctorEmail] = useState('');
  const [isSearchingDoctor, setIsSearchingDoctor] = useState(false);
  const [selectedDoctorDetail, setSelectedDoctorDetail] = useState(null);

  // 📝 CLINICAL REMARKS STATE
  const [remarkText, setRemarkText] = useState('');
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // 🔐 PASSWORD MODAL STATE
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    currentPassword: '',
    newPassword: '',
    isLoading: false
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 🕒 ACTIVITY FEED STATE
  const [activities, setActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // 2. Crash-proof patient grouping logic with Status and Last Activity injection
  const patientRoster = useMemo(() => {
    const recordArray = dbRecords || [];
    const unique = recordArray.reduce((acc, record) => {
      const patientId = record.user?._id;
      if (patientId && patientId !== currentUser?._id) {
        if (!acc[patientId]) {
          acc[patientId] = {
            id: patientId,
            username: record.user?.username || 'Unknown Patient',
            email: record.user?.email || 'N/A',
            recordCount: 0,
            status: 'Granted',
            files: []
          };
        }
        acc[patientId].recordCount += 1;
        acc[patientId].files.push(record);
      }
      return acc;
    }, {});

    // Calculate last activity date for Doctors' Clinical Inbox
    const rosterArray = Object.values(unique).map(patient => {
      const sortedFiles = [...patient.files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastActivity = sortedFiles.length > 0 ? new Date(sortedFiles[0].createdAt).toLocaleDateString() : 'N/A';
      return { ...patient, lastActivity };
    });

    return rosterArray;
  }, [dbRecords, currentUser]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Premium Toast States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Decryption Preview State
  const [previewData, setPreviewData] = useState({
    isOpen: false,
    url: null,
    type: null,
    title: '',
    recordId: null,
    isLoading: false,
    description: '',
    sharedAccess: []
  });

  // File Sharing State
  const [shareData, setShareData] = useState({
    isOpen: false,
    record: null,
    doctorEmail: '',
    isLoading: false
  });

  // Real-Time Database Metrics Telemetry State
  const [dashboardStats, setDashboardStats] = useState({
    totalRecords: 0,
    totalStorage: '0.00 MB',
    lastActivity: 'None',
    pendingCount: 0,
    activeNodes: 0,
    chartData: [],
    pendingRequests: []
  });

  // 🔒 Dynamic Security Masking Engine for PHI Compliance
  const maskEmailString = (emailStr) => {
    if (!emailStr || !emailStr.includes('@')) return "secured_profile@vault.local";
    const [localPart, domainPart] = emailStr.split('@');
    if (localPart.length <= 3) {
      return `${localPart[0]}${'*'.repeat(localPart.length - 1)}@${domainPart}`;
    }
    const maskedLength = localPart.length - 3;
    return `${localPart.substring(0, 3)}${'*'.repeat(maskedLength)}@${domainPart}`;
  };

  // =========================================================================
  // ⚡ NOTIFICATION ENGINE & API DATA SYNCHRONIZERS
  // =========================================================================
  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const fetchActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const res = await api.get('/records/activities');
      if (res.data.status === 'success') {
        setActivities(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch activity feed:", error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchTelemetryStats = async () => {
    try {
      const res = await api.get('/records/stats/telemetry');
      if (res.data?.status === 'success') {
        setDashboardStats(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.warn("Telemetry API fallback activated. Generating local metrics.");
    }
  };

  const fetchLiveRecords = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await api.get('/records/user');
      if (res.data?.status === 'success') {
        const recordsData = res.data.data || [];
        setDbRecords(recordsData);
      }
    } catch (err) {
      console.error("❌ Failed to stream database records:", err);
      triggerToast('Error synchronizing node telemetry ledger lists.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 🔄 RE-RENDER BOUNDARY LOGIC EFFECTS
  // =========================================================================
  useEffect(() => {
    if (dbRecords.length > 0) {
      const totalBytes = dbRecords.reduce((acc, curr) => {
        const sizeString = curr.fileSize || "0";
        const numericMatch = sizeString.match(/[\d.]+/);
        return acc + (numericMatch ? parseFloat(numericMatch[0]) : 0);
      }, 0);

      setDashboardStats(prev => ({
        ...prev,
        totalRecords: dbRecords.length,
        totalStorage: `${totalBytes.toFixed(2)} MB`
      }));
    }
  }, [dbRecords]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchTelemetryStats();
      fetchActivities();
    } else if (activeTab === 'audit-logs') {
      fetchAuditLogs(); // <-- Triggers sync when Admin opens the tab
    }
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch (e) {
        console.error("Failed to parse cached user metadata.", e);
      }
    }

    fetchLiveRecords();
  }, [router]);

  useEffect(() => {
    if (currentUser?.role === 'hospital_admin' || currentUser?.role === 'admin') {
      fetchAdminTelemetry();
      fetchStaffLoad();
    }
    if (currentUser?.role === 'patient') {
      fetchPatientConnections();
    }
    if (currentUser?.role === 'doctor') {
      fetchDoctorPendingRequests();
    }
  }, [currentUser]);

  useEffect(() => {
    // Only fetch if they are on the My Doctors tab (adjust 'network' to match your tab state name)
    if (activeTab === 'network') {
      const fetchDirectory = async () => {
        setIsLoadingDirectory(true);
        try {
          // Adjust this endpoint to match your actual backend route that gets all doctors
          const res = await api.get('/auth/users?role=doctor');
          // Assuming your API returns { status: 'success', data: [...] } or similar
          setDirectoryDoctors(res.data.users || res.data || []);
        } catch (error) {
          console.error("Failed to fetch clinical directory:", error);
        } finally {
          setIsLoadingDirectory(false);
        }
      };

      fetchDirectory();
    }
  }, [activeTab]); // Re-runs if they navigate away and come back

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordModal.newPassword.length < 8) {
      return triggerToast("New password must be at least 8 characters long.", "error");
    }

    setPasswordModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await api.put('/auth/update-password', {
        currentPassword: passwordModal.currentPassword,
        newPassword: passwordModal.newPassword
      });

      if (res.data?.status === 'success' || res.status === 200) {
        triggerToast("Cryptographic access keys updated successfully.", "success");
        setPasswordModal({ isOpen: false, currentPassword: '', newPassword: '', isLoading: false });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update password.";
      triggerToast(msg, "error");
    } finally {
      setPasswordModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // =========================================================================
  // ⚙️ ACTION HANDLERS
  // =========================================================================
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    triggerToast('Ecosystem node session terminated securely.', 'success');

    setTimeout(() => {
      router.push('/login');
    }, 1200);
  };

  // =========================================================================
  // 🤝 HANDSHAKE ACTION HANDLERS (Patients)
  // =========================================================================
  const fetchPatientConnections = async () => {
    try {
      const res = await api.get('/connections/patient');
      if (res.data?.status === 'success') {
        setPatientConnections(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    }
  };

  const handleRequestConnection = async (e) => {
    e.preventDefault();
    if (!searchDoctorEmail.trim()) return;

    setIsSearchingDoctor(true);
    try {
      const res = await api.post('/connections/request', { doctorEmail: searchDoctorEmail });
      if (res.data?.status === 'success') {
        triggerToast('Connection request dispatched successfully.', 'success');
        setSearchDoctorEmail('');
        fetchPatientConnections();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch request.';
      triggerToast(msg, 'error');
    } finally {
      setIsSearchingDoctor(false);
    }
  };

  // =========================================================================
  // 🛡️ ADMIN ACTION HANDLERS
  // =========================================================================
  const fetchAdminTelemetry = async () => {
    try {
      const res = await api.get('/admin/telemetry');
      console.log("🔍 FRONTEND DIAGNOSTIC - API Response:", res.data);
      if (res.data?.status === 'success') {
        setAdminTelemetry(res.data.data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch admin telemetry:", err);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data?.status === 'success') {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      console.error("❌ Failed to fetch audit logs:", err);
      triggerToast("Failed to sync system audit trail.", "error");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const fetchStaffLoad = async () => {
    try {
      const res = await api.get('/admin/hospital-staff');
      setActiveStaff(res.data.data);
    } catch (error) {
      console.error("Failed to fetch staff workload", error);
    }
  };

  const handleVerifyNode = async (doctorId, action = 'approve') => {
    try {
      const res = await api.post('/admin/verify-doctor', { doctorId, action });

      if (res.data?.status === 'success') {
        // OPTIMISTIC UI: Remove row immediately
        setAdminTelemetry((prev) => {
          if (!prev) return prev;
          const newCount = prev.pendingCount > 0 ? prev.pendingCount - 1 : 0;
          const newDoctors = prev.pendingDoctors.filter((doc) => doc._id !== doctorId);
          return { ...prev, pendingCount: newCount, pendingDoctors: newDoctors };
        });

        triggerToast(res.data.message || `Node successfully ${action}d.`, 'success');

        if (typeof fetchStaffLoad === 'function') {
          fetchStaffLoad();
        }
      }
    } catch (err) {
      console.error(`❌ Verification Error [${action}]:`, err);
      const errorMessage = err.response?.data?.message || err.message || 'Verification action failed';
      triggerToast(errorMessage, 'error');
    }
  };

  // =========================================================================
  // 🩺 DOCTOR ACTION HANDLERS (Handshake & Remarks)
  // =========================================================================
  const fetchDoctorPendingRequests = async () => {
    try {
      const res = await api.get('/connections/doctor/pending');
      if (res.data?.status === 'success') {
        setDashboardStats(prev => ({
          ...prev,
          pendingRequests: res.data.data,
          pendingCount: res.data.data.length
        }));
      }
    } catch (err) {
      console.error("❌ Failed to fetch doctor pending requests:", err);
    }
  };

  const handleApproveRequest = async (connectionId) => {
    try {
      triggerToast('Authorizing cryptographic handshake...', 'success');
      const res = await api.post(`/connections/accept/${connectionId}`);

      if (res.data?.status === 'success') {
        triggerToast('Handshake complete. Patient added to clinical roster.', 'success');

        setTimeout(async () => {
          await Promise.all([
            typeof fetchDoctorPendingRequests === 'function' ? fetchDoctorPendingRequests() : Promise.resolve(),
            typeof fetchLiveRecords === 'function' ? fetchLiveRecords() : Promise.resolve(),
            typeof fetchTelemetryStats === 'function' ? fetchTelemetryStats() : Promise.resolve(),
            typeof fetchPatientConnections === 'function' ? fetchPatientConnections() : Promise.resolve()
          ]);
        }, 500); // 500ms buffer prevents race conditions with the database
      }
    } catch (err) {
      triggerToast('Failed to authorize handshake.', 'error');
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      triggerToast('Rejecting connection request...', 'success');

      const res = await api.post(`/connections/reject/${connectionId}`);

      if (res.data?.status === 'success') {
        triggerToast('Request denied and cleared from queue.', 'success');
        fetchDoctorPendingRequests();
        if (typeof fetchTelemetryStats === 'function') fetchTelemetryStats();
      }
    } catch (err) {
      triggerToast('Failed to reject request.', 'error');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !previewData.recordId) return;
    setIsSubmittingFeedback(true);

    try {
      const recordId = previewData.recordId;

      const res = await api.put(`/records/${recordId}/feedback`, {
        remarks: feedbackText
      });

      if (res.data?.status === 'success' || res.status === 200) {
        triggerToast('Clinical feedback securely appended to ledger.', 'success');

        // Update the live modal state
        setPreviewData(prev => ({
          ...prev,
          sharedAccess: prev.sharedAccess.map(access => {
            const docId = currentUser?._id || currentUser?.id;
            const recId = access.recipient?._id || access.recipient?.id || access.recipient;

            if (String(recId) === String(docId)) {
              return { ...access, doctorRemarks: feedbackText };
            }
            return access;
          })
        }));

        // 🚨 NEW: Force the main table database to sync in the background
        if (typeof fetchLiveRecords === 'function') {
          fetchLiveRecords();
        }
      }
    } catch (err) {
      console.error("Failed to save feedback:", err);
      triggerToast('Failed to save feedback network error.', 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleIpfsUploadSubmission = async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('medical-file');
    const titleInput = document.getElementById('document-title');
    const descInput = document.getElementById('document-description');

    if (!fileInput.files[0] || !titleInput.value.trim()) {
      triggerToast('Please provide both a descriptive title and a valid medical file.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) throw new Error('Not authenticated');

      const encryptionSecret = "MedVault-Stable-Secret-2026";

      const file = fileInput.files[0];
      const title = titleInput.value.trim();
      const description = descInput.value.trim();

      const { encryptedBlob, iv, wrappedKey, originalType } = await encryptFile(file, encryptionSecret);

      const payload = new FormData();
      payload.append('file', encryptedBlob, file.name);
      payload.append('title', title);
      payload.append('description', description || 'Decentralized document node payload stream.');
      payload.append('iv', JSON.stringify(iv));
      payload.append('wrappedKey', JSON.stringify(wrappedKey));
      payload.append('originalMimeType', originalType);

      const res = await api.post('/records/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (res.data?.status === 'success') {
        const savedRecord = res.data.data?.record;

        triggerToast('Asset encrypted and written into IPFS! Initializing immutable on-chain ledger lock...');

        if (savedRecord?.ipfsHash) {
          try {
            await api.post('/records/blockchain-sync', {
              ipfsHash: savedRecord.ipfsHash,
              title: savedRecord.title
            });
          } catch (syncErr) {
            console.error('⚠️ Cryptographic relayer queue synchronization failure:', syncErr.message);
          }
        }

        triggerToast('Success! Record encrypted, locked on-chain and securely stored.');

        titleInput.value = '';
        descInput.value = '';
        fileInput.value = '';

        const placeholderLabel = document.getElementById('file-name-placeholder');
        if (placeholderLabel) {
          placeholderLabel.innerText = "Click to browse files (PDF, PNG, JPG up to 10MB)";
        }

        setActiveTab('records');
        await fetchLiveRecords();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'IPFS pipeline upload streaming transmission rejected.';
      triggerToast(errorMsg, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewRecord = async (record) => {
    let existingRemarks = '';
    if (currentUser?.role === 'doctor') {
      const docId = currentUser?._id || currentUser?.id;
      const myAccess = record.sharedAccess?.find(a => {
        const recId = a.recipient?._id || a.recipient?.id || a.recipient;
        return String(recId) === String(docId);
      });
      existingRemarks = myAccess?.doctorRemarks || '';
    }
    setFeedbackText(existingRemarks);

    setPreviewData({
      isOpen: true,
      url: null,
      type: null,
      title: record.title,
      recordId: record._id || record.id,
      isLoading: true,
      description: record.description,
      sharedAccess: record.sharedAccess
    });

    try {
      const encryptionSecret = "MedVault-Stable-Secret-2026";

      const targetUrl = record.ipfsGatewayUrl || `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`;
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Failed to fetch file from IPFS network');

      const encryptedArrayBuffer = await response.arrayBuffer();
      let decryptedBuffer;

      console.log(`🔐 DECRYPTION ENGINE: Initiating unwrap for ${currentUser?.role}...`);

      decryptedBuffer = await decryptFile(
        encryptedArrayBuffer,
        record.iv,
        record.wrappedKey,
        encryptionSecret
      );

      const mimeType = record.originalMimeType || 'application/pdf';
      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);

      setPreviewData(prev => ({
        ...prev,
        url: objectUrl,
        type: mimeType,
        isLoading: false
      }));

    } catch (err) {
      console.error("Decryption pipeline failed:", err);
      triggerToast(err.message || "Decryption failed: Cryptographic signature mismatch or network error.", "error");
      setPreviewData({ isOpen: false, url: null, type: null, title: '', recordId: null, isLoading: false, description: '', sharedAccess: [] });
    }
  };

  const closePreview = () => {
    if (previewData.url) URL.revokeObjectURL(previewData.url);
    setPreviewData({ isOpen: false, url: null, type: null, title: '', recordId: null, isLoading: false, description: '', sharedAccess: [] });
    setFeedbackText('');
  };

  const openShareModal = (record) => {
    setShareData({ isOpen: true, record: record, doctorEmail: '', isLoading: false });
  };

  const closeShareModal = () => {
    setShareData({ isOpen: false, record: null, doctorEmail: '', isLoading: false });
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!shareData.doctorEmail.trim() || !shareData.record) return;

    setShareData(prev => ({ ...prev, isLoading: true }));

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) throw new Error('Authentication token missing from client session node.');

      const encryptionSecret = "MedVault-Stable-Secret-2026";

      console.log("🟢 STEP 1: Fetching Doctor's Key...");
      const docEmailClean = shareData.doctorEmail.toLowerCase().trim();
      const keyResponse = await fetch(`http://localhost:5000/api/v1/records/public-key/${docEmailClean}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!keyResponse.ok) throw new Error('Target doctor node not found.');
      const keyResult = await keyResponse.json();
      const { doctorId, publicKey: pemString } = keyResult.data;

      console.log("🟢 STEP 2: Converting RSA Key...");
      let doctorPublicKeyCrypto;
      try {
        const pemContents = pemString.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
        const binaryDerString = window.atob(pemContents);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) {
          binaryDer[i] = binaryDerString.charCodeAt(i);
        }
        doctorPublicKeyCrypto = await crypto.subtle.importKey('spki', binaryDer.buffer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
      } catch (err) {
        throw new Error("Failed at Step 2: RSA Key conversion rejected.");
      }

      console.log("🟢 STEP 3: Unwrapping Patient's Key...");
      let rawDekBytes;
      try {
        const baseKeyBytes = new TextEncoder().encode(encryptionSecret);
        const baseKey = await crypto.subtle.importKey('raw', baseKeyBytes, 'HKDF', false, ['deriveKey']);
        const patientKek = await crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(16), info: new Uint8Array() },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['unwrapKey']
        );

        const wrappedKeyRaw = shareData.record.wrappedKey.data || shareData.record.wrappedKey;

        const fileDek = await crypto.subtle.unwrapKey(
          'raw',
          new Uint8Array(wrappedKeyRaw),
          patientKek,
          { name: 'AES-GCM', iv: new Uint8Array(12) },
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        rawDekBytes = await crypto.subtle.exportKey('raw', fileDek);
      } catch (err) {
        throw new Error("Failed at Step 3: Could not unwrap the original key.");
      }

      console.log("🟢 STEP 4: Re-encrypting for Doctor...");
      let doctorWrappedKeyBuffer;
      try {
        doctorWrappedKeyBuffer = await crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          doctorPublicKeyCrypto,
          rawDekBytes
        );
      } catch (err) {
        throw new Error("Failed at Step 4: Could not wrap key for doctor.");
      }

      const sharedWrappedKeyArray = Array.from(new Uint8Array(doctorWrappedKeyBuffer));

      console.log("🟢 STEP 5: Saving to Database...");
      const shareResponse = await fetch('http://localhost:5000/api/v1/records/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ recordId: shareData.record._id, doctorId, sharedWrappedKey: sharedWrappedKeyArray })
      });

      if (!shareResponse.ok) throw new Error('Failed to dispatch re-wrapped key.');

      triggerToast(`Access granted cleanly! Encrypted key envelope stored for ${docEmailClean}.`, "success");
      closeShareModal();
    } catch (err) {
      console.error("❌ Handshake Failed:", err);
      triggerToast(err.message, "error");
    } finally {
      setShareData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const filteredRecords = dbRecords.filter(rec =>
    rec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.ipfsHash?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Search Filter
      const matchesSearch = auditSearch === '' || log.actor?.toLowerCase().includes(auditSearch.toLowerCase());

      // 2. Type Filter
      const matchesType = auditFilter === 'All' || log.type?.includes(auditFilter);

      // 3. Date Filter
      let matchesDate = true;
      if (auditDate !== 'All Time') {
        const logDate = new Date(log.timestamp || log.createdAt);
        const now = new Date();

        if (auditDate === 'Today') {
          matchesDate = logDate.toDateString() === now.toDateString();
        } else if (auditDate === 'Last 7 Days') {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchesDate = logDate >= sevenDaysAgo;
        } else if (auditDate === 'This Month') {
          matchesDate = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [auditLogs, auditSearch, auditFilter, auditDate]);

  // =========================================================================
  // 🛑 SECURITY GATE: PENDING DOCTOR LOCKOUT
  // =========================================================================
  if (currentUser?.role === 'doctor' && currentUser?.verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center space-y-6">
          <div className="h-20 w-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(245,158,11,0.1)]">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-wide">Verification Pending</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your clinical operator node has been registered successfully, but is currently locked. A Global Administrator must verify your credentials before you can access patient ledgers.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="h-11 w-full rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-teal-500 selection:text-slate-950">

      {/* FLOATING GLASSMORPHIC TOAST NOTIFICATION LAYER */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[340px] max-w-md transition-all ${toast.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20'
            : 'bg-red-950/80 border-red-500/30 text-red-300 shadow-red-950/20'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <p className="text-sm font-medium tracking-wide leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* AMBIENT CYBERNETIC BACKGROUND GLOWS */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-teal-500/5 to-transparent blur-[140px] animate-pulse duration-[9000ms]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-sky-500/5 to-transparent blur-[120px] animate-pulse duration-[7000ms]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* STICKY GLASSMORPHIC SIDEBAR NAVIGATION MODULE */}
      <aside className="relative z-10 w-64 border-r border-slate-900 bg-slate-900/20 backdrop-blur-2xl flex flex-col justify-between shrink-0">
        <div>
          <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-900/60">
            <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 p-2.5 ring-1 ring-teal-500/20 shadow-inner">
              <Shield className="h-5 w-5 text-teal-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-wider text-white uppercase bg-clip-text bg-gradient-to-b from-white to-slate-400">MedVault</span>
              <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Decentralized</span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'overview'
                ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            {/* STRICT ROLE GUARD: ONLY PATIENTS SEE MY NETWORK */}
            {currentUser?.role === 'patient' && (
              <button
                onClick={() => setActiveTab('network')}
                className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'network'
                  ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
              >
                <UserPlus className="h-4 w-4" />
                My Doctors
              </button>
            )}

            {/* STRICT ROLE GUARD: ADMINS EXCLUDED FROM MEDICAL RECORDS */}
            {(currentUser?.role === 'doctor' || currentUser?.role === 'patient') && (
              <button
                onClick={() => setActiveTab('records')}
                className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'records'
                  ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
              >
                <FileText className="h-4 w-4" />
                {currentUser?.role === 'doctor' ? 'Clinical Inbox' : 'Medical Records'}
              </button>
            )}

            {/* STRICT ROLE GUARD: ADMINS ONLY AUDIT LOGS */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') && (
              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'audit-logs'
                  ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
              >
                <ClipboardList className="h-4 w-4" />
                Audit Logs
              </button>
            )}

            {/* STRICT ROLE GUARD: ONLY PATIENTS CAN UPLOAD */}
            {currentUser?.role === 'patient' && (
              <button
                onClick={() => setActiveTab('upload')}
                className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'upload'
                  ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                  : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
              >
                <UploadCloud className="h-4 w-4" />
                Upload Record
              </button>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold tracking-wide transition-all ${activeTab === 'settings'
                ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-400 ring-1 ring-teal-500/20 shadow-lg shadow-teal-950/20'
                : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </nav>
        </div>

        {/* BOTTOM AUTHENTICATED SYSTEM PROFILE IDENTITY CARD */}
        <div className="p-4 border-t border-slate-900/60 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 flex items-center justify-center ring-1 ring-slate-700/10 shadow-inner shrink-0">
              <User className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate leading-snug capitalize">
                {currentUser?.role === 'doctor'
                  ? (currentUser?.username?.toLowerCase().startsWith('dr') ? currentUser?.username : `Dr. ${currentUser?.username}`)
                  : currentUser?.username}
              </h4>
              <p className="text-[9px] text-teal-400 font-mono tracking-widest uppercase mt-0.5 bg-teal-500/5 border border-teal-500/10 rounded px-1.5 py-0.5 inline-block">
                {currentUser?.role}
              </p>
              {(currentUser?.role === 'doctor' || currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') && (
                <p className="text-[10px] text-slate-500 truncate mt-1 font-medium">
                  {HOSPITAL_DIRECTORY[currentUser?.hospitalId] || 'Unassigned Hospital'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-slate-950 border border-slate-900 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 group/btn"
          >
            <LogOut className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            Disconnect Node
          </button>
        </div>
      </aside>

      {/* COMPONENT CENTRAL VIEW SHEET WRAPPER */}
      <div className="flex-1 flex flex-col relative z-10 overflow-y-auto">

        {/* INTERACTIVE WORKSPACE SUBHEADER */}
        <header className="h-20 border-b border-slate-900/60 px-8 flex items-center justify-between bg-slate-950/20 backdrop-blur-xl shrink-0">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white">MedVault Management Dashboard</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Secure, decentralized cross-origin framework nodes reporting stable.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={fetchLiveRecords}
              disabled={isLoading}
              className="p-2 border border-slate-900 rounded-xl bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-900 transition-all disabled:opacity-40"
              title="Force Sync Index Ledger"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-1.5 text-[11px] font-bold tracking-wide text-emerald-400 shadow-sm shadow-emerald-950/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              IPFS Gateway Connected
            </div>
          </div>
        </header>

        <main className="p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">

          {/* TELEMETRY METRIC SECTION CARDS MATRIX */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-slate-900/20 backdrop-blur-2xl border border-slate-900 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-teal-500/20 to-transparent group-hover:via-teal-500/40 transition-all duration-700" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Encryption</span>
                <Activity className="h-4 w-4 text-teal-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Active</h3>
            </div>

            <div className="bg-slate-900/20 backdrop-blur-2xl border border-slate-900 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-sky-500/20 to-transparent group-hover:via-sky-500/40 transition-all duration-700" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
                <Database className="h-4 w-4 text-sky-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight font-mono">
                {isLoading ? "SYNC" : String(
                  (currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin')
                    ? (adminTelemetry?.totalRecords || 0)
                    : (dashboardStats?.totalRecords ?? dbRecords?.length ?? 0)
                ).padStart(2, '0')}
              </h3>
            </div>

            <div className="bg-slate-900/20 backdrop-blur-2xl border border-slate-900 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent group-hover:via-purple-500/40 transition-all duration-700" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Role</span>
                <UserCheck className="h-4 w-4 text-purple-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight capitalize">{currentUser?.role}</h3>
            </div>
          </section>

          {/* DYNAMIC CARD WORKSPACE STAGE */}
          <section className="bg-slate-900/10 backdrop-blur-2xl border border-slate-900 rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

            <div className="p-6 border-b border-slate-900 bg-slate-950/20 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wider text-white uppercase">{activeTab} Workspace</h3>
              <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest"></div>
            </div>

            <div className="p-8">

              {/* LAYOUT STAGE 1: SYSTEM MANAGEMENT CONSOLE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 py-1 animate-fadeIn">

                  {/* WELCOME BANNER SECTION GRID */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white tracking-wide capitalize">
                        Welcome Back, {currentUser?.username || "User"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {currentUser?.role === 'super_admin'
                          ? "Global System Administrator node reporting operational."
                          : currentUser?.role === 'hospital_admin'
                            ? `Local Administration node connected. Managing jurisdiction: ${HOSPITAL_DIRECTORY[currentUser?.hospitalId] || currentUser?.hospitalId || 'Unknown'}`
                            : currentUser?.role === 'doctor'
                              ? `Clinical operating node securely connected • Node: ${HOSPITAL_DIRECTORY[currentUser?.hospitalId] || currentUser?.hospitalId || 'General Ledger Node'}`
                              : "Your records are up to date."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Cluster Node: Connected
                    </div>
                  </div>

                  {/* LIVE DATABASE-DRIVEN METRIC COUNTERS */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {currentUser?.role === 'doctor' ? (
                      <>
                        {/* DOCTOR CARD 1: PATIENTS GRANTED ACCESS */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Patients Access</span>
                            <span className="text-xl font-black text-white block tracking-tight">
                              {patientRoster.length}
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                        </div>

                        {/* DOCTOR CARD 2: PENDING INBOUND REQUESTS */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Pending Inbound</span>
                            <span className="text-xl font-black text-amber-400 block tracking-tight">
                              {dashboardStats?.pendingRequests?.length || 0}
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <UserPlus className="h-4 w-4" />
                          </div>
                        </div>
                      </>
                    ) : (currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') ? (
                      <>
                        {/* ADMIN CARD 1: AUDIT TRAIL SUMMARY */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Audit Trail</span>
                            <span className="text-xl font-black text-indigo-400 block tracking-tight">
                              Active
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <Activity className="h-4 w-4" />
                          </div>
                        </div>

                        {/* ADMIN CARD 2: NODE HEALTH */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Node Health</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="text-xl font-black text-white block tracking-tight">
                                Connected
                              </span>
                            </div>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Server className="h-4 w-4" />
                          </div>
                        </div>

                        {/* HOSPITAL NETWORK SCALE */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Network</p>
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Users className="w-4 h-4 text-blue-500" />
                            </div>
                          </div>

                          <div className="flex space-x-6">
                            <div>
                              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Patients</p>
                              <h3 className="text-2xl font-bold text-white">
                                {adminTelemetry?.totalPatients || 0}
                              </h3>
                            </div>
                            <div className="w-px bg-slate-800"></div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Doctors</p>
                              <h3 className="text-2xl font-bold text-teal-400">
                                {adminTelemetry?.totalDoctors || 0}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* PATIENT CARD 1: TOTAL RECORDS */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Total Records</span>
                            <span className="text-xl font-black text-white block tracking-tight">
                              {dashboardStats?.totalRecords ?? dbRecords.length}
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                            <FolderPlus className="h-4 w-4" />
                          </div>
                        </div>

                        {/* PATIENT CARD 2: STORAGE FOOTPRINTS */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Storage Allocated</span>
                            <span className="text-xl font-black text-emerald-400 block tracking-tight">
                              {dashboardStats?.totalStorage || '0.00 MB'}
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <HardDrive className="h-4 w-4" />
                          </div>
                        </div>

                        {/* PATIENT CARD 3: ACTIVE DOCTORS */}
                        <div className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">Active Doctors</span>
                            <span className="text-xl font-black text-amber-400 block tracking-tight">
                              {patientConnections.filter(c => c.status === 'active').length} Connected
                            </span>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ADMIN ONLY: PENDING DOCTORS AND STAFF LOAD */}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') && (
                    <>
                      {/* --- START OF PENDING APPROVALS SECTION --- */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                        <div className="p-5 border-b border-slate-900/80 bg-slate-950/60 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                              <ShieldAlert className="h-4 w-4 text-amber-500" />
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                              Pending Operator Verifications
                            </h3>
                          </div>

                          <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                            {adminTelemetry?.pendingCount || 0} Action Required
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-900">
                              <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Operator Info</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Declared Specialty</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/40">
                              {/* 🛡️ ADMIN VIEW */}
                              {adminTelemetry?.pendingDoctors?.length > 0 ? (
                                adminTelemetry.pendingDoctors.map((doc) => (
                                  <tr key={doc._id} className="bg-slate-900/20 hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                      <p className="text-white font-bold">{doc.username}</p>
                                      <p className="text-xs text-slate-500 font-mono mt-0.5">{doc.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                                        {doc.specialty || 'General Practice'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                      {new Date(doc.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                      <div className="flex justify-end items-center gap-3">
                                        <button onClick={() => handleVerifyNode(doc._id, 'approve')} className="px-4 py-2 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] hover:bg-emerald-500/20 transition-colors">
                                          <Shield className="h-3.5 w-3.5" /> Approve
                                        </button>
                                        <button onClick={() => handleVerifyNode(doc._id, 'reject')} className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/50 rounded-lg text-[11px] hover:bg-rose-500/20 transition-colors">
                                          Reject
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                    <p className="font-medium text-xs">No pending operator verifications in the queue.</p>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {/* --- END OF PENDING APPROVALS SECTION --- */}

                      {/* --- CARD 2: ACTIVE CLINICAL PERSONNEL WORKLOAD --- */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                        <div className="p-5 border-b border-slate-900/80 bg-slate-950/60 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                          <h3 className="text-sm font-bold text-white tracking-wide">Active Clinical Personnel</h3>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-900">
                              <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Doctor Name</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Specialty</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Patient Count</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Record Count</th>

                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/40">
                              {(!activeStaff || activeStaff.length === 0) ? (
                                <tr>
                                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                                    No verified clinical staff active on network.
                                  </td>
                                </tr>
                              ) : (
                                activeStaff.map((doctor) => (
                                  <tr key={doctor._id} className="bg-slate-900/20 hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{doctor.username}</td>
                                    <td className="px-6 py-4">
                                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                                        {doctor.specialty}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-blue-400 font-bold">{doctor.patientCount} </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="text-blue-400 font-bold">{doctor.recordCount || 0}</span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* DOCTOR ONLY: PENDING APPROVALS */}
                  {currentUser?.role === 'doctor' && (
                    <div className="space-y-6">

                      {/* PENDING APPROVALS WIDGET */}
                      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-bold text-amber-500 tracking-widest uppercase flex items-center gap-2">
                            <UserPlus className="h-3.5 w-3.5" /> Pending Access Approvals
                          </h4>
                          {/* SYNCS PERFECTLY WITH THE TOP CARD */}
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {dashboardStats?.pendingRequests?.length || 0} Action Required
                          </span>
                        </div>

                        <div className="space-y-3">
                          {/* USES THE CORRECT VARIABLE TO CHECK FOR DATA */}
                          {!dashboardStats?.pendingRequests || dashboardStats.pendingRequests.length === 0 ? (
                            <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                              <p className="text-xs text-slate-500">No inbound patient authorization requests awaiting your approval.</p>
                            </div>
                          ) : (
                            /* LOOPS THROUGH THE CORRECT DATA ARRAY */
                            dashboardStats.pendingRequests.map((req, idx) => (
                              <div key={req._id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                                <div>
                                  {/* ROBUST FALLBACKS FOR PATIENT NAME */}
                                  <h5 className="text-sm font-bold text-white capitalize">
                                    {req.patient?.username || req.patientName || req.user?.username || req.patientId?.username || 'Patient Node'}
                                  </h5>
                                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                    {req.patient?.email || req.patientId?.email || req.reason || req.type || 'Connection Request'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleApproveRequest && handleApproveRequest(req._id)}
                                    className="px-4 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-slate-950 text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest && handleRejectRequest(req._id)}
                                    className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-slate-950 text-[11px] font-bold uppercase transition-all flex items-center justify-center"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIVE RECHARTS ENGINE & FEED SECTION */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CHART CONTAINER PANEL - ONLY VISIBLE TO SUPER_ADMIN */}
                    {currentUser?.role === 'super_admin' && (
                      <div className="lg:col-span-2 bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-teal-400" /> Ledger Document Ingestion Trends
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">Real-time sync</span>
                        </div>
                        <div className="w-full h-48 flex items-center justify-center font-mono text-[10px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dashboardStats?.chartData || []}
                              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                              <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                                itemStyle={{ color: '#00ffaa', fontSize: '11px' }}
                              />
                              <Bar dataKey="records" fill="#00ffaa" radius={[4, 4, 0, 0]} maxBarSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* RECENT ACTIVITY TIMELINE FEED (HIDDEN FOR ALL ADMINS) */}
                    {(currentUser?.role === 'patient' || currentUser?.role === 'doctor') && (
                      <div className={`bg-slate-950/40 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between ${currentUser?.role !== 'super_admin' ? 'lg:col-span-3' : ''}`}>
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" /> Recent Activity
                          </h4>

                          <div className="space-y-3.5">
                            {isLoadingActivities ? (
                              <div className="text-center py-6 text-slate-500 text-xs font-medium animate-pulse">
                                Syncing ledger activities...
                              </div>
                            ) : activities?.length > 0 ? (
                              <>

                                {/* ROLE-BASED ACTIVITY FEED SEPARATION */}
                                {currentUser?.role === 'doctor' ? (

                                  /* 🩺 DOCTOR DASHBOARD - STRICT INBOUND FEED */
                                  activities
                                    .slice(0, 7)
                                    .map((act, idx) => {
                                      const patientName = act.patient || act.actor || 'Patient';
                                      const reportTitle = act.record || 'a Document';

                                      let displayMsg = '';
                                      let dotColor = 'bg-blue-400';

                                      // 1. Check if it's a shared record
                                      if (act.type?.includes('Access Granted') || act.action?.includes('Granted Access')) {
                                        displayMsg = `${patientName} has shared ${reportTitle} with you.`;
                                        dotColor = 'bg-emerald-400';
                                      }
                                      // 2. Check if it's a new connection request
                                      else if (act.type?.includes('Access Requests') || act.record === 'Connection Request') {
                                        displayMsg = `${patientName} has sent you a Connection request.`;
                                        dotColor = 'bg-amber-400'; // Amber to show it needs action
                                      }
                                      // 3. Fallback for any other inbound logs
                                      else {
                                        displayMsg = `${patientName} has uploaded a new record: ${reportTitle}`;
                                      }

                                      return (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                                          <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                            <div className="flex flex-col">
                                              <span className="text-xs text-white font-medium">
                                                {displayMsg}
                                              </span>
                                            </div>
                                          </div>
                                          <span className="text-slate-500 font-mono text-[10px] shrink-0 mt-2 sm:mt-0">
                                            {new Date(act.timestamp || act.createdAt || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      );
                                    })
                                ) : (

                                  /* 🟢 PATIENT DASHBOARD - STRICT PERSONALIZED FEED */
                                  activities
                                    .filter(act => {
                                      const logText = `${act.type || ''} ${act.action || ''}`.toLowerCase();
                                      // STRICT FILTER: ONLY allow feedback/remarks and accept/approve/reject actions.
                                      return logText.includes('feedback') || logText.includes('remark') ||
                                        logText.includes('accept') || logText.includes('approve') || logText.includes('reject');
                                    })
                                    .slice(0, 7)
                                    .map((act, idx) => {
                                      const logText = `${act.type || ''} ${act.action || ''}`.toLowerCase();
                                      const isFeedback = logText.includes('feedback') || logText.includes('remark');

                                      const personName = act.actor || act.doctor || 'Doctor';
                                      const doctorName = personName.toLowerCase().startsWith('dr') ? personName : `Dr. ${personName}`;
                                      const docName = act.record || 'a Document';

                                      let displayTitle = '';
                                      let dotColor = 'bg-slate-400';

                                      if (isFeedback) {
                                        displayTitle = `${doctorName} has given feedback on ${docName} you shared`;
                                        dotColor = 'bg-amber-400';
                                      } else {
                                        // If it passed the filter and isn't feedback, it's a connection response
                                        const isReject = logText.includes('reject');
                                        const status = isReject ? 'rejected' : 'accepted';
                                        displayTitle = `${doctorName} has ${status} your request`;
                                        dotColor = isReject ? 'bg-red-400' : 'bg-emerald-400';
                                      }

                                      return (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                                          <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                            <div className="flex flex-col">
                                              <span className="text-xs text-white font-medium">
                                                {displayTitle}
                                              </span>
                                            </div>
                                          </div>
                                          <span className="text-slate-500 font-mono text-[10px] shrink-0 mt-2 sm:mt-0">
                                            {new Date(act.timestamp || act.createdAt || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      );
                                    })
                                )}
                              </>
                            ) : (
                              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/50 text-slate-500 text-xs font-medium">
                                No recent activity found on ledger.
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof fetchActivities === 'function') fetchActivities();
                            triggerToast("Synchronizing active database dashboard metrics...");
                          }}
                          className="w-full h-8 mt-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
                        >
                          Refresh Metrics
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* LAYOUT STAGE 2: DATA LOGIC RECORDS TABLE INTERFACE */}
              {activeTab === 'records' && (
                <div className="space-y-6">
                  {currentUser?.role === 'doctor' && !activePatient ? (
                    /* DOCTOR ONLY: MY PATIENTS ROSTER VIEW */
                    <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40 p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900/80 pb-3">My Patients</h3>
                      {patientRoster.length === 0 ? (
                        <div className="text-center py-10 text-xs font-medium text-slate-500">
                          <p>No patients have shared encrypted access with your node interface yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientRoster.map((patient) => (
                            <div key={patient.id} className="flex justify-between items-center p-4 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800/60 rounded-xl transition-colors">
                              <div>
                                <h4 className="font-bold text-white text-sm">{patient.username}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {patient.status === 'Granted' ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] uppercase font-bold tracking-wider">Access Granted</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] uppercase font-bold tracking-wider">Pending Auth</span>
                                  )}
                                  <p className="text-[11px] text-slate-500 font-mono">
                                    Last record: {patient.lastActivity} • {patient.recordCount} records
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setActivePatient(patient)}
                                disabled={patient.status !== 'Granted'}
                                className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                View Records <ExternalLink className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* EVERYONE ELSE (AND DOCTORS VIEWING A SPECIFIC PATIENT): THE FILE TABLE */
                    <div className="space-y-4">
                      {/* Doctor Back Button */}
                      {currentUser?.role === 'doctor' && activePatient && (
                        <button
                          onClick={() => setActivePatient(null)}
                          className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors mb-4 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 w-fit"
                        >
                          ← Back to Patient Roster
                        </button>
                      )}

                      {/* Patient Context Header for Doctors */}
                      {currentUser?.role === 'doctor' && activePatient && (
                        <div className="flex items-center justify-between pb-4 border-b border-slate-900/80 mb-6">
                          <div>
                            <h3 className="text-lg font-black text-white tracking-wide">
                              Viewing records for <span className="text-teal-400">{activePatient.username}</span>
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{activePatient.email} • ID: {activePatient.id.slice(-6)}</p>
                          </div>
                          <span className="px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">
                            Active Handshake
                          </span>
                        </div>
                      )}

                      <div className="relative max-w-md group/search">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/search:text-teal-400 transition-colors" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search assets by title..."
                          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 text-sm transition-all"
                        />
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
                        {isLoading ? (
                          <div className="text-center py-16 text-xs font-semibold text-slate-500 flex items-center justify-center gap-3">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
                            Streaming encrypted ledger arrays from decentralized indexer...
                          </div>
                        ) : filteredRecords.filter(r => !activePatient || r.user?._id === activePatient.id).length === 0 ? (
                          <div className="text-center py-20 text-xs font-medium text-slate-500 space-y-2">
                            <p>No records found.</p>
                            <p className="text-[10px] text-slate-700 font-mono"></p>
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-950 border-b border-slate-900/80">
                              <tr>
                                <th className="px-6 py-4">Record Title</th>
                                <th className="px-6 py-4">Storage IPFS Hash</th>
                                <th className="px-6 py-4">File Size</th>
                                <th className="px-6 py-4">Verification Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/40 font-medium">
                              {filteredRecords.filter(r => !activePatient || r.user?._id === activePatient.id).map((record) => (
                                <tr key={record._id || record.id} className="hover:bg-slate-900/30 transition-all group/row">
                                  <td className="px-6 py-4 font-bold text-white max-w-[220px] truncate">
                                    {record.title || "Untitled Fragment"}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-teal-400 max-w-[260px] truncate relative">
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewRecord(record)}
                                      className="hover:text-teal-300 inline-flex items-center gap-1.5 transition-colors text-left"
                                      title="Decrypt and view record"
                                    >
                                      {record.ipfsHash || "Processing identity block..."}
                                      <ExternalLink className="h-3 w-3 opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-500 shrink-0" />
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                    {record.fileSize || "0.00 MB"}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-500/5 text-teal-400 border border-teal-500/10">
                                      Verified Secure
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      {(currentUser?.role === 'patient' || currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') && (
                                        <button
                                          onClick={() => openShareModal(record)}
                                          className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] font-bold text-purple-400 hover:bg-purple-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                                        >
                                          <UserCheck className="h-3.5 w-3.5" /> Share
                                        </button>
                                      )}
                                      {currentUser?.role === 'doctor' && (
                                        <button
                                          onClick={() => handlePreviewRecord(record)}
                                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                                        >
                                          <FileCheck className="h-3.5 w-3.5" /> View & Remark
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LAYOUT STAGE 3: FORM SUBMISSION WORKSPACE */}
              {activeTab === 'upload' && (
                <div className="max-w-xl mx-auto space-y-6 py-2">
                  {currentUser?.role === 'patient' ? (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-white">Upload New Medical Record</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Select a file to upload. It will be securely stored.
                        </p>
                      </div>

                      <form onSubmit={handleIpfsUploadSubmission} className="space-y-4">
                        <div className="space-y-1.5">
                          <label htmlFor="document-title" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Document Title
                          </label>
                          <input
                            id="document-title"
                            type="text"
                            placeholder="e.g., MRI Scan Report Brain Neural Index"
                            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/10 transition-colors"
                            disabled={isLoading}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="document-description" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Record Notes / Diagnosis Summary
                          </label>
                          <textarea
                            id="document-description"
                            rows={3}
                            placeholder="Add additional notes, diagnosis summaries, or indexing references here..."
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/10 transition-colors resize-none"
                            disabled={isLoading}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Medical File Attachment
                          </label>
                          <div className="relative border border-dashed border-slate-800 hover:border-teal-500/30 rounded-xl p-8 text-center transition-all bg-slate-950/40 group">
                            <UploadCloud className="h-8 w-8 text-slate-600 group-hover:text-teal-400 mx-auto mb-2 transition-colors" />
                            <input
                              id="medical-file"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isLoading}
                              onChange={(e) => {
                                const placeholderLabel = document.getElementById('file-name-placeholder');
                                if (placeholderLabel && e.target.files[0]) {
                                  placeholderLabel.innerText = `Selected Payload Asset: ${e.target.files[0].name}`;
                                  placeholderLabel.classList.remove('text-slate-600');
                                  placeholderLabel.classList.add('text-teal-400', 'font-bold');
                                }
                              }}
                              required
                            />
                            <p id="file-name-placeholder" className="text-xs text-slate-600 font-medium tracking-wide">
                              Click to browse local files (PDF, PNG, JPG up to 10MB)
                            </p>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 font-extrabold text-slate-950 shadow-[0_4px_20px_rgba(20,184,166,0.15)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm tracking-wide mt-6"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                              Streaming & Pinning Core Transaction Vectors...
                            </span>
                          ) : (
                            "Upload Secure Record"
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-slate-900 bg-slate-950/40 rounded-2xl">
                      <ShieldAlert className="h-12 w-12 text-red-500 mb-4 opacity-80" />
                      <h3 className="text-lg font-bold text-white mb-2">Access Denied</h3>
                      <p className="text-sm text-slate-400 max-w-sm">
                        Document ingestion is strictly restricted to Patient nodes. Hospital Administrators and Clinical Doctors cannot upload local files to the decentralized ledger.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* LAYOUT STAGE 3.5: PATIENT NETWORK (HANDSHAKE UI) */}
              {activeTab === 'network' && currentUser?.role === 'patient' && (
                <div className="max-w-4xl mx-auto space-y-6 py-2 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-white tracking-wide uppercase">Clinical Network</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Add doctors you'd like to share your records with.
                    </p>
                  </div>

                  {/* Add New Doctor Section */}
                  <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                    <h5 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-teal-400" /> Add a Doctor
                    </h5>
                    <form onSubmit={handleRequestConnection} className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative group/search">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/search:text-teal-400 transition-colors" />
                        <input
                          type="email"
                          value={searchDoctorEmail}
                          onChange={(e) => setSearchDoctorEmail(e.target.value)}
                          placeholder="Doctor's Email Address"
                          className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/10 transition-colors"
                          required
                          disabled={isSearchingDoctor}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingDoctor}
                        className="h-11 px-6 rounded-xl bg-teal-500/10 border border-teal-500/20 text-sm font-bold text-teal-400 hover:bg-teal-500 hover:text-slate-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                      >
                        {isSearchingDoctor ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Send Request
                      </button>
                    </form>
                  </div>

                  {/* Connected Doctors List */}
                  <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-900/80 bg-slate-950/60 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white tracking-wide">Connected Doctors</h3>
                      <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                        {patientConnections.length} Connections
                      </span>
                    </div>

                    <div className="p-5">
                      {patientConnections.length === 0 ? (
                        <div className="text-center py-10 text-xs font-medium text-slate-500 bg-slate-900/20 rounded-xl border border-slate-800/50 border-dashed">
                          You have no active or pending clinical connections.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {patientConnections.map((conn) => (
                            <div
                              key={conn._id}
                              onClick={() => conn.status === 'active' && setSelectedDoctorDetail(conn.doctorId)}
                              className={`flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800 transition-colors ${conn.status === 'active' ? 'cursor-pointer hover:border-teal-500/50 hover:bg-slate-800/40' : 'opacity-75'
                                }`}
                            >
                              <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${conn.status === 'active'
                                ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                }`}>
                                <UserCheck className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate capitalize">
                                  {conn.doctorId?.username
                                    ? (conn.doctorId.username.toLowerCase().startsWith('dr') ? conn.doctorId.username : `Dr. ${conn.doctorId.username}`)
                                    : 'Unknown Operator'
                                  }
                                </h4>
                                <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{conn.doctorId?.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${conn.status === 'active'
                                    ? 'bg-teal-500/5 text-teal-400 border-teal-500/10'
                                    : 'bg-amber-500/5 text-amber-400 border-amber-500/10'
                                    }`}>
                                    {conn.status}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    {conn.doctorId?.specialty || 'General Practice'} • {
                                      HOSPITAL_DIRECTORY[conn.doctorId?.hospitalId] ||
                                      conn.doctorId?.hospitalId ||
                                      HOSPITAL_DIRECTORY[conn.doctorId?.hospital] ||
                                      conn.doctorId?.hospital ||
                                      'Unassigned Hospital'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* NEW CODE: DYNAMIC CLINICAL DIRECTORY */}
                  <div className="pt-8 mt-8 border-t border-slate-800/50">
                    <div className="space-y-1 mb-6">
                      <h4 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                        Global Clinical Directory
                      </h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Discover and connect with verified healthcare professionals
                      </p>
                    </div>

                    {isLoadingDirectory ? (
                      <div className="flex items-center justify-center py-10">
                        <span className="flex items-center gap-2 text-teal-500 text-sm font-bold">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Syncing Global Ledger...
                        </span>
                      </div>
                    ) : (
                      /* ADDED: Fixed height (550px), overflow scrolling, and custom dark-mode scrollbar */
                      <div className="space-y-8 max-h-[550px] overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">

                        {Object.entries(
                          directoryDoctors.reduce((acc, doctor) => {
                            // BULLETPROOF MAPPING: Force string, trim spaces, and lowercase
                            const rawId = String(doctor.hospitalId || doctor.hospital || 'independent').trim().toUpperCase();

                            // Dictionary check
                            const hospitalName = HOSPITAL_DIRECTORY[rawId] || rawId;

                            if (!acc[hospitalName]) acc[hospitalName] = [];
                            acc[hospitalName].push(doctor);
                            return acc;
                          }, {})
                        ).map(([hospital, doctors]) => (
                          <div key={hospital} className="space-y-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50">

                            {/* Hospital Header Segment */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                              <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(20,184,166,0.1)]">
                                  <Building2 className="h-4 w-4 text-teal-400" />
                                </div>
                                <h3 className="text-xs font-black text-white tracking-wider uppercase">
                                  {hospital}
                                </h3>
                              </div>
                              <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                {doctors.length} Specialist{doctors.length !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {/* Doctors Grid for this Hospital */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {doctors.map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/80 hover:border-teal-500/40 transition-all group relative overflow-hidden flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    {/* NEW STETHOSCOPE ICON */}
                                    <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-teal-400 group-hover:border-teal-500/50 transition-colors shrink-0">
                                      <Stethoscope className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-white font-bold text-sm">
                                        {doc.username?.toLowerCase().startsWith('dr') ? doc.username : `Dr. ${doc.username}`}
                                      </h4>
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400/70 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 mt-1 inline-block">
                                        {doc.specialty || 'General'}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      triggerToast(`Copied Node Address!`);
                                      navigator.clipboard.writeText(doc.email);
                                    }}
                                    className="h-8 px-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-teal-400 hover:border-teal-500/30 transition-all shrink-0"
                                  >
                                    Copy Node
                                  </button>
                                </div>
                              ))}
                            </div>

                          </div>
                        ))}
                        {directoryDoctors.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-sm font-medium border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                            No external nodes detected in the public ledger yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LAYOUT STAGE 3.6: ADMIN AUDIT LOGS */}
              {activeTab === 'audit-logs' && (currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') && (
                <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-white tracking-wide uppercase">System Audit Trail</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Immutable log of all data access events across your network nodes.
                    </p>
                  </div>

                  {/* FILTER BAR */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs group/search">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-600 group-focus-within/search:text-teal-400 transition-colors" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search by actor name..."
                        className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-teal-500 text-xs transition-all"
                      />
                    </div>

                    <div className="flex w-full sm:w-auto gap-4">
                      <select
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        className="h-10 flex-1 sm:w-40 rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors appearance-none"
                      >
                        <option value="All">All Event Types</option>
                        <option value="Access">Access Events</option>
                        <option value="Feedback">Feedback</option>
                        <option value="Admin">Admin Actions</option>
                      </select>

                      <select
                        value={auditDate}
                        onChange={(e) => setAuditDate(e.target.value)}
                        className="h-10 flex-1 sm:w-36 rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-white text-xs focus:outline-none focus:border-teal-500 transition-colors appearance-none"
                      >
                        <option value="All Time">All Time</option>
                        <option value="Today">Today</option>
                        <option value="Last 7 Days">Last 7 Days</option>
                        <option value="This Month">This Month</option>
                      </select>
                    </div>
                  </div>

                  {/* AUDIT TABLE */}
                  <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-950/80 border-b border-slate-900">
                          <tr>
                            <th className="px-6 py-4 font-bold">Timestamp</th>
                            <th className="px-6 py-4 font-bold">Event Type</th>
                            <th className="px-6 py-4 font-bold">Actor</th>
                            <th className="px-6 py-4 font-bold">Patient</th>
                            <th className="px-6 py-4 font-bold">Record</th>
                            <th className="px-6 py-4 font-bold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/40">
                          {isLoadingAudit ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400 mr-2" />
                                Syncing ledger logs...
                              </td>
                            </tr>
                          ) : filteredAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">
                                No audit logs match your filters.
                              </td>
                            </tr>
                          ) : (
                            filteredAuditLogs.map((log) => (
                              <tr key={log._id} className="bg-slate-900/20 hover:bg-slate-900/50 transition-colors">
                                <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                  {new Date(log.timestamp || log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${log.color || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {log.type || 'System Event'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                  {log.actor || 'System'}
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                  {log.patient || '—'}
                                </td>
                                <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                                  {log.record || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-medium">
                                  {log.action}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* LAYOUT STAGE 4: SYSTEM SETTINGS LAYER (USER ACCOUNT INTERFACE) */}
              {activeTab === 'settings' && (
                <div className="relative z-40 max-w-2xl mx-auto space-y-6 py-2 animate-fadeIn pointer-events-auto">
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-white tracking-wide uppercase">Account Settings</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manage your secure identity profile and cryptographic keys.
                    </p>
                  </div>

                  <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.4)] space-y-4">
                    {/* Profile Header */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-5">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Profile Identity</span>
                        <h5 className="text-sm font-bold text-white mt-0.5 capitalize">
                          {currentUser?.username
                            ? (currentUser?.role === 'doctor' && !currentUser.username.toLowerCase().startsWith('dr')
                              ? `Dr. ${currentUser.username}`
                              : currentUser.username)
                            : "Authorized Node"}
                        </h5>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-[10px] font-extrabold text-teal-400 uppercase tracking-widest">
                        {currentUser?.role || "Patient"}
                      </span>
                    </div>

                    <div className="space-y-4 pt-2">
                      {/* EMAIL ROW */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/20 border border-slate-900 p-4 rounded-xl hover:bg-slate-900/40 transition-colors">
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-bold tracking-wider text-[9px] uppercase">Registered Node Email</span>
                          <span className="text-white font-mono text-xs tracking-wide">
                            {currentUser?.email ? maskEmailString(currentUser.email) : "N/A"}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-md text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Verified Identity
                        </span>
                      </div>

                      {/* ACCOUNT SECURITY ROW */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/20 border border-slate-900 p-4 rounded-xl hover:bg-slate-900/40 transition-colors">
                        <div className="space-y-1">
                          <span className="text-slate-500 block font-bold tracking-wider text-[9px] uppercase">Account Security</span>
                          <span className="text-slate-400 text-xs block">Update your cryptographic access keys.</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            console.log("🔒 BUTTON CLICK DETECTED!");
                            setPasswordModal({ isOpen: true, currentPassword: '', newPassword: '', isLoading: false });
                          }}
                          className="h-9 px-4 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] font-bold text-teal-400 hover:bg-teal-500 hover:text-slate-950 transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Update Password
                        </button>
                      </div>

                      {/* DEPLOYMENT TERMINATION ROW */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-500/5 border border-red-500/10 p-4 rounded-xl mt-6 hover:bg-red-500/10 transition-colors">
                        <div className="space-y-1">
                          <span className="text-red-500/70 block font-bold tracking-wider text-[9px] uppercase">Session Control</span>
                          <span className="text-slate-500 text-xs block">Disconnect from the decentralized ledger.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="h-9 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-400 hover:bg-red-500 hover:text-slate-950 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer pointer-events-auto"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Disconnect Node
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔐 UPDATE PASSWORD SECURE MODAL */}
              {passwordModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
                    onClick={() => !passwordModal.isLoading && setPasswordModal({ ...passwordModal, isOpen: false })}
                  />

                  {/* Modal Content */}
                  <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                      <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-teal-400" /> Update Password
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Provide your current key to authorize this security update.
                      </p>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
                      {/* CURRENT PASSWORD FIELD */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordModal.currentPassword}
                            onChange={(e) => setPasswordModal(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-4 pr-10 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors"
                            required
                            disabled={passwordModal.isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors disabled:opacity-50"
                            disabled={passwordModal.isLoading}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* NEW PASSWORD FIELD */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordModal.newPassword}
                            onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-4 pr-10 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors"
                            placeholder="Minimum 8 characters"
                            required
                            disabled={passwordModal.isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors disabled:opacity-50"
                            disabled={passwordModal.isLoading}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setPasswordModal({ isOpen: false, currentPassword: '', newPassword: '', isLoading: false })}
                          disabled={passwordModal.isLoading}
                          className="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer pointer-events-auto"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={passwordModal.isLoading || !passwordModal.currentPassword || !passwordModal.newPassword}
                          className="flex-1 h-10 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition-all flex items-center justify-center disabled:opacity-50 disabled:bg-teal-500/20 disabled:text-teal-500 cursor-pointer pointer-events-auto"
                        >
                          {passwordModal.isLoading ? (
                            <span className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying...</span>
                          ) : (
                            "Confirm Update"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </section>

        </main>
      </div>

      {/* DOCTOR DETAIL MODAL (FOR PATIENTS) */}
      {selectedDoctorDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedDoctorDetail(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-white tracking-wide">
                  {selectedDoctorDetail?.username?.toLowerCase().startsWith('dr')
                    ? selectedDoctorDetail.username
                    : `Dr. ${selectedDoctorDetail?.username || 'Doctor'}`}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{selectedDoctorDetail.specialty || 'General Practice'} • {HOSPITAL_DIRECTORY[selectedDoctorDetail.hospitalId] || selectedDoctorDetail.hospitalId || 'Unassigned'}</p>
                <p className="text-[10px] text-teal-400 font-mono mt-2">{selectedDoctorDetail.email}</p>
              </div>
              <button onClick={() => setSelectedDoctorDetail(null)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 bg-slate-950 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Records Shared With This Node
                </h4>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  {dbRecords?.filter(rec => rec.sharedAccess?.some(access => access.recipient?._id === selectedDoctorDetail._id || access.recipient === selectedDoctorDetail._id)).length || 0} Active
                </span>
              </div>
              <div className="space-y-3">
                {dbRecords.filter(rec => rec.sharedAccess?.some(access => access.recipient?._id === selectedDoctorDetail._id || access.recipient === selectedDoctorDetail._id)).length === 0 ? (
                  <p className="text-xs text-slate-600 font-medium text-center py-4 bg-slate-900/50 rounded-xl border border-slate-800/50 border-dashed">
                    You have not granted this doctor access to any records yet.
                  </p>
                ) : (
                  dbRecords.filter(rec => rec.sharedAccess?.some(access => access.recipient?._id === selectedDoctorDetail._id || access.recipient === selectedDoctorDetail._id)).map(record => (
                    <div key={record._id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="truncate pr-4">
                        <p className="text-sm font-bold text-slate-200 truncate">{record.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{record.ipfsHash}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-1 bg-teal-500/10 text-teal-400 rounded-md">
                        Access Live
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURE DECRYPTION PREVIEW MODAL */}
      {previewData.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closePreview} />

          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-md">
                  {previewData.title}
                </h3>
                <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                  Locally Decrypted
                </span>
              </div>
              <button
                onClick={closePreview}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"
              >
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
              {previewData.isLoading ? (
                <div className="flex flex-col items-center gap-4 text-slate-400">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-400" />
                  <p className="text-xs font-mono animate-pulse">Decrypting payload in browser memory...</p>
                </div>
              ) : previewData.url ? (
                previewData.type?.includes('image') ? (
                  <img
                    src={previewData.url}
                    alt={previewData.title}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <iframe
                    src={previewData.url}
                    className="w-full h-full rounded-lg bg-white"
                    title={previewData.title}
                  />
                )
              ) : (
                <div className="text-red-400 text-sm font-medium">Failed to load decrypted preview.</div>
              )}
            </div>

            {/* 📝 CLINICAL REMARKS (Visible based on Role) */}
            <div className="p-5 bg-slate-950/50 border-t border-slate-900 space-y-4">

              {/* 1. PATIENT's ORIGINAL REMARK */}
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Patient's Upload Note
                </h5>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
                  <p className="text-sm text-slate-300">
                    {previewData?.description || <span className="italic text-slate-600">No initial notes provided.</span>}
                  </p>
                </div>
              </div>

              {/* 2. CLINICAL BOARD FEEDBACK LIST (Visible to Patients AND Doctors) */}
              {previewData?.sharedAccess?.some(a => a.doctorRemarks) && (
                <div className="space-y-1.5 pt-4">
                  <h5 className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">
                    Clinical Board Feedback
                  </h5>
                  <div className="bg-slate-900/40 rounded-xl p-3 border border-teal-500/10 space-y-3">
                    {previewData.sharedAccess.map((access, idx) => {
                      if (!access.doctorRemarks) return null;

                      // Identifies if the remark belongs to the doctor currently viewing it
                      const isMe = String(access.recipient?._id || access.recipient) === String(currentUser?._id || currentUser?.id);

                      // FIX: Smart Hospital ID resolution
                      const rawHospitalId = isMe
                        ? (currentUser?.hospitalId || currentUser?.hospital)
                        : (access.recipient?.hospitalId || access.recipient?.hospital);

                      const displayHospital = HOSPITAL_DIRECTORY[rawHospitalId] || rawHospitalId || 'Unassigned Hospital';

                      return (
                        <div key={idx} className="flex flex-col border-b border-slate-800/50 last:border-0 pb-3 last:pb-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="text-xs font-bold text-teal-400">
                              {access.recipient?.username
                                ? (access.recipient.username.toLowerCase().startsWith('dr')
                                  ? access.recipient.username
                                  : `Dr. ${access.recipient.username}`)
                                : 'Unknown Physician'}
                            </span>
                            {isMe && <span className="text-[8px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">You</span>}

                            {/* Updated Specialty and Hospital Injection */}
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 sm:mt-0">
                              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-slate-700"></span>
                              {access.recipient?.specialty || 'General Practice'}
                              <span className="text-slate-700">•</span>
                              {displayHospital}
                            </span>
                          </div>

                          <span className="text-sm text-slate-300">
                            {access.doctorRemarks}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. DOCTOR'S INPUT AREA (Visible to Doctor) */}
              {currentUser?.role === 'doctor' && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                      Your Clinical Remarks
                    </h5>
                    {previewData.sharedAccess?.some(a => (String(a.recipient?._id || a.recipient) === String(currentUser?._id || currentUser?.id)) && a.doctorRemarks) && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wider">
                        Saved
                      </span>
                    )}
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your diagnosis or feedback here to share securely with the patient..."
                    disabled={previewData.sharedAccess?.some(a => (String(a.recipient?._id || a.recipient) === String(currentUser?._id || currentUser?.id)) && a.doctorRemarks)}
                    className="w-full h-20 bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {!previewData.sharedAccess?.some(a => (String(a.recipient?._id || a.recipient) === String(currentUser?._id || currentUser?.id)) && a.doctorRemarks) && (
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback || !feedbackText.trim()}
                      className="h-9 px-4 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-bold transition-colors border border-amber-500/20 mt-2 disabled:opacity-50"
                    >
                      {isSubmittingFeedback ? "Encrypting & Saving..." : "Submit Feedback"}
                    </button>
                  )}
                </div>
              )}
              {/* Closing the Modal Body */}
            </div>
            {/* Closing the Modal Wrapper */}
          </div>
        </div>
      )}



      {/* SECURE RECORD SHARING MODAL */}
      {shareData.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeShareModal} />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-lg font-black text-white tracking-wide">Grant Clinical Access</h3>
              <p className="text-xs text-slate-500 mt-1">
                Securely re-encrypt the payload key for <span className="text-teal-400 font-bold">{shareData.record?.title}</span>.
              </p>
            </div>

            <form onSubmit={handleGrantAccess} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Connected Operator
                </label>
                <select
                  value={shareData.doctorEmail}
                  onChange={(e) => setShareData(prev => ({ ...prev, doctorEmail: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  required
                >
                  <option value="">-- Select an authorized operator --</option>
                  {patientConnections.filter(c => c.status === 'active').map(conn => (
                    <option key={conn._id} value={conn.doctorId?.email}>
                      {conn.doctorId?.username?.toLowerCase().startsWith('dr')
                        ? conn.doctorId?.username
                        : `Dr. ${conn.doctorId?.username}`} ({conn.doctorId?.specialty || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-3">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                  This action performs a cryptographic re-wrapping of the original Data Encryption Key using the recipient's public identifier.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeShareModal}
                  className="flex-1 h-10 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareData.isLoading || !shareData.doctorEmail}
                  className="flex-1 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-purple-400 hover:bg-purple-500 hover:text-slate-950 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {shareData.isLoading ? "Wrapping Key..." : "Grant Access"}
                </button>
              </div>
            </form>
          </div>


        </div>
      )}
    </div>
  );
}