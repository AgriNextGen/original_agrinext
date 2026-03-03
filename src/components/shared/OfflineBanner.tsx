import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import network from '@/offline/network';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [online, setOnline] = useState(network.isOnline());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsub = network.subscribe((isOnline: boolean) => {
      if (!isOnline) setWasOffline(true);
      setOnline(isOnline);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (online && wasOffline) {
      const timer = setTimeout(() => setWasOffline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [online, wasOffline]);

  if (online && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-colors duration-300",
        online ? "bg-green-600 text-white" : "bg-yellow-600 text-white"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {online ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online — syncing your data...</span>
            <RefreshCw className="w-4 h-4 animate-spin" />
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline — changes saved locally</span>
          </>
        )}
      </div>
    </div>
  );
}
