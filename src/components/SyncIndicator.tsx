import React from 'react';
import network from '@/offline/network';
import { useEffect, useState } from 'react';

export default function SyncIndicator() {
  const [online, setOnline] = useState(network.isOnline());
  useEffect(() => {
    const unsub = network.subscribe((o) => setOnline(o));
    return unsub;
  }, []);
  return (
    <div className={`px-2 py-1 text-sm ${online ? 'text-green-700' : 'text-yellow-800'}`}>
      {online ? 'Online' : 'Offline — Pending sync'}
    </div>
  );
}

