type Callback = (online: boolean) => void;

const listeners: Callback[] = [];

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function notify(online: boolean) {
  listeners.forEach((cb) => {
    try { cb(online); } catch (_) {}
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => notify(true));
  window.addEventListener('offline', () => notify(false));
}

export function subscribe(cb: Callback) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export default { isOnline, subscribe };

