import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Phone, 
  User, 
  Package,
  ExternalLink,
  Play,
  CheckCircle2,
  Truck,
  Navigation,
  AlertTriangle,
  MessageCircle,
  ImageIcon
} from 'lucide-react';
import { useTripDetail, useTripStatusEvents, useUpdateTripStatusSecure, useProofSignedUrl } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import TripStatusStepper from '@/components/logistics/TripStatusStepper';
import ProofCaptureDialog from '@/components/logistics/ProofCaptureDialog';
import IssueReportDialog from '@/components/logistics/IssueReportDialog';
import { useLanguage } from '@/hooks/useLanguage';

const statusColors: Record<string, string> = {
  created: 'bg-gray-100 text-gray-800',
  accepted: 'bg-blue-100 text-blue-800',
  pickup_done: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: trip, isLoading } = useTripDetail(id);
  const { data: events } = useTripStatusEvents(id);
  const updateStatus = useUpdateTripStatusSecure();

  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofType, setProofType] = useState<'pickup' | 'delivery'>('pickup');
  const [proofNextStatus, setProofNextStatus] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const openGoogleMaps = (location: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleSimpleStatusUpdate = (newStatus: string) => {
    if (trip) {
      updateStatus.mutate({ tripId: trip.id, newStatus });
    }
  };

  const handleProofCapture = (type: 'pickup' | 'delivery', nextStatus: string) => {
    setProofType(type);
    setProofNextStatus(nextStatus);
    setProofDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.tripDetails')}>
        <PageShell title={t('logistics.tripDetails')}>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </PageShell>
      </DashboardLayout>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout title={t('logistics.tripDetails')}>
        <PageShell title={t('logistics.tripDetails')} breadcrumbs={<Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />{t('common.back')}</Button>}>
          <EmptyState icon={Package} title={t('logistics.tripNotFound')} />
        </PageShell>
      </DashboardLayout>
    );
  }

  const request = trip.transport_request;
  const isTerminalStatus = ['delivered', 'completed', 'cancelled'].includes(trip.status);

  return (
    <DashboardLayout title={t('logistics.tripDetails')}>
      <PageShell
        title={trip.crop?.crop_name || t('logistics.transportTrip')}
        breadcrumbs={<Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />{t('common.back')}</Button>}
        actions={<Badge className={statusColors[trip.status]}>{trip.status.replace('_', ' ')}</Badge>}
      >
        {/* Status Stepper */}
        <Card>
          <CardContent className="py-6">
            <TripStatusStepper
              currentStatus={trip.status}
              assignedAt={trip.accepted_at ?? trip.created_at}
              enRouteAt={null}
              arrivedAt={null}
              pickedUpAt={trip.pickup_done_at}
              inTransitAt={trip.in_transit_at}
              deliveredAt={trip.delivered_at}
              cancelledAt={trip.cancelled_at}
              issueCode={null}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Load Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {t('logistics.loadDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('logistics.crop')}</p>
                  <p className="font-medium text-lg">{trip.crop?.crop_name || t('common.unknown')}</p>
                  {trip.crop?.variety && (
                    <p className="text-sm text-muted-foreground">{trip.crop.variety}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('logistics.quantity')}</p>
                  <p className="font-medium text-lg">
                    {request?.quantity} {request?.quantity_unit || t('common.quintals')}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('logistics.pickupLocation')}</p>
                    <p className="font-medium">{request?.pickup_village || request?.pickup_location}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => openGoogleMaps(request?.pickup_village || request?.pickup_location || '')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('logistics.openInMaps')}
                </Button>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                    <p className="text-sm text-muted-foreground">{t('logistics.preferredDate')}</p>
                  <p className="font-medium">
                    {request?.preferred_date 
                      ? format(parseISO(request.preferred_date), 'MMMM d, yyyy')
                      : t('common.flexible')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farmer & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('logistics.farmer')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('logistics.name')}</p>
                  <p className="font-medium text-lg">{trip.farmer?.full_name || t('common.unknown')}</p>
                </div>
                
                {trip.farmer?.village && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('logistics.location')}</p>
                    <p className="font-medium">
                      {trip.farmer.village}
                      {trip.farmer.district && `, ${trip.farmer.district}`}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {trip.farmer?.phone && (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => window.open(`tel:${trip.farmer?.phone}`)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {t('logistics.call')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openWhatsApp(trip.farmer?.phone || '')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {t('logistics.whatsApp')}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!isTerminalStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {t('logistics.updateStatus')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trip.status === 'accepted' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleProofCapture('pickup', 'pickup_done')}
                      disabled={updateStatus.isPending}
                    >
                      <Package className="h-5 w-5 mr-2" />
                      {t('logistics.confirmPickup')}
                    </Button>
                  )}
                  
                  {trip.status === 'pickup_done' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleSimpleStatusUpdate('in_transit')}
                      disabled={updateStatus.isPending}
                    >
                      <Navigation className="h-5 w-5 mr-2" />
                      {t('logistics.startDelivery')}
                    </Button>
                  )}
                  
                  {trip.status === 'in_transit' && (
                    <Button 
                      className="w-full h-14 text-lg bg-green-600 hover:bg-green-700" 
                      onClick={() => handleProofCapture('delivery', 'delivered')}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      {t('logistics.confirmDelivery')}
                    </Button>
                  )}

                  {!['delivered', 'completed', 'cancelled'].includes(trip.status) && (
                    <Button 
                      variant="outline"
                      className="w-full text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={() => setIssueDialogOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {t('logistics.reportIssue')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {trip.status === 'delivered' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="font-medium text-green-800">{t('logistics.deliveredSuccessfully')}</p>
                  {trip.delivered_at && (
                    <p className="text-sm text-green-600">
                      {format(parseISO(trip.delivered_at), 'MMMM d, yyyy h:mm a')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Trip History with Proof Photos */}
        {events && events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                {t('logistics.tripHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l-2 border-muted ml-3 space-y-6">
                {events.map((event) => {
                  const hasProof = event.new_status === 'pickup_done' || event.new_status === 'delivered';
                  return (
                    <li key={event.id} className="ml-5 relative">
                      <div className="absolute -left-[1.6rem] mt-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-sm">
                          {event.new_status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(event.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {event.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>
                      )}
                      {hasProof && (
                        <ProofThumbnails tripId={trip.id} type={event.new_status === 'pickup_done' ? 'pickup' : 'delivery'} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <ProofCaptureDialog
          open={proofDialogOpen}
          onOpenChange={setProofDialogOpen}
          tripId={trip.id}
          type={proofType}
          nextStatus={proofNextStatus}
        />
        
        <IssueReportDialog
          open={issueDialogOpen}
          onOpenChange={setIssueDialogOpen}
          tripId={trip.id}
        />
      </PageShell>
    </DashboardLayout>
  );
};

function ProofThumbnails({ tripId, type }: { tripId: string; type: 'pickup' | 'delivery' }) {
  const proofPaths = [`${type}_proof_1.jpg`, `${type}_proof_2.jpg`, `${type}_proof_3.jpg`];

  return (
    <div className="mt-2 flex gap-2 flex-wrap">
      {proofPaths.map((path) => (
        <ProofImage key={path} tripId={tripId} path={`trips/${tripId}/${path}`} />
      ))}
    </div>
  );
}

function ProofImage({ tripId, path }: { tripId: string; path: string }) {
  const { data: url, isLoading, isError } = useProofSignedUrl(path);

  if (isLoading) {
    return <Skeleton className="h-16 w-16 rounded-lg" />;
  }

  if (isError || !url) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt="Proof photo"
        className="h-16 w-16 rounded-lg object-cover border hover:ring-2 hover:ring-primary/50 transition-shadow"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </a>
  );
}

export default TripDetail;
