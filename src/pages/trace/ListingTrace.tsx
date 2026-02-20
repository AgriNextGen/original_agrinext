import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  MapPin, 
  Package, 
  Calendar, 
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  Leaf,
  Camera,
  Sprout,
  Droplets
} from 'lucide-react';
import { format } from 'date-fns';

interface CropDetails {
  crop_name: string;
  variety: string | null;
  sowing_date: string | null;
  harvest_date: string | null;
  status: string;
  growth_stage: string | null;
  origin_district?: string;
  origin_village?: string;
}

interface TimelineEntry {
  type: string;
  date: string;
  notes: string | null;
}

interface EvidenceItem {
  url: string;
  date: string;
  notes: string | null;
  type?: string;
}

interface TraceData {
  trace_code: string;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  origin: string | null;
  inputs_summary: string | null;
  test_report_urls: string[];
  listed_at: string;
  verified: boolean;
  platform: string;
  crop?: CropDetails;
  crop_timeline?: TimelineEntry[];
  evidence?: {
    stage_photos?: EvidenceItem[];
    input_photos?: EvidenceItem[];
    soil_reports?: EvidenceItem[];
  };
  geo_verified?: boolean;
}

const ACTIVITY_LABELS: Record<string, string> = {
  photo: 'Photo Taken',
  fertilizer: 'Fertilizer Applied',
  spray: 'Pesticide Spray',
  irrigation: 'Irrigation',
  weeding: 'Weeding',
  disease: 'Disease Observed',
  growth_update: 'Growth Update',
  harvest_update: 'Harvest Update',
  note: 'Note',
  other: 'Activity',
};

const ListingTrace = () => {
  const { traceCode } = useParams<{ traceCode: string }>();
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraceData = async () => {
      if (!traceCode) {
        setError('Invalid trace code');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-listing-trace?trace_code=${encodeURIComponent(traceCode)}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        const result = await response.json();

        if (!response.ok) {
          setError(result.message || 'This trace record is not available.');
          setTraceData(null);
        } else {
          setTraceData(result);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching trace data:', err);
        setError('Unable to verify this product. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTraceData();
  }, [traceCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying product origin...</p>
        </div>
      </div>
    );
  }

  if (error || !traceData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Trace Record Not Available</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This product trace record is not available or has been unpublished.'}
            </p>
            <Link to="/" className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1">
              Visit AgriNext Gen <ExternalLink className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">Verified Product</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Product Transparency</h1>
          <p className="text-muted-foreground text-sm mt-1">Trace Code: {traceData.trace_code}</p>
        </div>

        {/* Main product card */}
        <Card className="mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 rounded-lg p-3">
                <Leaf className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{traceData.product_name}</h2>
                <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-0">
                  {traceData.category}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="pt-6 space-y-4">
            {traceData.origin && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Origin</p>
                  <p className="font-medium">{traceData.origin}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Quantity Available</p>
                <p className="font-medium">{traceData.quantity} {traceData.unit}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Listed On</p>
                <p className="font-medium">{format(new Date(traceData.listed_at), 'PPP')}</p>
              </div>
            </div>

            {traceData.inputs_summary && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Farming Inputs Used</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{traceData.inputs_summary}</p>
                </div>
              </>
            )}

            {traceData.test_report_urls && traceData.test_report_urls.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Test Reports</p>
                  <div className="space-y-2">
                    {traceData.test_report_urls.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm">
                        <FileText className="h-4 w-4" />
                        View Report {index + 1}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Crop Details Card */}
        {traceData.crop && (
          <Card className="mb-4">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Crop Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Crop</p>
                  <p className="font-medium">{traceData.crop.crop_name}</p>
                </div>
                {traceData.crop.variety && (
                  <div>
                    <p className="text-muted-foreground">Variety</p>
                    <p className="font-medium">{traceData.crop.variety}</p>
                  </div>
                )}
                {traceData.crop.sowing_date && (
                  <div>
                    <p className="text-muted-foreground">Sown</p>
                    <p className="font-medium">{format(new Date(traceData.crop.sowing_date), 'PP')}</p>
                  </div>
                )}
                {traceData.crop.harvest_date && (
                  <div>
                    <p className="text-muted-foreground">Expected Harvest</p>
                    <p className="font-medium">{format(new Date(traceData.crop.harvest_date), 'PP')}</p>
                  </div>
                )}
                {traceData.crop.growth_stage && (
                  <div>
                    <p className="text-muted-foreground">Stage</p>
                    <Badge variant="outline">{traceData.crop.growth_stage}</Badge>
                  </div>
                )}
                {traceData.crop.origin_district && (
                  <div>
                    <p className="text-muted-foreground">Farm Location</p>
                    <p className="font-medium">
                      {[traceData.crop.origin_village, traceData.crop.origin_district].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crop Timeline */}
        {traceData.crop_timeline && traceData.crop_timeline.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Crop Timeline</h3>
              </div>
              <div className="space-y-3">
                {traceData.crop_timeline.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5" />
                      {i < traceData.crop_timeline!.length - 1 && (
                        <div className="w-0.5 flex-1 bg-green-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">
                        {ACTIVITY_LABELS[entry.type] || entry.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), 'PP')}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evidence Photos */}
        {traceData.evidence?.stage_photos && traceData.evidence.stage_photos.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Crop Stage Photos</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {traceData.evidence.stage_photos.map((photo, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border">
                    <img src={photo.url} alt={`Stage ${i + 1}`} className="w-full h-32 object-cover" />
                    {photo.notes && (
                      <p className="text-xs text-muted-foreground p-2">{photo.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {traceData.evidence?.input_photos && traceData.evidence.input_photos.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Input & Fertilizer Proof</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {traceData.evidence.input_photos.map((photo, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-border">
                    <img src={photo.url} alt={`Input ${i + 1}`} className="w-full h-32 object-cover" />
                    {photo.notes && (
                      <p className="text-xs text-muted-foreground p-2">{photo.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {traceData.evidence?.soil_reports && traceData.evidence.soil_reports.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Soil Test Reports</h3>
              </div>
              <div className="space-y-2">
                {traceData.evidence.soil_reports.map((report, i) => (
                  <a key={i} href={report.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Soil Report {i + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.date), 'PP')}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geo Verification Badge */}
        {traceData.geo_verified && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-2 text-blue-800">
                <MapPin className="h-5 w-5" />
                <span className="text-sm font-medium">Geo-verified at farm level</span>
              </div>
              <p className="text-xs text-center text-blue-700 mt-1">
                Farm location has been verified via GPS
              </p>
            </CardContent>
          </Card>
        )}

        {/* Verification footer */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-2 text-green-800">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Verified on {traceData.platform}</span>
            </div>
            <p className="text-xs text-center text-green-700 mt-2">
              This product listing has been verified for authenticity
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1">
            Learn more about AgriNext Gen <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ListingTrace;
