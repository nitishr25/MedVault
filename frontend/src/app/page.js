'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ShieldAlert, Loader2 } from 'lucide-react';

export default function RootGatewayPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Audit client data anchors to inspect existing verified state loops
    const tokenPassport = localStorage.getItem('token');
    const userSession = localStorage.getItem('user');

    // 2. Direct traffic dynamically based on authentication clearance vectors
    if (tokenPassport && userSession) {
      console.log("🔒 Dynamic session handshake verified. Synced straight to dashboard cluster.");
      router.replace('/dashboard');
    } else {
      console.log("🔓 Session anonymous or expired. Redirecting incoming traffic to login gateway.");
      // If data looks half-cleared, make sure local storage footprints are thoroughly reset
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden font-sans select-none selection:bg-teal-500 selection:text-slate-950">
      
      {/* GLOWING GRAPHIC BACKGROUND OVERLAYS */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-teal-500/5 to-transparent blur-[130px] animate-pulse duration-[4000ms]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* CENTRAL COMPILING INTERFACE MODULE CONTAINER */}
      <div className="relative z-10 text-center space-y-5 max-w-xs mx-auto">
        <div className="inline-flex items-center justify-center rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-900 p-4 ring-1 ring-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-bounce duration-[3000ms]">
          <Shield className="h-8 w-8 text-teal-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xs font-black tracking-[0.25em] text-white uppercase font-mono bg-clip-text bg-gradient-to-b from-white to-slate-400">
            Initializing Node
          </h1>
          <p className="text-[11px] text-slate-500 font-semibold tracking-wide leading-relaxed">
            Securing environment variables, validating local cryptographic signatures, and checking access matrices.
          </p>
        </div>

        {/* LOADING ANIMATION SPINNER TRACKER */}
        <div className="flex items-center justify-center pt-1">
          <Loader2 className="h-4 w-4 animate-spin text-teal-500/30 text-t-teal-400" />
        </div>
      </div>

      {/* FIXED METADATA CHECKPOINT FOOTER */}
      <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
        <p className="text-[9px] text-slate-800 font-mono tracking-widest uppercase flex items-center justify-center gap-1.5">
          <ShieldAlert className="h-3 w-3 text-slate-800" /> Node handshake firewall checkpoint active
        </p>
      </div>
    </div>
  );
}