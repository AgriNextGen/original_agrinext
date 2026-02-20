import { useState, useCallback } from 'react';

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface UseGeoCaptureResult {
  position: GeoPosition | null;
  capturing: boolean;
  error: string | null;
  capture: () => Promise<GeoPosition | null>;
  clear: () => void;
}

export function useGeoCapture(): UseGeoCaptureResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return null;
    }

    setCapturing(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geo: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(geo);
          setCapturing(false);
          resolve(geo);
        },
        (err) => {
          let msg = 'Unable to capture location';
          if (err.code === 1) msg = 'Location permission denied';
          else if (err.code === 2) msg = 'Location unavailable';
          else if (err.code === 3) msg = 'Location request timed out';
          setError(msg);
          setCapturing(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return { position, capturing, error, capture, clear };
}
