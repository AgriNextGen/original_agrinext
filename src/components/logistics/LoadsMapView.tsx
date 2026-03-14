import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface LoadLocation {
  id: string;
  farmer_name: string;
  crop_name: string;
  quantity: number;
  quantity_unit: string;
  village: string;
}

interface LoadsMapViewProps {
  loads: LoadLocation[];
  centerVillage?: string;
}

export default function LoadsMapView({ loads, centerVillage }: LoadsMapViewProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey.startsWith('sb_secret')) {
      setError(t('logistics.mapKeyMissing') || 'Google Maps API key not configured');
      return;
    }

    if (!mapRef.current || loads.length === 0) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({ apiKey, version: 'weekly', libraries: ['geocoding'] });
        const google = await loader.load();
        if (cancelled) return;

        const map = new google.maps.Map(mapRef.current!, {
          zoom: 9,
          center: { lat: 12.3, lng: 76.6 },
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const geocoder = new google.maps.Geocoder();
        const bounds = new google.maps.LatLngBounds();

        for (const load of loads.slice(0, 10)) {
          const location = `${load.village}, Karnataka, India`;
          try {
            const result = await geocoder.geocode({ address: location });
            if (result.results[0] && !cancelled) {
              const pos = result.results[0].geometry.location;
              bounds.extend(pos);
              const marker = new google.maps.Marker({
                position: pos,
                map,
                title: `${load.farmer_name} - ${load.crop_name}`,
              });
              const info = new google.maps.InfoWindow({
                content: `<div style="font-size:13px"><strong>${load.farmer_name}</strong><br/>${load.crop_name} - ${load.quantity} ${load.quantity_unit}<br/><span style="color:#666">${load.village}</span></div>`,
              });
              marker.addListener('click', () => info.open(map, marker));
            }
          } catch {
            // geocoding failure for this location is non-critical
          }
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 60);
        }
        setMapReady(true);
      } catch {
        setError(t('logistics.mapLoadFailed') || 'Failed to load map');
      }
    };

    initMap();
    return () => { cancelled = true; };
  }, [loads, centerVillage, t]);

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-primary" />
            {t('logistics.pickupLocations') || 'Pickup Locations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loads.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5 text-primary" />
          {t('logistics.pickupLocations') || 'Pickup Locations'}
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {loads.length} {loads.length === 1 ? 'load' : 'loads'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg overflow-hidden bg-muted/30" style={{ height: '280px' }}>
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={mapRef} className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
