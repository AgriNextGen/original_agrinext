import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Phone,
  Package,
  ExternalLink
} from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';

const statusColors: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
};

const ActiveTrips = () => {
  const navigate = useNavigate();
  // Use the trips hook to get trips from the trips table (proper entity)
  const { data: trips, isLoading } = useTrips(['assigned', 'en_route', 'arrived', 'picked_up', 'in_transit']);

  const openGoogleMaps = (location: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  if (isLoading) {
    return <DashboardLayout title="Active Trips"><DataState loading><></></DataState></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Active Trips">
      <PageShell
        title="Active Trips"
        subtitle={`${trips?.length || 0} trips in progress`}
      >

      {/* Trips List */}
      <DataState
        empty={!trips || trips.length === 0}
        emptyTitle="No active trips"
        emptyMessage="Accept some loads to start transporting."
      >
        <div className="space-y-4">
          {trips.map((trip) => {
            const request = trip.transport_request;
            
            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Trip Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {trip.crop?.crop_name || 'Unknown Crop'}
                          {trip.crop?.variety && (
                            <span className="text-muted-foreground font-normal ml-2">
                              ({trip.crop.variety})
                            </span>
                          )}
                        </h3>
                        <Badge className={statusColors[trip.status] || 'bg-gray-100 text-gray-800'}>
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Farmer</p>
                          <p className="font-medium">{trip.farmer?.full_name || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{request?.quantity} {request?.quantity_unit || 'quintals'}</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Pickup Location</p>
                            <p className="font-medium">{request?.pickup_village || request?.pickup_location}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Preferred Date</p>
                            <p className="font-medium">
                              {request?.preferred_date 
                                ? format(parseISO(request.preferred_date), 'MMM d, yyyy')
                                : 'Flexible'}
                              {request?.preferred_time && ` @ ${request.preferred_time}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request?.notes && (
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <p className="text-muted-foreground">Notes: {request.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Button 
                        onClick={() => navigate(`/logistics/trip/${trip.id}`)}
                        className="w-full"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Open Trip
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openGoogleMaps(request?.pickup_village || request?.pickup_location || '')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Maps
                      </Button>

                      {trip.farmer?.phone && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`tel:${trip.farmer?.phone}`)}
                          className="w-full"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Farmer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DataState>
      {!trips || trips.length === 0 ? (
        <div className="pt-2">
          <Button onClick={() => navigate('/logistics/loads')}>Browse Available Loads</Button>
        </div>
      ) : null}
      </PageShell>
    </DashboardLayout>
  );
};

export default ActiveTrips;
