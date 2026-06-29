'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { 
  Shield, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Fingerprint,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // PREMIUM TOAST STATE MANAGEMENT
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      triggerToast('Please populate all verification input vectors.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Clean and lowercase credentials before flight to prevent auth schema rejections
      const processedEmail = email.trim().toLowerCase();
      
      const res = await api.post('/auth/login', { 
        email: processedEmail, 
        password: password 
      });
      
      // CRITICAL FIX: Extract both the token AND the explicit user data package (including role)
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        
        if (res.data.user) {
          // Store complete profile metadata string so the dashboard knows the user's role instantly
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }

        triggerToast(res.data.message || 'Cryptographic identity verified. Syncing terminal node...');
        
        // 1.2-second strategic delay lets the user appreciate the success state before route jump
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        triggerToast('Authentication engine handshake failed.', 'error');
      }
    } catch (err) {
      // Capture 401s and validation blocks gracefully within the UI without breaking the call stack
      const errorMessage = err.response?.data?.message || 'Authorization credentials rejected.';
      triggerToast(errorMessage, 'error');
      console.error("❌ Auth terminal Handshake mismatch details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden p-4 font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* FLOATING GLASSMORPHIC TOAST PANEL */}
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
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-teal-500/10 to-emerald-500/5 blur-[130px] animate-pulse duration-[8000ms]" />
        <div className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-blue-500/10 to-sky-500/5 blur-[130px] animate-pulse duration-[6000ms]" />
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
        
        {/* Core Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 p-3 ring-1 ring-teal-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
            <Fingerprint className="h-6 w-6 text-teal-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-b from-white to-slate-300精密">
            Access MedVault Secure Node
          </h2>
          <p className="text-xs text-slate-500 font-medium tracking-wide max-w-[290px] mx-auto">
            Sign in with your credentials to access
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Identity input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              E-mail ID
            </label>
            <div className="relative group/input">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Registered e-mail address"
                className="h-11 w-full rounded-xl border border-slate-900 bg-slate-950/80 pl-11 pr-4 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                disabled={isLoading}
                required 
              />
            </div>
          </div>

          {/* Secret phrase input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              Password
            </label>
            <div className="relative group/input">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600 group-focus-within/input:text-teal-400 transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-11 w-full rounded-xl border border-slate-900 bg-slate-950/80 pl-11 pr-11 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                disabled={isLoading}
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-teal-400 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 font-bold text-slate-950 shadow-[0_4px_20px_rgba(20,184,166,0.15)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm tracking-wide mt-6"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                Validating Network Token...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Sign IN <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>

          {/* INTERACTIVE SIGN UP LINK ROUTER */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500 font-medium">
              New USER?{" "}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-teal-400 hover:text-teal-300 font-bold underline transition-colors underline-offset-2"
              >
                Create an account
              </button>
            </p>
          </div>

        </form>
      </div>

      {/* DECENTRALIZED SECURITY FOOT NOTE */}
      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <p className="text-[10px] text-slate-700 font-mono tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3 text-slate-800" /> End-to-End Encrypted Quantum Ledger Node Auth Active
        </p>
      </div>
    </div>
  );
}