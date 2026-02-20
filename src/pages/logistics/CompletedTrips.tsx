import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, MapPin, Calendar, Package } from 'lucide-react';
import { useCompletedTrips } from '@/hooks/useLogisticsDashboard';
import { format, parseISO } from 'date-fns';

const CompletedTrips = () => {
  const { data: trips, isLoading } = useCompletedTrips();

  if (isLoading) {
    return (
      <DashboardLayout title="Completed Trips">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Completed Trips">
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Completed Trips</h1>
        <p className="text-muted-foreground">
          {trips?.length || 0} trips completed successfully
        </p>
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!trips || trips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No completed trips yet</p>
              <p className="text-sm">Your delivery history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Pickup Location</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell>
                        <p className="font-medium">{trip.farmer?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.farmer?.village}, {trip.farmer?.district}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{trip.crop?.crop_name || 'N/A'}</p>
                        {trip.crop?.variety && (
                          <p className="text-xs text-muted-foreground">{trip.crop.variety}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {trip.quantity} {trip.quantity_unit || 'quintals'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{trip.pickup_village || trip.pickup_location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.completed_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(parseISO(trip.completed_at), 'MMM d, yyyy')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {trip.distance_km ? (
                          <span>{trip.distance_km} km</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {trips && trips.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{trips.length}</p>
              <p className="text-sm text-muted-foreground">Total Deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {trips.reduce((acc, t) => acc + (t.quantity || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Quintals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {trips.reduce((acc, t) => acc + (t.distance_km || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Distance (km)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {new Set(trips.map(t => t.farmer_id)).size}
              </p>
              <p className="text-sm text-muted-foreground">Farmers Served</p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default CompletedTrips;
