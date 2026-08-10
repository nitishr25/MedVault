import { Eye } from 'lucide-react';

export default function DemoBanner({ user }) {
  const isDemoUser = user?.isDemo || user?.username?.toLowerCase().includes('demo');

  if (!user || !isDemoUser) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-1.5 text-[11px] font-bold tracking-wide text-amber-400 shadow-sm shadow-amber-950/10 whitespace-nowrap shrink-0">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      Demo Mode
    </div>
  );
}