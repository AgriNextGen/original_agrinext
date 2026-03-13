import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudDrizzle, 
  CloudSnow, 
  Wind, 
  Droplets,
  Thermometer,
  MapPin,
  RefreshCw,
  CloudLightning,
  Clock,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useFarmerProfile } from '@/hooks/useFarmerDashboard';
import { useWeather } from '@/hooks/useWeather';
import { formatDistanceToNow } from 'date-fns';

const getWeatherIcon = (icon: string, size: 'sm' | 'lg' = 'lg') => {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-10 w-10';
  switch (icon) {
    case 'sun':
      return <Sun className={`${sizeClass} text-amber-500`} />;
    case 'cloud':
      return <Cloud className={`${sizeClass} text-gray-200`} />;
    case 'rain':
      return <CloudRain className={`${sizeClass} text-blue-300`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${sizeClass} text-blue-200`} />;
    case 'snow':
      return <CloudSnow className={`${sizeClass} text-sky-200`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${sizeClass} text-yellow-400`} />;
    default:
      return <Sun className={`${sizeClass} text-amber-500`} />;
  }
};

const WeatherWidget = () => {
  const { data: profile } = useFarmerProfile();
  const {
    weather, isCached, isStale, isLoading,
    isRefreshing, error, hasLocation, profileLoading, refetch,
  } = useWeather();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || profileLoading) {
    return (
      <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Cloud className="h-5 w-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full bg-white/20" />
            <Skeleton className="h-8 w-20 bg-white/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasLocation) {
    return (
      <Card className="bg-gradient-to-br from-slate-400 to-slate-500 text-white border-0 overflow-hidden relative">
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2 text-white/90 text-base">
            <Cloud className="h-4 w-4" />
            Weather Today
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <MapPin className="h-6 w-6 text-white/80 mb-2" />
            <p className="text-white/90 text-sm">Set your location</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !weather) {
    return (
      <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white border-0 overflow-hidden relative">
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2 text-white/90 text-base">
            <Cloud className="h-4 w-4" />
            Weather Today
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-white/80" />
            <div>
              <p className="text-white/90 text-sm">Unavailable</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isRefreshing}
                className="text-white/70 hover:text-white p-0 h-auto text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const lastUpdated = weather.fetched_at 
    ? formatDistanceToNow(new Date(weather.fetched_at), { addSuffix: true })
    : 'unknown';

  return (
    <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white/90 text-base">
              <Cloud className="h-4 w-4" />
              Weather Today
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-0">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  {getWeatherIcon(weather.icon, 'sm')}
                </div>
                <div>
                  <p className="text-2xl font-bold">{weather.temp_c}°C</p>
                  <p className="text-white/80 text-xs">{weather.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-xs">{isExpanded ? 'Less' : 'More'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <MapPin className="h-3 w-3" />
                <span>{weather.location || profile?.village || 'Your Location'}</span>
              </div>

              {weather.forecast_short && (
                <p className="text-xs text-white/60 italic line-clamp-2">
                  {weather.forecast_short}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-white/70" />
                  <div>
                    <p className="text-xs text-white/60">Humidity</p>
                    <p className="text-sm font-medium">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-white/70" />
                  <div>
                    <p className="text-xs text-white/60">Wind</p>
                    <p className="text-sm font-medium">{weather.wind_kmh} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-white/70" />
                  <div>
                    <p className="text-xs text-white/60">Feels</p>
                    <p className="text-sm font-medium">{weather.temp_c + 2}°C</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-2 border-t border-white/10 text-white/50 text-[10px]">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdated}</span>
                {isStale && <span className="text-amber-300 ml-1">(cached)</span>}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default WeatherWidget;
