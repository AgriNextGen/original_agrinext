import { useEffect, useState } from 'react';
import network from '@/offline/network';
import { cn } from '@/lib/utils';

export default function SyncIndicator() {
  const [online, setOnline] = useState(network.isOnline());
  useEffect(() => {
    const unsub = network.subscribe((o) => setOnline(o));
    return unsub;
  }, []);
  return (
    <div className={cn(
      'hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full',
      online ? 'text-emerald-700 bg-emerald-50' : 'text-amber-800 bg-amber-50'
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        online ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
      )} />
      {online ? 'Online' : 'Offline'}
    </div>
  );
}
