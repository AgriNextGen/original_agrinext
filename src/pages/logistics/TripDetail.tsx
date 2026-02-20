import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
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
  MessageCircle
} from 'lucide-react';
import { useTripDetail, useTripStatusEvents, useUpdateTripStatusSecure } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import TripStatusStepper from '@/components/logistics/TripStatusStepper';
import ProofCaptureDialog from '@/components/logistics/ProofCaptureDialog';
import IssueReportDialog from '@/components/logistics/IssueReportDialog';

const statusColors: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-purple-100 text-purple-800',
  arrived: 'bg-orange-100 text-orange-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  issue: 'bg-amber-100 text-amber-800',
};

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      <DashboardLayout title="Trip Details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout title="Trip Details">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">Trip not found</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const request = trip.transport_request;
  const isTerminalStatus = ['delivered', 'cancelled'].includes(trip.status);

  return (
    <DashboardLayout title="Trip Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {trip.crop?.crop_name || 'Transport'} Trip
            </h1>
          </div>
          <Badge className={statusColors[trip.status]}>
            {trip.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Status Stepper */}
        <Card>
          <CardContent className="py-6">
            <TripStatusStepper
              currentStatus={trip.status}
              assignedAt={trip.assigned_at}
              enRouteAt={trip.en_route_at}
              arrivedAt={trip.arrived_at}
              pickedUpAt={trip.picked_up_at}
              inTransitAt={trip.in_transit_at}
              deliveredAt={trip.delivered_at}
              cancelledAt={trip.cancelled_at}
              issueCode={trip.issue_code}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Load Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Load Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Crop</p>
                  <p className="font-medium text-lg">{trip.crop?.crop_name || 'Unknown'}</p>
                  {trip.crop?.variety && (
                    <p className="text-sm text-muted-foreground">{trip.crop.variety}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium text-lg">
                    {request?.quantity} {request?.quantity_unit || 'quintals'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location</p>
                    <p className="font-medium">{request?.pickup_village || request?.pickup_location}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => openGoogleMaps(request?.pickup_village || request?.pickup_location || '')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </Button>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Date</p>
                  <p className="font-medium">
                    {request?.preferred_date 
                      ? format(parseISO(request.preferred_date), 'MMMM d, yyyy')
                      : 'Flexible'}
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
                  Farmer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-lg">{trip.farmer?.full_name || 'Unknown'}</p>
                </div>
                
                {trip.farmer?.village && (
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
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
                        Call
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openWhatsApp(trip.farmer?.phone || '')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
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
                    Update Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trip.status === 'assigned' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleSimpleStatusUpdate('en_route')}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Trip
                    </Button>
                  )}
                  
                  {trip.status === 'en_route' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleSimpleStatusUpdate('arrived')}
                      disabled={updateStatus.isPending}
                    >
                      <MapPin className="h-5 w-5 mr-2" />
                      Arrived at Pickup
                    </Button>
                  )}
                  
                  {trip.status === 'arrived' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleProofCapture('pickup', 'picked_up')}
                      disabled={updateStatus.isPending}
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Confirm Pickup
                    </Button>
                  )}
                  
                  {trip.status === 'picked_up' && (
                    <Button 
                      className="w-full h-14 text-lg" 
                      onClick={() => handleSimpleStatusUpdate('in_transit')}
                      disabled={updateStatus.isPending}
                    >
                      <Navigation className="h-5 w-5 mr-2" />
                      Start Delivery
                    </Button>
                  )}
                  
                  {trip.status === 'in_transit' && (
                    <Button 
                      className="w-full h-14 text-lg bg-green-600 hover:bg-green-700" 
                      onClick={() => handleProofCapture('delivery', 'delivered')}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Confirm Delivery
                    </Button>
                  )}

                  {!['delivered', 'cancelled', 'issue'].includes(trip.status) && (
                    <Button 
                      variant="outline"
                      className="w-full text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={() => setIssueDialogOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {trip.status === 'delivered' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="font-medium text-green-800">Delivered Successfully</p>
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
      </div>
    </DashboardLayout>
  );
};

export default TripDetail;
