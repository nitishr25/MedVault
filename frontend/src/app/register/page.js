'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { 
  Shield, 
  User, 
  Mail, 
  KeyRound, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Fingerprint,
  Stethoscope, 
  Eye,
  EyeOff,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  
  // CORE COMPONENT STATES (No formData used here!)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('patient'); 
  const [specialty, setSpecialty] = useState(''); 
  const [hospitalId, setHospitalId] = useState('HOSPITAL-01');
  const [isLoading, setIsLoading] = useState(false);

  // PREMIUM GLASSMORPHIC TOAST STATES
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !email.trim() || !password || !role) {
      triggerToast('Please populate all node initialization vectors.', 'error');
      return;
    }

    if (password.length < 8) {
      triggerToast('Security code passphrase must be at least 8 characters long.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // FORCE THE PAYLOAD - No conditional statements.
      const payload = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role.toLowerCase(),
        specialty: role === 'doctor' ? (specialty || 'General Practice') : 'None',
        hospitalId: hospitalId
      };

      // Debug check: Look in your BROWSER console (F12) for this line
      console.log("🚀 FRONTEND PAYLOAD BEING SENT:", payload);

      const res = await api.post('/auth/register', payload);

      if (res.data?.status === 'success' || res.status === 201) {
        const successMsg = res.data?.message || 'Account initialized successfully.';
        triggerToast(successMsg, 'success');
        setTimeout(() => { router.push('/login'); }, 2000); 
      }
    } catch (err) {
      console.error("❌ Registration rejected:", err);
      triggerToast(err.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden p-4 font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* FLOATING HIGH-FIDELITY GLASSMORPHIC TOAST PANEL */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[340px] max-w-md transition-all ${
            toast.type === 'success' 
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

      {/* BACKGROUND GRAPHIC GLOW MATRICES */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-teal-500/10 to-emerald-500/5 blur-[130px] animate-pulse duration-[8000ms]" />
        <div className="absolute right-1/4 bottom-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-blue-500/10 to-sky-500/5 blur-[130px] animate-pulse duration-[6000ms]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* CENTRAL IDENTITY CONTROL INTERFACE CARD */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/30 backdrop-blur-2xl border border-slate-900 rounded-2xl p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] space-y-6 group">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent group-hover:via-teal-500/30 transition-all duration-700" />
        
        {/* Header Branding Panel */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 p-3 ring-1 ring-teal-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
            <Shield className="h-6 w-6 text-teal-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-b from-white to-slate-300">
            Initialize MedVault Identity
          </h2>
          <p className="text-xs text-slate-500 font-medium tracking-wide max-w-[280px] mx-auto">
            Register as a secure operator node within the health intelligence ecosystem matrix.
          </p>
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          
          {/* Input 1: Operator Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              Username
            </label>
            <div className="relative group/input">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your Name"
                className="h-11 w-full rounded-xl border border-slate-900 bg-slate-950/80 pl-11 pr-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                disabled={isLoading}
                required 
              />
            </div>
          </div>

          {/* Input 2: Identity Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              Email Address
            </label>
            <div className="relative group/input">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your Email ID"
                className="h-11 w-full rounded-xl border border-slate-900 bg-slate-950/80 pl-11 pr-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                disabled={isLoading}
                required 
              />
            </div>
          </div>

          {/* Input 3: Security Secret Phrase Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative flex items-center group">
              <KeyRound className="absolute left-3.5 h-4 w-4 text-slate-600 group-focus-within:text-teal-400 transition-colors" />
              
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-11 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/10 transition-colors"
                required
              />

              {/* Premium Eye Toggle Trigger Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors focus:outline-none z-10"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Input 4: Dynamic Core Role Dropdown Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              Account Type (Role)
            </label>
            <div className="relative group/input">
              <UserCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-900 bg-slate-950/80 pl-11 pr-10 text-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all appearance-none cursor-pointer"
                disabled={isLoading}
                required
              >
                <option value="patient" className="bg-slate-950 text-slate-300">Patient (Record Owner Mode)</option>
                <option value="doctor" className="bg-slate-950 text-slate-300">Doctor (Clinical Audit Mode)</option>
                <option value="hospital_admin" className="bg-slate-950 text-slate-300">Hospital Admin (Infrastructure Node Mode)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <Sparkles className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Input 5 - Conditional Specialty Dropdown for Doctors */}
          {role === 'doctor' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-semibold text-amber-400/80 tracking-wider uppercase block">
                Clinical Specialty (Required)
              </label>
              <div className="relative group/input">
                <Stethoscope className="absolute left-3.5 top-3.5 h-4 w-4 text-amber-500/50 group-focus-within/input:text-amber-400 transition-colors" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="h-11 w-full rounded-xl border border-amber-500/20 bg-slate-950/80 pl-11 pr-10 text-slate-200 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                  disabled={isLoading}
                  required={role === 'doctor'}
                >
                  <option value="" disabled className="bg-slate-950 text-slate-500">Select Primary Specialty</option>
                  <option value="Cardiologist" className="bg-slate-950 text-slate-300">Cardiologist</option>
                  <option value="Neurologist" className="bg-slate-950 text-slate-300">Neurologist</option>
                  <option value="Orthopedic" className="bg-slate-950 text-slate-300">Orthopedic Surgeon</option>
                  <option value="General Surgeon" className="bg-slate-950 text-slate-300">General Surgeon</option>
                  <option value="Pediatrician" className="bg-slate-950 text-slate-300">Pediatrician</option>
                  <option value="Oncologist" className="bg-slate-950 text-slate-300">Oncologist</option>
                  <option value="General Practice" className="bg-slate-950 text-slate-300">General Practice</option>
                  <option value="Psychiatrist" className="bg-slate-950 text-slate-300">Psychiatrist</option>
                  <option value="Hepatologist" className="bg-slate-950 text-slate-300">Hepatologist</option>
                  <option value="Dermatologist" className="bg-slate-950 text-slate-300">Dermatologist</option>
                  <option value="Radiologist" className="bg-slate-950 text-slate-300">Radiologist</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <Sparkles className="h-4 w-4 text-amber-500/50" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Specialty will be visible to patients requesting connection.</p>
            </div>
          )}

          {/* HOSPITAL SELECTION (Only visible for Doctors) */}
{(role === 'doctor' || role === 'hospital_admin') && (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
      Primary Hospital Affiliation
    </label>
    <div className="relative group/input">
      <div className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      </div>
      <select
  name="hospitalId"
  value={hospitalId || ''}
  onChange={(e) => setHospitalId(e.target.value)}
  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors appearance-none"
  required
>
  <option value="" disabled>-- Select Your Affiliated Hospital --</option>
  <option value="HOSPITAL-01">City General Hospital</option>
  <option value="HOSPITAL-02">Metro Medical Center</option>
  <option value="HOSPITAL-03">Valley Health Clinic</option>
  <option value="HOSPITAL-04">Sunrise Care Hospital</option>
  <option value="HOSPITAL-05">Oceanview Medical</option>
  <option value="HOSPITAL-06">Pinnacle Health System</option>
  <option value="HOSPITAL-07">Central Neurological Institute</option>
</select>
    </div>
  </div>
)}

          {/* Action Trigger Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 font-bold text-slate-950 shadow-[0_4px_20px_rgba(20,184,166,0.2)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm tracking-wide mt-4"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                Broadcasting Ledger Entry...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Create Account <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>

          {/* BACK TO LOGIN ROUTER LINK */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Existing identity verified?{" "}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-teal-400 hover:text-teal-300 font-bold underline transition-colors underline-offset-2"
              >
                Login IN
              </button>
            </p>
          </div>

        </form>
      </div>

      {/* DECENTRALIZED FOOT NOTE MATRIX */}
      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <p className="text-[10px] text-slate-700 font-mono tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Fingerprint className="h-3 w-3 text-slate-800" /> Decentralized Vault Ingestion Environment Active
        </p>
      </div>
    </div>
  );
}